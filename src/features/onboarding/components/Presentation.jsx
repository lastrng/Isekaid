import { useEffect, useRef, useState } from "react";
import { PRODUCT_STEPS, UPDATE_STEPS } from "../content/onboardingContent.js";
import "../onboarding.css";

/** Static presentation: no account content or network dependency. */
export function Presentation({mode="update",initialIndex=0,onIndexChange,onDone,onEvent}) {
  const steps=mode==="update"?UPDATE_STEPS:PRODUCT_STEPS;
  const [index,setIndex]=useState(()=>Math.max(0,Math.min(steps.length-1,Number(initialIndex)||0)));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const titleRef=useRef(null);
  const busyRef=useRef(false);
  const callbacks=useRef({onIndexChange,onEvent});
  callbacks.current={onIndexChange,onEvent};
  const step=steps[index];
  const last=index===steps.length-1;
  const backAction=useRef(null);
  const started=useRef(false);
  const viewed=useRef(null);
  useEffect(()=>{
    const back=()=>backAction.current?.();
    const escape=event=>{if(event.key==="Escape")back();};
    window.addEventListener("isekaid:presentation-back",back);
    window.addEventListener("keydown",escape);
    return()=>{window.removeEventListener("isekaid:presentation-back",back);window.removeEventListener("keydown",escape);};
  },[]);
  useEffect(()=>{if(!started.current){started.current=true;callbacks.current.onEvent?.("start",{mode});}},[mode]);
  useEffect(()=>{
    titleRef.current?.focus({preventScroll:true});
    callbacks.current.onIndexChange?.(index,mode);
    if(viewed.current!==step.id){viewed.current=step.id;callbacks.current.onEvent?.("step",{mode,step:step.id,index:index+1});}
  },[index,mode,step.id]);
  const finish=async skipped=>{
    if(busyRef.current)return;
    busyRef.current=true;setBusy(true);setError("");
    try {
      if(skipped)callbacks.current.onEvent?.("skip",{mode,step:step.id});
      await onDone({skipped});
    } catch(cause) {
      setError(cause?.message||"Enregistrement impossible. Réessaie.");
      busyRef.current=false;setBusy(false);
    }
  };
  backAction.current=()=>{if(!busyRef.current){if(index>0)setIndex(i=>i-1);else finish(true);}};
  return <main className="onboarding-shell" aria-labelledby="onboarding-title">
    <header className="onboarding-header"><span className="onboarding-brand">ISEKAI’D</span><button type="button" className="onboarding-skip" disabled={busy} onClick={()=>finish(true)}>{mode==="replay"?"Quitter":"Passer"}</button></header>
    <div className="onboarding-progress" role="progressbar" aria-label="Progression de la présentation" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index+1}>
      {steps.map((item,i)=><span key={item.id} className={i<=index?"is-active":""}/>)}
    </div>
    <section key={step.id} className="onboarding-step">
      <div className={`onboarding-art onboarding-art--${step.id}`} aria-hidden="true">
        <div className="onboarding-art-sun"/><div className="onboarding-art-paper"><span className="onboarding-art-label">CARNET DU JAPON</span><step.Icon size={50} strokeWidth={1.2}/><span className="onboarding-art-rule"/><span className="onboarding-art-rule short"/></div><span className="onboarding-art-stamp" lang="ja">旅</span>
      </div>
      <p className="onboarding-eyebrow">{step.eyebrow} · {index+1} / {steps.length}</p>
      <h1 id="onboarding-title" tabIndex={-1} ref={titleRef}>{step.title}</h1>
      <p className="onboarding-description">{step.description}</p>
      {step.sequence&&<ol className="onboarding-sequence">{step.sequence.map(label=><li key={label}>{label}</li>)}</ol>}
      {step.examples&&<div className="onboarding-tags">{step.examples.map(label=><span key={label}>{label}</span>)}</div>}
      {step.panels&&<div className="onboarding-panels">{step.panels.map(panel=><div key={panel.title}><h2>{panel.title}</h2><p>{panel.text}</p></div>)}</div>}
    </section>
    <footer className="onboarding-footer">
      {index>0&&<button type="button" className="onboarding-back" disabled={busy} onClick={()=>setIndex(i=>i-1)}>Retour</button>}
      <button type="button" className="onboarding-next" disabled={busy} onClick={()=>last?finish(false):setIndex(i=>i+1)}>{busy?"Enregistrement…":last||index===0?step.action:"Continuer"}</button>
      {error&&<p role="alert" className="onboarding-error">{error}</p>}
    </footer>
  </main>;
}
