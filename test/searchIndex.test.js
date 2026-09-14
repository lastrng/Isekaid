import test from "node:test";
import assert from "node:assert/strict";

import { buildSearchIndex, groupSearchResults, normalizeSearchText, searchCatalog } from "../src/data/searchIndex.js";

const database = {
  wiki: [{ mot: "Onsen", jp: "温泉", romaji: "onsen", definition: "Bain thermal", categorie: "culture" }],
  lieux: [{ id: "cafe", nom: "Café traditionnel", nom_jp: "喫茶店", quartier: "Gion", categorie: "Café", description: "Une adresse calme" }],
};

test("normalizeSearchText ignore les accents et la casse", () => {
  assert.equal(normalizeSearchText("ÉTÉ à Kyōto"), "ete a kyoto");
});

test("l'index inclut maintenant les lieux", () => {
  const index = buildSearchIndex(database);
  assert.equal(index.some((item) => item.kind === "lieu"), true);
});

test("la recherche accepte plusieurs termes dans n'importe quel champ", () => {
  const results = searchCatalog(buildSearchIndex(database), "cafe gion");
  assert.deepEqual(results.map((item) => item.kind), ["lieu"]);
});

test("l'index couvre aussi la culture contemporaine et l'histoire", () => {
  const index = buildSearchIndex({
    culture: [{ id:"anime", titre:"Le manga moderne", tag:"Pop culture", contenu:"Osamu Tezuka" }],
    histoire: [{ id:"edo", titre:"Époque Edo", periode:"1603–1868", resume:"Les shoguns Tokugawa" }],
  });
  assert.equal(searchCatalog(index,"Tezuka")[0].kind,"culture");
  assert.equal(searchCatalog(index,"Tokugawa")[0].kind,"history");
});

test("l’index universel couvre les dix familles demandées",()=>{
  const prefecture={id:"kyoto",slug:"kyoto",nameFr:"Kyoto",nameJa:"京都府",nameKana:"きょうとふ",region:"Kansai",capital:"Kyoto",cities:[{id:"kyoto"}]};
  const db={
    villes:[{id:"kyoto",nom:"Kyoto",nom_jp:"京都",region:"Kansai"}],
    lieux:[{id:"fushimi",nom:"Fushimi Inari",villeId:"kyoto",categorie:"Sanctuaire"}],
    culture:[{id:"tea",titre:"La cérémonie du thé"}],traditions:[{id:"gion",nom:"Gion Matsuri"}],repas:[{id:"yudofu",romaji:"Yudōfu"}],
    expressions:[{id:"sum",expression:"すみません",traduction:"Excusez-moi"}],situations:[{id:"temple",titre:"Dans un temple"}],
    voyages_preconcus:[{id:"kyoto-essential",titre:"Kyoto essentiel",villes:["kyoto"],jours:[]}],
  };
  const index=buildSearchIndex(db,{prefectures:[prefecture],lessons:[{id:"p1",title:"Lire les kana",goal:"Débuter"}],trips:[{id:"mine",titre:"Mon Kyoto",villes:["kyoto"],jours:[]}]});
  assert.deepEqual(new Set(index.map(item=>item.type)),new Set(["Préfecture","Ville","Lieu","Article","Tradition","Plat","Expression","Situation","Voyage","Leçon"]));
  assert.deepEqual(new Set(index.map(item=>item.entityType)),new Set(["prefecture","city","place","article","tradition","dish","expression","situation","trip","lesson"]));
});

test("Kyoto regroupe les correspondances directes et les relations géographiques",()=>{
  const prefecture={id:"kyoto",slug:"kyoto",nameFr:"Kyoto",nameJa:"京都府",nameKana:"きょうとふ",region:"Kansai",capital:"Kyoto",cities:[{id:"kyoto"}]};
  const db={
    villes:[{id:"kyoto",nom:"Kyoto",region:"Kansai"}],
    lieux:[{id:"fushimi",nom:"Fushimi Inari",villeId:"kyoto",categorie:"Sanctuaire shinto"},{id:"kiyomizu",nom:"Kiyomizu-dera",villeId:"kyoto",categorie:"Temple"}],
    culture:[{id:"cuisine",titre:"Cuisine de Kyoto",contenu:"Les spécialités locales"}],
    situations:[{id:"temple",titre:"Expressions utiles dans un temple",description:"Visiter un temple"}],
    voyages_preconcus:[{id:"essential",titre:"Kyoto essentiel",villes:["kyoto"],jours:[]}],
  };
  const results=searchCatalog(buildSearchIndex(db,{prefectures:[prefecture]}),"Kyoto");
  const groups=groupSearchResults(results,{limitPerGroup:20});
  assert.deepEqual(groups.map(group=>group.id),["prefectures","cities","places","discover","learn","trips"]);
  assert.ok(groups.find(group=>group.id==="places").items.some(item=>item.title==="Fushimi Inari"&&item.match==="geographic"));
  assert.ok(groups.find(group=>group.id==="learn").items.some(item=>item.raw.id==="temple"));
  assert.equal(groups.find(group=>group.id==="trips").items[0].title,"Kyoto essentiel");
});
