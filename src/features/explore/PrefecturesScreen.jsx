import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { JapanPrefectureMap } from "./JapanPrefectureMap.jsx";
import { PrefectureDetail, PrefectureMark } from "./PrefectureDetail.jsx";
import { EditorialHeader, EmptyState, ProductCard, productTheme } from "../shared/ProductUI.jsx";

function stateLabel(item){
  if(item.visited)return "Visitée";
  if(item.favorite)return "Sauvegardée";
  if(item.discovered)return "Découverte";
  return "Jamais découverte";
}

export function PrefecturesScreen({C,db,prefectures=[],initialSelectedId=null,onOpenPlace,onBack,onDiscover,onToggleFavorite,onAddToTrip,onOpenConnection,backRef}){
  const [region,setRegion]=useState("all");
  const [status,setStatus]=useState("all");
  const [query,setQuery]=useState("");
  const [selectedId,setSelectedId]=useState(initialSelectedId);
  useEffect(()=>{
    if(!backRef)return;
    const pop=()=>{if(selectedId){setSelectedId(null);return true;}return false;};
    backRef.current=pop;
    return()=>{if(backRef.current===pop)backRef.current=null;};
  },[backRef,selectedId]);
  const selected=prefectures.find(item=>item.id===selectedId)||null;
  const regions=[...new Set(prefectures.map(item=>item.region))];
  const visible=useMemo(()=>prefectures.filter(item=>{
    const matchesRegion=region==="all"||item.region===region;
    const matchesStatus=status==="all"||(status==="new"&&!item.discovered&&!item.favorite&&!item.visited)||Boolean(item[status]);
    const haystack=`${item.nameFr} ${item.nameJa} ${item.nameKana} ${item.capital}`.toLocaleLowerCase("fr");
    return matchesRegion&&matchesStatus&&haystack.includes(query.trim().toLocaleLowerCase("fr"));
  }),[prefectures,region,status,query]);
  const openPrefecture=id=>{onDiscover?.(id);setSelectedId(id);};
  if(selected)return <PrefectureDetail C={C} db={db} prefecture={selected} onBack={()=>setSelectedId(null)} onToggleFavorite={onToggleFavorite} onAddToTrip={onAddToTrip} onOpenPlace={onOpenPlace} onOpenConnection={onOpenConnection}/>;
  const counts={discovered:prefectures.filter(item=>item.discovered).length,favorite:prefectures.filter(item=>item.favorite).length,visited:prefectures.filter(item=>item.visited).length};
  return <div style={productTheme(C,{height:"100%",overflowY:"auto",background:C.bg})}>
    <EditorialHeader C={C} onBack={onBack} backLabel="Découvrir" eyebrow="日本 · Explorer le Japon" title="Les 47 préfectures" subtitle={`${counts.discovered} découvertes · ${counts.favorite} sauvegardées · ${counts.visited} visitées`}/>
    <main style={{padding:"14px 20px 110px"}}>
      <JapanPrefectureMap C={C} prefectures={prefectures} selectedId={selectedId} onSelect={openPrefecture}/>
      <ProductCard C={C} as="label" variant="quiet" style={{display:"flex",alignItems:"center",gap:9,padding:"11px 13px",marginTop:14,borderRadius:14}}><Search size={15} color={C.t3}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Nom, capitale ou nom japonais…" style={{flex:1,border:0,outline:0,background:"transparent",color:C.text,fontSize:12}}/></ProductCard>
      <div role="group" aria-label="État des préfectures" style={{display:"flex",gap:7,overflowX:"auto",padding:"11px 0 6px"}}>{[
        ["all","Tous les états"],["new","Jamais découvertes"],["discovered","Découvertes"],["favorite","Sauvegardées"],["visited","Visitées"],
      ].map(([id,label])=><button className="isekaid-chip" key={id} aria-pressed={status===id} onClick={()=>setStatus(id)}>{label}</button>)}</div>
      <div style={{display:"flex",gap:7,overflowX:"auto",padding:"5px 0 15px"}}>{["all",...regions].map(name=><button key={name} onClick={()=>setRegion(name)} style={{flexShrink:0,padding:"7px 10px",borderRadius:999,border:`1px solid ${region===name?C.gold:C.border}`,background:region===name?`${C.gold}12`:"transparent",color:region===name?C.gold:C.t3,fontSize:9.5,cursor:"pointer"}}>{name==="all"?"Tout le Japon":name}</button>)}</div>
      <div className="isekaid-stagger" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{visible.map(item=><ProductCard C={C} as="button" interactive key={item.id} onClick={()=>openPrefecture(item.id)} style={{minHeight:102,padding:12,borderRadius:15,borderColor:item.visited?C.green+"66":item.favorite?C.red+"66":item.discovered?C.gold+"66":C.border,background:item.visited?`${C.green}0d`:item.favorite?`${C.red}0d`:C.s1,color:C.text,textAlign:"left",cursor:"pointer"}}><span style={{float:"right",marginLeft:5}}><PrefectureMark prefecture={item} size={32}/></span><span style={{fontSize:9,color:C.t3}}>{String(item.number).padStart(2,"0")} · {item.region}</span><strong style={{display:"block",fontFamily:"'Noto Serif JP',serif",fontSize:14,marginTop:5}}>{item.nameFr}</strong><span lang="ja" style={{display:"block",fontSize:10,color:C.t2,marginTop:1}}>{item.nameJa}</span><span style={{display:"block",fontSize:9.5,color:item.visited?C.green:item.favorite?C.red:item.discovered?C.gold:C.t3,marginTop:6}}>{stateLabel(item)}{item.available?` · ${item.places.length} lieu${item.places.length>1?"x":""}`:""}</span></ProductCard>)}</div>
      {!visible.length&&<EmptyState C={C} mark="図" title="Aucune préfecture trouvée" description="Essaie une autre région, un autre état ou efface ta recherche."/>}
    </main>
  </div>;
}
