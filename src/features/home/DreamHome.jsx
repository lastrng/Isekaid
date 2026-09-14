import { useMemo } from "react";
import { Compass, Map, PlaneTakeoff } from "lucide-react";
import { buildDreamHome } from "./dreamHomeModel.js";
import { JourneyIllustration, ProductCard } from "../shared/ProductUI.jsx";

export function DreamHome({ C, user, db, currentDate, onNavigate, onOpenLieu, onOpenTradition, onOpenTrip }) {
  const model = useMemo(() => buildDreamHome({ user, db, currentDate }), [user, db, currentDate]);
  const card = { width: "100%", padding: 17, textAlign: "left", color: C.text, cursor: "pointer" };
  const open = action => action.id === "inspiration" ? (model.place ? onOpenLieu(model.place) : onNavigate("explore")) : action.id === "new_trip" ? onOpenTrip(null) : onNavigate(action.tab);
  return <section aria-label="Contexte voyage sans voyage créé" style={{ padding: "0 20px 110px", marginTop: 14, position: "relative", display: "grid", gap: 14 }}>
    <ProductCard C={C} as="button" variant="paper" interactive style={{...card,padding:0,overflow:"hidden"}} onClick={() => onNavigate("explore")}>
      <JourneyIllustration/>
      <span style={{display:"block",padding:"18px 18px 19px",position:"relative",zIndex:1}}>
        <span style={{ color: C.red, fontSize: 9.5,letterSpacing:".16em",fontWeight:800 }}>LE JAPON, ENTRE DEUX DÉPARTS</span>
        <span style={{display:"block",fontFamily: "'Noto Serif JP',serif",fontWeight:600,fontSize: 22,lineHeight:1.35,margin:"8px 0"}}>Le voyage commence par ce que l’on remarque</span>
        <span style={{display:"block",fontSize: 12, color: C.t2, lineHeight: 1.6 }}>Découvre une préfecture, garde ton japonais vivant et compose peu à peu ton propre carnet.</span>
        <span style={{display:"flex",alignItems:"center",gap:6,color: C.red,fontSize: 11.5,fontWeight:700,marginTop:13}}><Compass size={15}/> Ouvrir une piste</span>
      </span>
    </ProductCard>
    {model.place && <ProductCard C={C} as="button" variant="quiet" interactive style={{...card,display:"flex",alignItems:"center",gap:12,padding:14}} onClick={() => onOpenLieu(model.place)}>
      <span aria-hidden style={{width:38,height:38,display:"grid",placeItems:"center",borderRadius:"50%",background:`${C.gold}14`,color:C.gold,flexShrink:0}}><Map size={18}/></span>
      <span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:9.5,color:C.t3,fontWeight:750,letterSpacing:".11em"}}>{model.personalized?"UNE PISTE POUR TOI":"PREMIÈRE PISTE"}</span>
      <strong style={{display:"block",fontFamily:"'Noto Serif JP',serif",fontSize:14,marginTop:4}}>{model.place.nom}</strong>
      <span style={{display:"block",fontSize:10.5,color:C.t3,marginTop:2}}>Lire la fiche avant de l’ajouter à un voyage →</span></span>
    </ProductCard>}
    <div aria-label="Actions recommandées" style={{ display: "grid", gap: 8 }}>
      {model.recommendations.filter(item => !["inspiration","new_trip"].includes(item.id)).slice(0, 2).map(item => <ProductCard C={C} as="button" variant="quiet" interactive key={item.id} onClick={() => open(item)} style={{ ...card, minHeight:48, padding: 13 }}><strong style={{ fontSize: 12.5 }}>{item.title}</strong><span style={{ display: "block", color: C.t3, fontSize: 10.5, marginTop: 3 }}>{item.text} →</span></ProductCard>)}
    </div>
    <ProductCard C={C} as="button" variant="passport" interactive style={{...card,padding:15,display:"flex",alignItems:"center",gap:12}} onClick={() => onOpenTrip(null)}>
      <PlaneTakeoff size={19} color={C.red}/><span><strong style={{display:"block",fontSize:12.5}}>Une envie de départ se précise ?</strong>
      <span style={{display:"block",fontSize:10.5,color:C.t3,marginTop:3}}>Créer un voyage, même sans dates →</span></span>
    </ProductCard>
  </section>;
}
