import { useEffect, useState } from "react";
import { ActivityContext } from "../travel/ActivityContext.jsx";
import { summarizeOfflineSync } from "../../services/sync/offlineStrategy.js";
import { OfflineTravelKit } from "../travel/OfflineTravelKit.jsx";

export function JapanModeHome({C,model,db,pendingMutations=0,onOpenTrip,onSos,onPhrases,onToggle,onTutor,onOpenConnection}) {
  const [online,setOnline]=useState(()=>globalThis.navigator?.onLine!==false);
  const [error,setError]=useState("");
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);};},[]);
  const toggle=id=>{try{onToggle(model.trip.id,id);setError("");}catch{setError("Impossible d’enregistrer cette modification. Réessaie.");}};
  const button={padding:14,borderRadius:14,border:`1px solid ${C.border}`,color:C.text,background:C.s1,textAlign:"left",cursor:"pointer",fontSize:12};
  const sync = summarizeOfflineSync({ online, pending: pendingMutations });
  return <section aria-label="Aujourd'hui au Japon" style={{padding:"0 20px 110px",marginTop:14,position:"relative",zIndex:2,display:"grid",gap:13}}>
    <OfflineTravelKit C={C}/>
    <section style={{...button,cursor:"default",padding:18}}>
      <div style={{fontSize:10,color:C.red,fontWeight:700,letterSpacing:".14em"}}>AUJOURD’HUI AU JAPON {!online&&"· HORS CONNEXION"}</div>
      <h2 style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",margin:"10px 0 4px"}}>{model.day?`Jour ${model.day.num} · ${model.day.titre||"Ta journée"}`:"Ton Japon, aujourd’hui"}</h2>
      {model.trip?.titre&&<div style={{fontSize:11,color:C.t3,marginBottom:9}}>{model.trip.titre}{model.day?.date?` · ${model.day.date}`:""}</div>}
      <p style={{fontSize:12,color:C.t2}}>{model.progress.isComplete?"Toutes les activités prévues sont cochées. Profite de la suite !":model.place?`À suivre : ${model.place.nom}`:model.next?"Une activité personnelle t’attend dans ton programme.":model.trip?"Ta journée est libre. Ajoute tes envies au programme.":"Ajoute les dates de ton séjour pour retrouver ta journée ici."}</p>
      {model.progress.total>0&&<><div role="progressbar" aria-label="Progression du jour" aria-valuenow={model.progress.percent} aria-valuemin={0} aria-valuemax={100} style={{height:6,borderRadius:9,overflow:"hidden",background:C.s2}}><div style={{height:"100%",width:`${model.progress.percent}%`,background:C.green}}/></div><p style={{fontSize:11,color:C.t3}}>{model.progress.completed} / {model.progress.total} activités faites</p></>}
      {model.place?.acces&&<p style={{fontSize:12,color:C.t2,lineHeight:1.6}}>Accès : {model.place.acces}</p>}
      <button onClick={()=>onOpenTrip(model.trip?.id,"day")} style={{...button,background:C.s2,width:"100%"}}>{model.trip?"Carte et programme du jour":"Créer mon séjour"} →</button>
      {model.activities.length>0&&<div aria-label="Programme de la journée" style={{marginTop:14}}>
        <div style={{fontSize:9,color:C.t3,fontWeight:700,letterSpacing:".12em",marginBottom:4}}>PROGRAMME DE LA JOURNÉE</div>
        {model.activities.map((activity,index)=><label key={activity.id||index} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 0",fontSize:12,borderTop:index?`1px solid ${C.border}`:"none",opacity:activity.fait?0.62:1}}><input type="checkbox" checked={activity.fait===true} disabled={!activity.id} onChange={()=>toggle(activity.id)}/><span style={{flex:1,textDecoration:activity.fait?"line-through":"none"}}>{activity.place?.nom||activity.note||`Activité ${index+1}`}</span>{activity.id===model.next?.id&&<span style={{fontSize:9,color:C.red,fontWeight:700}}>À SUIVRE</span>}</label>)}
      </div>}
      {error&&<p role="alert" style={{fontSize:12,color:C.red}}>{error}</p>}
    </section>
    <div aria-label="Actions recommandées" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{model.recommendations.slice(1, 4).map(item => <button key={item.id} onClick={() => item.id === "sos" ? onSos() : item.id === "phrases" ? onPhrases() : onOpenTrip(model.trip?.id, "day")} style={{...button,background:item.id === "sos" ? C.red : C.s1,color:item.id === "sos" ? "#fff" : C.text,fontWeight:item.id === "sos" ? 700 : 400}}>{item.title}<br/><span style={{fontSize:10,fontWeight:400,color:item.id === "sos" ? "#fff" : C.t3}}>{item.text}</span></button>)}</div>
    {model.active && <p style={{ margin: 0, fontSize: 10, color: C.t3 }}>Mode Japon activé par les dates de ton voyage. La localisation n’est pas nécessaire.</p>}
    <ActivityContext C={C} db={db} trips={model.trip ? [model.trip] : []} place={model.place} onTutor={online?onTutor:undefined} onOpenConnection={onOpenConnection}/>
    <details style={{fontSize:11,color:C.t2,lineHeight:1.6}}><summary>{sync.label}</summary><p>Les modifications sont enregistrées localement puis placées dans la file de synchronisation. Les fonds de carte, certaines images et le tuteur demandent une connexion. L’audio dépend des voix installées sur ton téléphone.</p></details>
  </section>;
}
