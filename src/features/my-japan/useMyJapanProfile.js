import { setMemoryNote } from "./memoryJournal.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { resolvePastTrip } from "../../entities/trip/tripLifecycle.js";
import { loadTrips, normalizeTrip, saveTrips } from "../travel/tripModel.js";
import { buildMyJapanSummary } from "./myJapanModel.js";
import {
  addActivityMemoryPhotos,
  compressMemoryPhoto,
  countLocalMemoryPhotos,
  discardPendingMemoryPhoto,
  normalizeMemoryPhotos,
  removeActivityMemoryPhoto,
  reorderActivityMemoryPhoto,
  resolvePendingMemoryPhoto,
  storePendingMemoryPhoto,
  updateActivityMemoryPhoto,
} from "./memoryPhotos.js";
import { backupFingerprint, createCloudBackup, loadBackupMeta, saveBackupMeta } from "../../services/sync/cloudBackup.js";
import { enqueueMutation, flushPendingMutations, loadPendingMutations } from "../../services/sync/pendingMutations.js";
import { mergeTripSnapshots } from "../../services/sync/tripSnapshots.js";
import { trackProductEvent } from "../../services/analytics/analytics.js";
import { createMemoryPhotoUrl, deleteMemoryPhoto, fetchTrips, saveCloudBackup, saveProgress, saveTripsCloud, supabaseEnabled, uploadMemoryPhoto } from "../../supabase.js";

