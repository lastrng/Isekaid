import test from "node:test";
import assert from "node:assert/strict";

import { currentSeasonKey, seasonalLieux } from "../src/lib/seasons.js";

test("currentSeasonKey couvre les quatre saisons", () => {
  assert.equal(currentSeasonKey(new Date(2026, 3, 1)), "printemps");
  assert.equal(currentSeasonKey(new Date(2026, 6, 1)), "été");
  assert.equal(currentSeasonKey(new Date(2026, 9, 1)), "automne");
  assert.equal(currentSeasonKey(new Date(2026, 0, 1)), "hiver");
});

test("seasonalLieux filtre sans muter le catalogue", () => {
  const database = {
    lieux: [
      { id: "a", saison_ideale: "printemps" },
      { id: "b", saison_ideale: "hiver" },
    ],
  };
  assert.deepEqual(seasonalLieux(database, "hiver"), [database.lieux[1]]);
  assert.equal(database.lieux.length, 2);
});
