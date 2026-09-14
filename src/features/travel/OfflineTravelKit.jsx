import { Check, MapPin, MessageSquare, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { OfflineStatus } from "../../components/OfflineStatus.jsx";
import { getCachedOfflineTravel } from "../../services/sync/offlineStrategy.js";
import { SpeakButton } from "../../tts.jsx";

function JapaneseLine({C,item}) {
  const raw=item?.raw || item;
  const phrase=raw?.expression || raw?.japanese || raw?.phrases?.[0]?.jp;
  const meaning=raw?.traduction || raw?.french || raw?.phrases?.[0]?.fr || item?.title;
  if(!phrase)return null;
  return <div style={{display:"flex",gap:9,alignItems:"center",padding:"8px 0",borderTop:`1px solid ${C.border}`}}><div style={{flex:1,minWidth:0}}><strong lang="ja" style={{display:"block",fontSize:13,color:C.text}}>{phrase}</strong><span style={{display:"block",fontSize:9.5,color:C.t3,marginTop:2}}>{meaning}</span></div><SpeakButton C={C} text={phrase} size={30}/></div>;
}

/** Aperçu concret du paquet local, partagé avant et pendant le voyage. */
export function OfflineTravelKit({C,compact=false}) {
  const [snapshot,setSnapshot]=useState(()=>getCachedOfflineTravel());
  useEffect(()=>{const refresh=()=>setSnapshot(getCachedOfflineTravel());window.addEventListener("isekaid:offline-cache-updated",refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("isekaid:offline-cache-updated",refresh);window.removeEventListener("storage",refresh);};},[]);
  const japanese=[...(snapshot.savedExpressions||[]),...(snapshot.travelJapanese||[])].slice(0,6);
  return <details style={{padding:compact?11:13,borderRadius:14,border:`1px solid ${snapshot.ready?C.green:C.border}`,background:snapshot.ready?`${C.green}0d`:C.s1}}>
    <summary style={{cursor:"pointer",listStyle:"none",display:"flex",alignItems:"center",gap:9}}><WifiOff size={16} color={snapshot.ready?C.green:C.t3}/><span style={{flex:1}}><strong style={{display:"block",fontSize:11.5,color:C.text}}>Essentiels du voyage</strong><small style={{display:"block",fontSize:9,color:C.t3,marginTop:2}}>{snapshot.trip?snapshot.trip.titre:"Ajoute un voyage daté pour préparer son accès local"}</small></span><OfflineStatus C={C} scope="travel"/></summary>
    {snapshot.trip&&<div style={{paddingTop:11,marginTop:10,borderTop:`1px solid ${C.border}`}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,textAlign:"center"}}>{[
        [snapshot.days.length,"jours"],[snapshot.places.length,"lieux"],[snapshot.sos.length,"SOS"],[snapshot.checklist.length,"checklist"],
      ].map(([value,label])=><div key={label} style={{padding:"7px 3px",borderRadius:9,background:C.s2}}><strong style={{display:"block",fontSize:13,color:C.text}}>{value}</strong><span style={{fontSize:8,color:C.t3}}>{label}</span></div>)}</div>
      {snapshot.places.length>0&&<div style={{marginTop:10,fontSize:9.5,color:C.t2}}><MapPin size={12} style={{verticalAlign:"-2px",marginRight:4}}/>{snapshot.places.map(place=>place.nom).slice(0,4).join(" · ")}{snapshot.places.length>4?"…":""}</div>}
      {japanese.length>0&&<div style={{marginTop:10}}><div style={{fontSize:9,color:C.t3,fontWeight:750,letterSpacing:".1em",marginBottom:3}}><MessageSquare size={12} style={{verticalAlign:"-2px",marginRight:4}}/>JAPONAIS ENREGISTRÉ</div>{japanese.map((item,index)=><JapaneseLine key={item.id||item.expression||index} C={C} item={item}/>)}</div>}
      <div style={{display:"flex",gap:6,alignItems:"center",fontSize:9,color:C.t3,marginTop:10}}><Check size={12} color={C.green}/>Carte de fond, images distantes et tuteur non inclus.</div>
    </div>}
  </details>;
}
