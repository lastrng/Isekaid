import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { removeAccountMemoryPhotos } from "./memory-cleanup.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!authHeader || !url || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const authenticated = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await authenticated.auth.getUser(token);
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    // Les lignes SQL sont supprimées par leurs FK ON DELETE CASCADE, mais les
    // objets Storage ne le sont pas. Nettoyer le dossier privé avant l'identité
    // évite de conserver des souvenirs après une suppression de compte.
    try {
      await removeAccountMemoryPhotos(admin.storage, data.user.id);
    } catch (storageError) {
      console.error("[delete-account] suppression photos impossible:", storageError);
      return new Response(JSON.stringify({ error: "storage_delete_failed" }), { status: 500, headers });
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
    if (deleteError) {
      console.error("[delete-account] suppression impossible:", deleteError);
      return new Response(JSON.stringify({ error: "delete_failed" }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (error) {
    console.error("[delete-account] erreur inattendue:", error);
    return new Response(JSON.stringify({ error: "unexpected_error" }), { status: 500, headers });
  }
});
