import { useState } from "react";
import { ArrowRight, Map } from "lucide-react";
import { favoriteDiscoveryResult } from "./discoverModel.js";
import { EmptyState, ProductCard, SectionHeading } from "../shared/ProductUI.jsx";

const ACCENT = {red:"#C9463D",indigo:"#6E63A6",green:"#3A6645",gold:"#9E7A1A",pink:"#D96B86",blue:"#4276A0"};

function ContentGrid({ C, items, onOpen, empty }) {
  return <div className="isekaid-stagger" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{items.map((item,index)=><ProductCard C={C} as="button" variant="quiet" interactive key={`${item.kind}:${item.raw?.id||index}`} onClick={()=>onOpen?.(item)} style={{minHeight:116,padding:13,color:C.text,textAlign:"left",cursor:"pointer"}}><span aria-hidden style={{fontSize:21}}>{item.emoji || "🎋"}</span><strong style={{display:"block",fontFamily:"'Noto Serif JP',serif",fontSize:12.5,marginTop:7,lineHeight:1.35}}>{item.title}</strong><span style={{display:"block",fontSize:9.5,color:C.t3,marginTop:4}}>{item.type}</span></ProductCard>)}{!items.length&&<EmptyState C={C} mark="余" title="Une collection encore ouverte" description={empty} style={{gridColumn:"1/-1"}}/>}</div>;
}

export function DiscoverHome({ C, model, onOpenDestination, onOpenItem }) {
  const [filter,setFilter]=useState("all");
  const favoriteItems=model.favorites.map(favoriteDiscoveryResult).filter(Boolean);
  return <main style={{padding:"0 20px 10px"}}>
    <section style={{marginTop:16}}>
      <ProductCard C={C} as="button" variant="passport" interactive onClick={()=>onOpenDestination({route:"prefectures",cat:"regions"})} style={{width:"100%",padding:18,color:C.text,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}><span aria-hidden style={{width:48,height:48,display:"grid",placeItems:"center",flexShrink:0,borderRadius:"50%",background:`${C.red}10`,color:C.red}}><Map size={23}/></span><span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:9.5,color:C.red,fontWeight:800,letterSpacing:".16em"}}>ATLAS PERSONNEL</span><strong style={{display:"block",fontFamily:"'Noto Serif JP',serif",fontSize:19,marginTop:5}}>Les 47 préfectures</strong><span style={{display:"block",fontSize:10.5,color:C.t2,marginTop:4,lineHeight:1.45}}>{model.prefectures.filter(item=>item.discovered).length} découvertes · {model.prefectures.filter(item=>item.visited).length} visitées</span></span><ArrowRight size={17} color={C.red}/></ProductCard>
    </section>

    <section style={{marginTop:17}}>
      <SectionHeading C={C} eyebrow="Ton encyclopédie" title="Explorer par univers" detail={`${model.reading.total} lus · ${model.favorites.length} favoris`}/>
      <div role="group" aria-label="Filtres de Découvrir" style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:12}}>{[{id:"all",label:"Tous les thèmes"},{id:"favorites",label:"Mes favoris"},{id:"unread",label:"À lire"}].map(item=><button className="isekaid-chip" key={item.id} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}</button>)}</div>
    </section>

    {filter==="favorites" ? <ContentGrid C={C} items={favoriteItems.slice(0,12)} onOpen={onOpenItem} empty="Ajoute un cœur depuis une fiche pour construire ta collection."/> : filter==="unread" ? <ContentGrid C={C} items={model.suggestedUnread} onOpen={onOpenItem} empty="Tu as lu toutes les suggestions disponibles."/> : <section className="isekaid-stagger" style={{display:"grid",gap:10}}>
      {model.sections.map(section=>{
        const color=ACCENT[section.accent]||C.red;
        const first=section.topics.find(topic=>topic.available);
        return <ProductCard C={C} as="article" variant="quiet" key={section.id} style={{overflow:"hidden"}}>
          <button onClick={()=>onOpenDestination(first||section)} style={{width:"100%",padding:"14px 14px 10px",border:0,background:`linear-gradient(105deg,${color}12,transparent 72%)`,color:C.text,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:11}}><span aria-hidden style={{width:39,height:39,display:"grid",placeItems:"center",borderRadius:"50%",background:`${color}12`,fontSize:20,flexShrink:0}}>{section.emoji || "🎋"}</span><span style={{flex:1,minWidth:0}}><strong style={{display:"block",fontFamily:"'Noto Serif JP',serif",fontSize:14.5}}>{section.title}</strong><span style={{display:"block",fontSize:10,color:C.t3,lineHeight:1.4,marginTop:2}}>{section.description}</span><span style={{display:"block",fontSize:9,color,marginTop:4}}>{section.total} contenus · {section.read} lus</span></span><ArrowRight size={15} color={color}/></button>
          <div style={{padding:"0 12px 12px 63px",display:"flex",gap:5,flexWrap:"wrap"}}>{section.topics.map(topic=><button key={topic.id} disabled={!topic.available} onClick={()=>onOpenDestination(topic)} style={{padding:"5px 7px",borderRadius:999,border:`1px ${topic.available?"solid":"dashed"} ${topic.available?color+"55":C.border}`,background:topic.available?`${color}0d`:"transparent",color:topic.available?C.t2:C.t3,fontSize:8.5,cursor:topic.available?"pointer":"default"}}>{topic.label}{!topic.available?" · bientôt":""}</button>)}</div>
        </ProductCard>;
      })}
    </section>}
  </main>;
}
