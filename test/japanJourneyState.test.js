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
