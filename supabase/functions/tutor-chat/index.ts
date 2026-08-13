// ─────────────────────────────────────────────────────────────────────────────
// tutor-chat — Edge Function du tuteur conversationnel japonais (Phases 3-4)
//
// Reçoit un message utilisateur, vérifie le JWT Supabase, applique le gating
// freemium (limite gratuite, puis vérification premium RevenueCat, puis
// plafond anti-abus même pour les payants), appelle l'API Anthropic (Haiku
// par défaut) avec une sortie forcée par tool-use (JSON strict, jamais de
// markdown ni de parsing fragile), sauvegarde l'échange en base, renvoie le
// résultat.
//
// ANTHROPIC_API_KEY et REVENUECAT_SECRET_KEY ne quittent jamais cette
// fonction : jamais exposées au client.
// ─────────────────────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { TUTOR_SCENARIOS } from "./scenarios.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const REVENUECAT_SECRET_KEY = Deno.env.get("REVENUECAT_SECRET_KEY") ?? "";
const REVENUECAT_ENTITLEMENT_ID = Deno.env.get("REVENUECAT_ENTITLEMENT_ID") || "premium";
const TUTOR_MODEL = Deno.env.get("TUTOR_MODEL") || "claude-haiku-4-5-20251001";
// Plafond anti-abus (même les premium l'atteignent un jour) — inchangé depuis la Phase 3.
const DAILY_LIMIT = parseInt(Deno.env.get("TUTOR_DAILY_LIMIT") || "30", 10);
// Palier gratuit (Phase 4) : au-delà, il faut être premium pour continuer.
const FREE_DAILY_LIMIT = parseInt(Deno.env.get("TUTOR_FREE_DAILY_LIMIT") || "8", 10);
const HISTORY_LIMIT = parseInt(Deno.env.get("TUTOR_HISTORY_LIMIT") || "20", 10);

