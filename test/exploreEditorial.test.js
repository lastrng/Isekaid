import test from "node:test";
import assert from "node:assert/strict";
import { buildExploreEditorial, editorialPools, pickEditorial } from "../src/features/explore/exploreEditorial.js";

const db = { culture: [{ id: "c1", titre: "Anime moderne", tag: "Pop culture", contenu: "Une histoire" }], repas: [{ id: "r1", romaji: "Ramen", description: "Un bouillon" }] };

test("les façades éditoriales exposent gastronomie et contemporain", () => {
  const pools = editorialPools(db);
  assert.equal(pools.food[0].label, "Gastronomie");
  assert.equal(pools.contemporary[0].id, "c1");
  assert.equal(buildExploreEditorial({ db, date: "2026-09-06" }).featured.id, "c1");
});

test("la sélection éditoriale reste déterministe pour une date", () => {
  const first = pickEditorial(editorialPools(db).food, "2026-09-06", "x");
  const second = pickEditorial(editorialPools(db).food, "2026-09-06", "x");
  assert.equal(first.id, second.id);
});
