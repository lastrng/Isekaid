import { ReadinessCard } from "../readiness/ReadinessCard.jsx";

export function JourneyHome({ C, model, kanaProgress, scenProgress, pathProgress, onOpenTrip, onNavigate, onOpenLieu, onOpenTradition }) {
  const planning = model.mode === "planning";
  const card = { display:"block",width:"100%",padding:17,textAlign:"left",background:C.s1,color:C.text,border:`1px solid ${C.border}`,borderRadius:18,boxShadow:C.shadow,cursor:"pointer" };
  const related = model.related;
  const openRecommendation = action => action.id === "journal" ? onNavigate("profile") : action.id === "new_trip" ? onOpenTrip(null) : onNavigate(action.tab);
  const openRelated = () => related.kind === "tradition" ? onOpenTradition(related.raw) : onOpenLieu(related.raw);
  return <div style={{padding:"0 20px 110px",marginTop:14,position:"relative",zIndex:2,display:"grid",gap:14}}>
    <button onClick={()=>planning?onOpenTrip(model.trip?.id,"day"):onNavigate("profile")} style={{...card,padding:21}}>
      <span style={{display:"block",fontSize:10,letterSpacing:".13em",color:C.red,fontWeight:700}}>{planning?"AVANT LE DÉPART":"APRÈS LE VOYAGE"}</span>
      <h2 style={{fontFamily:"'Noto Serif JP',serif",fontSize:23,fontWeight:600,margin:"9px 0",lineHeight:1.35}}>{model.title}</h2>
      <p style={{color:C.t2,fontSize:12,lineHeight:1.6,margin:"0 0 12px"}}>{model.description}</p>
      {!planning && model.memory && <p style={{fontSize:13,lineHeight:1.6,color:C.t2,fontStyle:"italic",overflowWrap:"anywhere"}}>« {model.memory.note.slice(0,180)}{model.memory.note.length>180?"…":""} »</p>}
      <span style={{fontSize:12,color:C.red,fontWeight:650}}>{planning?(model.trip?"Ouvrir mon itinéraire":"Créer mon voyage"):model.summary.awaitingConfirmation.length?"Confirmer mon voyage":"Retrouver mon carnet"} →</span>
    </button>
    {planning && <ReadinessCard C={C} trips={model.preparationTrips} preferredTripId={model.trip?.id} kanaProgress={kanaProgress} scenarioProgress={scenProgress} pathProgress={pathProgress} onOpenTrip={onOpenTrip} onNavigate={onNavigate}/>}
    <div aria-label="Actions recommandées" style={{ display: "grid", gap: 8 }}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:C.t3}}>À FAIRE MAINTENANT</div>
      {model.recommendations?.slice(0, 4).map(item => <button key={item.id} onClick={() => openRecommendation(item)} style={{ ...card, minHeight:44, padding: 13, boxShadow: "none" }}><strong style={{ fontSize: 13 }}>{item.title}</strong><span style={{ display: "block", color: C.t3, fontSize: 11, marginTop: 3 }}>{item.text} →</span></button>)}
    </div>
    <p style={{fontSize:10,color:C.t3,textAlign:"center",margin:0}}>Ton Japon commence avant le départ et continue après ton retour.</p>
  </div>;
}
