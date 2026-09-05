import assert from "node:assert/strict";
import test from "node:test";
import { haversineKm, tripDayMetrics } from "../src/features/travel/tripDayModel.js";

test("calcule les métriques métier d'une journée sans dépendre de l'UI",()=>{
  const lieux={a:{id:"a",duree:"1 h",lat:35.68,lng:139.76},b:{id:"b",duree:"30 min",lat:35.69,lng:139.77}};
  const metrics=tripDayMetrics({activites:[{lieuId:"a"},{lieuId:"b"}]},lieux);
  assert.equal(metrics.places.length,2);
  assert.equal(metrics.totalMinutes,115);
  assert.ok(metrics.km>0);
  assert.equal(tripDayMetrics({activites:[{lieuId:"unknown"}]},lieux).totalMinutes,0);
  assert.equal(haversineKm({lat:0,lng:0},{lat:0,lng:0}),0);
  assert.equal(haversineKm(null,{lat:0,lng:0}),null);
});
