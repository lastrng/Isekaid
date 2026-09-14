import { BookOpen, CalendarDays, CheckSquare, ChevronRight, FileText, Heart, Map, MapPin, NotebookPen, Plus, Stamp } from "lucide-react";
import { useMemo } from "react";
import { buildJapanGraph, buildTripConnections } from "../../entities/content/japanGraph.js";
import { getTravelRelatedContent } from "../../entities/user/userContext.js";
import { ContextualConnections } from "../shared/ContextualConnections.jsx";
import { SpeakButton } from "../../tts.jsx";
import { OfflineTravelKit } from "./OfflineTravelKit.jsx";

function countTrip(trip){
  const activities=(trip?.jours||[]).flatMap(day=>day.activites||[]);
  return {
    days:trip?.jours?.length||0,
    cities:new Set((trip?.villes||[]).filter(Boolean)).size,
    places:activities.length,
    visited:activities.filter(activity=>activity.fait===true).length,
    notes:activities.filter(activity=>Boolean(activity.note?.trim())).length,
    checklistDone:(trip?.checklist||[]).filter(item=>item.fait===true).length,
    checklistTotal:trip?.checklist?.length||0,
  };
}

function QuickAction({C,icon:Icon,title,text,onClick,disabled=false}){
  return <button disabled={disabled} onClick={onClick} style={{minHeight:102,padding:13,borderRadius:15,border:`1px solid ${C.border}`,background:C.s1,color:C.text,textAlign:"left",cursor:disabled?"default":"pointer",opacity:disabled?.48:1}}><Icon size={18} color={C.red}/><strong style={{display:"block",fontSize:12,marginTop:7}}>{title}</strong><span style={{display:"block",fontSize:9.5,color:C.t3,lineHeight:1.35,marginTop:3}}>{text}</span></button>;
}

function Stat({C,value,label}){
  return <div style={{padding:"9px 5px",borderRadius:11,background:C.s2,textAlign:"center"}}><strong style={{display:"block",fontSize:16,color:C.text}}>{value}</strong><span style={{fontSize:9,color:C.t3}}>{label}</span></div>;
}

