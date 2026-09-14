import test from "node:test";
import assert from "node:assert/strict";

import { buildRetentionLoop, getStreakContinuity, getTravelRetention } from "../src/features/progress/retentionLoop.js";

const currentDate=new Date("2026-09-10T12:00:00");

test("la boucle quotidienne présente trois rendez-vous, sans séparer le quiz de l'apprentissage",()=>{
  const model=buildRetentionLoop({
    dailyActivities:[
      {kind:"discover",done:true},
      {kind:"learn",done:true},
      {kind:"understand",done:false},
      {kind:"mission",done:false},
    ],
    currentDate,
  });
  assert.deepEqual(model.today.phases.map(item=>item.id),["discover","learn","mission"]);
  assert.equal(model.today.completed,1);
  assert.equal(model.today.phases.find(item=>item.id==="learn").done,false);
  assert.equal(model.nextAction.phaseId,"learn");
});

test("sans voyage, la prochaine raison de revenir vient du japonais ou de l'exploration",()=>{
  const model=buildRetentionLoop({
    dailyActivities:[{kind:"discover",done:true},{kind:"learn",done:true},{kind:"understand",done:true},{kind:"mission",done:true}],
    discoveredPrefectures:18,
    pathProgress:{completed:["p1","p2"]},
    learningTotal:8,
    stamps:4,
    trips:[],
    currentDate,
  });
  assert.equal(model.travel.phase,"between");
  assert.equal(model.nextAction.id,"learning");
  assert.deepEqual(model.durable.prefectures,{completed:18,total:47});
  assert.equal(model.durable.passport.completed,4);
});

test("le voyage apporte anticipation, utilité puis mémoire selon son état",()=>{
  assert.equal(getTravelRetention([{id:"next",dateDebut:"2026-10-01",dateFin:"2026-10-03"}],currentDate).phase,"before");
  assert.equal(getTravelRetention([{id:"now",dateDebut:"2026-09-09",dateFin:"2026-09-12"}],currentDate).phase,"during");
  assert.equal(getTravelRetention([{id:"past",status:"completed",dateDebut:"2026-08-01",dateFin:"2026-08-03"}],currentDate).phase,"after");
});

test("une pause n'efface pas la progression durable du streak",()=>{
  const continuity=getStreakContinuity({count:1,best:12,last:"2026-09-01",totalActiveDays:26,freezes:0},currentDate);
  assert.equal(continuity.state,"returning");
  assert.equal(continuity.best,12);
  assert.equal(continuity.totalActiveDays,26);
  assert.match(continuity.message,/restent acquis/);
});

test("un joker rend explicite la journée de grâce",()=>{
  const continuity=getStreakContinuity({count:6,last:"2026-09-08",freezes:1},currentDate);
  assert.equal(continuity.state,"protected");
  assert.match(continuity.message,/protège/);
});
