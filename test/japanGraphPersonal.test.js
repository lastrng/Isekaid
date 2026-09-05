import test from "node:test";
import assert from "node:assert/strict";
import { buildJapanGraph, relatedToActivity } from "../src/entities/content/japanGraph.js";

test("relie un voyage et un souvenir au lieu visité sans modifier les données", () => {
  const trip = { id: "trip-1", titre: "Kyoto", jours: [{ num: 1, villeId: "kyoto", activites: [{ id: "activity-1", lieuId: "fushimi", fait: true, note: "Très tôt le matin" }] }] };
  const db = { lieux: [{ id: "fushimi", nom: "Fushimi Inari", villeId: "kyoto", interets: ["culture"] }], villes: [{ id: "kyoto", nom: "Kyoto", region: "Kansai" }], regions: [{ id: "kansai", nom: "Kansai" }], histoire: [{ id: "heian", titre: "Période Heian" }] };
  const before = JSON.stringify(trip);
  const graph = buildJapanGraph(db, { trips: [trip] });
  const personal = relatedToActivity(db.lieux[0], graph, { purpose: "personal", limit: 10 });
  assert.ok(personal.some(node => node.kind === "trip" && node.reason === "Lié à ce lieu"));
  assert.ok(personal.some(node => node.kind === "memory" && node.reason === "Lié à ce lieu"));
  assert.equal(JSON.stringify(trip), before);
  assert.ok(buildJapanGraph(db).some(node => node.id === "history:heian"));
});

test("respecte une relation éditoriale explicite et expose ses métadonnées", () => {
  const place = { id: "p", nom: "Lieu", relatedContent: ["history:edo"], tags: ["quartier"], relations: ["history:edo"] };
  const graph = buildJapanGraph({ lieux: [place], histoire: [{ id: "edo", titre: "Époque Edo", tags: ["histoire"] }] });
  const result = relatedToActivity(place, graph, { purpose: "explore", limit: 10 });
  assert.equal(result[0].id, "history:edo");
  assert.equal(result[0].reason, "Lié à ce lieu");
  assert.deepEqual(result[0].tags, ["histoire"]);
  assert.deepEqual(result[0].relations, []);
});
