import test from "node:test";
import assert from "node:assert/strict";

import {
  HIRAGANA,
  KATAKANA,
  deckMastery,
  getDueForReview,
  recordKana,
  srsStats,
} from "../src/features/learn/kanaModel.js";

test("les deux syllabaires de base contiennent 46 caractères", () => {
  assert.equal(HIRAGANA.length, 46);
  assert.equal(KATAKANA.length, 46);
  assert.equal(new Set(HIRAGANA.map((item) => item.k)).size, 46);
});

test("recordKana fait progresser puis redescendre une carte", () => {
  const learned = recordKana({}, "あ", true);
  assert.equal(learned["あ"].box, 1);
  assert.equal(learned["あ"].known, 1);

  const missed = recordKana(learned, "あ", false);
  assert.equal(missed["あ"].box, 0);
  assert.equal(missed["あ"].seen, 2);
});

test("getDueForReview exclut les cartes inconnues et maîtrisées", () => {
  const now = Date.now();
  const due = getDueForReview(
    {
      "あ": { box: 2, due: now - 1000 },
      "い": { box: 5, due: now - 1000 },
    },
    HIRAGANA.slice(0, 3),
  );
  assert.deepEqual(due.map((item) => item.k), ["あ"]);
});

test("les statistiques et la maîtrise partagent les mêmes données", () => {
  const progress = {
    "あ": { seen: 4, known: 4, box: 5 },
    "い": { seen: 4, known: 1, box: 1, due: Date.now() - 1 },
  };
  assert.deepEqual(deckMastery(progress, HIRAGANA.slice(0, 2)), { mastered: 1, total: 2 });
  assert.deepEqual(srsStats(progress), { studied: 2, mastered: 1, learning: 1, due: 1 });
});
