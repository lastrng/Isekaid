import { setMemoryNote } from "./memoryJournal.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { resolvePastTrip } from "../../entities/trip/tripLifecycle.js";
import { loadTrips, saveTrips } from "../travel/tripModel.js";
import { buildMyJapanSummary } from "./myJapanModel.js";
import { compressMemoryPhoto, countLocalMemoryPhotos, migrateLocalMemoryPhotos, setActivityMemoryPhoto } from "./memoryPhotos.js";
import { backupFingerprint, createCloudBackup, loadBackupMeta, saveBackupMeta } from "../../services/sync/cloudBackup.js";
import { enqueueMutation, flushPendingMutations, loadPendingMutations } from "../../services/sync/pendingMutations.js";
import { trackProductEvent } from "../../services/analytics/analytics.js";
import { createMemoryPhotoUrl, deleteMemoryPhoto, saveCloudBackup, saveProgress, saveTripsCloud, supabaseEnabled, uploadMemoryPhoto } from "../../supabase.js";

function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
}

export function useMyJapanProfile({db,session,expressionProgress,kanaProgress,favorites}){
  const [trips,setTrips]=useState(()=>loadTrips());
  const [syncTick,setSyncTick]=useState(0);
  useEffect(()=>{const reload=()=>{setTrips(loadTrips());setSyncTick(t=>t+1);};window.addEventListener("isekaid:trips-synced",reload);return()=>window.removeEventListener("isekaid:trips-synced",reload);},[]);
  const summary=useMemo(()=>buildMyJapanSummary({trips,cities:db?.villes||[],places:db?.lieux||[],regionsCatalog:db?.regions||[],expressionProgress,kanaProgress,favorites}),[db,trips,expressionProgress,kanaProgress,favorites]);
  const persistTrips=useCallback(next=>{setTrips(next);saveTrips(next);},[]);

  const resolveTrip=useCallback((tripId,didTravel)=>{
    setTrips(current=>{
      const next=current.map(trip=>trip.id===tripId?resolvePastTrip(trip,didTravel):trip);
      saveTrips(next);
      if(session?.user&&supabaseEnabled){enqueueMutation({type:"trips",userId:session.user.id,payload:next});flushPendingMutations({trips:mutation=>saveTripsCloud(mutation.userId,mutation.payload)});}
      return next;
    });
    if(didTravel)trackProductEvent("trip_completed",{});
  },[session?.user?.id]);

  const changeNote=useCallback(async(memory,note)=>{
    const next=setMemoryNote(loadTrips(),memory,note);
    if(!saveTrips(next)) throw new Error("storage_full");
    setTrips(next);
    if(session?.user&&supabaseEnabled){
      enqueueMutation({type:"trips",userId:session.user.id,payload:next});
      await flushPendingMutations({trips:mutation=>saveTripsCloud(mutation.userId,mutation.payload)});
    }
    setSyncTick(t=>t+1);
  },[session?.user?.id]);

  const getPhotoUrl=useCallback(async photo=>!photo?null:photo.startsWith?.("data:")?photo:createMemoryPhotoUrl(photo),[]);
  const changePhoto=useCallback(async(memory,file)=>{
    let photo=null;
    if(file){
      const compressed=await compressMemoryPhoto(file);
      if(session?.user&&supabaseEnabled)photo=await uploadMemoryPhoto(session.user.id,compressed);
      if(!photo)photo=await blobToDataUrl(compressed);
    }
    const next=setActivityMemoryPhoto(loadTrips(),{tripId:memory.tripId,dayNumber:memory.dayNumber,activityId:memory.activityId,photo});
    persistTrips(next);
    if(memory.photo&&memory.photo!==photo)deleteMemoryPhoto(memory.photo);
    if(session?.user&&supabaseEnabled){enqueueMutation({type:"trips",userId:session.user.id,payload:next});flushPendingMutations({trips:mutation=>saveTripsCloud(mutation.userId,mutation.payload)});}
    setSyncTick(t=>t+1);
  },[session?.user?.id,persistTrips]);

  const retrySync=useCallback(async()=>{
    if(!session?.user||!supabaseEnabled)return;
    const migrated=await migrateLocalMemoryPhotos(loadTrips(),blob=>uploadMemoryPhoto(session.user.id,blob));
    if(migrated.changed){persistTrips(migrated.trips);enqueueMutation({type:"trips",userId:session.user.id,payload:migrated.trips});}
    await flushPendingMutations({trips:mutation=>saveTripsCloud(mutation.userId,mutation.payload),progress:mutation=>saveProgress(mutation.userId,mutation.payload)});
    const backup=createCloudBackup();
    if(backup&&await saveCloudBackup(session.user.id,backup))saveBackupMeta({userId:session.user.id,fingerprint:backupFingerprint(backup),syncedAt:new Date().toISOString()});
    setSyncTick(t=>t+1);
  },[session?.user?.id,persistTrips]);

  useEffect(()=>{if(!session?.user)return;retrySync();window.addEventListener("online",retrySync);return()=>window.removeEventListener("online",retrySync);},[session?.user?.id,retrySync]);
  const syncStatus=useMemo(()=>{
    const meta=loadBackupMeta();
    const pending=loadPendingMutations().filter(item=>item.userId===session?.user?.id);
    return {pending:pending.length+countLocalMemoryPhotos(trips),hasError:pending.some(item=>(item.attempts||0)>0),lastSyncedAt:meta?.userId===session?.user?.id?meta.syncedAt:null};
  },[trips,syncTick,session?.user?.id]);

  return {summary,resolveTrip,getPhotoUrl,changePhoto,changeNote,retrySync,syncStatus};
}