function photoId(){return globalThis.crypto?.randomUUID?.()||`photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;}

export function useMyJapanProfile({db,session,expressionProgress,kanaProgress,favorites,prefectureProgress,streak}){
  const [trips,setTrips]=useState(()=>loadTrips());
  const [syncTick,setSyncTick]=useState(0);
  useEffect(()=>{const reload=()=>{setTrips(loadTrips());setSyncTick(t=>t+1);};window.addEventListener("isekaid:trips-synced",reload);return()=>window.removeEventListener("isekaid:trips-synced",reload);},[]);
  useEffect(()=>{
    if(!session?.user||!supabaseEnabled)return;
    let cancelled=false;
    (async()=>{
      await flushPendingMutations({trips:mutation=>saveTripsCloud(mutation.userId,mutation.payload)});
      if(cancelled||loadPendingMutations().some(item=>item.type==="trips"&&item.userId===session.user.id))return;
      const cloud=await fetchTrips(session.user.id);
      if(cancelled||!Array.isArray(cloud))return;
      const current=loadTrips();
      const merged=mergeTripSnapshots(current,cloud).map(normalizeTrip);
      if(JSON.stringify(current)!==JSON.stringify(merged)){saveTrips(merged);setTrips(merged);}
      if(JSON.stringify(cloud.filter(trip=>!trip.deletedAt))!==JSON.stringify(merged)){
        enqueueMutation({type:"trips",userId:session.user.id,payload:merged});
        await flushPendingMutations({trips:mutation=>saveTripsCloud(mutation.userId,mutation.payload)});
      }
    })().catch(error=>console.warn("[my-japan] synchronisation des voyages indisponible:",error?.message));
    return()=>{cancelled=true;};
  },[session?.user?.id]);
  const summary=useMemo(()=>buildMyJapanSummary({trips,cities:db?.villes||[],places:db?.lieux||[],regionsCatalog:db?.regions||[],expressionProgress,kanaProgress,favorites,prefectureProgress,streak,db}),[db,trips,expressionProgress,kanaProgress,favorites,prefectureProgress,streak]);
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

  const persistMemoryTrips=useCallback(async next=>{
    if(!saveTrips(next))throw new Error("storage_full");
    setTrips(next);
    if(session?.user&&supabaseEnabled){
      enqueueMutation({type:"trips",userId:session.user.id,payload:next});
      await flushPendingMutations({trips:mutation=>saveTripsCloud(mutation.userId,mutation.payload)});
    }
    setSyncTick(t=>t+1);
  },[session?.user?.id]);

  const getPhotoUrl=useCallback(async photo=>{
    if(!photo)return null;
    const normalized=typeof photo==="string"?{storagePath:photo}:photo;
    if(normalized.localKey){
      const blob=await resolvePendingMemoryPhoto(normalized);
      return blob?URL.createObjectURL(blob):null;
    }
    if(normalized.storagePath?.startsWith?.("data:"))return normalized.storagePath;
    return createMemoryPhotoUrl(normalized.storagePath);
  },[]);

  const addMemoryPhotos=useCallback(async(memory,files,{onProgress}={})=>{
    const selected=Array.from(files||[]);
    if(!selected.length)return {uploaded:0,pending:0};
    let next=loadTrips();
    let uploaded=0;
    let pending=0;
    for(let index=0;index<selected.length;index+=1){
      onProgress?.("compressing",index,selected.length);
      const optimized=await compressMemoryPhoto(selected[index]);
      const id=photoId();
      let entry={id,caption:"",sortOrder:0,isCover:false,status:"pending",mimeType:"image/jpeg",width:optimized.width,height:optimized.height,takenAt:optimized.takenAt,createdAt:new Date().toISOString()};
      if(session?.user&&supabaseEnabled&&navigator.onLine!==false){
        onProgress?.("uploading",index,selected.length);
        try{
          const storagePath=await uploadMemoryPhoto(session.user.id,{tripId:memory.tripId,activityId:memory.activityId,photoId:id,blob:optimized.blob});
          entry={...entry,storagePath,status:"ready"};uploaded+=1;
        }catch{
          const localKey=await storePendingMemoryPhoto(id,optimized.blob);
          entry={...entry,localKey};pending+=1;
        }
      }else{
        const localKey=await storePendingMemoryPhoto(id,optimized.blob);
        entry={...entry,localKey};pending+=1;
      }
      next=addActivityMemoryPhotos(next,memory,[entry]);
    }
    await persistMemoryTrips(next);
    onProgress?.(pending?"pending":"done",selected.length,selected.length);
    return {uploaded,pending};
  },[session?.user?.id,persistMemoryTrips]);

  const removeMemoryPhoto=useCallback(async(memory,photo)=>{
    if(!photo?.id)throw new Error("memory_not_found");
    if(photo.storagePath&&!photo.storagePath.startsWith("data:")&&navigator.onLine===false)throw new Error("offline_delete_requires_connection");
    if(photo.storagePath&&!photo.storagePath.startsWith("data:"))await deleteMemoryPhoto(photo.storagePath);
    await discardPendingMemoryPhoto(photo);
    await persistMemoryTrips(removeActivityMemoryPhoto(loadTrips(),memory,photo.id));
  },[persistMemoryTrips]);

  const updateMemoryPhoto=useCallback(async(memory,photoId,patch)=>persistMemoryTrips(updateActivityMemoryPhoto(loadTrips(),memory,photoId,patch)),[persistMemoryTrips]);
  const reorderMemoryPhoto=useCallback(async(memory,photoId,direction)=>persistMemoryTrips(reorderActivityMemoryPhoto(loadTrips(),memory,photoId,direction)),[persistMemoryTrips]);

  const syncPendingPhotos=useCallback(async()=>{
    if(!session?.user||!supabaseEnabled||navigator.onLine===false)return {changed:false};
    let next=loadTrips();
    let changed=false;
    for(const trip of next){
      for(const day of trip.jours||[]){
        for(const activity of day.activites||[]){
          const memory={tripId:trip.id,dayNumber:day.num,activityId:activity.id};
          for(const photo of normalizeMemoryPhotos(activity)){
            if(photo.status!=="pending"&&!photo.localKey&&!photo.storagePath?.startsWith?.("data:"))continue;
            const blob=await resolvePendingMemoryPhoto(photo);
            if(!blob)continue;
            try{
              const storagePath=await uploadMemoryPhoto(session.user.id,{tripId:trip.id,activityId:activity.id,photoId:photo.id,blob});
              next=updateActivityMemoryPhoto(next,memory,photo.id,{storagePath,localKey:undefined,status:"ready"});
              await discardPendingMemoryPhoto(photo);
              changed=true;
            }catch{ /* la photo reste locale et sera retentée au prochain retour réseau */ }
          }
        }
      }
    }
    if(changed)await persistMemoryTrips(next);
    return {changed};
  },[session?.user?.id,persistMemoryTrips]);

  const retrySync=useCallback(async()=>{
    if(!session?.user||!supabaseEnabled)return;
    await syncPendingPhotos();
    await flushPendingMutations({trips:mutation=>saveTripsCloud(mutation.userId,mutation.payload),progress:mutation=>saveProgress(mutation.userId,mutation.payload)});
    const backup=createCloudBackup();
    if(backup&&await saveCloudBackup(session.user.id,backup))saveBackupMeta({userId:session.user.id,fingerprint:backupFingerprint(backup),syncedAt:new Date().toISOString()});
    setSyncTick(t=>t+1);
  },[session?.user?.id,syncPendingPhotos]);

  useEffect(()=>{if(!session?.user)return;retrySync();window.addEventListener("online",retrySync);return()=>window.removeEventListener("online",retrySync);},[session?.user?.id,retrySync]);
  const syncStatus=useMemo(()=>{
    const meta=loadBackupMeta();
    const pending=loadPendingMutations().filter(item=>item.userId===session?.user?.id);
    return {pending:pending.length+countLocalMemoryPhotos(trips),hasError:pending.some(item=>(item.attempts||0)>0),lastSyncedAt:session?.user?.id&&meta?.userId===session.user.id?meta.syncedAt:null};
  },[trips,syncTick,session?.user?.id]);

  return {summary,resolveTrip,getPhotoUrl,addMemoryPhotos,removeMemoryPhoto,updateMemoryPhoto,reorderMemoryPhoto,changeNote,retrySync,syncStatus};
}
