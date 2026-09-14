import test from "node:test";
import assert from "node:assert/strict";
import { DISCOVER_SECTIONS, JAPAN_PREFECTURES, buildDiscoverHome, catalogItems, prefecturesWithContent, relatedDiscoveries } from "../src/features/explore/discoverModel.js";

test("l'architecture expose les six univers et tous les sous-thèmes attendus",()=>{
  assert.deepEqual(DISCOVER_SECTIONS.map(section=>section.id),["culture","society","gastronomy","history","pop","practical"]);
  assert.ok(DISCOVER_SECTIONS.find(section=>section.id==="pop").topics.some(topic=>topic.id==="games"));
  assert.ok(DISCOVER_SECTIONS.find(section=>section.id==="practical").topics.some(topic=>topic.id==="waste"));
});

test("l'annuaire contient exactement les 47 préfectures regroupées dans 8 régions",()=>{
  assert.equal(JAPAN_PREFECTURES.length,47);
  assert.equal(new Set(JAPAN_PREFECTURES.map(item=>item.region)).size,8);
  assert.equal(new Set(JAPAN_PREFECTURES.map(item=>item.id)).size,47);
});

test("une préfecture réutilise les villes et lieux déjà documentés",()=>{
  const prefectures=prefecturesWithContent({villes:[{id:"tokyo",nom:"Tokyo"}],lieux:[{id:"senso",nom:"Sensō-ji",villeId:"tokyo"}]});
  const tokyo=prefectures.find(item=>item.name==="Tokyo");
  assert.equal(tokyo.available,true);
  assert.equal(tokyo.places[0].id,"senso");
});

test("les catalogues progressifs n'inventent pas de contenu",()=>{
  const db={repas:[{id:"ramen",romaji:"Ramen"}],culture:[{id:"anime",titre:"Anime moderne",tag:"Pop culture"}],vie_quotidienne:[{id:"train",titre:"Prendre le train",categorie:"Transports"}]};
  assert.equal(catalogItems(db,"gastronomy").length,1);
  assert.equal(catalogItems(db,"pop").length,1);
  assert.equal(catalogItems(db,"practical").length,1);
  const home=buildDiscoverHome({db,readingProgress:{version:1,read:{"repas:ramen":"date"}}});
  assert.equal(home.sections.find(section=>section.id==="gastronomy").read,1);
});

test("les contenus liés excluent la fiche courante et partagent un thème réel",()=>{
  const source={kind:"vie",title:"Le train",sub:"Transports",summary:"Voyager en train",raw:{id:"train",titre:"Le train",description:"Voyager en train"}};
  const related=relatedDiscoveries({vie_quotidienne:[source.raw,{id:"gare",titre:"À la gare",description:"Prendre le train"}],repas:[{id:"ramen",romaji:"Ramen",description:"Bouillon"}]},source);
  assert.equal(related[0].raw.id,"gare");
  assert.ok(related.every(item=>item.raw.id!=="train"));
});
