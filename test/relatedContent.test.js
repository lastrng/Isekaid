import assert from "node:assert/strict";
import test from "node:test";
import { contentTags, getRelatedContent } from "../src/entities/content/relatedContent.js";

test("normalise les caractéristiques d’un lieu en tags", () => {
  assert.ok(contentTags({categorie:"Sanctuaire",description:"Une allée de torii"}).includes("sanctuaire"));
  assert.ok(contentTags({categorie:"Sanctuaire",description:"Une allée de torii"}).includes("torii"));
});

test("retourne le contenu contextuel par pertinence sans condition UI", () => {
  const results = getRelatedContent({nom:"Gare de Tokyo",categorie:"Transport",description:"Départ du Shinkansen"});
  assert.equal(results[0].id, "train-car");
});

test("ne propose rien quand aucune relation n’est prouvée", () => {
  assert.deepEqual(getRelatedContent({nom:"Jardin abstrait"}), []);
});
