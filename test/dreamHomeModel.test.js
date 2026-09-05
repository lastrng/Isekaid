import test from "node:test";
import assert from "node:assert/strict";
import { buildDreamHome } from "../src/features/home/dreamHomeModel.js";
const currentDate = new Date("2026-09-05T10:00:00Z");
test("propose une inspiration déterministe correspondant aux intérêts connus", () => {
  const db = { lieux: [{ id: "a", interets: ["nature"] }, { id: "b", interets: ["gastro"] }], traditions: [{ id: "t" }] };
  const input = { db, user: { why: ["gastro"] }, currentDate };
  const before = JSON.stringify(input);
  const model = buildDreamHome(input);
  assert.equal(model.place.id, "b");
  assert.equal(model.tradition.id, "t");
  assert.equal(model.personalized, true);
  assert.deepEqual(buildDreamHome(input), model);
  assert.equal(JSON.stringify(input), before);
});
test("les catalogues vides et les intérêts inconnus ont un repli explicite", () => {
  assert.deepEqual(buildDreamHome({ currentDate }), { place: null, tradition: null, personalized: false });
  assert.equal(buildDreamHome({ currentDate, user: { why: ["unknown"] }, db: { lieux: [{ id: "a" }] } }).place.id, "a");
});
