import test from "node:test";
import assert from "node:assert/strict";
import { contentReadingId, isContentRead, markContentRead, readingCount } from "../src/features/explore/contentReading.js";

test("la progression de lecture utilise un identifiant stable sans muter l'état précédent",()=>{
  const before={version:1,read:{}};
  const item={id:"onsen",titre:"Le onsen"};
  const next=markContentRead(before,"vie",item,"2026-09-10T10:00:00.000Z");
  assert.deepEqual(before,{version:1,read:{}});
  assert.equal(contentReadingId("vie",item),"vie:onsen");
  assert.equal(isContentRead(next,"vie",item),true);
  assert.equal(readingCount(next),1);
});

test("les contenus historiques sans id gardent un repli par titre",()=>{
  assert.equal(contentReadingId("culture",{titre:"Le manga"}),"culture:Le manga");
  assert.equal(contentReadingId("culture",{}),null);
});
