import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(URL && ANON);
export const supabase = supabaseEnabled
  ? createClient(URL, ANON, {
      auth: { detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
    })
  : null;

const isNative = Capacitor.isNativePlatform();
const APP_SCHEME = "app.isekaid://login-callback";

export async function signUpEmail(email, password){
  return supabase.auth.signUp({ email, password });
}
export async function signInEmail(email, password){
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signInGoogle(){
  if(!supabaseEnabled) return;
  if(isNative){
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: APP_SCHEME, skipBrowserRedirect: true },
    });
    if(error || !data?.url) throw new Error(error?.message || "URL OAuth manquante");
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url, windowName: "_self", presentationStyle: "popover" });
  } else {
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }
}
export async function signOut(){
  return supabase.auth.signOut();
}
export async function getSession(){
  if(!supabaseEnabled) return { session: null, error: null };
  try {
    const { data } = await supabase.auth.getSession();
    return { session: data.session, error: null };
  } catch (e) {
    // Hors ligne (ou refresh du token impossible) : on ne bloque jamais l'appelant.
    console.warn("[supabase] getSession a échoué (probablement hors ligne):", e?.message);
    return { session: null, error: e };
  }
}
export function onAuthChange(cb){
  if(!supabaseEnabled) return { unsubscribe(){} };
  const { data } = supabase.auth.onAuthStateChange((_e, session)=> cb(session));
  return data.subscription;
}
export async function handleOAuthCallback(url){
  if(!supabaseEnabled) return null;
  try {
    try { const { Browser } = await import("@capacitor/browser"); await Browser.close(); } catch {}
    const urlObj = new window.URL(url);
    const code = urlObj.searchParams.get("code");
    if(code){
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if(error) throw error;
      return data.session;
    }
    const hashParams = new URLSearchParams(urlObj.hash.replace("#", ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if(accessToken){
      const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || "" });
      if(error) throw error;
      return data.session;
    }
    return null;
  } catch(e){
    console.warn("[supabase] handleOAuthCallback échoué:", e?.message);
    return null;
  }
}
export async function fetchProgress(userId){
  const { data, error } = await supabase.from("progress").select("*").eq("user_id", userId).single();
  if(error) return null;
  return data;
}
export async function saveProgress(userId, patch){
  const { error } = await supabase.from("progress").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", userId);
  return !error;
}
export async function fetchTrips(userId){
  if(!supabaseEnabled) return null;
  const { data, error } = await supabase.from("progress").select("trips").eq("user_id", userId).single();
  if(error || !data) return null;
  return data.trips || null;
}
export async function saveTripsCloud(userId, trips){
  if(!supabaseEnabled) return false;
  const { error } = await supabase.from("progress").update({ trips, updated_at: new Date().toISOString() }).eq("user_id", userId);
  return !error;
}

export async function fetchDailyFeed({ limit = 50 } = {}){
  if(!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from("app_feed")
    .select("id, created_at, theme, title, subtitle, body, kanji, romaji, image_url, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);
  if(error){ console.warn("[supabase] fetchDailyFeed:", error?.message); return []; }
  return data || [];
}

// ─── Tuteur conversationnel (Phase 3) ──────────────────────────────────────
export async function fetchTutorConversations(userId){
  if(!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from("tutor_conversations")
    .select("id, scenario, titre, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if(error){ console.warn("[supabase] fetchTutorConversations:", error?.message); return []; }
  return data || [];
}
export async function fetchTutorMessages(conversationId){
  if(!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from("tutor_messages")
    .select("id, role, content_jp, content_fr, romaji, correction, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if(error){ console.warn("[supabase] fetchTutorMessages:", error?.message); return []; }
  return data || [];
}
// Invoque l'Edge Function tutor-chat. Le JWT de la session courante est
// ajouté automatiquement par le client Supabase authentifié.
export async function sendTutorMessage({ message, scenarioId, niveau, conversationId }){
  const { data, error } = await supabase.functions.invoke("tutor-chat", {
    body: { message, scenarioId, niveau, conversationId },
  });
  if(error){
    let payload = null;
    try { payload = await error.context?.json?.(); } catch { /* réponse non-JSON ou déjà consommée */ }
    if(payload?.error === "limit_reached") return { limitReached: true, limit: payload.limit };
    throw error;
  }
  return data;
}
