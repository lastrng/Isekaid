import assert from "node:assert/strict";
import test from "node:test";
import { countLocalMemoryPhotos, migrateLocalMemoryPhotos, setActivityMemoryPhoto } from "../src/features/my-japan/memoryPhotos.js";

test("attache une photo au bon souvenir sans muter le voyage",()=>{
  const trips=[{id:"t1",jours:[{num:1,activites:[{id:"a1",note:"Matin"},{id:"a2"}]}]}];
  const next=setActivityMemoryPhoto(trips,{tripId:"t1",dayNumber:1,activityId:"a1",photo:"user/photo.jpg"});
  assert.equal(next[0].jours[0].activites[0].memoryPhoto,"user/photo.jpg");
  assert.equal(trips[0].jours[0].activites[0].memoryPhoto,undefined);
  assert.ok(next[0].updatedAt);
});

test("reprend les photos locales et remplace leur contenu par un chemin cloud",async()=>{
  const local="data:image/jpeg;base64,"+Buffer.from("photo").toString("base64");
  const trips=[{id:"t1",jours:[{num:1,activites:[{id:"a1",memoryPhoto:local}]}]}];
  assert.equal(countLocalMemoryPhotos(trips),1);
  const result=await migrateLocalMemoryPhotos(trips,async blob=>blob.size?"user/photo.jpg":null);
  assert.equal(result.changed,true);
  assert.equal(result.trips[0].jours[0].activites[0].memoryPhoto,"user/photo.jpg");
  assert.equal(countLocalMemoryPhotos(result.trips),0);
});
