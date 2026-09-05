export const OFFLINE_PRIORITY = Object.freeze([
  "activeTrip", "tripDays", "savedPlaces", "checklist", "sos", "essentialPhrases", "contextualContent", "progress",
]);

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
