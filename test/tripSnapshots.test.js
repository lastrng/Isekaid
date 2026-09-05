import assert from "node:assert/strict";
import test from "node:test";
import { mergeTripSnapshots } from "../src/services/sync/tripSnapshots.js";

test("fusionne les voyages présents sur deux appareils",()=>{
  const merged=mergeTripSnapshots([{id:"local",updatedAt:"2026-09-05T10:00:00Z"}],[{id:"cloud",updatedAt:"2026-09-05T09:00:00Z"}]);
  assert.deepEqual(new Set(merged.map(t=>t.id)),new Set(["local","cloud"]));
});

test("conserve la version la plus récemment modifiée",()=>{
  const merged=mergeTripSnapshots(
    [{id:"same",titre:"Téléphone",updatedAt:"2026-09-05T10:00:00Z"}],
    [{id:"same",titre:"Tablette",updatedAt:"2026-09-05T11:00:00Z"}],
  );
  assert.equal(merged[0].titre,"Tablette");
});
