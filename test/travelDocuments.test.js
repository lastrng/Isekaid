import test from "node:test";
import assert from "node:assert/strict";
import { prepareTravelDocument, safeDocumentUrl, upsertTravelDocument } from "../src/features/travel/travelDocuments.js";
import { normalizeTrip } from "../src/features/travel/tripModel.js";
test("valide les références et rejette les liens exécutables ou avec identifiants", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "https://user:secret@example.com", "invalid"]) {
    assert.equal(safeDocumentUrl(url), "");
    assert.throws(() => prepareTravelDocument({ title: "Vol", url }, "d"));
  }
  assert.throws(() => prepareTravelDocument({ title: " " }, "d"));
  assert.throws(() => prepareTravelDocument({ title: "Vol", notes: "x".repeat(3001) }, "d"));
  assert.equal(prepareTravelDocument({ title: " Vol ", type: "unknown", url: "https://example.com" }, "d").type, "other");
});
test("conserve les anciens voyages et remplace uniquement la référence éditée", () => {
  const trip = { id: "trip", custom: 42, jours: [] };
  const document = prepareTravelDocument({ title: "Hôtel", reference: "ABC" }, "d");
  const updated = upsertTravelDocument(trip, document);
  assert.equal(trip.documents, undefined);
  assert.equal(updated.custom, 42);
  assert.deepEqual(normalizeTrip(updated).documents, [document]);
  assert.equal(upsertTravelDocument(updated, { ...document, title: "Ryokan" }).documents.length, 1);
  assert.equal(upsertTravelDocument(updated, { ...document, title: "Ryokan" }).documents[0].title, "Ryokan");
});
