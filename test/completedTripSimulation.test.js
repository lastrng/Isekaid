import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildMyJapanSummary } from "../src/features/my-japan/myJapanModel.js";
import { ALLOWED_TARGET_EMAIL, SIMULATION_TRIP_ID, buildSimulationTrip } from "../scripts/completed-trip-simulation-lib.mjs";

test("le voyage de simulation est réaliste et repose uniquement sur le catalogue Isekaid", async () => {
  const db = JSON.parse(await readFile(new URL("../src/japan-data.json", import.meta.url), "utf8"));
  const trip = buildSimulationTrip();
  const catalogPlaces = new Set(db.lieux.map(place => place.id));
  const activities = trip.jours.flatMap(day => day.activites);
  assert.equal(ALLOWED_TARGET_EMAIL, "test1@gmail.com");
  assert.equal(trip.id, SIMULATION_TRIP_ID);
  assert.equal(trip.status, "completed");
  assert.equal(trip.jours.length, 8);
  assert.equal(activities.length, 15);
  assert.equal(activities.every(activity => activity.fait && catalogPlaces.has(activity.lieuId)), true);
  assert.equal(new Set(activities.map(activity => activity.lieuId)).size, 15);
  assert.equal(activities.filter(activity => activity.note).length, 4);

  const summary = buildMyJapanSummary({ trips:[trip], cities:db.villes, places:db.lieux, favorites:[], kanaProgress:{}, streak:{count:2,best:8}, currentDate:new Date("2026-09-11T12:00:00Z") });
  assert.equal(summary.completedTrips, 1);
  assert.equal(summary.completedDays, 8);
  assert.equal(summary.visitedPlaces, 15);
  assert.deepEqual(summary.visitedPrefectureIds.sort(), ["kyoto", "tokyo"]);
  assert.deepEqual(summary.badges.map(badge => badge.id), ["first_trip", "ramen_rookie"]);
  assert.equal(summary.stamps.length, 5);
});
