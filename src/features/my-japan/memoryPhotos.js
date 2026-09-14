import { deletePendingPhoto, loadPendingPhoto, makeLocalPhotoKey, savePendingPhoto } from "./memoryPhotoStore.js";

export const MAX_MEMORY_PHOTOS_PER_PLACE = 10;
export const MEMORY_PHOTO_MAX_EDGE = 2400;
export const MEMORY_PHOTO_MAX_BYTES = 6 * 1024 * 1024;
const JPEG_QUALITY = 0.84;

const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", ...HEIC_TYPES]);

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error("image_compression_failed")),
    "image/jpeg",
    quality,
  ));
}

async function decodeWithImageElement(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return { width:image.naturalWidth, height:image.naturalHeight, draw:(context,w,h)=>context.drawImage(image,0,0,w,h), close:()=>{} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation:"from-image" });
      return { width:bitmap.width, height:bitmap.height, draw:(context,w,h)=>context.drawImage(bitmap,0,0,w,h), close:()=>bitmap.close?.() };
    } catch (error) {
      if (HEIC_TYPES.has(file.type)) throw new Error("unsupported_heic", { cause:error });
    }
  }
  try {
    return await decodeWithImageElement(file);
  } catch (error) {
    if (HEIC_TYPES.has(file.type)) throw new Error("unsupported_heic", { cause:error });
    throw new Error("image_decode_failed", { cause:error });
  }
}

export async function compressMemoryPhoto(file) {
  if (!(file instanceof Blob)) throw new Error("invalid_image");
  const type = String(file.type || "").toLowerCase();
  if (type && !ACCEPTED_TYPES.has(type) && !type.startsWith("image/")) throw new Error("invalid_image");
  const decoded = await decodeImage(file);
  try {
    const scale = Math.min(1, MEMORY_PHOTO_MAX_EDGE / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha:false });
    if (!context) throw new Error("image_compression_failed");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    decoded.draw(context, width, height);
    let blob = await canvasBlob(canvas, JPEG_QUALITY);
    if (blob.size > MEMORY_PHOTO_MAX_BYTES) blob = await canvasBlob(canvas, 0.72);
    if (blob.size > MEMORY_PHOTO_MAX_BYTES) throw new Error("image_too_large");
    return { blob, width, height, originalBytes:file.size || null, takenAt:file.lastModified ? new Date(file.lastModified).toISOString() : null };
  } finally {
    decoded.close();
  }
}

export function normalizeMemoryPhotos(activity = {}) {
  const structured = Array.isArray(activity.memoryPhotos) ? activity.memoryPhotos : [];
  const legacy = !structured.length && activity.memoryPhoto ? [{
    id:`legacy-${activity.id || activity.lieuId || "photo"}`,
    storagePath:activity.memoryPhoto,
    caption:"",
    sortOrder:0,
    isCover:true,
    status:activity.memoryPhoto.startsWith?.("data:") ? "pending" : "ready",
  }] : [];
  const hasCover = [...structured, ...legacy].some(photo=>photo?.isCover);
  return [...structured, ...legacy]
    .filter(photo => photo?.id && (photo.storagePath || photo.localKey))
    .sort((a,b)=>(a.sortOrder || 0)-(b.sortOrder || 0))
    .map((photo,index)=>({ ...photo, caption:String(photo.caption || "").slice(0,500), sortOrder:index, isCover:Boolean(photo.isCover || (!hasCover && index===0)) }));
}

function updateActivity(trips, { tripId, dayNumber, activityId }, updater) {
  let found = false;
  const next = trips.map(trip => trip.id !== tripId ? trip : {
    ...trip,
    updatedAt:new Date().toISOString(),
    jours:(trip.jours || []).map(day => day.num !== dayNumber ? day : ({
      ...day,
      activites:(day.activites || []).map(activity => {
        if (activity.id !== activityId) return activity;
        found = true;
        const memoryPhotos = updater(normalizeMemoryPhotos(activity));
        return { ...activity, memoryPhoto:undefined, memoryPhotos:memoryPhotos.map((photo,index)=>({ ...photo, sortOrder:index })) };
      }),
    })),
  });
  if (!found) throw new Error("memory_not_found");
  return next;
}

