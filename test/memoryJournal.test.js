import assert from "node:assert/strict";
import test from "node:test";
import { filterMemories, setMemoryNote } from "../src/features/my-japan/memoryJournal.js";
import { buildMyJapanSummary } from "../src/features/my-japan/myJapanModel.js";

test("recherche sans accents et combine les filtres du carnet", () => {
  const memories = [
    {tripId:"a",placeName:"Temple",tripTitle:"Kyoto",note:"Thé délicieux",photo:"a.jpg"},
    {tripId:"b",placeName:"Temple",tripTitle:"Tokyo",note:"Thé délicieux"},
  ];
  assert.equal(filterMemories(memories,{query:"the delicieux",tripId:"a",photosOnly:true}).length,1);
  assert.equal(filterMemories(memories,{query:"absent"}).length,0);
});

test("modifie uniquement la note ciblée et conserve les photos et activités", () => {
  const trips=[{id:"a",jours:[{num:1,activites:[{id:"x",note:"Avant",memoryPhoto:"photo.jpg",fait:true}]},{num:2,activites:[{id:"x",note:"Autre jour"}]}]}];
  const updated=setMemoryNote(trips,{tripId:"a",dayNumber:1,activityId:"x"},"  Après  ");
  assert.equal(updated[0].jours[0].activites[0].note,"Après");
  assert.equal(updated[0].jours[0].activites[0].memoryPhoto,"photo.jpg");
  assert.equal(updated[0].jours[1].activites[0].note,"Autre jour");
  assert.equal(trips[0].jours[0].activites[0].note,"Avant");
  assert.throws(()=>setMemoryNote(trips,{tripId:"absent",activityId:"x"},"Texte"));
});

test("le carnet permet de raconter un lieu effectué même sans note préalable", () => {
  const summary=buildMyJapanSummary({trips:[{id:"a",status:"completed",jours:[{num:1,activites:[{id:"x",fait:true},{id:"y",fait:false}]}]}]});
  assert.equal(summary.memories.length,1);
  assert.equal(summary.memories[0].note,"");
  assert.equal(summary.memories[0].activityId,"x");
});
