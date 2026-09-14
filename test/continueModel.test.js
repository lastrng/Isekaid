import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTINUE_ACTIVITY_KEY,
  buildContinueRecommendation,
  continueActivityFromDaily,
  loadContinueActivity,
  resolveContinueContent,
  saveContinueActivity,
} from "../src/features/home/continueModel.js";

const currentDate = new Date(2026, 8, 5, 12);

function memoryStorage() {
  const values = new Map();
  return { getItem:key=>values.get(key) ?? null, setItem:(key,value)=>values.set(key,value), values };
}

test("persiste une reprise éditoriale minimale et la résout dans le catalogue local", () => {
  const storage = memoryStorage();
  const activity = continueActivityFromDaily({ type:"region", title:"Hokkaidō", raw:{id:"hokkaido"} });
  const saved = saveContinueActivity(activity, storage);
  assert.equal(saved.kind, "prefecture");
  assert.equal(JSON.parse(storage.values.get(CONTINUE_ACTIVITY_KEY)).target.contentId, "hokkaido");
  assert.deepEqual(loadContinueActivity(storage), saved);
  assert.equal(resolveContinueContent({regions:[{id:"hokkaido",nom:"Hokkaidō"}]}, saved.target).nom, "Hokkaidō");
});

test("une activité réellement interrompue prime même pendant un voyage", () => {
  const item = buildContinueRecommendation({
    currentDate,
    saved:{kind:"article",title:"Ancien article",target:{}},
    trips:[{id:"trip",titre:"Tokyo",dateDebut:"2026-09-05",jours:[{num:1,titre:"Shibuya",activites:[{id:"a"}]}]}],
  });
  assert.equal(item.kind, "article");
  assert.equal(item.title, "Ancien article");
});

test("reprend une lecture existante avant les replis de progression", () => {
  const saved = {kind:"article",title:"Le konbini",target:{contentType:"daily_life",contentId:"konbini"}};
  const item = buildContinueRecommendation({currentDate,saved,db:{vie_quotidienne:[{id:"konbini"}]},dueReviewCount:4,hasKanaProgress:true});
  assert.equal(item.title, "Le konbini");
});

test("propose une révision puis un parcours commencé, sans dupliquer la carte Voyage", () => {
  assert.equal(buildContinueRecommendation({currentDate,dueReviewCount:3,hasKanaProgress:true}).kind, "review");
  assert.equal(buildContinueRecommendation({currentDate,pathProgress:{completed:["p1","p2"]}}).kind, "lesson");
  assert.equal(buildContinueRecommendation({currentDate,trips:[{id:"draft",titre:"Mon Japon",jours:[]}]}), null);
  assert.equal(buildContinueRecommendation({currentDate}), null);
});
