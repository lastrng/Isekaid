import { syncProgress, rememberProgressBase } from "./services/sync/progressSync.js";
import { syncTripSnapshot } from "./services/sync/syncTripSnapshot.js";
import { mergeTripSnapshots } from "./services/sync/tripSnapshots.js";
import { withTripDeletions, recordTripDeletions, loadTripSyncBase, saveTripSyncBase, preserveTripConflict } from "./services/sync/tripSyncState.js";
import { readJson, writeJson } from "./lib/storage.js";
import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { normalizeSessionResponse } from "./services/auth/sessionModel.js";

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
    return normalizeSessionResponse(await supabase.auth.getSession());
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
  // Le profil ne doit pas recevoir les colonnes de voyages, suppressions ou
  // extensions ajoutées au schéma historique. Les voyages ont leur propre
  // lecture bornée dans fetchTrips().
  const { data, error } = await supabase.from("progress").select("profile,favorites,kana_progress,scenarios,path,mission,streak,unlocks,settings,updated_at").eq("user_id", userId).single();
  if(error) return null;
  if(!rememberProgressBase(userId,data)) return null;
  return data;
}
export async function saveProgress(userId, patch){
  if(!supabaseEnabled)return false;
  try {
    const merged=await syncProgress({userId,local:patch,
      read:async()=>{
        const {data,error}=await supabase.from("progress").select("profile,favorites,kana_progress,scenarios,path,mission,streak,unlocks,settings,updated_at").eq("user_id",userId).single();
        if(error)throw error;
        return data;
      },
      compareAndSet:async(version,snapshot)=>{
        let query=supabase.from("progress").update({...snapshot,updated_at:new Date(Math.max(Date.now(),(Date.parse(version)||0)+1)).toISOString()}).eq("user_id",userId);
        query=version===null?query.is("updated_at",null):query.eq("updated_at",version);
        const {data,error}=await query.select("user_id");
        if(error)throw error;
        return data?.length===1;
      },
    });
    if(!merged)return false;
    globalThis.window?.dispatchEvent(new CustomEvent("isekaid:progress-synced",{detail:{userId,submitted:patch,merged}}));
    return true;
  } catch { return false; }
}
export async function fetchTrips(userId){
  if(!supabaseEnabled) return null;
  const { data, error } = await supabase.from("progress").select("trips,trip_deletions").eq("user_id", userId).single();
  if(error || !data) return null;
  const snapshot=[...(data.trips||[]),...(data.trip_deletions||[])];
  recordTripDeletions(snapshot);
  return snapshot;
}
export async function saveTripsCloud(userId, trips){
  if(!supabaseEnabled) return false;
  try {
    const merged=await syncTripSnapshot({local:withTripDeletions(trips),base:loadTripSyncBase(userId),
      onConflict:trip=>preserveTripConflict(userId,trip),
      read:async()=>{
        const {data,error}=await supabase.from("progress").select("trips,trip_deletions,updated_at").eq("user_id",userId).single();
        if(error) throw error;
        return {...data,trips:[...(data.trips||[]),...(data.trip_deletions||[])]};
      },
      compareAndSet:async(version,next)=>{
        let query=supabase.from("progress").update({trips:next.filter(trip=>!trip.deletedAt),trip_deletions:next.filter(trip=>trip.deletedAt),updated_at:new Date(Math.max(Date.now(),(Date.parse(version)||0)+1)).toISOString()}).eq("user_id",userId);
        query=version===null?query.is("updated_at",null):query.eq("updated_at",version);
        const {data,error}=await query.select("user_id");
        if(error) throw error;
        return data?.length===1;
      },
    });
    if(!merged)return false;
    recordTripDeletions(merged);
    const current=withTripDeletions(readJson("isekaid_trips_v1",[]));
    const next=mergeTripSnapshots(current,merged,{base:trips,onConflict:trip=>preserveTripConflict(userId,trip)});
    if(!writeJson("isekaid_trips_v1",next))return false;
    if(!saveTripSyncBase(userId,merged))return false;
    globalThis.window?.dispatchEvent(new Event("isekaid:trips-synced"));
    return true;
  } catch { return false; }
}