export function addActivityMemoryPhotos(trips, memory, photos) {
  return updateActivity(trips, memory, current => {
    if (current.length + photos.length > MAX_MEMORY_PHOTOS_PER_PLACE) throw new Error("photo_limit_reached");
    const hasCover = current.some(photo=>photo.isCover);
    return [...current, ...photos.map((photo,index)=>({ ...photo, isCover:hasCover || index > 0 ? Boolean(photo.isCover) : true }))];
  });
}

export function updateActivityMemoryPhoto(trips, memory, photoId, patch) {
  return updateActivity(trips, memory, current => {
    const next = current.map(photo=>photo.id===photoId?{...photo,...patch}:photo);
    if (patch.isCover) return next.map(photo=>({...photo,isCover:photo.id===photoId}));
    return next;
  });
}

export function removeActivityMemoryPhoto(trips, memory, photoId) {
  return updateActivity(trips, memory, current => {
    const removed = current.find(photo=>photo.id===photoId);
    const next = current.filter(photo=>photo.id!==photoId);
    if (removed?.isCover && next.length) next[0] = {...next[0],isCover:true};
    return next;
  });
}

export function reorderActivityMemoryPhoto(trips, memory, photoId, direction) {
  return updateActivity(trips, memory, current => {
    const index=current.findIndex(photo=>photo.id===photoId);
    const destination=index+(direction<0?-1:1);
    if(index<0||destination<0||destination>=current.length)return current;
    const next=[...current];
    [next[index],next[destination]]=[next[destination],next[index]];
    return next;
  });
}

export function countLocalMemoryPhotos(trips=[]) {
  return trips.reduce((total,trip)=>total+(trip.jours||[]).reduce((dayTotal,day)=>dayTotal+(day.activites||[]).reduce((activityTotal,activity)=>activityTotal+normalizeMemoryPhotos(activity).filter(photo=>photo.status==="pending"||photo.localKey||photo.storagePath?.startsWith?.("data:")).length,0),0),0);
}

// Compatibilité avec les souvenirs créés avant la galerie multi-photo.
export function setActivityMemoryPhoto(trips, {tripId,dayNumber,activityId,photo}) {
  let found=false;
  const next=(trips||[]).map(trip=>trip.id!==tripId?trip:{...trip,updatedAt:new Date().toISOString(),jours:(trip.jours||[]).map(day=>day.num!==dayNumber?day:{...day,activites:(day.activites||[]).map(activity=>{
    if(activity.id!==activityId)return activity;
    found=true;
    return {...activity,memoryPhoto:photo};
  })})});
  if(!found)throw new Error("memory_not_found");
  return next;
}

export async function migrateLocalMemoryPhotos(trips=[],upload) {
  let changed=false;
  const next=[];
  for(const trip of trips){
    let tripChanged=false;
    const days=[];
    for(const day of trip.jours||[]){
      const activities=[];
      for(const activity of day.activites||[]){
        if(activity.memoryPhoto?.startsWith?.("data:")){
          const [header,data]=activity.memoryPhoto.split(",");
          const mime=header.match(/data:([^;]+)/)?.[1]||"image/jpeg";
          const blob=new Blob([Uint8Array.from(atob(data),character=>character.charCodeAt(0))],{type:mime});
          const storagePath=await upload(blob,{tripId:trip.id,dayNumber:day.num,activityId:activity.id});
          if(storagePath){activities.push({...activity,memoryPhoto:storagePath});changed=true;tripChanged=true;continue;}
        }
        activities.push(activity);
      }
      days.push({...day,activites:activities});
    }
    next.push({...trip,jours:days,...(tripChanged?{updatedAt:new Date().toISOString()}:{})});
  }
  return {trips:next,changed};
}

export async function storePendingMemoryPhoto(photoId, blob) {
  const localKey=makeLocalPhotoKey(photoId);
  await savePendingPhoto(localKey,blob);
  return localKey;
}

export async function resolvePendingMemoryPhoto(photo) {
  if (photo.localKey) return loadPendingPhoto(photo.localKey);
  if (photo.storagePath?.startsWith?.("data:")) {
    const [header,data]=photo.storagePath.split(",");
    const mime=header.match(/data:([^;]+)/)?.[1]||"image/jpeg";
    return new Blob([Uint8Array.from(atob(data),character=>character.charCodeAt(0))],{type:mime});
  }
  return null;
}

export async function discardPendingMemoryPhoto(photo) {
  if (photo?.localKey) await deletePendingPhoto(photo.localKey);
}
