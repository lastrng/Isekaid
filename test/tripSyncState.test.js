import test from "node:test";
import assert from "node:assert/strict";
import { markTripDeleted, withTripDeletions, recordTripDeletions, loadTripConflicts, preserveTripConflict } from "../src/services/sync/tripSyncState.js";

test("la trace locale et distante survit aux snapshots ne contenant plus le voyage",()=>{
  const previous=globalThis.localStorage;
  const values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  try {
    markTripDeleted("local");
    recordTripDeletions([{id:"remote",deletedAt:"2026-09-05T10:00:00Z"}]);
    const snapshot=withTripDeletions([{id:"local",titre:"Ancienne copie"},{id:"kept"}]);
    assert.equal(snapshot.find(trip=>trip.id==="local").titre,undefined);
    assert.ok(snapshot.find(trip=>trip.id==="remote").deletedAt);
    assert.ok(snapshot.find(trip=>trip.id==="kept"));
    preserveTripConflict("a",{id:"kept",titre:"Ma version"});
    preserveTripConflict("a",{id:"kept",titre:"Ma version"});
    assert.equal(loadTripConflicts("a").length,1);
    assert.equal(loadTripConflicts("b").length,0);
  } finally {globalThis.localStorage=previous;}
});
