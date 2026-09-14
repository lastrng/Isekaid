import test from "node:test";
import assert from "node:assert/strict";
import {
  getDailyContent,
  getRecommendedDiscovery,
  getRecommendedLearning,
  getTravelRelatedContent,
  getUserContext,
} from "../src/entities/user/userContext.js";

const db = {
  villes:[{id:"kyoto",nom:"Kyoto",region:"kansai"},{id:"sapporo",nom:"Sapporo",region:"hokkaido"}],
  lieux:[
    {id:"fushimi",nom:"Fushimi Inari",villeId:"kyoto",categorie:"Sanctuaire",saison_ideale:"automne"},
    {id:"odori",nom:"Parc Odori",villeId:"sapporo",categorie:"Nature",saison_ideale:"hiver"},
  ],
  repas:[{id:"ramen",romaji:"Ramen",description:"Gastronomie et restaurant"}],
  culture:[{id:"manga",titre:"Le manga",tag:"Pop culture"}],
  expressions:[{id:"sum",expression:"すみません",romaji:"Sumimasen",traduction:"Excusez-moi",niveau:"beginner"}],
  situations:[
    {id:"restaurant",titre:"Au restaurant",description:"Commander un repas",niveau:"beginner"},
    {id:"train",titre:"Prendre le train",description:"À la gare",niveau:"intermediate"},
  ],
  scenarios:[{id:"hotel",titre:"Arriver à l’hôtel",description:"Hébergement",niveau:"advanced"}],
};

const trip = {
  id:"kansai",titre:"Kyoto en automne",dateDebut:"2026-10-20",dateFin:"2026-10-25",villes:["kyoto"],
  jours:[{num:1,villeId:"kyoto",transport:"train",activites:[{id:"a",lieuId:"fushimi"}]}],
};

test("getUserContext normalise toutes les sources utiles sans effet de bord",()=>{
  const context=getUserContext({
    user:{why:["gastro","culture"],goal:"travel",level:"débutant"},db,trips:[trip],
    favorites:[{type:"lieu",item:db.lieux[0]}],readingProgress:{read:{"culture:manga":"2026-01-01"}},
    kanaProgress:{a:{level:3},i:{level:1}},scenarioProgress:{done:["restaurant"]},pathProgress:{completed:["step-1"]},
    prefectureProgress:{entries:{kyoto:{discovered:true},tokyo:{visited:true}}},streak:{count:12,best:20},currentDate:new Date("2026-09-10T12:00:00Z"),
  });
  assert.equal(context.version,1);
  assert.equal(context.japaneseLevel.id,"beginner");
  assert.equal(context.season,"automne");
  assert.equal(context.trip.nextTrip.id,"kansai");
  assert.deepEqual(context.trip.regionIds,["kansai"]);
  assert.ok(context.trip.themeIds.includes("transport"));
  assert.equal(context.progress.masteredKana,1);
  assert.deepEqual(context.progress.completedScenarioIds,["restaurant"]);
  assert.deepEqual(context.progress.discoveredPrefectureIds,["kyoto"]);
  assert.equal(context.streak.current,12);
});

test("Découvrir privilégie le voyage, la saison et évite un contenu déjà lu",()=>{
  const context=getUserContext({user:{why:["culture"]},db,trips:[trip],readingProgress:{read:{"culture:manga":"date"}},currentDate:new Date("2026-09-10T12:00:00Z")});
  const recommendations=getRecommendedDiscovery({context,db,limit:20});
  assert.equal(recommendations[0].sourceId,"fushimi");
  assert.ok(recommendations.findIndex(item=>item.sourceId==="manga")>recommendations.findIndex(item=>item.sourceId==="fushimi"));
  assert.ok(recommendations[0].reasons.includes("Dans ton voyage"));
});

test("Apprendre tient compte du niveau et de la progression acquise",()=>{
  const context=getUserContext({user:{why:["gastro"],level:"beginner"},db,scenarioProgress:{done:["restaurant"]},currentDate:new Date("2026-09-10T12:00:00Z")});
  const recommendations=getRecommendedLearning({context,db,limit:20});
  assert.notEqual(recommendations[0].sourceId,"hotel");
  assert.ok(recommendations.findIndex(item=>item.sourceId==="restaurant")>recommendations.findIndex(item=>item.sourceId==="sum"));
});

test("Voyage et Aujourd’hui réutilisent les mêmes recommandations déterministes",()=>{
  const context=getUserContext({user:{why:["gastro"],level:"beginner"},db,trips:[trip],currentDate:new Date("2026-09-10T12:00:00Z")});
  const first=getDailyContent({context,db,date:"2026-09-10"});
  const second=getDailyContent({context,db,date:"2026-09-10"});
  assert.deepEqual(first,second);
  assert.deepEqual(first.travel,getTravelRelatedContent({context,db,limit:1,date:"2026-09-10"}));
  assert.ok(first.discovery.length);
  assert.ok(first.learning.length);
});