function storageSegment(value){
  const segment=String(value||"").replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,120);
  if(!segment)throw new Error("invalid_storage_path");
  return segment;
}
export async function uploadMemoryPhoto(userId,{tripId,activityId,photoId,blob}){
  if(!supabaseEnabled || !userId || !(blob instanceof Blob)) throw new Error("photo_upload_unavailable");
  const path=`${storageSegment(userId)}/trips/${storageSegment(tripId)}/places/${storageSegment(activityId)}/${storageSegment(photoId)}.jpg`;
  const { error }=await supabase.storage.from("memory-photos").upload(path,blob,{contentType:"image/jpeg",upsert:false,cacheControl:"31536000"});
  if(error)throw new Error("photo_upload_failed",{cause:error});
  return path;
}
export async function createMemoryPhotoUrl(path){
  if(!supabaseEnabled || !path) return null;
  const {data,error}=await supabase.storage.from("memory-photos").createSignedUrl(path,3600);
  if(error)throw new Error("photo_read_failed",{cause:error});
  return data?.signedUrl||null;
}
export async function deleteMemoryPhoto(path){
  if(!supabaseEnabled || !path || path.startsWith("data:")) return true;
  const {error}=await supabase.storage.from("memory-photos").remove([path]);
  if(error)throw new Error("photo_delete_failed",{cause:error});
  return true;
}
export async function fetchCloudBackup(userId){
  if(!supabaseEnabled||!userId)return null;
  const {data,error}=await supabase.from("user_backups").select("payload,updated_at").eq("user_id",userId).maybeSingle();
  return error||!data ? null : data;
}
export async function saveCloudBackup(userId,payload){
  if(!supabaseEnabled||!userId||!payload)return false;
  const {error}=await supabase.from("user_backups").upsert({user_id:userId,payload,updated_at:new Date().toISOString()},{onConflict:"user_id"});
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

// ─── Découvertes Japon (Explorer) ──────────────────────────────────────────
// Ordre croissant (plus ancienne d'abord) : c'est aussi l'ordre de déblocage
// par streak, la 1ère générée se débloque au jour 1, etc. (voir
// ExploreDiscoveries.jsx / DISCOVERY_UNLOCK_DAYS).
export async function fetchExploreDiscoveries({ limit = 200 } = {}){
  if(!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from("explore_discoveries")
    .select("id, slug, category, title, subtitle, body, kanji, romaji, image_url, image_attribution, image_licence, image_source_url, published_at")
    .order("published_at", { ascending: true })
    .limit(limit);
  if(error){ console.warn("[supabase] fetchExploreDiscoveries:", error?.message); return []; }
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
// timeout : un accroc côté DB/PostgREST peut laisser la fonction pendre
// ~1min avant qu'un 500 générique n'arrive — on coupe avant, avec un
// message clair plutôt que de laisser l'UI muette sur "réfléchit…".
export async function sendTutorMessage({ message, scenarioId, niveau, conversationId, bridgeContext, journeyContext }){
  const { data, error } = await supabase.functions.invoke("tutor-chat", {
    body: { message, scenarioId, niveau, conversationId, bridgeContext, journeyContext },
    timeout: 25000,
  });
  if(error){
    let payload = null;
    try { payload = await error.context?.json?.(); } catch { /* réponse non-JSON ou déjà consommée */ }
    if(payload?.error === "limit_reached") return { limitReached: true, limit: payload.limit, period:payload.period };
    if(payload?.error === "premium_required") return { premiumRequired: true, limit: payload.limit };
    throw error;
  }
  return data;
}
// Invoque l'Edge Function itinerary-generate (Phase 4.4) : auto-génération
// d'itinéraire premium à partir de lieux du catalogue (favoris gardés, ou
// pool filtré par le parcours de questions — VoyageWizard). `lieux` = objets
// complets (catalogue statique client, japan-data.json) — le serveur ne fait
// qu'ordonnancer/regrouper, jamais de lookup ni d'invention de lieu. `rythme`
// est optionnel ("tranquille"|"equilibre"|"dense") et ignoré côté serveur si absent.
export async function sendItineraryGenerate({ lieux, days, rythme }){
  const { data, error } = await supabase.functions.invoke("itinerary-generate", {
    body: rythme ? { lieux, days, rythme } : { lieux, days },
    timeout: 30000,
  });
  if(error){
    let payload = null;
    try { payload = await error.context?.json?.(); } catch { /* réponse non-JSON ou déjà consommée */ }
    if(payload?.error === "premium_required") return { premiumRequired: true };
    if(payload?.error === "cost_limit") return { costLimit:true, quota:payload };
    throw error;
  }
  return data;
}
// carnet-render reçoit uniquement l'identifiant d'un voyage terminé. La fonction
// vérifie l'ownership, rassemble les souvenirs privés côté serveur et renvoie une
// URL signée temporaire vers le PDF privé (jamais du HTML fourni par le client).
// Invoque l'Edge Function redeem-premium-code : valide le code d'invitation
// côté serveur (jamais comparé en clair dans le bundle client) et, si valide,
// l'enregistre dans premium_grants — reconnu par itinerary-generate,
// tutor-chat et carnet-render au même titre qu'un abonnement RevenueCat.
export async function redeemPremiumCode(code){
  const { data, error } = await supabase.functions.invoke("redeem-premium-code", {
    body: { code },
    timeout: 15000,
  });
  if(error){
    let payload = null;
    try { payload = await error.context?.json?.(); } catch { /* réponse non-JSON ou déjà consommée */ }
    if(payload?.error === "invalid_code") return { ok:false, reason:"invalid_code" };
    return { ok:false, reason:"error" };
  }
  return { ok: !!data?.ok };
}

export async function sendCarnetRender({tripId,force=false}){
  const { data, error } = await supabase.functions.invoke("carnet-render", {
    body: { tripId, ...(force?{force:true}:{}) },
    timeout: 90000,
  });
  if(error){
    let payload = null;
    try { payload = await error.context?.json?.(); } catch { /* réponse non-JSON ou déjà consommée */ }
    if(payload?.error === "premium_required") return { premiumRequired: true };
    const known=payload?.error;
    if(known) throw new Error(known,{cause:error});
    throw error;
  }
  return data;
}

/** Supprime définitivement l'utilisateur authentifié et ses données liées. */
export async function deleteRemoteAccount(){
  if(!supabaseEnabled) return { ok:true, localOnly:true };
  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: {},
    timeout: 15000,
  });
  if(error) throw error;
  const ok=data?.ok === true;
  if(ok){
    // La fonction distante a déjà révoqué les sessions. Le scope local force
    // ici la suppression immédiate du JWT persisté par supabase-js, même si
    // l'identité distante n'existe déjà plus (les 401/404 sont tolérés par le SDK).
    const {error:signOutError}=await supabase.auth.signOut({scope:"local"});
    if(signOutError) console.warn("[supabase] purge de session locale incomplète:",signOutError.message);
  }
  return { ok };
}
