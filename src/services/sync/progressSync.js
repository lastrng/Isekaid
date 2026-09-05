import { readJson, writeJson } from "../../lib/storage.js";
import { mergeProgress, PROGRESS_FIELDS, sameValue } from "./progressMerge.js";

export const progressBaseKey = userId => `isekaid_progress_sync_base_${userId}`;
export const progressConflictKey = userId => `isekaid_progress_conflicts_${userId}`;
export function progressSnapshot(value) {
  return Object.fromEntries(PROGRESS_FIELDS.filter(field=>Object.hasOwn(value,field)).map(field=>[field,value[field]]));
}
export function rememberProgressBase(userId,value) {return writeJson(progressBaseKey(userId),{...readJson(progressBaseKey(userId),{}),...progressSnapshot(value)});}
export function preserveProgressCopy(userId,value,paths) {
  const saved=readJson(progressConflictKey(userId),[]);
  const snapshot=progressSnapshot(value);
  if(saved.some(item=>sameValue(item.snapshot,snapshot)))return true;
  return writeJson(progressConflictKey(userId),[...saved,{id:crypto.randomUUID(),savedAt:new Date().toISOString(),paths,snapshot}]);
}
export async function syncProgress({userId,local,read,compareAndSet}) {
  const base=readJson(progressBaseKey(userId),{});
  for(let attempt=0;attempt<3;attempt++) {
    const remote=await read();
    if(!remote)return null;
    const {snapshot,conflicts}=mergeProgress(base,local,remote);
    if(conflicts.length) {
      const paths=conflicts.map(item=>item.path);
      if(!preserveProgressCopy(userId,local,paths)||!preserveProgressCopy(userId,remote,paths))return null;
    }
    if(await compareAndSet(remote.updated_at,snapshot)) {
      if(!rememberProgressBase(userId,snapshot))return null;
      return snapshot;
    }
  }
  return null;
}
