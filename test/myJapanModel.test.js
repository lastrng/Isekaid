import assert from "node:assert/strict";
import test from "node:test";
import { buildMyJapanSummary } from "../src/features/my-japan/myJapanModel.js";

test("ne considère comme visités que les lieux explicitement terminés", () => {
  const summary=buildMyJapanSummary({currentDate:new Date(2026,8,5),cities:[{id:"tokyo",nom:"Tokyo",region:"Kantō",emoji:"🗼"}],places:[{id:"senso",nom:"Sensō-ji",emoji:"⛩️"}],trips:[{id:"trip1",titre:"Tokyo",dateDebut:"2026-08-01",jours:[{villeId:"tokyo",activites:[{lieuId:"senso",fait:true,note:"Très tôt"},{lieuId:"ueno",fait:false}]}]}]});
  assert.equal(summary.completedTrips,1);
  assert.equal(summary.completedDays,1);
  assert.equal(summary.visitedPlaces,1);
  assert.deepEqual(summary.placeIds,["senso"]);
  assert.equal(summary.stamps[0].label,"Tokyo Stamp");
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
