import { ImageWithFallback } from "../../components/ImageWithFallback.jsx";
import { Check, Heart, MapPinned, Plane } from "lucide-react";
import { useMemo } from "react";
import { buildJapanGraph, buildPrefectureConnections } from "../../entities/content/japanGraph.js";
import { ContextualConnections } from "../shared/ContextualConnections.jsx";
import { discoveryResult } from "./discoverModel.js";

function hasContent(value){return Array.isArray(value)?value.length>0:Boolean(value);}

function isImageSource(value){
  return typeof value==="string"&&(/^(https?:|data:image\/|\/)/.test(value)||/\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(value));
}

function ContentValue({C,value}){
  if(Array.isArray(value))return <div style={{display:"grid",gap:7}}>{value.map((item,index)=>{
    const text=typeof item==="string"?item:item?.nameFr||item?.name||item?.nom||item?.title||item?.titre||item?.label;
    return text?<div key={item?.id||index} style={{display:"flex",gap:8,fontSize:12,color:C.t2,lineHeight:1.55}}><span aria-hidden style={{color:C.red}}>•</span><span>{text}</span></div>:null;
  })}</div>;
  return <p style={{margin:0,fontSize:12,color:C.t2,lineHeight:1.7,whiteSpace:"pre-line"}}>{value}</p>;
}

function EditorialSection({C,title,value,children}){
  const present=hasContent(value)||Boolean(children);
  return <section style={{padding:"16px 15px",borderRadius:17,border:`1px solid ${C.border}`,background:C.s1}}><h2 style={{fontFamily:"'Noto Serif JP',serif",fontSize:16,color:C.text,margin:"0 0 8px"}}>{title}</h2>{present?(children||<ContentValue C={C} value={value}/>):<p style={{margin:0,fontSize:11,color:C.t3,lineHeight:1.55}}>Contenu éditorial à venir.</p>}</section>;
}

export function PrefectureMark({prefecture,size=104}){
  const symbol=typeof prefecture.symbol==="string"?prefecture.symbol.trim():prefecture.symbol;
  const flag=typeof prefecture.flag==="string"?prefecture.flag.trim():prefecture.flag;
  const mark=symbol||flag;
  if(isImageSource(mark))return <ImageWithFallback src={mark} emoji={prefecture.emoji || "🗾"} style={{width:size,height:size,fontSize:size*.7}} imageStyle={{objectFit:"contain"}}/>;
  const fallback=typeof prefecture.emoji==="string"&&prefecture.emoji.trim()?prefecture.emoji:"🗾";
  return <span aria-hidden style={{display:"grid",placeItems:"center",width:size,height:size,fontSize:size*.7}}>{mark||fallback}</span>;
}

function LinkedCards({C,items,onOpenPlace,empty}){
  if(!items?.length)return <p style={{margin:0,fontSize:11,color:C.t3}}>{empty}</p>;
  return <div style={{display:"grid",gap:8}}>{items.map((item,index)=>{
    const isPlace=Boolean(item?.nom||item?.villeId);
    const label=typeof item==="string"?item:item?.nameFr||item?.name||item?.nom||item?.title||item?.titre||item?.label;
    return <button key={item?.id||index} disabled={!isPlace||!onOpenPlace} onClick={()=>isPlace&&onOpenPlace?.(discoveryResult("lieu",item))} style={{display:"flex",alignItems:"center",gap:10,padding:11,borderRadius:12,border:`1px solid ${C.border}`,background:C.s2,color:C.text,textAlign:"left",cursor:isPlace&&onOpenPlace?"pointer":"default"}}><span style={{fontSize:20}}>{item?.emoji||"📍"}</span><span style={{flex:1,fontSize:12,fontWeight:600}}>{label}</span>{isPlace&&onOpenPlace&&<span style={{color:C.t3}}>›</span>}</button>;
  })}</div>;
}

