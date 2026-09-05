import assert from "node:assert/strict";
import test from "node:test";
import { backupFingerprint, createCloudBackup, restoreCloudBackup } from "../src/services/sync/cloudBackup.js";

function storage(initial={}){
  const values=new Map(Object.entries(initial));
  return {get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),values};
}

test("sauvegarde les données utilisateur mais pas les secrets techniques",()=>{
  const source=storage({isekaid_weekly_v1:"{\"done\":1}",isekaid_pending_mutations_v1:"secret",isekaid_premium_v1:"fake",other:"x"});
  const backup=createCloudBackup(source);
  assert.equal(backup.values.isekaid_weekly_v1,"{\"done\":1}");
  assert.equal(backup.values.isekaid_pending_mutations_v1,undefined);
  assert.equal(backup.values.isekaid_premium_v1,undefined);
});

test("restaure uniquement les clés applicatives autorisées",()=>{
  const target=storage();
  restoreCloudBackup({version:1,values:{isekaid_ach_v1:"[1]",token:"no"}},target);
  assert.equal(target.getItem("isekaid_ach_v1"),"[1]");
  assert.equal(target.getItem("token"),null);
  assert.equal(backupFingerprint({a:1}),backupFingerprint({a:1}));
});

test("une ancienne sauvegarde ne retire pas une suppression locale",()=>{
  const target=storage({isekaid_deleted_trips_v1:JSON.stringify([{id:"deleted",deletedAt:"2026-09-05"}])});
  restoreCloudBackup({version:1,values:{isekaid_deleted_trips_v1:"[]"}},target);
  assert.equal(JSON.parse(target.getItem("isekaid_deleted_trips_v1"))[0].id,"deleted");
});
