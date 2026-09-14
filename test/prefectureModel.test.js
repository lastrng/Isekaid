import test from "node:test";
import assert from "node:assert/strict";
import {
  JAPAN_PREFECTURES,
  buildPrefectures,
  deriveVisitedPrefectureIds,
  loadPrefectureProgress,
  markPrefectureDiscovered,
  prefectureProgressSummary,
  savePrefectureProgress,
} from "../src/features/explore/prefectureModel.js";

function memoryStorage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}

test("le catalogue expose 47 fiches conformes au modèle éditorial générique",()=>{
  assert.equal(JAPAN_PREFECTURES.length,47);
  const required=["id","slug","nameFr","nameJa","nameKana","region","capital","flag","symbol","heroImage","shortDescription","description","history","geography","culture","localFood","specialties","festivals","prominentPlaces","nature","cities","bestSeasons","travelTips","funFacts","relatedContent","relatedPlaces","visited","favorite","discovered","stampUnlocked"];
  for(const prefecture of JAPAN_PREFECTURES)for(const field of required)assert.ok(Object.hasOwn(prefecture,field),`${prefecture.id}.${field}`);
});

test("ouvrir une fiche la marque découverte sans jamais la marquer visitée",()=>{
  const initial=markPrefectureDiscovered(null,"tokyo",new Date("2026-09-10T10:00:00Z"));
  const prefectures=buildPrefectures({progress:initial});
  const tokyo=prefectures.find(item=>item.id==="tokyo");
  assert.equal(tokyo.discovered,true);
  assert.equal(tokyo.visited,false);
  assert.equal(tokyo.stampUnlocked,false);
  assert.deepEqual(prefectureProgressSummary({progress:initial}),{discovered:1,visited:0,total:47,discoveredIds:["tokyo"],visitedIds:[]});
});

test("une visite exige une activité de voyage explicitement réalisée",()=>{
  const cities=[{id:"tokyo",prefecture:"Tokyo"},{id:"kyoto",prefecture:"Kyoto"}];
  const trips=[{status:"completed",jours:[{villeId:"tokyo",activites:[{fait:true}]},{villeId:"kyoto",activites:[{fait:false}]}]}];
  const visited=deriveVisitedPrefectureIds({trips,cities});
  assert.deepEqual([...visited],["tokyo"]);
  const prefectures=buildPrefectures({trips,cities,db:{villes:cities}});
  assert.equal(prefectures.find(item=>item.id==="tokyo").stampUnlocked,true);
  assert.equal(prefectures.find(item=>item.id==="kyoto").visited,false);
});

test("une visite physique implique aussi l’état découvert dans les projections",()=>{
  const visitedIds=new Set(["tokyo"]);
  assert.deepEqual(prefectureProgressSummary({progress:null,visitedIds}),{discovered:1,visited:1,total:47,discoveredIds:["tokyo"],visitedIds:["tokyo"]});
  const cities=[{id:"tokyo",prefecture:"Tokyo"}];
  const trips=[{status:"completed",jours:[{villeId:"tokyo",activites:[{fait:true}]}]}];
  const tokyo=buildPrefectures({db:{villes:cities},trips}).find(item=>item.id==="tokyo");
  assert.equal(tokyo.discovered,true);
  assert.equal(tokyo.visited,true);
});

test("la progression locale est persistée et tolère des données corrompues",()=>{
  const storage=memoryStorage();
  const progress=markPrefectureDiscovered(null,"osaka",new Date("2026-09-10T10:00:00Z"));
  assert.equal(savePrefectureProgress(progress,storage),true);
  assert.equal(loadPrefectureProgress(storage).entries.osaka.discovered,true);
  storage.setItem("isekaid_prefecture_progress_v1","{");
  assert.deepEqual(loadPrefectureProgress(storage),{version:1,entries:{}});
});

test("le corpus éditorial peut être enrichi par les données sans changer le code",()=>{
  const prefectures=buildPrefectures({db:{prefectures:[{id:"tokyo",shortDescription:"Texte validé",localFood:["Contenu validé"]}]}});
  const tokyo=prefectures.find(item=>item.id==="tokyo");
  assert.equal(tokyo.shortDescription,"Texte validé");
  assert.deepEqual(tokyo.localFood,["Contenu validé"]);
  assert.equal(prefectures.find(item=>item.id==="aomori").description,null);
});
