// ─────────────────────────────────────────────────────────────────────────────
// itinerary-generate — Auto-génération d'itinéraire de voyage (Phase 4.4)
//
// Calqué sur tutor-chat : JWT vérifié, gating premium re-vérifié serveur
// auprès de RevenueCat (fail-closed), sortie forcée par tool-use (JSON
// strict). Reçoit les lieux GARDÉS par l'utilisateur (catalogue statique
// côté client, japan-data.json — rien à chercher en base ici) et une durée
// en jours ; renvoie un regroupement par ville + un ordre de jours, jamais
// un lieu inventé hors de la liste reçue (garde-fou appliqué après l'appel
// IA, pas seulement demandé dans le prompt).
//
// ANTHROPIC_API_KEY et REVENUECAT_SECRET_KEY ne quittent jamais cette
// fonction : jamais exposées au client.
// ─────────────────────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const REVENUECAT_SECRET_KEY = Deno.env.get("REVENUECAT_SECRET_KEY") ?? "";
const REVENUECAT_ENTITLEMENT_ID = Deno.env.get("REVENUECAT_ENTITLEMENT_ID") || "premium";
const ITINERARY_MODEL = Deno.env.get("ITINERARY_MODEL") || "claude-haiku-4-5-20251001";

const MAX_LIEUX = 60; // borne large mais finie — anti-abus payload, pas une limite produit réaliste
const MIN_DAYS = 1;
const MAX_DAYS = 30;

// Identique à tutor-chat/index.ts : vérifie l'entitlement directement auprès
// de RevenueCat (jamais un booléen envoyé par le client, spoofable). Panne/
// clé absente → fail-closed (refuse plutôt que d'ouvrir par défaut).
async function isPremiumUser(userId: string): Promise<boolean> {
  if (!REVENUECAT_SECRET_KEY) {
    console.error("[itinerary-generate] REVENUECAT_SECRET_KEY absente — impossible de vérifier le premium, on refuse.");
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
    console.error("[itinerary-generate] vérification RevenueCat échouée:", e);
    return false;
  }
}

const RESPONSE_TOOL = {
  name: "emit_itinerary",
  description: "Renvoie l'itinéraire regroupé par ville et réparti sur les jours demandés.",
  input_schema: {
    type: "object",
    properties: {
      villes: {
        type: "array",
        items: { type: "string" },
        description: "IDs de ville (parmi ceux fournis en entrée) dans l'ordre du parcours, pour limiter les trajets.",
      },
      jours: {
        type: "array",
        items: {
          type: "object",
          properties: {
            villeId: { type: "string", description: "Doit être l'un des IDs de ville fournis en entrée." },
            titre: { type: "string", description: "Courte intro du jour, 1 phrase, en français." },
            lieuIds: {
              type: "array",
              items: { type: "string" },
              description: "IDs de lieux pour ce jour, exclusivement parmi ceux fournis en entrée.",
            },
          },
          required: ["villeId", "titre", "lieuIds"],
        },
      },
    },
    required: ["villes", "jours"],
  },
};

function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

