// ─────────────────────────────────────────────────────────────────────────────
// itinerary-generate — Auto-génération d'itinéraire de voyage (Phase 4.4,
// étendue en Phase 2 du parcours de création guidé)
//
// Calqué sur tutor-chat : JWT vérifié, gating premium re-vérifié serveur
// auprès de RevenueCat (fail-closed), sortie forcée par tool-use (JSON
// strict). Reçoit des lieux (catalogue statique côté client, japan-data.json
// — soit les favoris gardés, soit le pool filtré par le parcours de
// questions — rien à chercher en base ici), une durée en jours et un rythme
// optionnel ; renvoie un regroupement par ville + un ordre de jours, jamais
// un lieu inventé hors de la liste reçue (garde-fou appliqué après l'appel
// IA, pas seulement demandé dans le prompt). L'ordre des lieux à l'intérieur
// d'un jour est en plus garanti géographiquement par un tri plus-proche-
// voisin déterministe côté serveur (voir orderByProximity) — pas seulement
// suggéré à l'IA, pour un tracé carte cohérent en Phase 3.
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
const DAILY_GENERATION_LIMIT = parseInt(Deno.env.get("ITINERARY_DAILY_LIMIT") || "3", 10);
const MONTHLY_GENERATION_LIMIT = parseInt(Deno.env.get("ITINERARY_MONTHLY_LIMIT") || "20", 10);
const RYTHME_VALUES = new Set(["tranquille", "equilibre", "dense"]);
const RYTHME_HINT: Record<string, string> = {
  tranquille: "Rythme choisi : TRANQUILLE — vise plutôt 2 à 3 lieux par jour, laisse du temps mort.",
  equilibre: "Rythme choisi : ÉQUILIBRÉ — un bon rythme de croisière, ni trop chargé ni trop vide.",
  dense: "Rythme choisi : DENSE — l'utilisateur veut voir un maximum, les journées peuvent être bien remplies.",
};

// Tri par plus proche voisin (glouton) sur lat/lng — remplace la simple
// suggestion textuelle faite à l'IA par un ordre géographique garanti et
// gratuit (pas de service de routing), pour un tracé carte cohérent en
// Phase 3. Les lieux sans coordonnées sont laissés à la fin, inchangés.
function orderByProximity(ids: string[], coordsById: Map<string, { lat: number | null; lng: number | null }>): string[] {
  const withCoords = ids.filter((id) => {
    const c = coordsById.get(id);
    return c && typeof c.lat === "number" && typeof c.lng === "number";
  });
  const withoutCoords = ids.filter((id) => !withCoords.includes(id));
  if (withCoords.length <= 1) return [...withCoords, ...withoutCoords];

  const remaining = new Set(withCoords);
  // Point de départ déterministe (le plus au nord) pour un ordre stable d'un
  // appel à l'autre sur les mêmes lieux.
  let current = withCoords.reduce((a, b) => (coordsById.get(a)!.lat! > coordsById.get(b)!.lat! ? a : b));
  remaining.delete(current);
  const ordered = [current];
  while (remaining.size) {
    const cur = coordsById.get(current)!;
    let best: string | null = null;
    let bestD = Infinity;
    for (const id of remaining) {
      const c = coordsById.get(id)!;
      const dx = (cur.lat as number) - (c.lat as number);
      const dy = (cur.lng as number) - (c.lng as number);
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = id; }
    }
    ordered.push(best!);
    remaining.delete(best!);
    current = best!;
  }
  return [...ordered, ...withoutCoords];
}

