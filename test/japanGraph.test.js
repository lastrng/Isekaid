import test from "node:test";
import assert from "node:assert/strict";
import { buildJapanGraph, getContextualContent, relatedToActivity } from "../src/entities/content/japanGraph.js";

test("relie le catalogue par thème, ville et proximité sans proposer le lieu lui-même", () => {
  const place={id:"shrine",nom:"Sanctuaire",villeId:"kyoto",a_proximite:["near"]};
  const graph=buildJapanGraph({lieux:[place,{id:"near",nom:"Jardin voisin",villeId:"kyoto"}],villes:[{id:"kyoto",nom:"Kyoto",region:"Kansai"}],traditions:[{id:"ritual",nom:"Rituel shinto"}],expressions:[{expression:"jp",traduction:"Salut",contexte:"Au sanctuaire"}]});
  const results=relatedToActivity(place,graph,{limit:20});
  assert.ok(results.some(item=>item.id==="tradition:ritual"));
  assert.ok(results.some(item=>item.kind==="phrase"));
  assert.ok(results.some(item=>item.id==="place:near"&&item.reason==="À proximité"));
  assert.ok(!results.some(item=>item.id==="place:shrine"));
  assert.deepEqual(relatedToActivity(null,graph),[]);
  assert.deepEqual(relatedToActivity({nom:"Abstrait"},graph),[]);
});

import { readFileSync } from "node:fs";
import { CONTENT_RELATIONS, graphThemes } from "../src/entities/content/japanGraph.js";
const catalog = JSON.parse(readFileSync(new URL("../src/japan-data.json", import.meta.url), "utf8"));

test("les thèmes utilisent des mots entiers et reconnaissent accents et pluriels", () => {
  assert.deepEqual(graphThemes({ nom: "Un espace à parcourir" }), []);
  assert.ok(graphThemes({ nom: "Les temples et les métros" }).includes("temple"));
  assert.ok(graphThemes({ nom: "Les temples et les métros" }).includes("transport"));
});

test("les liens éditoriaux ciblent des contenus existants et filtrent par intention", () => {
  const graph = buildJapanGraph(catalog);
  for (const [id, themes] of Object.entries(CONTENT_RELATIONS)) {
    assert.ok(graph.some(node => node.id === id), id);
    assert.deepEqual(graph.find(node => node.id === id).themeIds, themes);
  }
  const place = { nom: "Restaurant", themeIds: ["food"] };
  const before = relatedToActivity(place, graph, { purpose: "before", limit: 20 });
  assert.ok(before.some(node => node.id === "code:baguettes"));
  assert.ok(before.every(node => ["tip", "code", "daily"].includes(node.kind)));
  const phrases = relatedToActivity(place, graph, { purpose: "speak" });
  assert.ok(phrases.some(node => node.id === "situation:restaurant"));
  assert.ok(phrases.every(node => ["phrase", "situation"].includes(node.kind)));
});

test("normalise les régions et accepte des relations explicites sans thème commun", () => {
  const place = { id: "custom", nom: "Visite", cityId: "kyoto", relatedContent: ["tradition:rituel"] };
  const graph = buildJapanGraph({ lieux: [place], villes: [{ id: "kyoto", nom: "Kyoto", region: "Kansai" }], regions: [{ id: "kansai", nom: "Kansai" }], traditions: [{ id: "rituel", nom: "Rituel" }] });
  const results = relatedToActivity(place, graph, { purpose: "explore" });
  assert.equal(results[0].id, "tradition:rituel");
  assert.equal(results[0].reason, "Lié à ce lieu");
  assert.ok(results.some(node => node.id === "region:kansai"));
  assert.ok(!results.some(node => node.id === "place:custom"));
  assert.deepEqual(relatedToActivity(place, graph, { purpose: "unknown" }), []);
});

test("récupère les conseils just-in-time par caractéristiques sans logique dans le composant", () => {
  const graph = buildJapanGraph({ lieux: [], traditions: [], codes_sociaux: [], vie_quotidienne: [] });
  for (const [activity, expected] of [[{ type: "onsen" }, "tip:onsen-rules"], [{ categorie: "Sanctuaire shinto" }, "tip:shrine-etiquette"], [{ type: "restaurant" }, "tip:restaurant-tips"], [{ type: "shinkansen" }, "tip:train-car"]]) {
    const results = getContextualContent(activity, graph);
    assert.ok(results.some(item => item.id === expected), `${expected} absent`);
    assert.ok(results.every(item => ["tip", "code", "daily"].includes(item.kind)));
  }
  assert.deepEqual(getContextualContent(null, graph), []);
});

test("préfère la relation explicite d'une activité à une simple ressemblance textuelle", () => {
  const graph = buildJapanGraph({ lieux: [], codes_sociaux: [{ id: "custom", titre: "Conseil", themeIds: ["food"] }] });
  const result = getContextualContent({ type: "restaurant", relatedContent: ["code:custom"] }, graph, { limit: 1 });
  assert.equal(result[0].id, "code:custom");
  assert.equal(result[0].reason, "Lié à ce lieu");
});
