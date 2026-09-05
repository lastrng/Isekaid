import assert from "node:assert/strict";
import test from "node:test";
import { findSosCategory, findSosPhrase, SOS_CATEGORIES } from "../src/features/sos/sosData.js";

test("les huit situations SOS sont embarquées avec quatre écritures", () => {
  assert.equal(SOS_CATEGORIES.length, 8);
  for (const category of SOS_CATEGORIES) for (const phrase of category.phrases) {
    assert.ok(phrase.japanese && phrase.kana && phrase.romaji && phrase.french);
  }
});

test("retrouve catégories et phrases par identifiant stable", () => {
  assert.equal(findSosCategory("sick")?.emoji, "🏥");
  assert.equal(findSosPhrase("help-now")?.japanese, "助けてください。");
  assert.equal(findSosPhrase("missing"), null);
});
