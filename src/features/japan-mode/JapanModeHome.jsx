import { useEffect, useState } from "react";
import { ActivityContext } from "../travel/ActivityContext.jsx";
import { getOfflineCapabilities, summarizeOfflineSync } from "../../services/sync/offlineStrategy.js";

export function JapanModeHome({C,model,db,pendingMutations=0,onOpenTrip,onSos,onPhrases,onToggle,onTutor}) {
  const [online,setOnline]=useState(()=>globalThis.navigator?.onLine!==false);
  const [error,setError]=useState("");
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);};},[]);
  const toggle=id=>{try{onToggle(model.trip.id,id);setError("");}catch{setError("Impossible d’enregistrer cette modification. Réessaie.");}};
  const button={padding:14,borderRadius:14,border:`1px solid ${C.border}`,color:C.text,background:C.s1,textAlign:"left",cursor:"pointer",fontSize:12};
  const offline = getOfflineCapabilities({ trip: model.trip, days: model.trip?.jours, sos: model.recommendations.filter(item => item.id === "sos"), essentialPhrases: model.recommendations.filter(item => item.id === "phrases"), contextualContent: model.place ? [model.place] : [], progress: model.progress });
  const sync = summarizeOfflineSync({ online, pending: pendingMutations });
  return <div style={{padding:"0 20px 110px",marginTop:-24,position:"relative",zIndex:2,display:"grid",gap:13}}>
    <section style={{...button,cursor:"default",padding:18}}>
      <div style={{fontSize:10,color:C.red,fontWeight:700,letterSpacing:".14em"}}>MODE JAPON {!online&&"· HORS CONNEXION"}</div>
      <h2 style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",margin:"10px 0"}}>{model.day?`Jour ${model.day.num} · ${model.day.titre||"Ta journée"}`:"Ton Japon, aujourd’hui"}</h2>
      <p style={{fontSize:12,color:C.t2}}>{model.progress.isComplete?"Toutes les activités prévues sont cochées. Profite de la suite !":model.place?`À suivre : ${model.place.nom}`:model.next?"Une activité personnelle t’attend dans ton programme.":model.trip?"Ta journée est libre. Ajoute tes envies au programme.":"Ajoute les dates de ton séjour pour retrouver ta journée ici."}</p>
      {model.progress.total>0&&<><div role="progressbar" aria-label="Progression du jour" aria-valuenow={model.progress.percent} aria-valuemin={0} aria-valuemax={100} style={{height:6,borderRadius:9,overflow:"hidden",background:C.s2}}><div style={{height:"100%",width:`${model.progress.percent}%`,background:C.green}}/></div><p style={{fontSize:11,color:C.t3}}>{model.progress.completed} / {model.progress.total} activités faites</p></>}
      {model.place?.acces&&<p style={{fontSize:12,color:C.t2,lineHeight:1.6}}>Accès : {model.place.acces}</p>}
      <button onClick={()=>onOpenTrip(model.trip?.id,"day")} style={{...button,background:C.s2,width:"100%"}}>{model.trip?"Carte et programme du jour":"Créer mon séjour"} →</button>
      {model.activities.length>0&&<details style={{marginTop:12}}><summary style={{fontSize:12,cursor:"pointer"}}>Cocher mes activités</summary>{model.activities.map((activity,index)=><label key={activity.id||index} style={{display:"flex",gap:10,alignItems:"center",padding:"12px 0",fontSize:12}}><input type="checkbox" checked={activity.fait===true} disabled={!activity.id} onChange={()=>toggle(activity.id)}/><span>{activity.place?.nom||`Activité ${index+1}`}</span></label>)}</details>}
      {error&&<p role="alert" style={{fontSize:12,color:C.red}}>{error}</p>}
    </section>
    <div aria-label="Actions recommandées" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{model.recommendations.slice(1, 4).map(item => <button key={item.id} onClick={() => item.id === "sos" ? onSos() : item.id === "phrases" ? onPhrases() : onOpenTrip(model.trip?.id, "day")} style={{...button,background:item.id === "sos" ? C.red : C.s1,color:item.id === "sos" ? "#fff" : C.text,fontWeight:item.id === "sos" ? 700 : 400}}>{item.title}<br/><span style={{fontSize:10,fontWeight:400,color:item.id === "sos" ? "#fff" : C.t3}}>{item.text}</span></button>)}</div>
    {model.active && <p style={{ margin: 0, fontSize: 10, color: C.t3 }}>Mode Japon activé par les dates de ton voyage. La localisation n’est pas nécessaire.</p>}
    <ActivityContext C={C} db={db} trips={model.trip ? [model.trip] : []} place={model.place} onTutor={online?onTutor:undefined}/>
    <details style={{fontSize:11,color:C.t2,lineHeight:1.6}}><summary>{sync.label} · ce qui reste disponible sans connexion</summary><p>{offline.activeTrip ? "Ton voyage actif, ses journées et sa checklist" : "Les données de voyage apparaîtront ici après leur enregistrement"} restent consultables sur ce téléphone. {offline.sos ? "SOS Japon" : "SOS Japon"}, les phrases essentielles et les conseils déjà chargés ne dépendent pas d’un appel réseau.</p><p>Les modifications locales sont placées dans la file de synchronisation existante dès que nécessaire. Les fonds de carte, certaines images et le tuteur demandent une connexion. L’audio dépend des voix installées sur ton téléphone.</p></details>
  </div>;
}
