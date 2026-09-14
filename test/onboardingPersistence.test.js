import test from "node:test";
import assert from "node:assert/strict";
import { activateAccountStorage, currentStorageOwner } from "../src/services/auth/accountStorage.js";
import { completeOnboardingState, emptyOnboardingState, markGuideSeen, mergeOnboardingStates, normalizeOnboardingState, onboardingEntry, resetContextualGuides } from "../src/features/onboarding/state/onboardingState.js";
import { mergeProgress } from "../src/services/sync/progressMerge.js";
import { createCloudBackup, restoreCloudBackup } from "../src/services/sync/cloudBackup.js";

function storage(initial={}) {
  const data=new Map(Object.entries(initial));
  return {get length(){return data.size;},key:i=>[...data.keys()][i],getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
test("A → logout → B → A preserves isolated profiles, badges, favourites and guides",()=>{
  const local=storage();
  activateAccountStorage("A",local);
  local.setItem("isekaid_profile_v1",'{"name":"Alice"}');
  local.setItem("isekaid_favs_v1",'["A"]');
  local.setItem("isekaid_ach_v1",'["first_day"]');
  local.setItem("isekaid_onboarding_state_v2_A",JSON.stringify(completeOnboardingState(emptyOnboardingState())));
  activateAccountStorage(null,local);
  assert.equal(local.getItem("isekaid_profile_v1"),null);
  activateAccountStorage("B",local);
  assert.equal(local.getItem("isekaid_ach_v1"),null);
  assert.equal(local.getItem("isekaid_favs_v1"),null);
  assert.equal(local.getItem("isekaid_onboarding_state_v2_B"),null);
  local.setItem("isekaid_profile_v1",'{"name":"Bob"}');
  activateAccountStorage("A",local);
  assert.equal(currentStorageOwner(local),"A");
  assert.equal(local.getItem("isekaid_profile_v1"),'{"name":"Alice"}');
  assert.equal(JSON.parse(local.getItem("isekaid_onboarding_state_v2_A")).completed,true);
  activateAccountStorage("B",local);
  assert.equal(local.getItem("isekaid_profile_v1"),'{"name":"Bob"}');
});
test("legacy data is only adopted with evidence of ownership",()=>{
  const unknown=storage({isekaid_profile_v1:'{"name":"old"}'});
  activateAccountStorage("new-account",unknown);
  assert.equal(unknown.getItem("isekaid_profile_v1"),null);
  activateAccountStorage(null,unknown);
  assert.equal(unknown.getItem("isekaid_profile_v1"),'{"name":"old"}');
  const known=storage({isekaid_profile_v1:'{"name":"A"}',isekaid_cloud_backup_meta_v1:'{"userId":"A"}'});
  assert.equal(activateAccountStorage("A",known),false);
  assert.equal(known.getItem("isekaid_profile_v1"),'{"name":"A"}');
});
test("quota failure before account switching preserves current data",()=>{
  const local=storage({isekaid_device_owner_v1:"A",isekaid_profile_v1:'{"name":"A"}'});
  local.setItem=()=>{throw Error("quota");};
  assert.throws(()=>activateAccountStorage("B",local),/quota/);
  assert.equal(currentStorageOwner(local),"A");
  assert.equal(local.getItem("isekaid_profile_v1"),'{"name":"A"}');
});
test("backup never transfers identity, account archives, profile or onboarding",()=>{
  const local=storage({isekaid_device_owner_v1:"A",isekaid_account_cache_v1_B:"private",isekaid_profile_v1:"private",isekaid_onboarding_state_v2_B:"private"});
  assert.deepEqual(createCloudBackup(local).values,{});
  const other=storage();
  restoreCloudBackup({version:1,values:Object.fromEntries(Array.from({length:local.length},(_,i)=>{const k=local.key(i);return [k,local.getItem(k)];}))},other);
  assert.equal(other.length,0);
});
test("stale cloud responses and concurrent devices retain independent completed guides",()=>{
  const base=emptyOnboardingState();
  const local=markGuideSeen(completeOnboardingState(base),"today");
  const remote=markGuideSeen(completeOnboardingState(base),"travel");
  const merged=mergeOnboardingStates(local,remote);
  assert.equal(merged.completed,true);
  assert.equal(merged.seenGuides.today,true);
  assert.equal(merged.seenGuides.travel,true);
  assert.deepEqual(mergeOnboardingStates(merged,base).seenGuides,merged.seenGuides);
  const sync=mergeProgress({settings:{onboarding:remote}},{settings:{onboarding:local}},{settings:{onboarding:remote}});
  assert.equal(sync.snapshot.settings.onboarding.seenGuides.today,true);
  assert.equal(sync.snapshot.settings.onboarding.seenGuides.travel,true);
  assert.equal(sync.conflicts.length,0);
});
test("guide reset survives stale cloud while presentation and progress stay complete",()=>{
  const before=markGuideSeen(completeOnboardingState(emptyOnboardingState()),"today");
  const reset=resetContextualGuides(before);
  const after=mergeOnboardingStates(reset,before);
  assert.equal(after.completed,true);
  assert.equal(after.seenGuides.today,false);
});
test("normalizes corrupt flags, resumes bounded steps and respects future versions",()=>{
  assert.equal(normalizeOnboardingState({completed:true}).version,1);
  assert.equal(normalizeOnboardingState({seenGuides:{today:"false"}}).seenGuides.today,false);
  assert.deepEqual(normalizeOnboardingState({presentation:{mode:"new",index:99}}).presentation,{mode:"new",index:4});
  assert.equal(onboardingEntry({hasProfile:true,state:{version:1,completed:true}}),"update");
  assert.equal(onboardingEntry({hasProfile:true,state:{version:3,completed:true}}),"app");
  assert.equal(onboardingEntry({hasProfile:true,state:{version:2,completed:false,presentation:{mode:"new",index:4}}}),"new");
  assert.equal(mergeOnboardingStates({version:3,completed:false},{version:2,completed:true}).completed,false);
});
