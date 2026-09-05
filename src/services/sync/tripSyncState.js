import { readJson, writeJson } from "../../lib/storage.js";

const DELETED = "isekaid_deleted_trips_v1";
export function recordTripDeletions(trips) {
  const deleted = new Map(readJson(DELETED,[]).map(item=>[item.id,item]));
  for(const trip of trips) if(trip.deletedAt) deleted.set(trip.id,{id:trip.id,deletedAt:trip.deletedAt,updatedAt:trip.deletedAt});
  if(!writeJson(DELETED,[...deleted.values()])) throw new Error("storage_full");
}
export function markTripDeleted(id) { recordTripDeletions([{id,deletedAt:new Date().toISOString()}]); }
export function withTripDeletions(trips) {
  const deleted = readJson(DELETED,[]);
  const ids = new Set(deleted.map(item=>item.id));
  return [...trips.filter(trip=>!ids.has(trip.id)),...deleted];
}
export function loadTripSyncBase(userId) { return readJson(`isekaid_trip_sync_base_${userId}`,[]); }
export function saveTripSyncBase(userId,trips) { return writeJson(`isekaid_trip_sync_base_${userId}`,trips); }
export function loadTripConflicts(userId) { return readJson(`isekaid_trip_conflicts_${userId}`,[]); }
export function preserveTripConflict(userId,trip) {
  const conflicts=loadTripConflicts(userId);
  if(conflicts.some(item=>JSON.stringify(item.trip)===JSON.stringify(trip))) return;
  const entry={id:globalThis.crypto.randomUUID(),savedAt:new Date().toISOString(),trip};
  if(!writeJson(`isekaid_trip_conflicts_${userId}`,[...conflicts,entry])) throw new Error("storage_full");
}
export function dismissTripConflict(userId,id) {
  return writeJson(`isekaid_trip_conflicts_${userId}`,loadTripConflicts(userId).filter(item=>item.id!==id));
}
