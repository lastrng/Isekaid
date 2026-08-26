// ─────────────────────────────────────────────────────────────────────────────
// redeem-premium-code — Valide un code d'invitation Premium et l'enregistre
// en base (table premium_grants), pour que les autres Edge Functions gating
// (itinerary-generate, tutor-chat, carnet-render) reconnaissent ce statut.
//
// Avant cette fonction, le code était comparé côté client (App.jsx,
// ACCESS_CODE) : visible en clair dans le bundle JS/APK, et le statut
// "Premium" qui en résultait n'existait qu'en localStorage — invisible pour
// les fonctions gating qui ne vérifient que RevenueCat (fail-closed). Ici :
//   1. vérifier le JWT,
//   2. comparer le code au secret PREMIUM_ACCESS_CODE (jamais exposé au
//      client),
//   3. si valide, upsert premium_grants via service_role (la table n'accorde
//      aucun droit d'écriture à "authenticated", précisément pour empêcher
//      qu'un client s'auto-déclare Premium sans passer par ce contrôle).
//
// PREMIUM_ACCESS_CODE ne quitte jamais cette fonction.
// ─────────────────────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PREMIUM_ACCESS_CODE = Deno.env.get("PREMIUM_ACCESS_CODE") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Fourni automatiquement par le runtime Supabase Edge Functions, jamais défini
// manuellement — seule cette clé peut écrire dans premium_grants (RLS sans
// policy insert pour authenticated).
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function safeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    if (!PREMIUM_ACCESS_CODE || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500, headers: jsonHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const code = safeString(body?.code).trim().toUpperCase();
    if (!code) {
      return new Response(JSON.stringify({ error: "missing_code" }), { status: 400, headers: jsonHeaders });
    }
    if (code !== PREMIUM_ACCESS_CODE.trim().toUpperCase()) {
      return new Response(JSON.stringify({ error: "invalid_code" }), { status: 400, headers: jsonHeaders });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upsertErr } = await admin
      .from("premium_grants")
      .upsert({ user_id: userId, source: "access_code" }, { onConflict: "user_id" });
    if (upsertErr) {
      console.error("[redeem-premium-code] échec upsert premium_grants:", upsertErr);
      return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    console.error("[redeem-premium-code] erreur inattendue:", e);
    return new Response(JSON.stringify({ error: "unexpected_error" }), { status: 500, headers: jsonHeaders });
  }
});
