import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { filterCatalog } from "./discoverModel.js";
import { EditorialHeader, EmptyState, ProductCard, productTheme } from "../shared/ProductUI.jsx";

export function DiscoveryCatalogScreen({ C, title, subtitle, emoji, items = [], readingProgress, favorites = [], onOpen, onBack }) {
  const [filter,setFilter]=useState("all");
  const [query,setQuery]=useState("");
  const visible=useMemo(()=>{
    const base=filterCatalog(items,filter,readingProgress,favorites);
    const normalized=query.trim().toLocaleLowerCase("fr");
    return normalized ? base.filter(item=>`${item.title} ${item.sub} ${item.summary}`.toLocaleLowerCase("fr").includes(normalized)) : base;
  },[items,filter,readingProgress,favorites,query]);
  return <div style={productTheme(C,{height:"100%",overflowY:"auto",background:C.bg})}>
    <EditorialHeader C={C} onBack={onBack} backLabel="Découvrir" leading={emoji} eyebrow="Collection" title={title} subtitle={`${subtitle} · ${visible.length} contenus`}/>
    <div style={{padding:"15px 20px 0"}}>
      <ProductCard C={C} as="label" variant="quiet" style={{display:"flex",alignItems:"center",gap:9,padding:"11px 13px",borderRadius:14}}><Search size={15} color={C.t3}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Filtrer cette collection…" style={{flex:1,border:0,outline:0,background:"transparent",color:C.text,fontSize:12}}/></ProductCard>
      <div role="group" aria-label="Filtrer les contenus" style={{display:"flex",gap:7,overflowX:"auto",padding:"11px 0 15px"}}>{[{id:"all",label:"Tous"},{id:"unread",label:"À lire"},{id:"favorites",label:"Favoris"}].map(item=><button className="isekaid-chip" key={item.id} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}</button>)}</div>
    </div>
    <main className="isekaid-stagger" style={{padding:"0 20px 110px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {visible.map(item=><ProductCard C={C} as="button" interactive key={`${item.kind}:${item.raw?.id||item.title}`} onClick={()=>onOpen?.(item)} style={{minHeight:148,padding:14,borderRadius:17,color:C.text,textAlign:"left",cursor:"pointer"}}><span style={{fontSize:26}}>{item.emoji || "🎋"}</span><strong style={{display:"block",fontFamily:"'Noto Serif JP',serif",fontSize:13,marginTop:8,lineHeight:1.35}}>{item.title}</strong><span style={{display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden",fontSize:10.5,color:C.t3,lineHeight:1.45,marginTop:5}}>{item.summary}</span></ProductCard>)}
      {!visible.length&&<EmptyState C={C} mark="集" title="Cette collection attend encore" description="Modifie le filtre ou reviens après avoir sauvegardé un contenu." style={{gridColumn:"1/-1"}}/>}
    </main>
  </div>;
}
