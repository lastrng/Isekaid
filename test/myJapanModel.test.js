import assert from "node:assert/strict";
import test from "node:test";
import { buildMyJapanSummary } from "../src/features/my-japan/myJapanModel.js";

test("ne considère comme visités que les lieux explicitement terminés", () => {
  const summary=buildMyJapanSummary({currentDate:new Date(2026,8,5),cities:[{id:"tokyo",nom:"Tokyo",region:"Kantō",emoji:"🗼"}],places:[{id:"senso",nom:"Sensō-ji",emoji:"⛩️"}],trips:[{id:"trip1",titre:"Tokyo",dateDebut:"2026-08-01",jours:[{villeId:"tokyo",activites:[{lieuId:"senso",fait:true,note:"Très tôt"},{lieuId:"ueno",fait:false}]}]}]});
  assert.equal(summary.completedTrips,1);
  assert.equal(summary.completedDays,1);
  assert.equal(summary.visitedPlaces,1);
  assert.deepEqual(summary.placeIds,["senso"]);
  assert.equal(summary.stamps.find(stamp=>stamp.type==="city").label,"Tokyo Stamp");
  assert.equal(summary.stamps.find(stamp=>stamp.type==="city").unlockedBy,"place_or_day_completed");
  assert.equal(summary.stamps.find(stamp=>stamp.type==="region").label,"Kantō Stamp");
  assert.equal(summary.stamps.find(stamp=>stamp.type==="trip").unlockedBy,"trip_completed");
  assert.equal(summary.completedTripDetails[0].places[0].name,"Sensō-ji");
  assert.equal(summary.completedTripDetails[0].notes,1);
  assert.equal(summary.memories[0].note,"Très tôt");
  assert.equal(summary.memories[0].placeName,"Sensō-ji");
  assert.equal(summary.collections.find(c=>c.id==="places").count,1);
});

test("un voyage passé ne prouve pas à lui seul qu’une ville a été visitée", () => {
  const summary=buildMyJapanSummary({currentDate:new Date(2026,8,5),cities:[{id:"kyoto",region:"Kansai"}],trips:[{dateDebut:"2026-08-01",jours:[{villeId:"kyoto",activites:[]}]}]});
  assert.equal(summary.completedTrips,0);
  assert.equal(summary.awaitingConfirmation.length,1);
  assert.equal(summary.visitedCities,0);
  assert.equal(summary.stamps.length,0);
});

test("un voyage annulé ne contribue jamais au passeport",()=>{
  const summary=buildMyJapanSummary({cities:[{id:"tokyo",region:"Kantō"}],trips:[{status:"cancelled",jours:[{villeId:"tokyo",activites:[{lieuId:"senso",fait:true}]}]}]});
  assert.equal(summary.visitedPlaces,0); assert.equal(summary.visitedCities,0); assert.equal(summary.stamps.length,0);
});

test("les jours exigent une activité effectuée et les régions utilisent leur catalogue",()=>{
  const summary=buildMyJapanSummary({regionsCatalog:[{id:"kanto"},{id:"kansai"}],trips:[{status:"completed",jours:[{activites:[{fait:true}]},{activites:[]}]}]});
  assert.equal(summary.completedDays,1);
  assert.equal(summary.collections.find(item=>item.id==="regions").total,2);
});

test("calcule les jours au Japon uniquement pour les voyages datés et garde les préfectures inconnues", () => {
  const dated = buildMyJapanSummary({ currentDate: new Date("2026-09-05"), cities: [{ id: "tokyo", nom: "Tokyo", region: "Kantō", prefecture: "Tokyo" }], trips: [{ status: "completed", dateDebut: "2026-08-01", dateFin: "2026-08-05", jours: [{ villeId: "tokyo", activites: [{ lieuId: "x", fait: true }] }] }], expressionProgress: { hello: { learned: true }, bye: { learned: false } } });
  assert.equal(dated.daysInJapan, 5);
  assert.equal(dated.daysInJapanKnown, true);
  assert.equal(dated.visitedPrefectures, 1);
  assert.deepEqual(dated.prefectureNames, ["Tokyo"]);
  assert.equal(dated.learnedExpressions, 1);
  const unknown = buildMyJapanSummary({ currentDate: new Date("2026-09-05"), cities: [{ id: "kyoto", nom: "Kyoto", region: "Kansai" }], trips: [{ status: "completed", jours: [{ villeId: "kyoto", activites: [{ fait: true }] }] }] });
  assert.equal(unknown.daysInJapan, null);
  assert.equal(unknown.daysInJapanKnown, false);
  assert.equal(unknown.visitedPrefectures, null);
  assert.equal(unknown.learnedExpressions, null);
});

test("agrège les favoris et apprentissages seulement quand les sources sont fournies", () => {
  const summary = buildMyJapanSummary({ favorites: [{ id: "a" }, { id: "b" }], kanaProgress: { a: { level: 3 }, i: { level: 1 } }, expressionProgress: ["いただきます"] });
  assert.equal(summary.favoritesCount, 2);
  assert.equal(summary.learnedKana, 1);
  assert.equal(summary.learnedExpressions, 1);
  assert.equal(summary.collections.find(item => item.id === "favorites").count, 2);
  assert.equal(summary.collections.find(item => item.id === "learning").count, 2);
  const unknown = buildMyJapanSummary();
  assert.equal(unknown.favoritesCount, null);
  assert.equal(unknown.learnedKana, null);
  assert.equal(unknown.collections.some(item => item.id === "learning"), false);
});
