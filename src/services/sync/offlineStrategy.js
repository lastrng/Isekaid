import { readJson, writeJson } from "../../lib/storage.js";

export const OFFLINE_PRIORITY = Object.freeze([
  "activeTrip", "tripDays", "savedPlaces", "checklist", "sos", "essentialPhrases", "contextualContent", "progress",
]);

const OFFLINE_CONTENT_KEY = "isekaid_offline_content_v1";

/** Cache local des ressources critiques déjà connues, sans appel réseau. */
export function cacheCriticalOfflineData({ daily = null, activeTrip = null, tripDays = [], savedPlaces = [], checklist = [], progress = null, sos = [], essentialPhrases = [], contextualContent = [] } = {}) {
  const payload = {
    version: 1,
    cachedAt: new Date().toISOString(),
    daily,
    activeTrip,
    tripDays: Array.isArray(tripDays) ? tripDays : [],
    savedPlaces: Array.isArray(savedPlaces) ? savedPlaces : [],
    checklist: Array.isArray(checklist) ? checklist : [],
    progress: progress && typeof progress === "object" ? progress : null,
    sos: Array.isArray(sos) ? sos : [],
    essentialPhrases: Array.isArray(essentialPhrases) ? essentialPhrases.slice(0, 24) : [],
    contextualContent: Array.isArray(contextualContent) ? contextualContent.slice(0, 24) : [],
  };
  return writeJson(OFFLINE_CONTENT_KEY, payload);
}

export function loadCriticalOfflineData() {
  return readJson(OFFLINE_CONTENT_KEY, null);
}

export function hasCriticalOfflineData(data = loadCriticalOfflineData()) {
  return Boolean(data?.version === 1 && data?.daily?.activities?.length && data?.sos?.length && data?.essentialPhrases?.length);
}

export function getCachedOfflineTravel(data = loadCriticalOfflineData()) {
  return {
    trip: data?.activeTrip || null,
    days: Array.isArray(data?.tripDays) ? data.tripDays : [],
    places: Array.isArray(data?.savedPlaces) ? data.savedPlaces : [],
    checklist: Array.isArray(data?.checklist) ? data.checklist : [],
  };
}

/** Décrit les capacités locales sans inspecter le réseau ni lancer de synchronisation. */
export function getOfflineCapabilities({ trip = null, days = [], savedPlaces = [], sos = [], essentialPhrases = [], contextualContent = [], progress = null } = {}) {
  return {
    activeTrip: Boolean(trip),
    tripDays: Array.isArray(days) && days.length > 0,
    savedPlaces: Array.isArray(savedPlaces) && savedPlaces.length > 0,
    checklist: Boolean(trip && Array.isArray(trip.checklist)),
    sos: Array.isArray(sos) && sos.length > 0,
    essentialPhrases: Array.isArray(essentialPhrases) && essentialPhrases.length > 0,
    contextualContent: Array.isArray(contextualContent) && contextualContent.length > 0,
    progress: Boolean(progress && typeof progress === "object"),
  };
}

export function summarizeOfflineSync({ online = true, pending = 0, lastSyncedAt = null, error = false } = {}) {
  if (error) return { state: "error", label: "Synchronisation à reprendre", pending, lastSyncedAt };
  if (!online) return { state: "offline", label: pending ? `${pending} modification${pending > 1 ? "s" : ""} en attente` : "Hors connexion", pending, lastSyncedAt };
  if (pending) return { state: "pending", label: `${pending} modification${pending > 1 ? "s" : ""} à synchroniser`, pending, lastSyncedAt };
  return { state: "synced", label: lastSyncedAt ? "Données synchronisées" : "Données conservées sur cet appareil", pending: 0, lastSyncedAt };
}

export { OFFLINE_CONTENT_KEY };
