import test from "node:test";
import assert from "node:assert/strict";

import { ALWAYS_FREE_PROMISES, countConcurrentTripSlots, ESSENTIAL_FEATURES, getPremiumAccess, PREMIUM_BENEFITS, PREMIUM_FEATURES } from "../src/features/premium/premiumAccess.js";

test("les fonctions essentielles ne dépendent jamais du droit Premium",()=>{
  for(const feature of Object.values(ESSENTIAL_FEATURES)){
    assert.deepEqual(getPremiumAccess(feature,{isPremium:false}).allowed,true,feature);
  }
});

test("un premier voyage reste gratuit puis les voyages parallèles deviennent Premium",()=>{
  assert.equal(getPremiumAccess(PREMIUM_FEATURES.MULTIPLE_TRIPS,{isPremium:false,usage:0,freeLimit:1}).allowed,true);
  assert.equal(getPremiumAccess(PREMIUM_FEATURES.MULTIPLE_TRIPS,{isPremium:false,usage:1,freeLimit:1}).allowed,false);
  assert.equal(getPremiumAccess(PREMIUM_FEATURES.MULTIPLE_TRIPS,{isPremium:true,usage:4,freeLimit:1}).allowed,true);
});

test("les voyages terminés ne consomment pas le voyage gratuit suivant",()=>{
  const date=new Date("2026-09-11T12:00:00");
  assert.equal(countConcurrentTripSlots([{id:"memory",status:"completed",dateDebut:"2025-04-01"}],date),0);
  assert.equal(countConcurrentTripSlots([{id:"memory",status:"completed"},{id:"next",dateDebut:"2026-10-01"}],date),1);
});

test("les bénéfices commerciaux correspondent uniquement aux outils avancés",()=>{
  assert.ok(PREMIUM_BENEFITS.length>=5);
  assert.ok(ALWAYS_FREE_PROMISES.some(item=>item.includes("SOS")));
  assert.equal(PREMIUM_BENEFITS.some(item=>/tout le contenu|sécurité|SOS/i.test(`${item.title} ${item.description}`)),false);
});
