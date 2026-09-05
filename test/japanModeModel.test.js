import test from "node:test";
import assert from "node:assert/strict";
import { buildJapanMode, toggleTodayActivity } from "../src/features/japan-mode/japanModeModel.js";

const currentDate=new Date(2026,8,5,12);
const trips=[{id:"t",dateDebut:"2026-09-04",customLieux:[{id:"custom",nom:"Mon étape"}],jours:[{num:1,activites:[{id:"yesterday",fait:false}]},{num:2,activites:[{id:"a",lieuId:"custom",fait:false},{id:"b",lieuId:"temple",fait:false}]}]}];
test("retrouve le jour, les lieux locaux et la prochaine activité sans localisation",()=>{
  const model=buildJapanMode(trips,{},currentDate);
  assert.equal(model.day.num,2);assert.equal(model.next.id,"a");assert.equal(model.place.nom,"Mon étape");
  assert.deepEqual(model.progress,{completed:0,total:2,percent:0,isComplete:false});
});
test("cocher et décocher actualise la progression sans muter les autres jours",()=>{
  const next=toggleTodayActivity(trips,"t","a",currentDate);
  assert.equal(trips[0].jours[1].activites[0].fait,false);
  assert.equal(next[0].jours[0],trips[0].jours[0]);
  assert.equal(buildJapanMode(next,{},currentDate).progress.percent,50);
  assert.equal(buildJapanMode(next,{},currentDate).next.id,"b");
  const undone=toggleTodayActivity(next,"t","a",currentDate);
  assert.equal(buildJapanMode(undone,{},currentDate).progress.percent,0);
});
test("refuse de cocher un autre jour ou un voyage annulé",()=>{
  assert.throws(()=>toggleTodayActivity(trips,"t","yesterday",currentDate));
  assert.throws(()=>toggleTodayActivity([{...trips[0],status:"cancelled"}],"t","a",currentDate));
  assert.equal(buildJapanMode([],{},currentDate).trip,null);
});
