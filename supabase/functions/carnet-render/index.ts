// ─────────────────────────────────────────────────────────────────────────────
// carnet-render — Rendu PDF du carnet de voyage illustré
//
// Fonction volontairement fine, contrairement à tutor-chat/itinerary-generate :
// aucun appel IA ici. Le HTML final est déjà entièrement assemblé côté client
// (voir src/carnet.js, buildCarnetHTML) — cette fonction se contente de :
//   1. vérifier le JWT,
//   2. re-vérifier le premium auprès de RevenueCat (fail-closed, même patron
//      que isPremiumUser dans itinerary-generate/index.ts),
//   3. transmettre le HTML au microservice weasyprint hébergé sur le VPS
//      (jamais exposé au client — URL et jeton restent des secrets serveur),
//   4. streamer les octets PDF renvoyés tels quels au client.
//
// CARNET_RENDER_URL / CARNET_RENDER_TOKEN ne quittent jamais cette fonction.
// ─────────────────────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REVENUECAT_SECRET_KEY = Deno.env.get("REVENUECAT_SECRET_KEY") ?? "";
const REVENUECAT_ENTITLEMENT_ID = Deno.env.get("REVENUECAT_ENTITLEMENT_ID") || "premium";
const CARNET_RENDER_URL = Deno.env.get("CARNET_RENDER_URL") ?? "";
const CARNET_RENDER_TOKEN = Deno.env.get("CARNET_RENDER_TOKEN") ?? "";

const MAX_HTML_BYTES = 3 * 1024 * 1024; // 3 Mo — large mais fini, anti-abus payload

// Identique à isPremiumUser dans itinerary-generate/index.ts.
async function isPremiumUser(userId: string): Promise<boolean> {
  if (!REVENUECAT_SECRET_KEY) {
    console.error("[carnet-render] REVENUECAT_SECRET_KEY absente — impossible de vérifier le premium, on refuse.");
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
    console.error("[carnet-render] vérification RevenueCat échouée:", e);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    if (!CARNET_RENDER_URL || !CARNET_RENDER_TOKEN) {
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
    const html = typeof body?.html === "string" ? body.html : "";
    if (!html) {
      return new Response(JSON.stringify({ error: "missing_html" }), { status: 400, headers: jsonHeaders });
    }
    if (new TextEncoder().encode(html).length > MAX_HTML_BYTES) {
      return new Response(JSON.stringify({ error: "html_too_large" }), { status: 413, headers: jsonHeaders });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    let renderRes: Response;
    try {
      renderRes = await fetch(CARNET_RENDER_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${CARNET_RENDER_TOKEN}`,
        },
        body: JSON.stringify({ html }),
        signal: controller.signal,
      });
    } catch (e) {
      console.error("[carnet-render] appel microservice weasyprint échoué:", e);
      return new Response(JSON.stringify({ error: "render_unavailable" }), { status: 502, headers: jsonHeaders });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!renderRes.ok) {
      const text = await renderRes.text().catch(() => "");
      console.error(`[carnet-render] microservice a répondu ${renderRes.status}:`, text.slice(0, 300));
      return new Response(JSON.stringify({ error: "render_failed" }), { status: 502, headers: jsonHeaders });
    }

    const pdfBytes = await renderRes.arrayBuffer();
    return new Response(pdfBytes, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/pdf" },
    });
  } catch (e) {
    console.error("[carnet-render] erreur inattendue:", e);
    return new Response(JSON.stringify({ error: "unexpected_error" }), { status: 500, headers: jsonHeaders });
  }
});
