import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Brain, Check, ChevronLeft, ChevronRight, Clock3, Pause, Play, Sparkles, Target } from "lucide-react";
import { ProductCard, productTheme } from "../shared/ProductUI.jsx";
import {
  answerDailyQuestion,
  completeDailyActivity,
  dailyDateKey,
  dailyProgress,
  dailySessionMinutes,
  getCurrentDailyStep,
  loadDailyRitual,
  syncDailyMissionProgress,
} from "./dailyModel.js";

const STEP_META = {
  discover: { label:"Découvrir", Icon:Sparkles, color:"#9E7A1A", cta:"Découvrir" },
  learn: { label:"Apprendre", Icon:BookOpen, color:"#C9463D", cta:"J’ai retenu cette expression" },
  understand: { label:"Comprendre", Icon:Brain, color:"#5B7E9B" },
  mission: { label:"Mission", Icon:Target, color:"#4E8060", cta:"Faire la mission" },
  practice: { label:"Comprendre", Icon:Brain, color:"#5B7E9B", cta:"Ouvrir la situation" },
};

function PrimaryAction({ color, onClick, children }) {
  return <button type="button" onClick={onClick} style={{width:"100%",minHeight:46,marginTop:14,padding:"10px 14px",border:0,borderRadius:999,background:color,color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer"}}>{children} <ArrowRight size={14} style={{verticalAlign:"middle"}}/></button>;
}

function CompletedNote({ C }) {
  return <div role="status" style={{display:"flex",alignItems:"center",gap:7,minHeight:44,marginTop:12,color:C.green,fontSize:12,fontWeight:750}}><Check size={16}/>Étape terminée</div>;
}

function ActivityPreview({ C, activity, script, onComplete, onAnswer, onOpen }) {
  const meta = STEP_META[activity.kind] || STEP_META.discover;
  const item = activity.raw || {};
  if (activity.kind === "learn") {
    const main = script === "romaji" ? item.romaji : script === "kanji" ? (item.expression || item.kana) : (item.kana || item.expression);
    const secondary = script === "romaji" ? (item.kana || item.expression) : item.romaji;
    return <>
      <div lang={script === "romaji" ? "fr" : "ja"} style={{fontFamily:"'Noto Serif JP',serif",fontSize:main?.length>14?24:29,color:C.text,lineHeight:1.3}}>{main || activity.title}</div>
      {secondary&&<div style={{fontSize:11,color:C.t3,marginTop:3}}>{secondary}</div>}
      <div style={{fontSize:14,fontWeight:700,color:C.red,marginTop:9}}>{item.traduction || activity.summary}</div>
      {activity.done?<CompletedNote C={C}/>:<PrimaryAction color={meta.color} onClick={onComplete}>{meta.cta}</PrimaryAction>}
    </>;
  }
  if (activity.kind === "understand") {
    return <>
      <div style={{fontFamily:"'Noto Serif JP',serif",fontSize:17,color:C.text,lineHeight:1.45}}>{activity.question?.prompt || activity.title}</div>
      <div style={{display:"grid",gap:7,marginTop:12}}>{(activity.question?.choices || []).map(choice=>{
        const correct = activity.done && choice === activity.question?.answer;
        const selected = activity.done && choice === activity.selectedAnswer;
        return <button type="button" disabled={activity.done} key={choice} onClick={()=>onAnswer(choice)} style={{minHeight:44,padding:"10px 12px",borderRadius:12,border:`1px solid ${correct?C.green:selected?C.red:C.border}`,background:correct?`${C.green}12`:selected?`${C.red}10`:C.s2,color:C.text,textAlign:"left",fontSize:12,lineHeight:1.35,cursor:activity.done?"default":"pointer"}}>{choice}</button>;
      })}</div>
      {activity.done&&<CompletedNote C={C}/>}
    </>;
  }
  return <>
    <div style={{fontFamily:"'Noto Serif JP',serif",fontSize:20,fontWeight:600,color:C.text,lineHeight:1.35}}>{item.emoji&&<span style={{marginRight:8}}>{item.emoji}</span>}{activity.title}</div>
    {activity.summary&&<div style={{fontSize:13,color:C.t2,lineHeight:1.55,marginTop:8,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{activity.summary}</div>}
    {activity.done
      ? activity.kind === "discover" || activity.kind === "practice"
        ? <PrimaryAction color={meta.color} onClick={onOpen}>Revoir cette étape</PrimaryAction>
        : <CompletedNote C={C}/>
      : <PrimaryAction color={meta.color} onClick={activity.kind === "mission" ? onOpen : ()=>{ onComplete(); onOpen(); }}>{activity.kind === "discover" ? `${meta.cta} ${activity.title}` : meta.cta}</PrimaryAction>}
  </>;
}

function DailyNavigation({ C, activities, selectedIndex, onSelect }) {
  return <nav aria-label="Naviguer dans la session" style={{margin:"13px 0 0",display:"grid",gridTemplateColumns:`repeat(${Math.max(1,activities.length)},minmax(0,1fr))`,gap:4}}>
    {activities.map((activity,index)=>{
      const meta = STEP_META[activity.kind] || STEP_META.discover;
      const selected = index === selectedIndex;
      return <button type="button" aria-current={selected?"step":undefined} aria-label={`${meta.label}, ${activity.done?"terminée":"non terminée"}${selected?", affichée":""}`} key={activity.id} onClick={()=>onSelect(index)} style={{minWidth:0,minHeight:44,padding:"0 2px",border:0,background:"transparent",color:activity.done?C.green:selected?C.text:C.t3,cursor:"pointer",textAlign:"center"}}>
        <span aria-hidden="true" style={{display:"block",height:3,borderRadius:4,background:activity.done?C.green:selected?meta.color:C.border,transition:"background .2s ease"}}/>
        <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3,marginTop:7,fontSize:9,fontWeight:selected||activity.done?750:500,whiteSpace:"nowrap"}}>{activity.done&&<Check size={10}/>}<span>{meta.label}</span></span>
        <span className="isekaid-visually-hidden">{activity.done?"terminée":selected?"affichée":"non terminée"}</span>
      </button>;
    })}
  </nav>;
}

function useReducedMotion() {
  const [reduced,setReduced] = useState(()=>globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true);
  useEffect(()=>{
    const query=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    if(!query)return;
    const update=()=>setReduced(query.matches);
    query.addEventListener?.("change",update);
    return()=>query.removeEventListener?.("change",update);
  },[]);
  return reduced;
}

export function DailyRitual({ C, db, date, timeZone, travelContext, userContext, mission, completedMissionIds, script = "kana", streakCount = 0, onOpenActivity, onDailyComplete, onProgressChange }) {
  const dateKey = dailyDateKey(date || new Date(), timeZone);
  const [ritual, setRitual] = useState(() => loadDailyRitual({ db, date: dateKey, travelContext, userContext, mission }));
  const initialStep = getCurrentDailyStep(ritual);
  const [selectedIndex,setSelectedIndex] = useState(()=>Math.min(initialStep.index,Math.max(0,ritual.activities.length-1)));
  const [autoPaused,setAutoPaused] = useState(false);
  const [hovered,setHovered] = useState(false);
  const touchStartX = useRef(null);
  const reducedMotion = useReducedMotion();

  const goTo = useCallback(index=>{
    const count=ritual.activities.length;
    if(!count)return;
    setSelectedIndex((index+count)%count);
  },[ritual.activities.length]);

  useEffect(() => {
    if (db) setRitual(loadDailyRitual({ db, date: dateKey, travelContext, userContext, mission }));
  }, [db, dateKey, travelContext, userContext, mission]);
  useEffect(() => {
    const refresh = () => setRitual(loadDailyRitual({ db, date: dateKey, travelContext, userContext, mission }));
    window.addEventListener("isekaid:daily-synced", refresh);
    return () => window.removeEventListener("isekaid:daily-synced", refresh);
  }, [db, dateKey, travelContext, userContext, mission]);
  useEffect(() => {
    const next = syncDailyMissionProgress(ritual, completedMissionIds);
    if (next === ritual) return;
    setRitual(next);
    const nextStep=getCurrentDailyStep(next);
    if(nextStep.activity)setSelectedIndex(nextStep.index);
    onDailyComplete?.({ firstActivity:false, complete:dailyProgress(next).complete, ritual:next });
  }, [completedMissionIds, onDailyComplete, ritual]);

  const progress = dailyProgress(ritual);
  const duration = dailySessionMinutes(ritual);
  const remaining = dailySessionMinutes(ritual, { remaining:true });
  const current = getCurrentDailyStep(ritual);
  useEffect(()=>{
    if(!ritual.activities.length)return;
    setSelectedIndex(index=>Math.min(index,ritual.activities.length-1));
  },[ritual.activities.length]);
  useEffect(()=>{
    if(!ritual.activities.length)return;
    const nextStep=getCurrentDailyStep(ritual);
    setSelectedIndex(Math.min(nextStep.index,ritual.activities.length-1));
  },[ritual.date]);
  useEffect(()=>{
    if(progress.complete || ritual.activities.length<2 || autoPaused || hovered || reducedMotion)return;
    const timer=setTimeout(()=>goTo(selectedIndex+1),6000);
    return()=>clearTimeout(timer);
  },[autoPaused,goTo,hovered,progress.complete,reducedMotion,ritual.activities.length,selectedIndex]);
  useEffect(() => {
    onProgressChange?.({ ...progress, activities:ritual.activities.map(({ kind, done }) => ({ kind, done })) });
  }, [onProgressChange, progress.complete, progress.done, progress.percent, progress.total, ritual.activities]);

  const notify = (next, before) => {
    setRitual(next);
    onDailyComplete?.({ firstActivity:before.done === 0, complete:dailyProgress(next).complete, ritual:next });
  };
  const complete = activity => {
    if (!activity || activity.done) return;
    const before = dailyProgress(ritual);
    const next=completeDailyActivity(ritual, activity.id);
    notify(next, before);
    const nextStep=getCurrentDailyStep(next);
    if(nextStep.activity)setSelectedIndex(nextStep.index);
  };
  const answer = (activity, choice) => {
    const before = dailyProgress(ritual);
    const next = answerDailyQuestion(ritual, activity.id, choice);
    if (next !== ritual) {
      notify(next, before);
      const nextStep=getCurrentDailyStep(next);
      if(nextStep.activity)setSelectedIndex(nextStep.index);
    }
  };

  const selectedActivity=ritual.activities[selectedIndex] || current.activity;
  const meta = selectedActivity ? (STEP_META[selectedActivity.kind] || STEP_META.discover) : STEP_META.discover;
  const SelectedIcon = meta.Icon;
  const onTouchEnd = event=>{
    if(touchStartX.current===null)return;
    const delta=event.changedTouches?.[0]?.clientX-touchStartX.current;
    touchStartX.current=null;
    if(Math.abs(delta)>42)goTo(selectedIndex+(delta<0?1:-1));
  };
  return <section aria-labelledby="daily-session-title" className="isekaid-screen-enter today-session" style={productTheme(C,{padding:"20px 20px 0",position:"relative",zIndex:2})}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12}}>
      <div>
        <div style={{fontSize:10,letterSpacing:".15em",color:C.red,fontWeight:800}}>TON JAPON AUJOURD’HUI</div>
        <h1 id="daily-session-title" style={{margin:"4px 0 0",fontFamily:"'Noto Serif JP',serif",fontSize:21,fontWeight:650,color:C.text}}>Que fais-tu maintenant ?</h1>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:5,color:C.t3,fontSize:11,whiteSpace:"nowrap",paddingBottom:2}}><Clock3 size={14}/>{progress.complete?duration:remaining} min</div>
    </div>

    {!ritual.activities.length ? <ProductCard C={C} variant="quiet" style={{padding:18,marginTop:13}}>
      <div style={{fontFamily:"'Noto Serif JP',serif",fontSize:17,color:C.text}}>Ta session se prépare</div>
      <div style={{fontSize:12,color:C.t2,lineHeight:1.5,marginTop:5}}>Ton contenu local reste intact. Reviens dans un instant ou reconnecte-toi pour charger les découvertes du jour.</div>
    </ProductCard> : progress.complete ? <ProductCard C={C} variant="quiet" style={{padding:"18px 17px",marginTop:13,background:`${C.green}0D`,borderColor:`${C.green}38`}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}><span style={{width:38,height:38,borderRadius:"50%",background:`${C.green}16`,color:C.green,display:"grid",placeItems:"center",flexShrink:0}}><Check size={20}/></span><div><div style={{fontFamily:"'Noto Serif JP',serif",fontSize:18,fontWeight:650,color:C.text}}>Ta session du jour est terminée</div><div style={{fontSize:11,color:C.t2,marginTop:3}}>{duration} min · {streakCount>0?"streak maintenu · ":""}{progress.done} étapes accomplies</div></div></div>
      <div aria-label="Quatre étapes terminées" style={{display:"grid",gridTemplateColumns:`repeat(${ritual.activities.length},1fr)`,gap:4,marginTop:14}}>{ritual.activities.map(activity=><span key={activity.id} style={{height:3,borderRadius:4,background:C.green}}/>)}</div>
    </ProductCard> : <>
      <DailyNavigation C={C} activities={ritual.activities} selectedIndex={selectedIndex} onSelect={goTo}/>
      <div role="region" aria-roledescription="carrousel" aria-label="Activités de la session" className="today-step-slider" style={{touchAction:"pan-y"}} onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onTouchStart={event=>{touchStartX.current=event.touches?.[0]?.clientX ?? null;}} onTouchEnd={onTouchEnd}>
      <ProductCard key={selectedActivity.id} aria-label={`${meta.label}, étape ${selectedIndex+1} sur ${ritual.activities.length}`} C={C} as="article" variant="paper" className="today-active-step" style={{padding:"16px 20px 17px",marginTop:8,borderColor:`${meta.color}55`,boxShadow:C.shadow}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:13}}>
          <div style={{display:"flex",alignItems:"center",gap:8,color:meta.color}}><SelectedIcon size={17}/><span style={{fontSize:10,fontWeight:850,letterSpacing:".12em"}}>0{selectedIndex+1} · {meta.label.toUpperCase()}</span></div>
          <span style={{fontSize:10,color:C.t3}}>{selectedActivity.durationMinutes || 1} min</span>
        </div>
        <ActivityPreview C={C} activity={selectedActivity} script={script} onComplete={()=>complete(selectedActivity)} onAnswer={choice=>answer(selectedActivity,choice)} onOpen={()=>onOpenActivity?.(selectedActivity)}/>
      </ProductCard>
      <button type="button" onClick={()=>goTo(selectedIndex-1)} aria-label="Étape précédente" className="today-step-slider__arrow today-step-slider__arrow--previous"><ChevronLeft size={18}/></button>
      <button type="button" onClick={()=>goTo(selectedIndex+1)} aria-label="Étape suivante" className="today-step-slider__arrow today-step-slider__arrow--next"><ChevronRight size={18}/></button>
      </div>
      {!reducedMotion&&<div style={{display:"flex",justifyContent:"center",minHeight:34,marginTop:2}}><button type="button" onClick={()=>setAutoPaused(value=>!value)} aria-label={autoPaused?"Reprendre le défilement automatique":"Mettre le défilement automatique en pause"} aria-pressed={autoPaused} style={sliderButtonStyle(C)}>{autoPaused?<Play size={13}/>:<Pause size={13}/>}</button></div>}
      <div role="status" aria-live="polite" style={{fontSize:0}}>{progress.done} étape sur {progress.total} terminée{progress.done>1?"s":""}. Carte affichée : {meta.label}.</div>
    </>}
  </section>;
}

function sliderButtonStyle(C) {
  return {width:38,height:34,border:0,borderRadius:"50%",background:"transparent",color:C.t3,opacity:.62,display:"grid",placeItems:"center",cursor:"pointer"};
}
