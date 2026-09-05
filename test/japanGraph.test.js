import test from "node:test";
import assert from "node:assert/strict";
import { buildJapanGraph, relatedToActivity } from "../src/entities/content/japanGraph.js";

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
