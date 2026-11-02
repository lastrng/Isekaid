import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { readJson, writeJson } from "../../lib/storage.js";
import { addPhraseReview, mergePhraseReviews, normalizePhraseReviews, PHRASE_REVIEWS_KEY, recordPhraseReview, removePhraseReview, restorePhraseReview } from "./phraseReviewModel.js";

export const PhraseReviewContext=createContext(null);
export const usePhraseReviews=()=>useContext(PhraseReviewContext);

export function usePhraseReviewStore() {
  const [state,setState]=useState(()=>normalizePhraseReviews(readJson(PHRASE_REVIEWS_KEY,null)));
  const [now,setNow]=useState(()=>Date.now());
  const [error,setError]=useState("");
  const current=useRef(state);
  const commit=useCallback(next=>{
    if (!writeJson(PHRASE_REVIEWS_KEY,next)) {const failure=new Error("Enregistrement impossible. Libère de l’espace puis réessaie ; ta réponse n’a pas été validée.");setError(failure.message);throw failure;}
    current.current=next;setState(next);setNow(Date.now());setError("");return next;
  },[]);
  const add=useCallback(candidate=>commit(addPhraseReview(current.current,candidate)),[commit]);
  const grade=useCallback((id,rating)=>commit(recordPhraseReview(current.current,id,rating)),[commit]);
  const remove=useCallback(id=>commit(removePhraseReview(current.current,id)),[commit]);
  const undo=useCallback(card=>commit(restorePhraseReview(current.current,card)),[commit]);
  const restore=useCallback(remote=>{
    const merged=mergePhraseReviews(current.current,remote);
    if(JSON.stringify(merged)===JSON.stringify(current.current))return current.current;
    return commit(merged);
  },[commit]);
  const clearLocal=useCallback(()=>{const empty=normalizePhraseReviews(null);current.current=empty;setState(empty);setError("");},[]);
  useEffect(()=>{
    const refresh=()=>setNow(Date.now());
    const storage=event=>{if(event.key===PHRASE_REVIEWS_KEY||event.key===null){try{restore(readJson(PHRASE_REVIEWS_KEY,null));}catch{/* L'erreur d'enregistrement est affichée par le carnet. */}}};
    const timer=setInterval(refresh,60_000);
    window.addEventListener("focus",refresh);window.addEventListener("storage",storage);document.addEventListener("visibilitychange",refresh);
    return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("storage",storage);document.removeEventListener("visibilitychange",refresh);};
  },[restore]);
  return {state,now,error,add,grade,remove,undo,restore,clearLocal};
}
