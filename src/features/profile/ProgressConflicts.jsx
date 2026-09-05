import { useEffect, useState } from "react";
import { readJson } from "../../lib/storage.js";
import { progressConflictKey } from "../../services/sync/progressSync.js";

const LABELS={profile:"Profil",favorites:"Favoris",kana_progress:"Révisions de kana",scenarios:"Scénarios",path:"Parcours",mission:"Mission du jour",streak:"Série de jours",unlocks:"Déblocages",settings:"Réglages"};
function preview(field,value) {
  if(!value)return ["Aucune donnée enregistrée"];
  if(field==="profile")return [value.name,value.level,(value.why||[]).join(", "),value.plannedDeparture].filter(Boolean);
  if(field==="favorites")return value.map(item=>item.item?.nom||item.item?.titre||item.item?.traduction||item.item?.expression||"Favori");
  if(field==="kana_progress")return Object.entries(value).map(([kana,entry])=>`${kana} : ${entry.seen||0} révisions, ${entry.known||0} reconnues`);
  if(field==="settings")return [value.dark?"Thème sombre":"Thème clair",`Couleur : ${value.accent||"classique"}`,`Écriture : ${value.script||"par défaut"}`];
  if(field==="streak")return [`${value.count||0} jours de suite`];
  if(field==="mission")return [`Journée : ${value.day||"non renseignée"}`,`${value.done?.length||0} objectifs terminés`];
  if(field==="scenarios"||field==="path")return (value.done||value.completed||[]).map(id=>`Étape terminée : ${id}`);
  return ["Données de déblocage conservées dans cette copie"];
}
export function ProgressConflicts({C,userId,onRestore}) {
  const [copies,setCopies]=useState(()=>readJson(progressConflictKey(userId),[]));
  const [message,setMessage]=useState("");
  useEffect(()=>{const reload=()=>setCopies(readJson(progressConflictKey(userId),[]));reload();window.addEventListener("isekaid:progress-synced",reload);return()=>window.removeEventListener("isekaid:progress-synced",reload);},[userId]);
  const restore=async(copy,field)=>{
    try {await onRestore({[field]:copy.snapshot[field]});setMessage(`${LABELS[field]} restauré localement. La synchronisation reprendra si nécessaire.`);}
    catch {setMessage("Restauration impossible pour le moment. La copie est conservée.");}
  };
  const download=copy=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(copy.snapshot,null,2)],{type:"application/json"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download="isekaid-copie-progression.json";anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  if(!copies.length)return null;
  return <section style={{padding:14,marginBottom:16,border:`1px solid ${C.gold}`,borderRadius:16,color:C.text,background:C.s1}}>
    <h3 style={{fontSize:14,marginTop:0}}>Copies de progression conservées</h3>
    <p style={{fontSize:11,color:C.t2,lineHeight:1.5}}>Deux appareils ont modifié la même information. Tu peux consulter chaque copie et restaurer uniquement la rubrique souhaitée. La version actuelle sera aussi conservée.</p>
    {copies.map(copy=><details key={copy.id} style={{padding:"10px 0",borderTop:`1px solid ${C.border}`}}><summary style={{fontSize:12,cursor:"pointer"}}>{new Date(copy.savedAt).toLocaleString("fr-FR")} · {[...new Set(copy.paths.map(path=>LABELS[path.split(".")[0]]).filter(Boolean))].join(", ")}</summary>
      {[...new Set(copy.paths.map(path=>path.split(".")[0]))].filter(field=>LABELS[field]&&copy.snapshot[field]!=null&&Object.hasOwn(copy.snapshot,field)).map(field=><details key={field} style={{padding:8}}><summary>{LABELS[field]}</summary><ul style={{maxHeight:180,overflow:"auto",fontSize:11,paddingLeft:18}}>{preview(field,copy.snapshot[field]).map((line,index)=><li key={index}>{line}</li>)}</ul><button onClick={()=>restore(copy,field)} style={{padding:9,borderRadius:9,border:`1px solid ${C.border}`,color:C.text,background:C.s2}}>Restaurer {LABELS[field].toLowerCase()}</button></details>)}
      <button onClick={()=>download(copy)} style={{marginTop:8,padding:9,borderRadius:9,border:`1px solid ${C.border}`,color:C.text,background:C.s2}}>Exporter la copie</button>
    </details>)}
    {message&&<p role="status" style={{fontSize:11,color:C.t2}}>{message}</p>}
  </section>;
}
