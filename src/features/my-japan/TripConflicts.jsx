import { useEffect, useState } from "react";
import { loadTripConflicts, dismissTripConflict, preserveTripConflict, withTripDeletions } from "../../services/sync/tripSyncState.js";
import { loadTrips, saveTrips } from "../travel/tripModel.js";
import { enqueueMutation, flushPendingMutations } from "../../services/sync/pendingMutations.js";
import { saveTripsCloud } from "../../supabase.js";

export function TripConflicts({C,userId}) {
  const [entries,setEntries]=useState(()=>loadTripConflicts(userId));
  const [error,setError]=useState("");
  useEffect(()=>{const reload=()=>setEntries(loadTripConflicts(userId));reload();window.addEventListener("isekaid:trips-synced",reload);return()=>window.removeEventListener("isekaid:trips-synced",reload);},[userId]);
  const restore=async entry=>{
    try {
      const current=loadTrips();
      const existing=current.find(trip=>trip.id===entry.trip.id);
      if(existing)preserveTripConflict(userId,existing);
      const deleted=withTripDeletions([]).some(trip=>trip.id===entry.trip.id);
      const restored={...entry.trip,id:deleted?`trip_${crypto.randomUUID()}`:entry.trip.id,updatedAt:new Date().toISOString()};
      const next=[...current.filter(trip=>trip.id!==restored.id),restored];
      if(!saveTrips(next))throw new Error("storage_full");
      if(!enqueueMutation({type:"trips",userId,payload:next}))throw new Error("storage_full");
      dismissTripConflict(userId,entry.id);
      setEntries(loadTripConflicts(userId));
      window.dispatchEvent(new Event("isekaid:trips-synced"));
      await flushPendingMutations({trips:mutation=>saveTripsCloud(mutation.userId,mutation.payload)});
    } catch {setError("La restauration n’a pas pu être terminée. La copie reste conservée.");}
  };
  if(!entries.length)return null;
  return <section style={{padding:14,marginBottom:16,border:`1px solid ${C.gold}`,borderRadius:16,background:C.s1,color:C.text}}>
    <h3 style={{fontSize:14,marginTop:0}}>Versions de voyage conservées</h3>
    <p style={{fontSize:11,color:C.t2,lineHeight:1.5}}>Des modifications différentes ont été reçues. Ces copies restent disponibles ici. Restaurer remplace le voyage actuel en conservant aussi sa version ; un voyage supprimé est recréé séparément.</p>
    {entries.map(entry=><details key={entry.id} style={{padding:"10px 0",borderTop:`1px solid ${C.border}`}}><summary style={{fontSize:12,cursor:"pointer"}}>{entry.trip.titre||"Voyage"} · {new Date(entry.savedAt).toLocaleString("fr-FR")}</summary>
      <p style={{fontSize:11,color:C.t2}}>{entry.trip.jours?.length||0} jours · version du {entry.trip.updatedAt?new Date(entry.trip.updatedAt).toLocaleString("fr-FR"):"voyage initial"}</p>
      <div style={{maxHeight:180,overflowY:"auto",fontSize:11}}>{(entry.trip.jours||[]).map((day,i)=><div key={i}>Jour {day.num||i+1} — {day.titre||day.villeId}{(day.activites||[]).map((activity,j)=><p key={j}>{activity.fait?"✓":"○"} {activity.lieuId} {activity.note}</p>)}</div>)}</div>
      <button onClick={()=>restore(entry)} style={{padding:9,borderRadius:9,border:`1px solid ${C.border}`,background:C.s2,color:C.text}}>Restaurer cette version</button>
    </details>)}
    {error&&<p role="alert" style={{color:C.red,fontSize:11}}>{error}</p>}
  </section>;
}
