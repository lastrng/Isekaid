import test from "node:test";
import assert from "node:assert/strict";
import { syncProgress, progressConflictKey, rememberProgressBase, progressBaseKey } from "../src/services/sync/progressSync.js";

test("relit après concurrence, archive les deux versions et conserve les bases des autres rubriques",async()=>{
  const previous=globalThis.localStorage;const values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  try {
    rememberProgressBase("a",{profile:{name:"Initial"},favorites:[{id:"f"}]});
    let writes=0;
    const merged=await syncProgress({userId:"a",local:{profile:{name:"Local"}},read:async()=>({profile:{name:"Remote"},updated_at:String(writes)}),compareAndSet:async()=>++writes===2});
    assert.equal(merged.profile.name,"Local");assert.equal(writes,2);
    const copies=JSON.parse(values.get(progressConflictKey("a")));
    assert.equal(copies.length,2);
    assert.ok(copies.some(item=>item.snapshot.profile.name==="Remote"));
    assert.ok(copies.some(item=>item.snapshot.profile.name==="Local"));
    assert.deepEqual(JSON.parse(values.get(progressBaseKey("a"))).favorites,[{id:"f"}]);
    globalThis.localStorage.setItem=()=>{throw new Error("full");};
    const failed=await syncProgress({userId:"a",local:{profile:{name:"New"}},read:async()=>({profile:{name:"Other"}}),compareAndSet:async()=>{throw new Error("must_not_write");}});
    assert.equal(failed,null);
  } finally {globalThis.localStorage=previous;}
});
