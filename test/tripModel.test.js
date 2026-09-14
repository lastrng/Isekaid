import test from "node:test";
import assert from "node:assert/strict";

import {
  addPrefecturePlanToTrip,
  autoPickVilles,
  deriveEtapesFromJours,
  normalizeTrip,
  pickCandidateLieux,
  tripFromGenerated,
  tripFromPreconcu,
  tripTiming,
  validateGeneratedItinerary,
} from "../src/features/travel/tripModel.js";

test("une préfecture planifiée est ajoutée une seule fois sans devenir une visite",()=>{
  const trip={id:"trip-1",plannedPrefectures:[],jours:[]};
  const intent={prefectureId:"tokyo",prefectureName:"Tokyo",cityIds:["tokyo"]};
  const planned=addPrefecturePlanToTrip(trip,intent);
  assert.equal(planned.plannedPrefectures.length,1);
  assert.equal(planned.plannedPrefectures[0].prefectureId,"tokyo");
  assert.equal(Object.hasOwn(planned.plannedPrefectures[0],"visited"),false);
  assert.equal(addPrefecturePlanToTrip(planned,intent),planned);
});

test("une préfecture accepte des villes référencées par leur identifiant",()=>{
  const trip={id:"trip-1",plannedPrefectures:[],jours:[]};
  const planned=addPrefecturePlanToTrip(trip,{prefectureId:"kyoto",prefectureName:"Kyoto",cityIds:["kyoto","uji",null]});
  assert.deepEqual(planned.plannedPrefectures[0].cityIds,["kyoto","uji"]);
});

test("deriveEtapesFromJours regroupe uniquement les villes contiguës", () => {
  const result = deriveEtapesFromJours([
    { num: 1, villeId: "tokyo" },
    { num: 2, villeId: "tokyo" },
    { num: 3, villeId: "kyoto" },
  ]);
  assert.equal(result.etapes.length, 2);
  assert.equal(result.etapes[0].nuits, 2);
  assert.equal(result.jours[0].etapeId, result.jours[1].etapeId);
  assert.notEqual(result.jours[1].etapeId, result.jours[2].etapeId);
});

test("tripTiming distingue avant, pendant et après le voyage", () => {
  const trip = { dateDebut: "2026-09-10", jours: [{}, {}, {}] };
  assert.deepEqual(tripTiming(trip, new Date(2026, 8, 8, 15)), { status: "upcoming", daysUntil: 2 });
  assert.deepEqual(tripTiming(trip, new Date(2026, 8, 11, 15)), { status: "active", dayNumber: 2, duration: 3 });
  assert.deepEqual(tripTiming(trip, new Date(2026, 8, 14, 15)), { status: "past", daysSince: 2 });
});

test("normalizeTrip migre un voyage v1 de façon idempotente", () => {
  const migrated = normalizeTrip({
    id: "trip-1",
    jours: [{ num: 1, villeId: "tokyo", etapes: [{ id: "a" }] }],
  });
  assert.equal(migrated.modelVersion, 2);
  assert.deepEqual(migrated.jours[0].activites, [{ id: "a" }]);
  assert.equal(normalizeTrip(migrated), migrated);
});

test("autoPickVilles respecte l'ordre de route et le budget", () => {
  const villes = [
    { id: "tokyo", jours_conseilles: "3-4 jours" },
    { id: "hakone", jours_conseilles: "1 jour" },
    { id: "kyoto", jours_conseilles: "3 jours" },
  ];
  assert.deepEqual(autoPickVilles(villes, 4), ["tokyo", "hakone"]);
});

test("pickCandidateLieux ne retourne que le catalogue autorisé", () => {
  const villes = [{ id: "tokyo", jours_conseilles: "2 jours" }];
  const lieux = [
    { id: "temple", villeId: "tokyo", interets: ["culture"] },
    { id: "shop", villeId: "tokyo", interets: ["lifestyle"] },
    { id: "outside", villeId: "kyoto", interets: ["culture"] },
  ];
  const result = pickCandidateLieux({
    lieux,
    villes,
    villeIds: ["tokyo"],
    interets: ["culture"],
    rythme: "equilibre",
    saison: "",
    days: 1,
  });
  assert.deepEqual(result.map((place) => place.id), ["temple"]);
});

test("tripFromGenerated produit le modèle persistant v2", () => {
  const trip = tripFromGenerated(
    { villes: ["tokyo"], jours: [{ villeId: "tokyo", titre: "Arrivée", recit:"Un récit développé", conseilDuJour:"Un conseil", lieuIds: ["senso-ji"] }] },
    "Tokyo",
  );
  assert.equal(trip.modelVersion, 2);
  assert.equal(trip.jours[0].activites[0].lieuId, "senso-ji");
  assert.equal(trip.jours[0].recit, "Un récit développé");
  assert.equal(trip.jours[0].conseilDuJour, "Un conseil");
  assert.equal(trip.checklist.length, 9);
});

test("un voyage préconçu conserve les transports utiles aux recommandations contextuelles",()=>{
  const trip=tripFromPreconcu({id:"rail",titre:"En train",villes:["tokyo"],jours:[{num:1,villeId:"tokyo",etapes:[{lieuId:"ueno",heure:"9:00",arrivee:{mode:"train",duree:"10 min"}}]}]});
  assert.deepEqual(trip.jours[0].activites[0].arrivee,{mode:"train",duree:"10 min"});
  assert.equal(trip.jours[0].activites[0].heure,"9:00");
});

test("validateGeneratedItinerary élimine hallucinations, doublons et incohérences", () => {
  const lieux = [
    { id:"senso-ji", villeId:"tokyo", nom:"Sensō-ji", categorie:"Temple" },
    { id:"fushimi-inari", villeId:"kyoto", nom:"Fushimi Inari", categorie:"Sanctuaire" },
  ];
  const result = validateGeneratedItinerary({ jours:[
    { villeId:"tokyo", titre:"fait inventé", lieuIds:["senso-ji","faux","senso-ji","fushimi-inari"] },
  ]}, { lieux, villes:["tokyo","kyoto"], days:2 });
  assert.equal(result.valid, true);
  assert.deepEqual(result.itinerary.jours.flatMap(j=>j.lieuIds).sort(), ["fushimi-inari","senso-ji"]);
  assert.equal(result.itinerary.jours[0].titre, "Jour 1 · Découverte de tokyo");
  assert.ok(result.itinerary.jours.every(day=>day.recit.length >= 250));
  assert.ok(result.itinerary.jours.every(day=>day.conseilDuJour.length >= 150));
  assert.ok(result.issues.includes("unknown_place"));
  assert.ok(result.issues.includes("place_city_mismatch"));
});
