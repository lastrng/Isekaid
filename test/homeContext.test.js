import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeJourneyContext, getHomePrimaryAction } from "../src/features/home/homeContext.js";

test("priorise le jour et la prochaine activité pendant le voyage",()=>{
  const currentDate=new Date(2026,8,5);
  const trips=[{id:"t",titre:"Tokyo",dateDebut:"2026-09-04",jours:[{num:1,activites:[]},{num:2,titre:"Asakusa",activites:[{id:"a",lieuId:"senso"}]}]}];
  const context=buildHomeJourneyContext({user:{},trips,currentDate});
  const action=getHomePrimaryAction(context,[{id:"senso",nom:"Sensō-ji"}]);
  assert.equal(context.currentDay.num,2);
  assert.equal(action.title,"Sensō-ji");
  assert.equal(action.tab,"voyage");
});

test("renvoie vers Mon Japon après le retour",()=>{
  const context=buildHomeJourneyContext({user:{},trips:[{dateDebut:"2026-08-01",jours:[{num:1}]}],currentDate:new Date(2026,8,5)});
  assert.equal(getHomePrimaryAction(context).tab,"profile");
});