export function PrefectureDetail({C,db,prefecture,onBack,onToggleFavorite,onAddToTrip,onOpenPlace,onOpenConnection}){
  const unique=[prefecture.geography,...(prefecture.specialties||[]),...(prefecture.festivals||[])].filter(Boolean);
  const seasons=[...(prefecture.bestSeasons||[]),...(prefecture.travelTips||[])];
  const hasOverview=hasContent(prefecture.shortDescription)||hasContent(prefecture.description);
  const connections=useMemo(()=>buildPrefectureConnections(prefecture,buildJapanGraph(db)),[db,prefecture]);
  return <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
    <header style={{minHeight:235,padding:"calc(18px + env(safe-area-inset-top, 0px)) 20px 22px",position:"relative",overflow:"hidden",background:`linear-gradient(145deg,${C.red}25,${C.s1} 60%,${C.gold}18)`}}>
      {prefecture.heroImage&&<><ImageWithFallback src={prefecture.heroImage} emoji={prefecture.emoji || "🗾"} style={{position:"absolute",inset:0,width:"100%",height:"100%",fontSize:64,background:C.s2}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.75))",pointerEvents:"none"}}/></>}
      <button onClick={onBack} style={{position:"relative",padding:0,border:0,background:"none",color:prefecture.heroImage?"#fff":C.t2,fontSize:12,cursor:"pointer"}}>‹ Les 47 préfectures</button>
      <div aria-hidden style={{position:"absolute",right:16,bottom:-8,fontFamily:"'Noto Serif JP',serif",fontSize:92,color:prefecture.heroImage?"#fff":C.red,opacity:.1}}><PrefectureMark prefecture={prefecture}/></div>
      <div style={{position:"absolute",left:20,right:20,bottom:21}}><div style={{fontSize:10,color:prefecture.heroImage?"#fff":C.red,letterSpacing:".15em",fontWeight:700}}>{prefecture.region} · {String(prefecture.number).padStart(2,"0")}/47</div><h1 style={{fontFamily:"'Noto Serif JP',serif",fontSize:29,color:prefecture.heroImage?"#fff":C.text,margin:"7px 0 1px"}}>{prefecture.nameFr}</h1><div style={{fontFamily:"'Noto Serif JP',serif",fontSize:16,color:prefecture.heroImage?"rgba(255,255,255,.82)":C.t2}}>{prefecture.nameJa} <span style={{fontSize:11}}>· {prefecture.nameKana}</span></div><div style={{fontSize:10.5,color:prefecture.heroImage?"rgba(255,255,255,.74)":C.t3,marginTop:6}}>Capitale · {prefecture.capital}</div></div>
    </header>
    <main style={{padding:"15px 20px 118px",display:"grid",gap:10}}>
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{prefecture.discovered&&<span style={{padding:"6px 9px",borderRadius:99,background:`${C.gold}17`,color:C.gold,fontSize:9.5}}><Check size={11} style={{verticalAlign:"-2px"}}/> Découverte</span>}{prefecture.favorite&&<span style={{padding:"6px 9px",borderRadius:99,background:`${C.red}14`,color:C.red,fontSize:9.5}}>♥ Sauvegardée</span>}{prefecture.visited&&<span style={{padding:"6px 9px",borderRadius:99,background:`${C.green}16`,color:C.green,fontSize:9.5}}>● Visitée · stamp débloqué</span>}</div>
      <EditorialSection C={C} title="En quelques mots" value={hasOverview?true:null}>{hasOverview?<div style={{display:"grid",gap:9}}>{hasContent(prefecture.shortDescription)&&<ContentValue C={C} value={prefecture.shortDescription}/>} {hasContent(prefecture.description)&&prefecture.description!==prefecture.shortDescription&&<ContentValue C={C} value={prefecture.description}/>}</div>:null}</EditorialSection>
      {connections.map(group=><ContextualConnections key={group.id} C={C} title={group.label} connections={group.items} onOpen={onOpenConnection}/>)}
      <EditorialSection C={C} title="Son histoire" value={prefecture.history}/>
      <EditorialSection C={C} title="Ce qui la rend unique" value={unique}/>
      <EditorialSection C={C} title="À voir"><LinkedCards C={C} items={[...(prefecture.prominentPlaces||[]),...(prefecture.relatedPlaces||[])]} onOpenPlace={onOpenPlace} empty="Les lieux seront ajoutés progressivement."/></EditorialSection>
      <EditorialSection C={C} title="À manger" value={prefecture.localFood}/>
      <EditorialSection C={C} title="Culture locale" value={prefecture.culture}/>
      <EditorialSection C={C} title="Nature" value={prefecture.nature}/>
      <EditorialSection C={C} title="Quand y aller" value={seasons}/>
      <EditorialSection C={C} title="Le savais-tu ?" value={prefecture.funFacts}/>
      <EditorialSection C={C} title="Lieux associés"><LinkedCards C={C} items={prefecture.relatedPlaces} onOpenPlace={onOpenPlace} empty="Aucun lieu associé pour le moment."/></EditorialSection>
      <EditorialSection C={C} title="Contenus associés"><LinkedCards C={C} items={prefecture.relatedContent} empty="Aucun contenu associé pour le moment."/></EditorialSection>
      {!prefecture.visited&&<div style={{padding:13,borderRadius:14,background:C.s2,fontSize:10.5,color:C.t3,lineHeight:1.55}}><MapPinned size={15} style={{verticalAlign:"-3px",marginRight:6}}/>Lire cette fiche ne marque pas la préfecture comme visitée. Une visite nécessite une activité de voyage explicitement réalisée.</div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,position:"sticky",bottom:10,zIndex:4}}><button onClick={()=>onAddToTrip?.(prefecture)} style={{padding:"12px 9px",borderRadius:999,border:0,background:C.red,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",boxShadow:C.shadow}}><Plane size={14} style={{verticalAlign:"-3px",marginRight:5}}/>Ajouter à un voyage</button><button onClick={()=>onToggleFavorite?.(prefecture)} aria-pressed={prefecture.favorite} style={{padding:"12px 9px",borderRadius:999,border:`1px solid ${prefecture.favorite?C.red:C.border}`,background:C.s1,color:prefecture.favorite?C.red:C.text,fontSize:11,fontWeight:700,cursor:"pointer",boxShadow:C.shadow}}><Heart size={14} fill={prefecture.favorite?"currentColor":"none"} style={{verticalAlign:"-3px",marginRight:5}}/>{prefecture.favorite?"Sauvegardée":"Sauvegarder"}</button></div>
    </main>
  </div>;
}
