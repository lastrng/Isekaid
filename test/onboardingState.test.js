import test from "node:test";
import assert from "node:assert/strict";

import { CURRENT_ONBOARDING_VERSION, completeOnboardingState, emptyOnboardingState, loadOnboardingState, markGuideSeen, onboardingEntry, onboardingStorageKey, saveOnboardingState } from "../src/features/onboarding/state/onboardingState.js";
import { CONTEXTUAL_GUIDES, PRODUCT_STEPS, UPDATE_STEPS, travelGuideFor } from "../src/features/onboarding/content/onboardingContent.js";

function withStorage(run) {
  const values=new Map();
  const previous=globalThis.localStorage;
  globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  try{return run(values);}finally{globalThis.localStorage=previous;}
}

test("versionne l’onboarding et conserve cinq guides indépendants",()=>withStorage(()=>{
  const completed=completeOnboardingState(emptyOnboardingState(),{now:"2026-09-12T12:00:00.000Z"});
  assert.equal(completed.version,CURRENT_ONBOARDING_VERSION);
  assert.equal(onboardingEntry({hasProfile:true,state:completed}),"app");
  const guided=markGuideSeen(completed,"travel");
  assert.equal(guided.seenGuides.travel,true);
  assert.equal(guided.seenGuides.today,false);
}));

test("isole la progression locale de chaque compte",()=>withStorage(values=>{
  saveOnboardingState("account-a",completeOnboardingState(emptyOnboardingState(),{now:"2026-09-12T12:00:00.000Z"}));
  assert.equal(loadOnboardingState("account-a").completed,true);
  assert.equal(loadOnboardingState("account-b").completed,false);
  assert.notEqual(onboardingStorageKey("account-a"),onboardingStorageKey("account-b"));
  assert.equal(values.size,1);
}));

test("oriente un nouveau compte vers le flow complet et un ancien profil vers les nouveautés",()=>{
  assert.equal(onboardingEntry({hasProfile:false,state:null}),"new");
  assert.equal(onboardingEntry({hasProfile:true,state:null}),"update");
});

test("adapte l’aide Voyage à ses quatre états réels",()=>{
  assert.equal(travelGuideFor("NO_TRIP").title,"Prépare ton premier voyage");
  assert.equal(travelGuideFor("PRE_TRIP").title,"Ton voyage prend forme");
  assert.equal(travelGuideFor("ACTIVE_TRIP").title,"Bienvenue en Mode Japon");
  assert.equal(travelGuideFor("POST_TRIP").title,"Ton voyage reste avec toi");
});

test("borne les présentations et couvre exactement les cinq onglets",()=>{
  assert.equal(PRODUCT_STEPS.length,5);
  assert.equal(UPDATE_STEPS.length,3);
  assert.deepEqual(Object.keys(CONTEXTUAL_GUIDES),["today","learn","discover","myJapan"]);
  assert.match(PRODUCT_STEPS.find(step=>step.id==="travel").description,/sur place/);
});
