import test from "node:test";
import assert from "node:assert/strict";

import {
  alignWords,
  extractSituationJP,
  jpMain,
  jpSub,
} from "../src/lib/japaneseText.js";

const entry = { jp: "東京", kana: "とうきょう", romaji: "Tōkyō" };

test("jpMain respecte le mode d'écriture", () => {
  assert.equal(jpMain(entry, "kanji"), "東京");
  assert.equal(jpMain(entry, "kana"), "とうきょう");
  assert.equal(jpMain(entry, "romaji"), "Tōkyō");
});

test("jpSub fournit une graphie complémentaire", () => {
  assert.equal(jpSub(entry, "romaji"), "東京");
  assert.equal(jpSub(entry, "kana"), "Tōkyō");
});

test("extractSituationJP extrait uniquement une citation", () => {
  assert.equal(extractSituationJP("On te demande : « お名前は？ »"), "お名前は？");
  assert.equal(extractSituationJP("Aucune réplique ici"), null);
});

test("alignWords associe les segments japonais et français", () => {
  const result = alignWords(
    [{ jp: "私", fr: "je" }, { jp: "は学生です", fr: "suis étudiant" }],
    "je suis étudiant",
  );
  assert.deepEqual(result.jpSegs, [
    { text: "私", wordIndex: 0 },
    { text: "は学生です", wordIndex: 1 },
  ]);
  assert.equal(result.frSegs.map((segment) => segment.text).join(""), "je suis étudiant");
});
