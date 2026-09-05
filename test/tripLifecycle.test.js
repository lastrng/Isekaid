import assert from "node:assert/strict";
import test from "node:test";
import { getTripLifecycleStatus, resolvePastTrip, TRIP_STATUS } from "../src/entities/trip/tripLifecycle.js";

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
