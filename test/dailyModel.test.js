import test from "node:test";
import assert from "node:assert/strict";
import { buildDailyRitual, completeDailyActivity, dailyProgress } from "../src/features/daily/dailyModel.js";

const db = {
  culture: [{ id: "k", titre: "Kintsugi", contenu: "Réparer" }],
  expressions: [{ id: "ita", expression: "いただきます", traduction: "Je reçois" }],
  repas: [{ id: "ramen", romaji: "Ramen", description: "Bouillon" }],
};

test("le Daily est déterministe pour une date", () => {
  const first = buildDailyRitual({ db, date: "2026-09-06" });
  const second = buildDailyRitual({ db, date: "2026-09-06" });
  assert.deepEqual(first.activities.map(item => item.id), second.activities.map(item => item.id));
  assert.equal(first.date, "2026-09-06");
});

test("la progression et la complétion du rituel sont calculées sur les activités", () => {
  const ritual = buildDailyRitual({ db, date: "2026-09-06" });
  const first = completeDailyActivity(ritual, ritual.activities[0].id);
  assert.equal(dailyProgress(first).done, 1);
  const complete = first.activities.slice(1).reduce((current, item) => completeDailyActivity(current, item.id), first);
  assert.equal(dailyProgress(complete).complete, true);
  assert.ok(complete.completedAt);
});

test("un catalogue absent au premier rendu ne fige pas un Daily vide", () => {
  const empty = buildDailyRitual({ db: {}, date: "2026-09-06" });
  const ready = buildDailyRitual({ db, date: "2026-09-06" });
  assert.equal(empty.activities.length, 0);
  assert.ok(ready.activities.length > 0);
});