async function callAnthropic(system: string, userContent: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ITINERARY_MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: userContent }],
      tools: [RESPONSE_TOOL],
      tool_choice: { type: "tool", name: "emit_itinerary" },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`anthropic_http_${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const toolUse = (data.content || []).find((b: any) => b.type === "tool_use" && b.name === "emit_itinerary");
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

    // ── Gating premium — serveur, fail-closed, jamais de confiance client ──
    const premium = await isPremiumUser(userId);
    if (!premium) {
      return new Response(JSON.stringify({ error: "premium_required" }), { status: 402, headers: jsonHeaders });
    }

    const body = await req.json().catch(() => null);
    const rawLieux = Array.isArray(body?.lieux) ? body.lieux : [];
    const days = Math.min(MAX_DAYS, Math.max(MIN_DAYS, parseInt(body?.days, 10) || 0));

    // ── Nettoyage strict de l'entrée : seuls les champs utiles, jamais de
    // confiance aveugle dans la forme envoyée par le client ──────────────
    const lieux = rawLieux
      .filter((l: any) => l && typeof l.id === "string" && typeof l.villeId === "string")
      .slice(0, MAX_LIEUX)
      .map((l: any) => ({
        id: l.id,
        nom: safeString(l.nom).slice(0, 120) || l.id,
        villeId: l.villeId,
        categorie: safeString(l.categorie).slice(0, 60),
        quartier: safeString(l.quartier).slice(0, 60),
        lat: typeof l.lat === "number" ? l.lat : null,
        lng: typeof l.lng === "number" ? l.lng : null,
      }));

    if (lieux.length === 0) {
      return new Response(JSON.stringify({ error: "no_lieux" }), { status: 400, headers: jsonHeaders });
    }
    if (!days) {
      return new Response(JSON.stringify({ error: "invalid_days" }), { status: 400, headers: jsonHeaders });
    }

    const knownLieuIds = new Set(lieux.map((l) => l.id));
    const knownVilleIds = new Set(lieux.map((l) => l.villeId));

    const system = [
      "Tu organises un itinéraire de voyage au Japon à partir d'une liste FERMÉE de lieux déjà choisis par l'utilisateur.",
      "Tu réponds TOUJOURS en appelant l'outil emit_itinerary — jamais de texte libre en dehors de l'outil.",
      "RÈGLE ABSOLUE : n'utilise QUE les IDs de lieu et de ville fournis dans la liste ci-dessous. N'invente, ne renomme et ne complète JAMAIS un lieu qui n'y figure pas.",
      "Regroupe les lieux par ville pour limiter les trajets. Choisis un ordre de villes cohérent géographiquement si plusieurs villes sont présentes.",
      `Répartis TOUS les lieux fournis sur exactement ${days} jour(s), en équilibrant la charge (ne surcharge pas un jour, n'en laisse pas un vide s'il reste des lieux à placer). Si un lieu a des coordonnées (lat/lng) proches d'un autre, tente de les mettre dans le même jour.`,
      "Pour chaque jour, écris un titre très court (1 phrase, en français) qui donne l'esprit de la journée (ex. \"Immersion dans le vieux Kyoto entre temples et bambouseraies\").",
      "",
      "Lieux disponibles (JSON) :",
      JSON.stringify(lieux),
    ].join("\n");

    let parsed: any = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        parsed = await callAnthropic(system, `Génère l'itinéraire sur ${days} jour(s).`);
      } catch (e) {
        lastErr = e;
      }
    }
    if (!parsed) {
      console.error("[itinerary-generate] échec appel Anthropic:", lastErr);
      return new Response(JSON.stringify({ error: "generation_unavailable" }), { status: 502, headers: jsonHeaders });
    }

    // ── Garde-fou serveur post-IA : jamais de lieu/ville hors catalogue reçu,
    // même si l'IA en a halluciné un ────────────────────────────────────────
    const villes = (Array.isArray(parsed.villes) ? parsed.villes : [])
      .filter((v: unknown) => typeof v === "string" && knownVilleIds.has(v));
    const jours = (Array.isArray(parsed.jours) ? parsed.jours : [])
      .map((j: any) => ({
        villeId: safeString(j?.villeId),
        titre: safeString(j?.titre).slice(0, 200),
        lieuIds: (Array.isArray(j?.lieuIds) ? j.lieuIds : []).filter((id: unknown) => typeof id === "string" && knownLieuIds.has(id)),
      }))
      .filter((j: any) => knownVilleIds.has(j.villeId) && j.lieuIds.length > 0);

    if (jours.length === 0) {
      return new Response(JSON.stringify({ error: "empty_itinerary" }), { status: 502, headers: jsonHeaders });
    }

    // ── Filet de sécurité qualité : si l'IA a oublié de placer un lieu
    // gardé (pas halluciné, juste omis), on ne le laisse pas disparaître en
    // silence — on le rattache au dernier jour de sa ville, ou au tout
    // dernier jour si sa ville n'apparaît dans aucun jour généré ─────────
    const placedLieuIds = new Set(jours.flatMap((j: any) => j.lieuIds));
    const missing = lieux.filter((l) => !placedLieuIds.has(l.id));
    for (const l of missing) {
      const target = [...jours].reverse().find((j: any) => j.villeId === l.villeId) || jours[jours.length - 1];
      target.lieuIds.push(l.id);
    }

    return new Response(JSON.stringify({ villes: villes.length ? villes : [...knownVilleIds], jours }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("[itinerary-generate] erreur inattendue:", e);
    return new Response(JSON.stringify({ error: "unexpected_error" }), { status: 500, headers: jsonHeaders });
  }
});