// Vérifie l'entitlement premium directement auprès de RevenueCat (jamais via
// un booléen envoyé par le client, spoofable). app_user_id = l'id Supabase,
// car le client fait déjà Purchases.logIn({appUserID: supabaseUserId})
// (voir src/purchases.js identifyUser) — les deux identifiants sont alignés.
// Panne/timeout RevenueCat → traité comme non-premium (fail-closed : plus
// sûr qu'un accès gratuit illimité en cas d'incident).
async function isPremiumUser(userId: string): Promise<boolean> {
  if (!REVENUECAT_SECRET_KEY) {
    console.error("[tutor-chat] REVENUECAT_SECRET_KEY absente — impossible de vérifier le premium, on refuse.");
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${REVENUECAT_SECRET_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    const data = await res.json();
    const entitlement = data?.subscriber?.entitlements?.[REVENUECAT_ENTITLEMENT_ID];
    if (!entitlement?.expires_date) return true; // pas de date d'expiration = abonnement à vie
    return new Date(entitlement.expires_date).getTime() > Date.now();
  } catch (e) {
    console.error("[tutor-chat] vérification RevenueCat échouée:", e);
    return false;
  }
}

const NIVEAU_INSTRUCTIONS: Record<string, string> = {
  "débutant":
    "Niveau de l'utilisateur : DÉBUTANT. Utilise beaucoup de français, des phrases japonaises courtes et simples (vocabulaire de base, formes polies simples). Remplis TOUJOURS le champ 'romaji' avec le romaji de reply_jp.",
  "faux-débutant":
    "Niveau de l'utilisateur : FAUX-DÉBUTANT (quelques bases). Mélange équilibré japonais/français, phrases un peu plus longues. Remplis 'romaji' seulement si la phrase japonaise contient du vocabulaire ou kanji peu communs, sinon laisse-le vide.",
  "intermédiaire":
    "Niveau de l'utilisateur : INTERMÉDIAIRE. Réponds très majoritairement en japonais naturel (kanji/kana), avec une traduction française concise dans reply_fr. Laisse le champ 'romaji' VIDE sauf si l'utilisateur demande explicitement le romaji dans son dernier message.",
};

const RESPONSE_TOOL = {
  name: "emit_response",
  description: "Renvoie la réponse structurée du tuteur de japonais.",
  input_schema: {
    type: "object",
    properties: {
      reply_jp: { type: "string", description: "Réponse du tuteur, en japonais." },
      reply_fr: { type: "string", description: "Traduction / explication en français de reply_jp." },
      romaji: { type: "string", description: "Romaji de reply_jp, ou chaîne vide si non pertinent au niveau de l'utilisateur." },
      correction: { type: "string", description: "Correction bienveillante d'une erreur (grammaire, particule, politesse, kana/kanji) trouvée dans le DERNIER message de l'utilisateur. Chaîne vide si aucune erreur." },
      suggestions: {
        type: "array",
        items: { type: "string" },
        description: "2 à 3 réponses courtes et naturelles, en japonais, que l'utilisateur pourrait envoyer ensuite.",
      },
    },
    required: ["reply_jp", "reply_fr", "romaji", "correction", "suggestions"],
  },
};

function buildSystemPrompt(niveau: string, scenarioId: string): string {
  const scenario = TUTOR_SCENARIOS.find((s) => s.id === scenarioId) ?? TUTOR_SCENARIOS.find((s) => s.id === "libre")!;
  const niveauInstr = NIVEAU_INSTRUCTIONS[niveau] || NIVEAU_INSTRUCTIONS["débutant"];
  return [
    "Tu es un tuteur de japonais bienveillant et patient pour un francophone qui apprend le japonais en vue d'un voyage au Japon.",
    "Tu réponds TOUJOURS en appelant l'outil emit_response — jamais de texte libre en dehors de l'outil.",
    niveauInstr,
    scenario.systemContext,
    "Si le dernier message de l'utilisateur contient une erreur (grammaire, particule, politesse, kana/kanji), explique-la brièvement et avec bienveillance dans 'correction', sans casser le fil de la conversation. Si aucune erreur, laisse 'correction' vide.",
    "Reste concis : 1 à 3 phrases courtes par réponse, adaptées à une conversation, pas un cours magistral.",
  ].join("\n\n");
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function safeSuggestions(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s) => typeof s === "string").slice(0, 3);
}

