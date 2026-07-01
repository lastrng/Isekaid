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
  if(!supabaseEnabled) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
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
