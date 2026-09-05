import assert from "node:assert/strict";
import test from "node:test";
import { enqueueMutation, flushPendingMutations, loadPendingMutations } from "../src/services/sync/pendingMutations.js";

function withStorage(run) {
  const old=globalThis.localStorage; const data=new Map();
  globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  return Promise.resolve(run()).finally(()=>{globalThis.localStorage=old;});
}

test("conserve seulement le dernier snapshot d’un même utilisateur",()=>withStorage(()=>{
  enqueueMutation({type:"trips",userId:"u1",payload:[1]});
  enqueueMutation({type:"trips",userId:"u1",payload:[1,2]});
  assert.equal(loadPendingMutations().length,1);
  assert.deepEqual(loadPendingMutations()[0].payload,[1,2]);
}));

test("retire une mutation réussie et conserve un échec",()=>withStorage(async()=>{
  enqueueMutation({type:"trips",userId:"u1",payload:[]});
  let result=await flushPendingMutations({trips:async()=>false});
  assert.equal(result.remaining,1); assert.equal(loadPendingMutations()[0].attempts,1);
  result=await flushPendingMutations({trips:async()=>true});
  assert.equal(result.remaining,0);
}));

for (const success of [true,false]) {
  test(`préserve les modifications arrivées pendant un envoi ${success?"réussi":"échoué"}`,()=>withStorage(async()=>{
    enqueueMutation({type:"trips",userId:"u1",payload:[1],createdAt:1});
    const result=await flushPendingMutations({trips:async()=>{
      enqueueMutation({type:"trips",userId:"u1",payload:[1,2],createdAt:2});
      enqueueMutation({type:"progress",userId:"u1",payload:{done:true}});
      return success;
    }});
    assert.equal(result.remaining,2);
    const pending=loadPendingMutations();
    assert.deepEqual(pending.find(item=>item.type==="trips").payload,[1,2]);
    assert.equal(pending.find(item=>item.type==="trips").attempts,0);
    assert.equal(pending.find(item=>item.type==="progress").payload.done,true);
    await flushPendingMutations({trips:async()=>true,progress:async()=>true});
    assert.equal(loadPendingMutations().length,0);
  }));
}
