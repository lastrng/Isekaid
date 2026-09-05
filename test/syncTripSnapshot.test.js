import test from "node:test";
import assert from "node:assert/strict";
import { syncTripSnapshot } from "../src/services/sync/syncTripSnapshot.js";

test("relit le cloud après une écriture concurrente et conserve les deux nouveaux voyages",async()=>{
  let calls=0;
  const result=await syncTripSnapshot({local:[{id:"local"}],base:[],
    read:async()=>({updated_at:String(calls),trips:calls?[{id:"other"}]:[]}),
    compareAndSet:async()=>++calls>1,
  });
  assert.equal(calls,2);
  assert.deepEqual(new Set(result.map(trip=>trip.id)),new Set(["local","other"]));
});
test("laisse l'envoi en attente quand les trois comparaisons échouent",async()=>{
  let calls=0;
  assert.equal(await syncTripSnapshot({local:[],base:[],read:async()=>({trips:[],updated_at:"v"}),compareAndSet:async()=>{calls++;return false;}}),null);
  assert.equal(calls,3);
});
