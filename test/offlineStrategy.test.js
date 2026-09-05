import test from "node:test";
import assert from "node:assert/strict";
import { getOfflineCapabilities, OFFLINE_PRIORITY, summarizeOfflineSync } from "../src/services/sync/offlineStrategy.js";

test("décrit les capacités critiques à partir des données réellement présentes", () => {
  const result = getOfflineCapabilities({ trip: { checklist: [] }, days: [{}], sos: ["lost"], essentialPhrases: [], contextualContent: [{ id: "tip" }], progress: {} });
  assert.deepEqual(OFFLINE_PRIORITY.slice(0, 4), ["activeTrip", "tripDays", "savedPlaces", "checklist"]);
  assert.equal(result.activeTrip, true); assert.equal(result.tripDays, true); assert.equal(result.savedPlaces, false); assert.equal(result.checklist, true); assert.equal(result.sos, true); assert.equal(result.contextualContent, true); assert.equal(result.progress, true);
});

test("expose l'état de synchronisation sans masquer une file en attente", () => {
  assert.equal(summarizeOfflineSync({ online: false, pending: 2 }).state, "offline");
  assert.equal(summarizeOfflineSync({ online: true, pending: 1 }).state, "pending");
  assert.equal(summarizeOfflineSync({ online: true, error: true }).state, "error");
  assert.equal(summarizeOfflineSync({ online: true, lastSyncedAt: "2026-09-05T10:00:00Z" }).label, "Données synchronisées");
});
