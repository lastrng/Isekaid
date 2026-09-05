const META_KEY="isekaid_cloud_backup_meta_v1";
const EXCLUDED_KEYS=new Set([
  "isekaid_pending_mutations_v1",
  "isekaid_japan_news_v2",
  "isekaid_premium_v1",
  META_KEY,
]);
const MAX_BACKUP_BYTES=2_000_000;

function appKeys(storage=globalThis.localStorage){
  const keys=[];
  if(!storage) return keys;
  for(let i=0;i<storage.length;i+=1){const key=storage.key(i);if(key?.startsWith("isekaid_")&&!EXCLUDED_KEYS.has(key)&&!key.startsWith("isekaid_trip_sync_base_"))keys.push(key);}
  return keys.sort();
}

export function createCloudBackup(storage=globalThis.localStorage){
  const values={};
  for(const key of appKeys(storage)){const value=storage.getItem(key);if(value!==null)values[key]=value;}
  const payload={version:1,values};
  return new TextEncoder().encode(JSON.stringify(payload)).length<=MAX_BACKUP_BYTES ? payload : null;
}

export function backupFingerprint(backup){
  const text=JSON.stringify(backup||{}); let hash=2166136261;
  for(let i=0;i<text.length;i+=1){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16);
}

export function restoreCloudBackup(backup,storage=globalThis.localStorage){
  if(!backup?.values||backup.version!==1||!storage)return false;
  for(const [key,value] of Object.entries(backup.values)){
    if(key.startsWith("isekaid_")&&!EXCLUDED_KEYS.has(key)&&!key.startsWith("isekaid_trip_sync_base_")&&typeof value==="string"){
      if(key==="isekaid_deleted_trips_v1" || key.startsWith("isekaid_trip_conflicts_")){
        try {
          const existing=JSON.parse(storage.getItem(key)||"[]");
          const incoming=JSON.parse(value);
          if(!Array.isArray(existing)||!Array.isArray(incoming))continue;
          const merged=new Map([...incoming,...existing].filter(item=>item?.id).map(item=>[item.id,item]));
          storage.setItem(key,JSON.stringify([...merged.values()]));
        } catch { /* Une sauvegarde invalide ne remplace pas les traces locales. */ }
      } else storage.setItem(key,value);
    }
  }
  return true;
}

export function loadBackupMeta(storage=globalThis.localStorage){
  try{return JSON.parse(storage?.getItem(META_KEY)||"null");}catch{return null;}
}
export function saveBackupMeta(meta,storage=globalThis.localStorage){storage?.setItem(META_KEY,JSON.stringify(meta));}
export { MAX_BACKUP_BYTES };
