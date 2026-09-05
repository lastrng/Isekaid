import assert from "node:assert/strict";
import test from "node:test";
import { calculateReadinessScore } from "../src/features/readiness/readinessScore.js";

test("un profil vide obtient un score nul et explicable", () => {
  const result = calculateReadinessScore();
  assert.equal(result.global, 0);
  assert.deepEqual(result.categories, { voyage:0, japonais:0, codesSociaux:0, transports:0, preparatifs:0 });
});

test("le score ne compte que les préparatifs et apprentissages réellement connus", () => {
  const result = calculateReadinessScore({
    trip:{ dateDebut:"2026-10-01", villes:["tokyo"], jours:[{activites:[{},{}]}], checklist:[{texte:"Billet avion",fait:true},{texte:"Assurance voyage",fait:false}] },
    kanaProgress:{ a:{level:3}, i:{level:4}, u:{level:2} },
    scenarioProgress:{done:["restaurant"]},
  });
  assert.equal(result.categories.voyage, 100);
  assert.equal(result.categories.preparatifs, 50);
  assert.equal(result.categories.transports, 100);
  assert.equal(result.evidence.masteredKana, 2);
  assert.equal(result.evidence.completedScenarios, 1);
});

test("chaque catégorie et le total restent bornés", () => {
  const progress = Object.fromEntries(Array.from({length:100},(_,i)=>[i,{level:5}]));
  const result = calculateReadinessScore({ kanaProgress:progress, scenarioProgress:{done:Array.from({length:20},(_,i)=>i)} });
  assert.ok(Object.values(result.categories).every(value=>value>=0 && value<=100));
  assert.ok(result.global>=0 && result.global<=100);
});

test("une date ou des scénarios généraux ne prouvent pas les transports ou les codes sociaux",()=>{
  const result=calculateReadinessScore({trip:{dateDebut:"2026-10-01"},scenarioProgress:{done:["a","b","c","d"]}});
  assert.equal(result.categories.transports,0);
  assert.equal(result.categories.codesSociaux,0);
  const prepared=calculateReadinessScore({trip:{checklist:[{texte:"Revoir les codes sociaux",fait:true},{texte:"Politesse au restaurant",fait:false}]}});
  assert.equal(prepared.categories.codesSociaux,50);
});
