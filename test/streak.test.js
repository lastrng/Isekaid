import test from "node:test";
import assert from "node:assert/strict";

import {
  dayKey,
  daysBetween,
  nextStreakMilestone,
} from "../src/features/progress/streak.js";

test("dayKey utilise une date locale stable", () => {
  assert.equal(dayKey(new Date(2026, 8, 4, 12)), "2026-09-04");
});

test("daysBetween calcule un écart calendaire", () => {
  assert.equal(daysBetween("2026-09-01", "2026-09-04"), 3);
});

test("nextStreakMilestone renvoie le prochain palier", () => {
  assert.equal(nextStreakMilestone(3)?.day, 7);
  assert.equal(nextStreakMilestone(100), null);
});
