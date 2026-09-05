import { useEffect } from "react";
import { fetchCloudBackup, saveCloudBackup, supabaseEnabled } from "../../supabase.js";
import { backupFingerprint, createCloudBackup, loadBackupMeta, restoreCloudBackup, saveBackupMeta } from "./cloudBackup.js";

export function useCloudBackup({userId,ready}){
  useEffect(()=>{
    if(!userId||!ready||!supabaseEnabled)return;
    let cancelled=false;
    let timer=null;
    const sync=async()=>{
      const snapshot=createCloudBackup();
      if(!snapshot)return false;
      const fingerprint=backupFingerprint(snapshot);
      const meta=loadBackupMeta();
      if(meta?.userId===userId&&meta.fingerprint===fingerprint)return true;
      if(await saveCloudBackup(userId,snapshot)){
        saveBackupMeta({userId,fingerprint,syncedAt:new Date().toISOString()});
        return true;
      }
      return false;
    };
    (async()=>{
      const remote=await fetchCloudBackup(userId);
      if(cancelled)return;
      const meta=loadBackupMeta();
      const localIsClean=meta?.fingerprint===backupFingerprint(createCloudBackup());
      const remoteIsNewer=Date.parse(remote?.updated_at||"")>Date.parse(meta?.syncedAt||"");
      if(remote?.payload&&(!meta||meta.userId!==userId||(localIsClean&&remoteIsNewer))){
        restoreCloudBackup(remote.payload);
        saveBackupMeta({userId,fingerprint:backupFingerprint(remote.payload),syncedAt:remote.updated_at});
        window.location.reload();
        return;
      }
      timer=setTimeout(sync,1800);
    })();
    const onHidden=()=>{if(document.visibilityState==="hidden")sync();};
    window.addEventListener("online",sync);
    document.addEventListener("visibilitychange",onHidden);
    return()=>{cancelled=true;clearTimeout(timer);window.removeEventListener("online",sync);document.removeEventListener("visibilitychange",onHidden);};
  },[userId,ready]);
}