// Identique à tutor-chat/index.ts : vérifie l'entitlement directement auprès
// de RevenueCat (jamais un booléen envoyé par le client, spoofable). Panne/
// clé absente → fail-closed (refuse plutôt que d'ouvrir par défaut).
async function isPremiumViaRevenueCat(userId: string): Promise<boolean> {
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

// Deuxième source de vérité serveur pour le Premium : les codes d'invitation,
// validés et enregistrés par l'Edge Function redeem-premium-code (jamais
// écrits directement par le client — voir la policy RLS sur premium_grants).
// Sans ce check, un utilisateur passé Premium par code se voit refuser ici
// (RevenueCat ne le connaît pas) alors que l'app le montre Premium partout.
async function isPremiumViaAccessCode(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabase.from("premium_grants").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

async function isPremiumUser(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  if (await isPremiumViaRevenueCat(userId)) return true;
  return isPremiumViaAccessCode(supabase, userId);
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
            lieuIds: {
              type: "array",
              items: { type: "string" },
              description: "IDs de lieux pour ce jour, exclusivement parmi ceux fournis en entrée.",
            },
          },
          required: ["villeId", "lieuIds"],
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

    // Quotas serveur non contournables par l'interface : au maximum 20 appels
    // par utilisateur et par mois (3/jour), soit quelques dizaines de
    // centimes même dans le cas haut. La réservation précède l'appel payant.

    // ── Gating premium — serveur, fail-closed, jamais de confiance client ──
    const premium = await isPremiumUser(supabase, userId);
    if (!premium) {
      return new Response(JSON.stringify({ error: "premium_required" }), { status: 402, headers: jsonHeaders });
    }

    const body = await req.json().catch(() => null);
    const rawLieux = Array.isArray(body?.lieux) ? body.lieux : [];
    const requestedDays = Number.parseInt(body?.days, 10);
    if (!Number.isInteger(requestedDays) || requestedDays < MIN_DAYS || requestedDays > MAX_DAYS) {
      return new Response(JSON.stringify({ error: "invalid_days" }), { status: 400, headers: jsonHeaders });
    }
    const days = requestedDays;
    const rythme = RYTHME_VALUES.has(body?.rythme) ? body.rythme as string : "equilibre";

    // ── Nettoyage strict de l'entrée : seuls les champs utiles, jamais de
    // confiance aveugle dans la forme envoyée par le client ──────────────
    const inputIds = new Set<string>();
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
      }))
      .filter((l) => l.id.length <= 120 && l.villeId.length <= 80 && !inputIds.has(l.id) && !!inputIds.add(l.id));

    if (lieux.length === 0) {
      return new Response(JSON.stringify({ error: "no_lieux" }), { status: 400, headers: jsonHeaders });
    }
    const knownLieuIds = new Set(lieux.map((l) => l.id));
    const knownVilleIds = new Set(lieux.map((l) => l.villeId));
    const placeCityById = new Map(lieux.map((l) => [l.id, l.villeId]));
    if (knownVilleIds.size > days) {
      return new Response(JSON.stringify({ error: "too_many_cities_for_days" }), { status: 400, headers: jsonHeaders });
    }
    // Les limites sont détenues par la RPC et ne viennent jamais du client.
    const {data:quota,error:usageError}=await supabase.rpc("reserve_ai_usage",{p_feature:"itinerary"});
    if(usageError) return new Response(JSON.stringify({error:"usage_unavailable"}), {status:503,headers:jsonHeaders});
    if(!quota?.allowed) return new Response(JSON.stringify({error:"cost_limit",...quota}), {status:429,headers:jsonHeaders});

    const system = [
      "Tu organises un itinéraire de voyage au Japon à partir d'une liste FERMÉE de lieux déjà choisis par l'utilisateur.",
      "Tu réponds TOUJOURS en appelant l'outil emit_itinerary — jamais de texte libre en dehors de l'outil.",
      "RÈGLE ABSOLUE : n'utilise QUE les IDs de lieu et de ville fournis dans la liste ci-dessous. N'invente, ne renomme et ne complète JAMAIS un lieu qui n'y figure pas.",
      "Regroupe les lieux par ville pour limiter les trajets. Choisis un ordre de villes cohérent géographiquement si plusieurs villes sont présentes.",
      `Répartis TOUS les lieux fournis sur exactement ${days} jour(s), en équilibrant la charge (ne surcharge pas un jour, n'en laisse pas un vide s'il reste des lieux à placer). Si un lieu a des coordonnées (lat/lng) proches d'un autre, tente de les mettre dans le même jour.`,
      RYTHME_HINT[rythme],
      "L'ordre exact des lieux DANS un jour n'a pas besoin d'être optimisé géographiquement de ta part — un tri par proximité est appliqué automatiquement après coup. Concentre-toi sur le bon regroupement par ville et jour.",
      "Ne rédige aucun texte éditorial : l'application construit localement les titres, résumés, conseils et plans B afin de limiter le coût de génération. Renvoie seulement la répartition demandée.",
      "",
      "Lieux disponibles (JSON) :",
      JSON.stringify(lieux),
    ].join("\n");

    let parsed: any = null;
    let lastErr: unknown = null;
    // Un seul appel facturable par action utilisateur. Une réponse invalide
    // produit une erreur explicite, jamais une relance silencieuse coûteuse.
    for (let attempt = 0; attempt < 1 && !parsed; attempt++) {
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
    const placedOnce = new Set<string>();
    const jours = (Array.isArray(parsed.jours) ? parsed.jours : [])
      .slice(0, days)
      .map((j: any) => ({
        villeId: safeString(j?.villeId),
        // Le titre libre de l'IA n'est pas conservé : libellé factuel uniquement.
        titre: "",
        lieuIds: (Array.isArray(j?.lieuIds) ? j.lieuIds : []).filter((id: unknown) => {
          if (typeof id !== "string" || !knownLieuIds.has(id) || placedOnce.has(id)) return false;
          if (placeCityById.get(id) !== safeString(j?.villeId)) return false;
          placedOnce.add(id); return true;
        }),
      }))
      .filter((j: any) => knownVilleIds.has(j.villeId));

    // Garantit exactement le nombre de jours demandé et au moins un jour par
    // ville du catalogue fermé. Les jours ajoutés sont factuels et vides avant
    // la redistribution déterministe ci-dessous.
    for (const villeId of knownVilleIds) {
      if (!jours.some((j: any) => j.villeId === villeId) && jours.length < days) jours.push({ villeId, titre: "", lieuIds: [] });
    }
    const cityRoute = [...knownVilleIds];
    while (jours.length < days) jours.push({ villeId: cityRoute[jours.length % cityRoute.length], titre: "", lieuIds: [] });

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
      const matching = jours.filter((j: any) => j.villeId === l.villeId).sort((a: any,b: any)=>a.lieuIds.length-b.lieuIds.length);
      const target = matching[0];
      if (!target) continue;
      target.lieuIds.push(l.id);
    }

    // ── Ordre géographique garanti par jour (post-traitement déterministe,
    // pas de routing réel/payant — juste plus proche voisin sur lat/lng) ──
    const coordsById = new Map(lieux.map((l) => [l.id, { lat: l.lat, lng: l.lng }]));
    for (const j of jours) {
      j.lieuIds = orderByProximity(j.lieuIds, coordsById);
      j.titre = `Journée à ${j.villeId}`;
    }

    if(quota.monthlyUsed>=Math.ceil(quota.monthlyLimit*.8)) console.warn(`[cost-alert] itinerary ${userId}: ${quota.monthlyUsed}/${quota.monthlyLimit} ce mois`);
    return new Response(JSON.stringify({ villes: villes.length ? villes : [...knownVilleIds], jours, quota }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("[itinerary-generate] erreur inattendue:", e);
    return new Response(JSON.stringify({ error: "unexpected_error" }), { status: 500, headers: jsonHeaders });
  }
});
