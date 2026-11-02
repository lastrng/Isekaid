import assert from "node:assert/strict";
import test from "node:test";
import { tripSubFromInitialView } from "../src/features/travel/travelInitialView.js";

test("la route de création ne confond pas une chaîne avec String.prototype.sub", () => {
  assert.equal(tripSubFromInitialView("new"), "day");
  assert.equal(tripSubFromInitialView("sos"), "day");
  assert.notEqual(tripSubFromInitialView("new"), String.prototype.sub);
});

test("la sous-vue d'un voyage est conservée uniquement si elle est explicite", () => {
  assert.equal(tripSubFromInitialView({ tripId: "trip-1", sub: "checklist" }), "checklist");
  assert.equal(tripSubFromInitialView({ tripId: "trip-1", sub: null }), "day");
  assert.equal(tripSubFromInitialView(null), "day");
});
