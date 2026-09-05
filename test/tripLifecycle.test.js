import assert from "node:assert/strict";
import test from "node:test";
import { getTripLifecycleStatus, normalizeCompletedTrips, resolvePastTrip, TRIP_STATUS } from "../src/entities/trip/tripLifecycle.js";

const now=new Date(2026,8,5);
test("distingue voyage planifié, actif et passé à confirmer",()=>{
  assert.equal(getTripLifecycleStatus({dateDebut:"2026-10-01",jours:[{}]},now),TRIP_STATUS.PLANNED);
  assert.equal(getTripLifecycleStatus({dateDebut:"2026-09-05",jours:[{}]},now),TRIP_STATUS.ACTIVE);
  assert.equal(getTripLifecycleStatus({dateDebut:"2026-08-01",jours:[{activites:[]}]},now),TRIP_STATUS.AWAITING_CONFIRMATION);
});

test("une activité faite constitue une preuve de voyage",()=>{
  assert.equal(getTripLifecycleStatus({dateDebut:"2026-08-01",jours:[{activites:[{fait:true}]}]},now),TRIP_STATUS.COMPLETED);
});

test("la confirmation et l’annulation sont explicites et réversibles dans le modèle",()=>{
  const trip={id:"t"}; const date=new Date("2026-09-05T10:00:00Z");
  assert.equal(resolvePastTrip(trip,true,date).status,TRIP_STATUS.COMPLETED);
  assert.equal(resolvePastTrip(trip,false,date).status,TRIP_STATUS.CANCELLED);
});

test("normalise automatiquement un voyage passé avec une activité faite",()=>{
  const date=new Date("2026-09-05T12:00:00Z");
  const result=normalizeCompletedTrips([{id:"trip",dateDebut:"2026-08-01",dateFin:"2026-08-03",jours:[{activites:[{fait:true}]}]}],date,date);
  assert.equal(result.changed,true);
  assert.equal(result.trips[0].status,TRIP_STATUS.COMPLETED);
  assert.equal(result.trips[0].completedAt,"2026-08-03T23:59:59.000Z");
  const pending=normalizeCompletedTrips([{id:"future",dateDebut:"2026-10-01",jours:[{activites:[]}]}],date,date);
  assert.equal(pending.changed,false);
  assert.equal(pending.trips[0].status,undefined);
});
