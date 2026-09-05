import assert from "node:assert/strict";
import test from "node:test";
import { mergeTripSnapshots } from "../src/services/sync/tripSnapshots.js";

test("fusionne les voyages présents sur deux appareils",()=>{
  const merged=mergeTripSnapshots([{id:"local",updatedAt:"2026-09-05T10:00:00Z"}],[{id:"cloud",updatedAt:"2026-09-05T09:00:00Z"}]);
  assert.deepEqual(new Set(merged.map(t=>t.id)),new Set(["local","cloud"]));
});

test("la suppression explicite empêche une ancienne copie de réapparaître",()=>{
  const live={id:"same",updatedAt:"2026-09-06T10:00:00Z"};
  const deleted={id:"same",deletedAt:"2026-09-05T10:00:00Z"};
  const copies=[];
  assert.deepEqual(mergeTripSnapshots([live],[deleted],{onConflict:trip=>copies.push(trip)}),[]);
  assert.deepEqual(copies,[live]);
  assert.equal(mergeTripSnapshots([deleted],[live],{includeDeleted:true})[0].deletedAt,deleted.deletedAt);
});

test("une modification unilatérale gagne sans créer de conflit",()=>{
  const base={id:"same",titre:"Initial",updatedAt:"2026-09-05T10:00:00Z"};
  const local={...base,titre:"Modification",updatedAt:"2026-09-05T09:00:00Z"};
  const conflicts=[];
  assert.equal(mergeTripSnapshots([local],[base],{base:[base],onConflict:x=>conflicts.push(x)})[0].titre,"Modification");
  assert.equal(conflicts.length,0);
});

test("conserve la version perdante lorsque les deux appareils ont modifié le voyage",()=>{
  const base={id:"same",titre:"Initial"};
  const local={...base,titre:"Local",updatedAt:"2026-09-05T10:00:00Z"};
  const remote={...base,titre:"Distant",updatedAt:"2026-09-05T11:00:00Z"};
  const conflicts=[];
  assert.equal(mergeTripSnapshots([local],[remote],{base:[base],onConflict:x=>conflicts.push(x)})[0].titre,"Distant");
  assert.deepEqual(conflicts,[local]);
});

test("conserve la version la plus récemment modifiée",()=>{
  const merged=mergeTripSnapshots(
    [{id:"same",titre:"Téléphone",updatedAt:"2026-09-05T10:00:00Z"}],
    [{id:"same",titre:"Tablette",updatedAt:"2026-09-05T11:00:00Z"}],
  );
  assert.equal(merged[0].titre,"Tablette");
});
