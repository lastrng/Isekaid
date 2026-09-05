import assert from "node:assert/strict";
import test from "node:test";
import {
  getActiveTrip,
  getCurrentTripDay,
  getDailyProgress,
  getJapanJourneyState,
  getNextActivity,
  getTripTiming,
} from "../src/entities/user/japanJourneyState.js";
import { JAPAN_RELATIONSHIP, normalizeProfile } from "../src/entities/user/profileModel.js";

const datedTrip = (start, days = 3) => ({ id: start, dateDebut: start, jours: Array.from({ length: days }, (_, i) => ({ num: i + 1 })) });

test("normalise un ancien profil sans perdre ses champs", () => {
  const profile = normalizeProfile({ name: " Léa ", goal: "travel", why: ["gastro", "gastro"], custom: 42 });
  assert.equal(profile.japanRelationship, JAPAN_RELATIONSHIP.PLANNING);
  assert.equal(profile.name, "Léa");
  assert.deepEqual(profile.why, ["gastro"]);
  assert.equal(profile.custom, 42);
});

test("calcule la prochaine activité et la progression quotidienne",()=>{
  const day={activites:[{id:"a",fait:true},{id:"b",fait:false},{id:"c"}]};
  assert.equal(getNextActivity(day).id,"b");
  assert.deepEqual(getDailyProgress(day),{completed:1,total:3,percent:33,isComplete:false});
  assert.deepEqual(getDailyProgress({activites:[]}),{completed:0,total:0,percent:0,isComplete:false});
});

test("déduit bientôt, au Japon et revenu depuis les dates", () => {
  assert.equal(getJapanJourneyState({}, [datedTrip("2026-09-20")], new Date(2026, 8, 5)), JAPAN_RELATIONSHIP.SOON);
  assert.equal(getJapanJourneyState({}, [datedTrip("2026-09-04")], new Date(2026, 8, 5)), JAPAN_RELATIONSHIP.IN_JAPAN);
  assert.equal(getJapanJourneyState({}, [datedTrip("2026-08-01")], new Date(2026, 8, 5)), JAPAN_RELATIONSHIP.RETURNED);
});

test("une localisation autorisée peut activer le mode Japon", () => {
  assert.equal(getJapanJourneyState({}, [], new Date(2026, 8, 5), { permissionGranted:true, inJapan:true }), JAPAN_RELATIONSHIP.IN_JAPAN);
  assert.equal(getJapanJourneyState({}, [], new Date(2026, 8, 5), { inJapan:true }), JAPAN_RELATIONSHIP.DREAMING);
});

test("retourne le voyage actif et son jour courant sans dépendre de React", () => {
  const trip = datedTrip("2026-09-04");
  assert.equal(getActiveTrip([datedTrip("2027-01-01"), trip], new Date(2026, 8, 5)), trip);
  assert.equal(getTripTiming(trip, new Date(2026, 8, 5)).dayNumber, 2);
  assert.equal(getCurrentTripDay(trip, new Date(2026, 8, 5)).num, 2);
});

test("prend en compte l'onboarding et les projets sans date sans inventer de séjour", () => {
  const now = new Date("2026-09-05T10:00:00Z");
  assert.equal(getJapanJourneyState({ plannedDeparture: "2026-09-20" }, [], now), "soon");
  assert.equal(getJapanJourneyState({ plannedDeparture: "2026-12-20" }, [], now), "planning");
  assert.equal(getJapanJourneyState({ plannedDeparture: "2026-09-05" }, [], now), "soon");
  assert.equal(getJapanJourneyState({ plannedDeparture: "2026-09-01" }, [], now), "dreaming");
  assert.equal(getJapanJourneyState({ japanRelationship: "japan_lover" }, [{ id: "draft", jours: [] }], now), "planning");
  assert.equal(getJapanJourneyState({ plannedDeparture: "2026-09-20" }, [datedTrip("2026-12-20")], now), "planning");
});

test("le retour dure 90 jours puis devient un lien durable au Japon", () => {
  const trip = datedTrip("2026-06-01", 1);
  assert.equal(getJapanJourneyState({}, [trip], new Date("2026-08-30T00:00:00Z")), "returned");
  assert.equal(getJapanJourneyState({}, [trip], new Date("2026-08-31T00:00:00Z")), "japan_lover");
  assert.equal(getJapanJourneyState({}, [trip, { id: "draft" }], new Date("2026-09-05T00:00:00Z")), "planning");
});

test("les frontières de journée utilisent Tokyo et rejettent les dates impossibles", () => {
  const trip = datedTrip("2026-09-06", 2);
  assert.equal(getTripTiming(trip, new Date("2026-09-05T14:59:59Z")).status, "upcoming");
  assert.equal(getTripTiming(trip, new Date("2026-09-05T15:00:00Z")).dayNumber, 1);
  assert.equal(getTripTiming(trip, new Date("2026-09-06T15:00:00Z")).dayNumber, 2);
  assert.equal(getTripTiming(datedTrip("2026-02-30")), null);
});
