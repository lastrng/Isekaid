import test from "node:test";
import assert from "node:assert/strict";

import { buildSearchIndex, normalizeSearchText, searchCatalog } from "../src/data/searchIndex.js";

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
