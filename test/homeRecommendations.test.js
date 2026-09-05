import test from "node:test";
import assert from "node:assert/strict";
import { getHomeRecommendations } from "../src/features/home/homeRecommendations.js";

const context = state => ({ state, nextActivity: state === "in_japan" ? { id: "a" } : null, nextTrip: state === "planning" ? { trip: { id: "t" }, timing: { daysUntil: 12 } } : null });

test("limite chaque accueil à cinq actions et garde des identifiants uniques", () => {
  for (const state of ["dreaming", "planning", "soon", "in_japan", "returned", "japan_lover"]) {
    const items = getHomeRecommendations({ context: context(state), hasInspiration: true, hasRelated: true });
    assert.ok(items.length >= 3 && items.length <= 5);
    assert.equal(new Set(items.map(item => item.id)).size, items.length);
  }
});

test("les priorités varient selon l'état utilisateur", () => {
  assert.equal(getHomeRecommendations({ context: context("in_japan") })[0].id, "today");
  assert.equal(getHomeRecommendations({ context: context("planning") })[0].id, "itinerary");
  assert.equal(getHomeRecommendations({ context: context("returned"), hasRelated: true })[0].id, "journal");
  assert.equal(getHomeRecommendations({ context: context("dreaming"), hasInspiration: true })[0].id, "inspiration");
});

test("un projet sans date reste orienté préparation", () => {
  const items = getHomeRecommendations({ context: { state: "planning", nextTrip: null } });
  assert.equal(items[0].id, "itinerary");
  assert.ok(items.some(item => item.id === "readiness"));
});
