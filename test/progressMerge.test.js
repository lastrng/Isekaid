import test from "node:test";
import assert from "node:assert/strict";
import { mergeProgress } from "../src/services/sync/progressMerge.js";

test("fusionne les changements de profil sur des champs distincts",()=>{
  const base={profile:{name:"A",level:"beginner"}};
  const result=mergeProgress(base,{profile:{name:"B",level:"beginner"}},{profile:{name:"A",level:"advanced"}});
  assert.deepEqual(result.snapshot.profile,{name:"B",level:"advanced"});
  assert.equal(result.conflicts.length,0);
});
test("réunit les ajouts de favoris et respecte les retraits connus",()=>{
  const base={favorites:[{id:"removed"},{id:"kept"}]};
  const result=mergeProgress(base,{favorites:[{id:"kept"},{id:"local"}]},{favorites:[{id:"removed"},{id:"kept"},{id:"remote"}]});
  assert.deepEqual(new Set(result.snapshot.favorites.map(item=>item.id)),new Set(["kept","local","remote"]));
});
test("sans base un favori manquant n'est pas assimilé à une suppression",()=>{
  assert.equal(mergeProgress({}, {favorites:[]},{favorites:[{id:"other"}]}).snapshot.favorites.length,1);
});
test("signale un conflit sur le même champ et préserve l'enregistrement SRS complet",()=>{
  const base={profile:{name:"A"},kana_progress:{"あ":{last:1,seen:2,known:1}}};
  const local={profile:{name:"B"},kana_progress:{"あ":{last:2,seen:3,known:2}}};
  const remote={profile:{name:"C"},kana_progress:{"あ":{last:3,seen:3,known:1}}};
  const result=mergeProgress(base,local,remote);
  assert.equal(result.snapshot.profile.name,"B");
  assert.deepEqual(result.snapshot.kana_progress["あ"],remote.kana_progress["あ"]);
  assert.equal(result.conflicts.length,2);
});
test("un message arrivé pendant l'envoi ne remplace pas la modification locale suivante",()=>{
  const sent={profile:{name:"A",level:"beginner"}};
  const result=mergeProgress(sent,{profile:{name:"B",level:"beginner"}},{profile:{name:"A",level:"advanced"}});
  assert.deepEqual(result.snapshot.profile,{name:"B",level:"advanced"});
});
test("garde la mission la plus récente et n'accepte pas de colonnes arbitraires",()=>{
  const result=mergeProgress({}, {mission:{day:"2026-09-06",done:[]},user_id:"fake",trips:[]},{mission:{day:"2026-09-05",done:["x"]}});
  assert.equal(result.snapshot.mission.day,"2026-09-06");
  assert.equal(result.snapshot.user_id,undefined);assert.equal(result.snapshot.trips,undefined);
});
test("fusionne les activités Daily cochées sur deux appareils",()=>{
  const base={settings:{daily:{date:"2026-09-06",activities:[{id:"a",done:false},{id:"b",done:false}]}}};
  const local={settings:{daily:{date:"2026-09-06",activities:[{id:"a",done:true},{id:"b",done:false}]}}};
  const remote={settings:{daily:{date:"2026-09-06",activities:[{id:"a",done:false},{id:"b",done:true}]}}};
  const result=mergeProgress(base,local,remote);
  const activities=result.snapshot.settings.daily.activities;
  assert.equal(activities.find(item=>item.id==="a").done,true);
  assert.equal(activities.find(item=>item.id==="b").done,true);
  assert.equal(result.conflicts.length,0);
});
