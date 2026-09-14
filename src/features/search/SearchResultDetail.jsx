import { useMemo } from "react";
import { ArrowLeft, Heart } from "lucide-react";
import { SpeakButton } from "../../tts.jsx";
import { ReadingProgressButton } from "../explore/ReadingProgressButton.jsx";
import { relatedDiscoveries } from "../explore/discoverModel.js";

function Section({ C, title, children }) {
  if (!children) return null;
  return <section style={{marginTop:24}}><div style={{fontSize:10,color:C.t3,letterSpacing:".16em",textTransform:"uppercase",marginBottom:8}}>{title}</div><div style={{fontSize:14,color:C.t2,lineHeight:1.75}}>{children}</div></section>;
}

export function SearchResultDetail({ C, result, favorite, onToggleFavorite, onBack, db, read=false, onMarkRead, onOpenRelated }) {
  const item = result.raw || {};
  const related = useMemo(()=>relatedDiscoveries(db,result,4),[db,result]);
  const expression = result.kind === "expr";
  const japanese = expression ? item.expression : item.nom_jp;
  const title = expression ? item.traduction : (item.traduction || item.nom || result.title);
  const subtitle = item.romaji || result.sub;
  const description = expression ? item.contexte : (item.description || item.contenu || result.summary);
  const insight = item.fun_fact || item.insight;
  return <div style={{position:"fixed",inset:0,zIndex:210,background:C.bg,overflowY:"auto"}}>
    <header style={{position:"sticky",top:0,zIndex:2,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"calc(18px + env(safe-area-inset-top, 0px)) 18px 12px",background:C.navBg,backdropFilter:"blur(18px)",borderBottom:`1px solid ${C.border}`}}>
      <button onClick={onBack} aria-label="Retour" style={{width:36,height:36,borderRadius:18,border:`1px solid ${C.border}`,background:C.s1,color:C.text,display:"grid",placeItems:"center",cursor:"pointer"}}><ArrowLeft size={18}/></button>
      <div style={{fontSize:10,color:result.color,letterSpacing:".16em",textTransform:"uppercase"}}>{result.type}</div>
      <div style={{display:"flex",gap:7}}><ReadingProgressButton C={C} read={read} onMarkRead={onMarkRead} compact/><button onClick={onToggleFavorite} aria-label={favorite?"Retirer des favoris":"Ajouter aux favoris"} style={{width:36,height:36,borderRadius:18,border:`1px solid ${C.border}`,background:C.s1,color:favorite?C.red:C.t3,display:"grid",placeItems:"center",cursor:"pointer"}}><Heart size={18} fill={favorite?"currentColor":"none"}/></button></div>
    </header>
    <main style={{padding:"34px 22px 80px"}}>
      <div style={{minHeight:190,borderRadius:28,padding:"30px 24px",background:`linear-gradient(145deg,${result.color}20,${C.s1})`,border:`1px solid ${result.color}35`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
        <div style={{fontSize:38,marginBottom:12}}>{result.emoji}</div>
        {japanese&&<div style={{fontFamily:"'Noto Serif JP',serif",fontSize:japanese.length>8?28:42,color:C.text,lineHeight:1.25}}>{japanese}</div>}
        {subtitle&&<div style={{color:result.color,fontSize:13,marginTop:8}}>{subtitle}</div>}
        {japanese&&<div style={{marginTop:14}}><SpeakButton C={C} text={japanese} size={38} color={result.color}/></div>}
      </div>
      <h1 style={{fontFamily:"'Noto Serif JP',serif",fontSize:25,color:C.text,margin:"28px 0 0",lineHeight:1.3}}>{title}</h1>
      <Section C={C} title={expression?"Sens et usage":"Découvrir"}>{description}</Section>
      <Section C={C} title="Exemple">{item.exemple_jp&&<><div style={{color:C.text,fontFamily:"'Noto Serif JP',serif",fontSize:17}}>{item.exemple_jp}</div><div style={{marginTop:5}}>{item.exemple_fr}</div></>}</Section>
      <Section C={C} title={item.insight ? "À retenir" : "Le savais-tu ?"}>{insight}</Section>
      {item.moment&&<div style={{display:"inline-flex",marginTop:22,padding:"7px 12px",borderRadius:999,background:`${result.color}16`,color:result.color,fontSize:12}}>Moment idéal : {item.moment}</div>}
      {related.length>0&&<section style={{marginTop:28}}><div style={{fontSize:10,color:C.t3,letterSpacing:".16em",textTransform:"uppercase",marginBottom:10}}>Pour continuer</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>{related.map(relatedItem=><button key={`${relatedItem.kind}:${relatedItem.raw?.id||relatedItem.title}`} onClick={()=>onOpenRelated?.(relatedItem)} style={{padding:13,borderRadius:15,border:`1px solid ${C.border}`,background:C.s1,color:C.text,textAlign:"left",cursor:"pointer"}}><span style={{fontSize:20}}>{relatedItem.emoji}</span><strong style={{display:"block",fontSize:11.5,marginTop:6,lineHeight:1.35}}>{relatedItem.title}</strong><span style={{display:"block",fontSize:9.5,color:C.t3,marginTop:3}}>{relatedItem.type}</span></button>)}</div></section>}
    </main>
  </div>;
}
