// src/supabase.js — client Supabase + helpers d'authentification et de progression
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si les variables manquent (ex. preview local sans .env), l'app reste en mode local.
export const supabaseEnabled = Boolean(URL && ANON);
export const supabase = supabaseEnabled ? createClient(URL, ANON) : null;

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signUpEmail(email, password){
  return supabase.auth.signUp({ email, password });
}
export async function signInEmail(email, password){
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signInGoogle(){
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
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

// ── Progression (cloud) ─────────────────────────────────────────────────────────
export async function fetchProgress(userId){
  const { data, error } = await supabase
    .from("progress").select("*").eq("user_id", userId).single();
  if(error) return null;
  return data;
}
export async function saveProgress(userId, patch){
  const { error } = await supabase
    .from("progress")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return !error;
}

// ── Voyages (cloud) ─────────────────────────────────────────────────────────
// Les voyages sont stockés dans la colonne JSONB `trips` de la table progress.
export async function fetchTrips(userId){
  if(!supabaseEnabled) return null;
  const { data, error } = await supabase
    .from("progress").select("trips").eq("user_id", userId).single();
  if(error || !data) return null;
  return data.trips || null;
}
export async function saveTripsCloud(userId, trips){
  if(!supabaseEnabled) return false;
  const { error } = await supabase
    .from("progress")
    .update({ trips, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return !error;
}