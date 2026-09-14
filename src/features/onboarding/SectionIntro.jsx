import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./contextGuide.css";

/** In-flow help attached to the real element: no coordinates, overlay or trap. */
export function SectionIntro({guide,onDone,targetRef}) {
  const [host,setHost]=useState(null);
  const [error,setError]=useState("");
  const doneRef=useRef(onDone);
  doneRef.current=onDone;
  useEffect(()=>{
    let cancelled=false;
    let frame;
    let element,container;
    const attach=()=>{
      const root=targetRef?.current;
      element=guide?.id==="today"?root?.querySelector("#daily-session-title")?.parentElement?.parentElement:guide?.id==="discover"?root?.parentElement:root;
      if(!element||element.closest("[hidden]"))return;
      container=document.createElement("div");
      container.className="context-guide-host";
      container.dataset.guide=guide.id;
      element.before(container);
      element.setAttribute("aria-details",`guide-${guide.id}`);
      setHost(container);
      frame=requestAnimationFrame(()=>{
        if(cancelled)return;
        const bounds=container.getBoundingClientRect();
        const route=element.closest(".isekaid-route-stack");
        const viewport=route?.getBoundingClientRect();
        if(bounds.top<(viewport?.top||0)||bounds.bottom>(viewport?.bottom||window.innerHeight)){
          container.scrollIntoView({block:"start",behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"instant":"smooth"});
        }
      });
    };
    attach();
    return()=>{
      cancelled=true;cancelAnimationFrame(frame);
      if(element)element.removeAttribute("aria-details");
      container?.remove();
    };
  },[targetRef,guide?.id]);
  useEffect(()=>{
    const keydown=event=>{
      if(event.key==="Escape"){
        try{doneRef.current?.();}catch(cause){setError(cause.message);}
      }
    };
    window.addEventListener("keydown",keydown);
    return()=>window.removeEventListener("keydown",keydown);
  },[]);
  if(!host||!guide)return null;
  return createPortal(<aside id={`guide-${guide.id}`} className="context-guide" aria-labelledby={`guide-${guide.id}-title`}>
    <div aria-live="polite"><p className="context-guide-label">Pour commencer</p><h2 id={`guide-${guide.id}-title`}>{guide.title}</h2><p>{guide.description}</p></div>
    <button type="button" onClick={()=>{try{doneRef.current?.();}catch(cause){setError(cause.message);}}}>{guide.action||"Compris"}</button>
    {error&&<p role="alert">{error}</p>}
  </aside>,host);
}
