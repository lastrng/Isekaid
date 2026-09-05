const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.78;

export async function compressMemoryPhoto(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("invalid_image");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error("image_compression_failed")),
    "image/jpeg",
    JPEG_QUALITY,
  ));
}

export function setActivityMemoryPhoto(trips, { tripId, dayNumber, activityId, photo }) {
  return trips.map(trip => trip.id !== tripId ? trip : {
    ...trip,
    updatedAt: new Date().toISOString(),
    jours: (trip.jours || []).map(day => day.num !== dayNumber ? day : {
      ...day,
      activites: (day.activites || []).map(activity => activity.id !== activityId ? activity : {
        ...activity,
        memoryPhoto: photo || undefined,
      }),
    }),
  });
}

export function dataUrlToBlob(dataUrl){
  const [header,data]=String(dataUrl||"").split(",");
  const mime=header.match(/data:([^;]+)/)?.[1]||"image/jpeg";
  const bytes=Uint8Array.from(atob(data),char=>char.charCodeAt(0));
  return new Blob([bytes],{type:mime});
}

export function countLocalMemoryPhotos(trips=[]){
  return trips.reduce((total,trip)=>total+(trip.jours||[]).reduce((dayTotal,day)=>dayTotal+(day.activites||[]).filter(activity=>activity.memoryPhoto?.startsWith?.("data:")).length,0),0);
}

export async function migrateLocalMemoryPhotos(trips,upload){
  let changed=false;
  const next=[];
  for(const trip of trips||[]){
    let tripChanged=false;
    const jours=[];
    for(const day of trip.jours||[]){
      const activites=[];
      for(const activity of day.activites||[]){
        if(activity.memoryPhoto?.startsWith?.("data:")){
          const remote=await upload(dataUrlToBlob(activity.memoryPhoto));
          if(remote){activites.push({...activity,memoryPhoto:remote});changed=true;tripChanged=true;continue;}
        }
        activites.push(activity);
      }
      jours.push({...day,activites});
    }
    next.push(tripChanged?{...trip,jours,updatedAt:new Date().toISOString()}:trip);
  }
  return {trips:next,changed};
}