async function callAnthropic(system: string, messages: { role: string; content: string }[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: TUTOR_MODEL,
      max_tokens: 1024,
      system,
      messages,
      tools: [RESPONSE_TOOL],
      tool_choice: { type: "tool", name: "emit_response" },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`anthropic_http_${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const toolUse = (data.content || []).find((b: any) => b.type === "tool_use" && b.name === "emit_response");
  if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) {
    throw new Error("no_tool_use_block");
  }
  return toolUse.input;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500, headers: jsonHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const message = safeString(body?.message).trim();
    const scenarioId = safeString(body?.scenarioId) || "libre";
    const niveau = safeString(body?.niveau) || "débutant";
    let conversationId = safeString(body?.conversationId) || null;

    if (!message) {
      return new Response(JSON.stringify({ error: "empty_message" }), { status: 400, headers: jsonHeaders });
    }

    // ── Garde-fou serveur : gating freemium, indépendant du client ──────────
    // Chemin rapide pour l'immense majorité des messages (bien sous le palier
    // gratuit) : pas d'appel RevenueCat, juste le comptage du jour.
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: usedToday, error: countErr } = await supabase
      .from("tutor_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", startOfDay.toISOString());
    if (countErr) {
      return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: jsonHeaders });
    }
    const used = usedToday ?? 0;
    if (used >= FREE_DAILY_LIMIT) {
      const premium = await isPremiumUser(userId);
      if (!premium) {
        return new Response(
          JSON.stringify({ error: "premium_required", limit: FREE_DAILY_LIMIT }),
          { status: 402, headers: jsonHeaders },
        );
      }
      if (used >= DAILY_LIMIT) {
        return new Response(
          JSON.stringify({ error: "limit_reached", limit: DAILY_LIMIT, remainingToday: 0 }),
          { status: 429, headers: jsonHeaders },
        );
      }
    }

    // ── Conversation : réutilise ou crée ─────────────────────────────────────
    if (conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("tutor_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (convErr || !conv) conversationId = null; // RLS/appartenance invalide → on en recrée une
    }
    if (!conversationId) {
      const { data: newConv, error: createErr } = await supabase
        .from("tutor_conversations")
        .insert({ user_id: userId, scenario: scenarioId })
        .select("id")
        .single();
      if (createErr || !newConv) {
        return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: jsonHeaders });
      }
      conversationId = newConv.id;
    }

    // ── Historique tronqué (les N derniers messages de CETTE conversation) ──
    const { data: pastMessages } = await supabase
      .from("tutor_messages")
      .select("role, content_jp, content_fr, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    const history = (pastMessages || []).slice().reverse();
    const truncated = (pastMessages || []).length >= HISTORY_LIMIT;

    const anthropicMessages: { role: string; content: string }[] = [];
    if (truncated) {
      anthropicMessages.push({
        role: "user",
        content: "[Début de conversation non affiché ici — continue naturellement à partir des échanges ci-dessous.]",
      });
      anthropicMessages.push({ role: "assistant", content: "了解しました。" });
    }
    for (const m of history) {
      if (m.role === "user") {
        anthropicMessages.push({ role: "user", content: safeString(m.content_jp) });
      } else {
        const text = [safeString(m.content_jp), m.content_fr ? `(${m.content_fr})` : ""].filter(Boolean).join(" ");
        anthropicMessages.push({ role: "assistant", content: text || "…" });
      }
    }

    // ── Sauvegarde le message utilisateur AVANT l'appel modèle ──────────────
    const { error: insertUserErr } = await supabase
      .from("tutor_messages")
      .insert({ conversation_id: conversationId, user_id: userId, role: "user", content_jp: message });
    if (insertUserErr) {
      return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: jsonHeaders });
    }
    anthropicMessages.push({ role: "user", content: message });

    const system = buildSystemPrompt(niveau, scenarioId);

    // ── Appel Anthropic, avec un retry léger si le JSON/tool-use est absent ──
    let parsed: any = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        parsed = await callAnthropic(system, anthropicMessages);
      } catch (e) {
        lastErr = e;
      }
    }
    if (!parsed) {
      console.error("[tutor-chat] échec appel Anthropic:", lastErr);
      return new Response(
        JSON.stringify({ error: "tutor_unavailable" }),
        { status: 502, headers: jsonHeaders },
      );
    }

    const replyJp = safeString(parsed.reply_jp);
    const replyFr = safeString(parsed.reply_fr);
    const romaji = safeString(parsed.romaji);
    const correction = safeString(parsed.correction);
    const suggestions = safeSuggestions(parsed.suggestions);

    const { error: insertAssistantErr } = await supabase.from("tutor_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content_jp: replyJp,
      content_fr: replyFr,
      romaji: romaji || null,
      correction: correction || null,
    });
    if (insertAssistantErr) {
      console.error("[tutor-chat] échec sauvegarde réponse:", insertAssistantErr);
    }

    // Titre auto de la conversation au tout premier échange
    if (!truncated && history.length === 0) {
      const scenario = TUTOR_SCENARIOS.find((s) => s.id === scenarioId);
      const titre = scenario ? scenario.titre : replyFr.slice(0, 40);
      await supabase.from("tutor_conversations").update({ titre }).eq("id", conversationId);
    }

    return new Response(
      JSON.stringify({
        conversationId,
        reply_jp: replyJp,
        reply_fr: replyFr,
        romaji,
        correction,
        suggestions,
        remainingToday: Math.max(0, DAILY_LIMIT - (usedToday ?? 0) - 1),
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (e) {
    console.error("[tutor-chat] erreur inattendue:", e);
    return new Response(JSON.stringify({ error: "unexpected_error" }), { status: 500, headers: jsonHeaders });
  }
});
