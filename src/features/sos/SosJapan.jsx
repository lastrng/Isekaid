import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Maximize2, Volume2, X } from "lucide-react";
import { speakJP } from "../../tts.jsx";
import { SOS_CATEGORIES } from "./sosData.js";
import { trackProductEvent } from "../../services/analytics/analytics.js";

export function SosJapan({ C, onBack, backRef }) {
  const [category, setCategory] = useState(null);
  const [largePhrase, setLargePhrase] = useState(null);
  const closeRef=useRef(null);
  useEffect(()=>{
    if(!backRef)return;
    const back=()=>{if(largePhrase){setLargePhrase(null);return true;}if(category){setCategory(null);return true;}return false;};
    backRef.current=back;
    return()=>{if(backRef.current===back)backRef.current=null;};
  },[backRef,largePhrase,category]);
  useEffect(()=>{
    if(!largePhrase)return;
    const previous=document.activeElement;
    closeRef.current?.focus();
    return()=>previous?.focus?.();
  },[largePhrase]);
  const items = category?.phrases || [];
  const chooseCategory = item => { trackProductEvent("sos_opened",{category:item.id}); setCategory(item); };
  return <div style={{height:"100%",overflowY:"auto",background:C.bg,paddingBottom:40}}>
    <header style={{position:"sticky",top:0,zIndex:5,display:"flex",alignItems:"center",gap:12,padding:"calc(18px + env(safe-area-inset-top, 0px)) 18px 14px",background:`${C.bg}f2`,borderBottom:`1px solid ${C.border}`}}>
      <button aria-label="Retour" onClick={()=>category?setCategory(null):onBack()} style={{width:36,height:36,borderRadius:18,border:`1px solid ${C.border}`,background:C.s1,color:C.text}}><ChevronLeft size={20}/></button>
      <div><div style={{fontSize:10,color:C.red,fontWeight:800,letterSpacing:".16em"}}>UTILISABLE HORS LIGNE</div><div style={{fontSize:20,color:C.text,fontWeight:700}}>SOS Japon</div></div>
    </header>
    <main style={{padding:"18px"}}>
      {!category ? <><p style={{margin:"0 0 16px",color:C.t2,fontSize:13,lineHeight:1.6}}>Choisis une situation. Les phrases restent dans ton téléphone et peuvent être montrées directement à ton interlocuteur.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{SOS_CATEGORIES.map(item=><button key={item.id} onClick={()=>chooseCategory(item)} style={{minHeight:112,padding:14,borderRadius:18,border:`1px solid ${C.border}`,background:C.s1,color:C.text,textAlign:"left"}}><span style={{display:"block",fontSize:28,marginBottom:9}}>{item.emoji}</span><span style={{fontSize:13,fontWeight:650,lineHeight:1.35}}>{item.label}</span></button>)}</div></>
      : <><div style={{fontSize:13,color:C.t2,marginBottom:14}}>{category.emoji} {category.label}</div>{items.map(phrase=><article key={phrase.id} style={{padding:18,borderRadius:18,background:C.s1,border:`1px solid ${C.border}`,marginBottom:12}}><div lang="ja" style={{fontSize:25,fontWeight:650,color:C.text,lineHeight:1.5,fontFamily:"'Noto Serif JP',serif"}}>{phrase.japanese}</div><div lang="ja" style={{fontSize:13,color:C.t2,lineHeight:1.6,marginTop:6}}>{phrase.kana}</div><div style={{fontSize:12,color:C.t3,fontStyle:"italic",marginTop:5}}>{phrase.romaji}</div><div style={{fontSize:13,color:C.text,lineHeight:1.5,marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>{phrase.french}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}><button onClick={()=>speakJP(phrase.japanese)} style={{padding:11,borderRadius:12,border:`1px solid ${C.border}`,background:C.s2,color:C.text}}><Volume2 size={16} style={{verticalAlign:"middle",marginRight:6}}/>Écouter</button><button onClick={()=>setLargePhrase(phrase)} style={{padding:11,borderRadius:12,border:"none",background:C.red,color:"#fff"}}><Maximize2 size={16} style={{verticalAlign:"middle",marginRight:6}}/>En grand</button></div></article>)}</>}
    </main>
    {largePhrase&&<div role="dialog" aria-modal="true" aria-label="Phrase à montrer" onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();setLargePhrase(null);}if(event.key==="Tab"){event.preventDefault();closeRef.current?.focus();}}} style={{position:"fixed",inset:0,zIndex:500,overflowY:"auto",background:"#fff",color:"#15110e",display:"flex",flexDirection:"column",padding:"max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom))"}}><button ref={closeRef} aria-label="Fermer" onClick={()=>setLargePhrase(null)} style={{alignSelf:"flex-end",width:44,height:44,borderRadius:22,border:"1px solid #ddd",background:"#fff"}}><X size={22}/></button><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}><div lang="ja" style={{fontSize:"clamp(34px,10vw,58px)",fontWeight:700,lineHeight:1.45,fontFamily:"'Noto Serif JP',serif"}}>{largePhrase.japanese}</div><div lang="ja" style={{fontSize:"clamp(18px,5vw,25px)",lineHeight:1.5,color:"#514944",marginTop:22}}>{largePhrase.kana}</div><div style={{fontSize:17,lineHeight:1.5,color:"#706862",marginTop:18}}>{largePhrase.french}</div></div><button onClick={()=>speakJP(largePhrase.japanese)} style={{padding:16,borderRadius:999,border:"none",background:"#c9463d",color:"#fff",fontSize:16,fontWeight:700}}><Volume2 size={20} style={{verticalAlign:"middle",marginRight:8}}/>Faire écouter</button></div>}
  </div>;
}