export function VoyageContextPanel({C,db,userContext,model,trip,keptPlacesCount=0,onOpenTrip,onOpenKept,onCreate,onBrowse,onPhrases,onPractical,onProfile,onResolveTrip,onOpenConnection}){
  const connections=useMemo(()=>userContext?getTravelRelatedContent({context:userContext,db,limit:3}):buildTripConnections(trip,buildJapanGraph(db)),[db,trip,userContext]);
  if(!model)return null;
  const planning=model.mode==="planning";
  const stats=countTrip(trip);
  const hasTrip=Boolean(trip);
  const awaiting=trip&&model.summary?.awaitingConfirmation?.some(item=>item.id===trip.id);
  const open=sub=>hasTrip&&onOpenTrip?.(trip.id,sub);

  return <section aria-label={planning?"Préparation du voyage":"Après le voyage"} style={{display:"grid",gap:11,marginBottom:20}}>
    <div style={{padding:19,borderRadius:19,border:`1px solid ${planning?C.red:C.gold}40`,background:`linear-gradient(145deg,${planning?C.red:C.gold}18,${C.s1})`,position:"relative",overflow:"hidden"}}>
      <span aria-hidden style={{position:"absolute",right:-8,bottom:-24,fontSize:88,opacity:.08}}>{planning?"🧳":"📔"}</span>
      <div style={{fontSize:9.5,color:planning?C.red:C.gold,fontWeight:750,letterSpacing:".14em"}}>{planning?"AVANT LE VOYAGE":"APRÈS LE VOYAGE"}</div>
      <h2 style={{fontFamily:"'Noto Serif JP',serif",fontSize:21,color:C.text,margin:"7px 0 5px",maxWidth:"86%"}}>{model.title}</h2>
      <p style={{fontSize:11,color:C.t2,lineHeight:1.55,margin:0,maxWidth:"90%"}}>{model.description}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:14}}>{planning?<>
        <Stat C={C} value={stats.days} label="jours"/><Stat C={C} value={stats.cities} label="villes"/><Stat C={C} value={stats.places} label="lieux"/><Stat C={C} value={stats.checklistTotal?`${stats.checklistDone}/${stats.checklistTotal}`:"—"} label="checklist"/>
      </>:<>
        <Stat C={C} value={stats.days} label="journées"/><Stat C={C} value={stats.visited} label="visités"/><Stat C={C} value={stats.notes} label="notes"/><Stat C={C} value={model.summary?.stamps?.length||0} label="stamps"/>
      </>}</div>
    </div>

    {planning&&<OfflineTravelKit C={C} compact/>}

    {planning&&<>
      <div style={{padding:"11px 12px",borderRadius:13,background:`${C.gold}12`,border:`1px solid ${C.gold}32`}}><div style={{fontSize:9,color:C.gold,fontWeight:750,letterSpacing:".1em"}}>RECOMMANDATION</div><div style={{fontSize:11,color:C.t2,lineHeight:1.5,marginTop:4}}>{model.preparationRecommendation}</div></div>
      {model.usefulJapanese&&<div style={{padding:13,borderRadius:14,background:C.s1,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:9,color:C.t3,fontWeight:700,letterSpacing:".1em"}}>JAPONAIS UTILE</div><strong lang="ja" style={{display:"block",fontFamily:"'Noto Serif JP',serif",fontSize:16,color:C.text,marginTop:4}}>{model.usefulJapanese.jp||model.usefulJapanese.kana}</strong><span style={{display:"block",fontSize:10,color:C.t2,marginTop:2}}>{model.usefulJapanese.fr}</span></div><SpeakButton C={C} text={model.usefulJapanese.jp||model.usefulJapanese.kana} size={34}/></div>}
      <ContextualConnections C={C} title="À préparer pour cet itinéraire" connections={connections} onOpen={onOpenConnection}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <QuickAction C={C} icon={Map} title="Itinéraire" text="Villes et ordre des étapes" onClick={()=>open("summary")} disabled={!hasTrip}/>
        <QuickAction C={C} icon={CalendarDays} title="Journées" text="Organiser le programme" onClick={()=>open("day")} disabled={!hasTrip}/>
        <QuickAction C={C} icon={Heart} title="Lieux sauvegardés" text={`${keptPlacesCount} lieu${keptPlacesCount>1?"x":""} à placer`} onClick={onOpenKept}/>
        <QuickAction C={C} icon={CheckSquare} title="Checklist" text="Préparer le départ" onClick={()=>open("checklist")} disabled={!hasTrip}/>
        <QuickAction C={C} icon={BookOpen} title="Japonais utile" text="Phrases pour le séjour" onClick={onPhrases}/>
        <QuickAction C={C} icon={FileText} title="Infos pratiques" text="Transports et usages" onClick={onPractical}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><button onClick={onCreate} style={{padding:11,border:0,borderRadius:999,background:C.red,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}><Plus size={14} style={{verticalAlign:"-3px",marginRight:4}}/>Créer un voyage</button><button onClick={onBrowse} style={{padding:11,border:`1px solid ${C.border}`,borderRadius:999,background:C.s1,color:C.text,fontSize:11,fontWeight:650,cursor:"pointer"}}>Voyages préconçus</button></div>
      <div style={{fontSize:9.5,color:C.t3,textAlign:"center"}}>Chaque modification est sauvegardée automatiquement sur cet appareil.</div>
    </>}

    {!planning&&<>
      {awaiting&&<div style={{padding:13,borderRadius:14,background:`${C.gold}12`,border:`1px solid ${C.gold}38`}}><strong style={{display:"block",fontSize:12,color:C.text}}>Ce voyage a-t-il bien eu lieu ?</strong><span style={{display:"block",fontSize:10,color:C.t3,lineHeight:1.45,marginTop:3}}>Une date passée ne suffit pas à créer des visites ou des stamps.</span><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:10}}><button onClick={()=>onResolveTrip?.(trip.id,true)} style={{padding:9,border:0,borderRadius:10,background:C.green,color:"#fff",fontSize:10.5,fontWeight:700}}>Oui, effectué</button><button onClick={()=>onResolveTrip?.(trip.id,false)} style={{padding:9,border:`1px solid ${C.border}`,borderRadius:10,background:C.s1,color:C.t2,fontSize:10.5}}>Non / annulé</button></div></div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <QuickAction C={C} icon={CalendarDays} title="Compléter les journées" text="Revoir le programme réalisé" onClick={()=>open("day")} disabled={!hasTrip}/>
        <QuickAction C={C} icon={MapPin} title="Lieux visités" text={`${stats.visited} lieu${stats.visited>1?"x":""} confirmé${stats.visited>1?"s":""}`} onClick={()=>open("day")} disabled={!hasTrip}/>
        <QuickAction C={C} icon={NotebookPen} title="Notes & souvenirs" text="Garder quelques traces" onClick={onProfile}/>
        <QuickAction C={C} icon={Stamp} title="Stamps obtenus" text={`${model.summary?.stamps?.length||0} dans Mon Japon`} onClick={onProfile}/>
        <QuickAction C={C} icon={BookOpen} title="Créer un carnet" text="Aperçu léger ou PDF" onClick={()=>open("carnet")} disabled={!hasTrip}/>
        <QuickAction C={C} icon={Map} title="Itinéraire conservé" text="Retrouver les étapes" onClick={()=>open("summary")} disabled={!hasTrip}/>
      </div>
      <button onClick={onCreate} style={{padding:11,border:`1px solid ${C.border}`,borderRadius:999,background:C.s1,color:C.text,fontSize:11,fontWeight:650,cursor:"pointer"}}>Préparer un nouveau voyage <ChevronRight size={14} style={{verticalAlign:"-3px"}}/></button>
    </>}
  </section>;
}
