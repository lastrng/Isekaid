// Legacy app stores use global keys. Archive them before changing identity,
// then remount the app so React cannot submit another account's old state.
const OWNER="isekaid_device_owner_v1";
const PREFIX="isekaid_account_cache_v1_";
const SHARED=["isekaid_account_cache_","isekaid_onboarding_state_","isekaid_progress_sync_base_","isekaid_trip_sync_base_","isekaid_progress_conflicts_","isekaid_trip_conflicts_"];
const isScoped=key=>key?.startsWith("isekaid_")&&key!==OWNER&&key!=="isekaid_pending_mutations_v1"&&!SHARED.some(prefix=>key.startsWith(prefix));
export function currentStorageOwner(storage=globalThis.localStorage) {
  try{return storage?.getItem(OWNER)||"local";}catch{return "local";}
}
export function activateAccountStorage(userId,storage=globalThis.localStorage) {
  if(!storage)return false;
  const next=userId||"local";
  let previous=storage.getItem(OWNER);
  if(previous===next)return false;
  // Old backups identify the owner. Unattributed data stays in the local
  // archive; never assign a previous installation's profile to a new account.
  if(!previous){
    try{previous=JSON.parse(storage.getItem("isekaid_cloud_backup_meta_v1")||"null")?.userId||"local";}catch{previous="local";}
    storage.setItem(OWNER,previous);
    if(previous===next)return false;
  }
  const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(isScoped);
  const snapshot=Object.fromEntries(keys.map(key=>[key,storage.getItem(key)]));
  // Both writes happen before removal: quota failure preserves the old data.
  storage.setItem(PREFIX+previous,JSON.stringify(snapshot));
  const incoming=JSON.parse(storage.getItem(PREFIX+next)||"{}");
  keys.forEach(key=>storage.removeItem(key));
  try {
    for(const [key,value] of Object.entries(incoming))if(isScoped(key)&&typeof value==="string")storage.setItem(key,value);
    storage.setItem(OWNER,next);
  } catch(error) {
    for(const key of Object.keys(incoming))if(isScoped(key))storage.removeItem(key);
    for(const [key,value]of Object.entries(snapshot))storage.setItem(key,value);
    throw error;
  }
  return true;
}
