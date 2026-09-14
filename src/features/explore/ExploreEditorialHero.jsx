import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { buildExploreEditorial, markEditorialSeen } from "./exploreEditorial.js";

function useReducedMotion() {
  const [reduced,setReduced]=useState(()=>globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true);
  useEffect(()=>{const query=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");if(!query)return;const update=()=>setReduced(query.matches);query.addEventListener?.("change",update);return()=>query.removeEventListener?.("change",update);},[]);
  return reduced;
}

export function ExploreEditorialHero({ C, db, images = {}, date = new Date(), onOpen }) {
  const [index,setIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const [detail,setDetail]=useState(null);
  const touchStartX=useRef(null);
  const reducedMotion=useReducedMotion();
  const stableDate=typeof date==="string"?date:date.toISOString().slice(0,10);
  const editorial=useMemo(()=>buildExploreEditorial({db,date:stableDate}),[db,stableDate]);
  const slides=useMemo(()=>[
    {id:"tradition",label:"Tradition",item:editorial.tradition},
    {id:"gastronomy",label:"Gastronomie",item:editorial.gastronomy},
    {id:"contemporary",label:"Japon contemporain",item:editorial.contemporary},
  ].filter(slide=>slide.item),[editorial]);
  const current=slides[index]||slides[0];
  const goTo=next=>{if(slides.length)setIndex((next+slides.length)%slides.length);};
  const open=item=>{if(!item)return;markEditorialSeen(item.id);if(onOpen)onOpen(item);else setDetail(item);};

  useEffect(()=>{if(index>=slides.length)setIndex(0);},[index,slides.length]);
  useEffect(()=>{if(reducedMotion||paused||slides.length<2)return;const timer=setTimeout(()=>goTo(index+1),6500);return()=>clearTimeout(timer);},[index,paused,reducedMotion,slides.length]);

  const illustration=item=>{const src=item&&(item.raw?.image||item.raw?.photo||images[item.imageKey]);return src?<img src={src} alt="" loading="lazy" style={{width:"100%",height:154,objectFit:"cover",display:"block"}}/>:<div aria-hidden style={{height:112,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,background:`linear-gradient(135deg, ${C.red}22, ${C.gold}22)`}}>{item?.raw?.emoji||(item?.type==="food"?"🍜":"🎋")}</div>;};
  const onTouchEnd=event=>{if(touchStartX.current===null)return;const delta=(event.changedTouches?.[0]?.clientX||0)-touchStartX.current;touchStartX.current=null;if(Math.abs(delta)>42)goTo(index+(delta<0?1:-1));};

  if(!current)return null;
  return <section aria-labelledby="explore-story-title" style={{padding:"19px 20px 0"}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12,marginBottom:9}}><div><div style={{fontSize:10,color:C.red,letterSpacing:".15em",fontWeight:750}}>UNE HISTOIRE À EMPORTER</div><h2 id="explore-story-title" style={{fontFamily:"'Noto Serif JP',serif",fontSize:21,color:C.text,margin:"4px 0 0",fontWeight:600}}>{current.label}</h2></div>{!reducedMotion&&<button type="button" onClick={()=>setPaused(value=>!value)} aria-label={paused?"Reprendre le défilement automatique":"Mettre le défilement automatique en pause"} aria-pressed={paused} style={{width:40,height:40,display:"grid",placeItems:"center",border:0,borderRadius:"50%",background:"transparent",color:C.t3,cursor:"pointer"}}>{paused?<Play size={14}/>:<Pause size={14}/>}</button>}</div>

    <div role="region" aria-roledescription="carrousel" aria-label="Histoires du Japon" style={{position:"relative",touchAction:"pan-y"}} onTouchStart={event=>{touchStartX.current=event.touches?.[0]?.clientX??null;}} onTouchEnd={onTouchEnd}>
      <button key={current.item.id} type="button" onClick={()=>open(current.item)} className="lift today-active-step" style={{width:"100%",padding:0,overflow:"hidden",border:`1px solid ${C.border}`,borderRadius:18,background:C.s1,color:C.text,textAlign:"left",cursor:"pointer"}}>{illustration(current.item)}<span style={{display:"block",padding:16}}><span style={{fontSize:9.5,color:C.gold,letterSpacing:".14em",fontWeight:750}}>{current.label.toUpperCase()} · 3 MIN</span><strong style={{display:"block",fontFamily:"'Noto Serif JP',serif",fontSize:18,marginTop:7,lineHeight:1.35}}>{current.item.title}</strong><span style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",fontSize:11.5,color:C.t2,lineHeight:1.5,marginTop:5}}>{current.item.summary}</span><span style={{display:"flex",alignItems:"center",gap:5,color:C.red,fontSize:11,fontWeight:750,marginTop:10}}>Lire l’histoire <ArrowRight size={14}/></span></span></button>
      <button type="button" onClick={()=>goTo(index-1)} aria-label="Histoire précédente" className="explore-story-arrow explore-story-arrow--previous"><ChevronLeft size={18}/></button>
      <button type="button" onClick={()=>goTo(index+1)} aria-label="Histoire suivante" className="explore-story-arrow explore-story-arrow--next"><ChevronRight size={18}/></button>
    </div>

    <nav aria-label="Choisir une histoire" style={{display:"grid",gridTemplateColumns:`repeat(${slides.length},minmax(0,1fr))`,gap:5,marginTop:10}}>{slides.map((slide,slideIndex)=><button type="button" key={slide.id} onClick={()=>goTo(slideIndex)} aria-current={slideIndex===index?"true":undefined} style={{minHeight:40,padding:"5px 2px",border:0,background:"transparent",color:slideIndex===index?C.text:C.t3,fontSize:9,fontWeight:slideIndex===index?750:500,cursor:"pointer"}}><span aria-hidden style={{display:"block",height:3,borderRadius:99,background:slideIndex===index?C.red:C.border,marginBottom:6}}/>{slide.label}</button>)}</nav>

    {detail&&<div role="dialog" aria-label={detail.title} onClick={()=>setDetail(null)} style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.58)",display:"flex",alignItems:"end"}}><div onClick={event=>event.stopPropagation()} style={{width:"100%",maxWidth:640,maxHeight:"88dvh",overflowY:"auto",margin:"0 auto",padding:"25px 22px 35px",borderRadius:"24px 24px 0 0",background:C.s1,color:C.text}}>{illustration(detail)}<div style={{color:C.gold,fontSize:10,letterSpacing:".14em",fontWeight:700,marginTop:16}}>{detail.label}</div><div style={{fontFamily:"'Noto Serif JP',serif",fontSize:23,margin:"9px 0"}}>{detail.title}</div><div style={{color:C.t2,fontSize:14,lineHeight:1.75,whiteSpace:"pre-line"}}>{detail.body||detail.raw?.contenu||detail.raw?.description||detail.raw?.fun_fact||detail.summary}</div><button onClick={()=>setDetail(null)} style={{width:"100%",marginTop:18,padding:12,border:0,borderRadius:999,background:C.red,color:"#fff",fontWeight:700,cursor:"pointer"}}>Fermer</button></div></div>}
  </section>;
}
