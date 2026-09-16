import { ReadinessCard } from "../readiness/ReadinessCard.jsx";
import { SpeakButton } from "../../tts.jsx";
import { ProductCard } from "../shared/ProductUI.jsx";
import { Romaji } from "../../components/JapaneseDisplay.jsx";

export function JourneyHome({ C, model, kanaProgress, scenProgress, pathProgress, onOpenTrip, onNavigate, onOpenLieu, onOpenTradition }) {
  const planning = model.mode === "planning";
  const card = { display:"block",width:"100%",padding:17,textAlign:"left",color:C.text };
  const openRecommendation = action => action.id === "journal" ? onNavigate("profile") : action.id === "new_trip" ? onOpenTrip(null) : onNavigate(action.tab);
  const nextStepTitle = model.nextStep?.place?.nom || model.nextStep?.dayTitle || (model.trip ? "Continuer l’itinéraire" : "Créer une première étape");
  return <section aria-label={planning ? "Contexte du prochain voyage" : "Après le voyage"} style={{padding:"0 20px 110px",marginTop:14,position:"relative",zIndex:2,display:"grid",gap:14}}>
    <ProductCard C={C} variant="passport" style={{...card,padding:21}}>
      <span style={{display:"block",fontSize:10,letterSpacing:".13em",color:C.red,fontWeight:700}}>{planning?"CONTEXTE VOYAGE · AVANT LE DÉPART":"CONTEXTE VOYAGE · APRÈS LE RETOUR"}</span>
      <h2 style={{fontFamily:"'Noto Serif JP',serif",fontSize:23,fontWeight:600,margin:"9px 0",lineHeight:1.35}}>{model.title}</h2>
      <p style={{color:C.t2,fontSize:12,lineHeight:1.6,margin:"0 0 14px"}}>{model.description}</p>
      {planning ? <div style={{display:"grid",gap:9,marginBottom:14}}>
        <div style={{padding:"11px 12px",borderRadius:13,background:C.s2}}>
          <span style={{display:"block",fontSize:9,color:C.t3,fontWeight:700,letterSpacing:".1em"}}>PROCHAINE ÉTAPE</span>
          <strong style={{display:"block",fontSize:13,marginTop:4}}>{nextStepTitle}</strong>
          {model.nextStep?.dayNumber && <span style={{fontSize:11,color:C.t3}}>Jour {model.nextStep.dayNumber}</span>}
        </div>
        <div style={{padding:"11px 12px",borderRadius:13,background:`${C.gold}12`,border:`1px solid ${C.gold}33`}}>
          <span style={{display:"block",fontSize:9,color:C.gold,fontWeight:700,letterSpacing:".1em"}}>PRÉPARATION RECOMMANDÉE</span>
          <span style={{display:"block",fontSize:12,color:C.t2,lineHeight:1.5,marginTop:4}}>{model.preparationRecommendation}</span>
        </div>
      </div> : model.memory && <p style={{fontSize:13,lineHeight:1.6,color:C.t2,fontStyle:"italic",overflowWrap:"anywhere"}}>« {model.memory.note.slice(0,180)}{model.memory.note.length>180?"…":""} »</p>}
      <button onClick={()=>planning?onOpenTrip(model.trip?.id,"day"):onNavigate("profile")} style={{padding:0,border:0,background:"none",color:C.red,fontSize:12,fontWeight:650,cursor:"pointer"}}>{planning?(model.trip?"Ouvrir mon itinéraire":"Créer mon voyage"):model.summary.awaitingConfirmation.length?"Confirmer mon voyage":"Retrouver mon carnet"} →</button>
    </ProductCard>

    {planning && model.usefulJapanese && <ProductCard C={C} variant="quiet" style={{...card,padding:16,boxShadow:"none"}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:C.t3,marginBottom:9}}>JAPONAIS UTILE POUR CE VOYAGE</div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'Noto Serif JP',serif",fontSize:18,fontWeight:600}}>{model.usefulJapanese.jp || model.usefulJapanese.kana}</div>
          <Romaji style={{fontSize:11,color:C.gold,fontStyle:"italic",marginTop:2}}>{model.usefulJapanese.romaji}</Romaji>
          <div style={{fontSize:12,color:C.t2,marginTop:4}}>{model.usefulJapanese.fr}</div>
        </div>
        <SpeakButton C={C} text={model.usefulJapanese.jp || model.usefulJapanese.kana} size={34}/>
      </div>
    </ProductCard>}
    {planning && <ReadinessCard C={C} trips={model.preparationTrips} preferredTripId={model.trip?.id} kanaProgress={kanaProgress} scenarioProgress={scenProgress} pathProgress={pathProgress} onOpenTrip={onOpenTrip} onNavigate={onNavigate}/>}

    {!planning && <div aria-label="Faire vivre le voyage terminé" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
      {model.returnActions.map(action=><ProductCard C={C} as="button" variant="quiet" interactive key={action.id} onClick={()=>onNavigate("profile")} style={{...card,minHeight:118,padding:14,cursor:"pointer"}}>
        <span style={{fontSize:22}}>{action.emoji}</span>
        <strong style={{display:"block",fontSize:12.5,marginTop:7,lineHeight:1.3}}>{action.title}</strong>
        <span style={{display:"block",fontSize:10.5,color:C.t3,lineHeight:1.4,marginTop:4}}>{action.text}</span>
      </ProductCard>)}
    </div>}

    {planning && <div aria-label="Actions recommandées" style={{ display: "grid", gap: 8 }}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:".12em",color:C.t3}}>À FAIRE MAINTENANT</div>
      {model.recommendations?.filter(item=>!["itinerary","readiness"].includes(item.id)).slice(0,2).map(item => <ProductCard C={C} as="button" variant="quiet" interactive key={item.id} onClick={() => openRecommendation(item)} style={{ ...card, minHeight:44, padding: 13, cursor:"pointer" }}><strong style={{ fontSize: 13 }}>{item.title}</strong><span style={{ display: "block", color: C.t3, fontSize: 11, marginTop: 3 }}>{item.text} →</span></ProductCard>)}
    </div>}
    <p style={{fontSize:10,color:C.t3,textAlign:"center",margin:0}}>Ton Japon commence avant le départ et continue après ton retour.</p>
  </section>;
}
