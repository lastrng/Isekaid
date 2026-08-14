// ─────────────────────────────────────────────────────────────────────────────
// motion.js — Socle d'animation unique de l'app (Phase 0)
//
// Tout mouvement de l'app doit puiser dans ces tokens/helpers plutôt que
// redéfinir ses propres durées/courbes — c'est ce qui donne une signature
// homogène (cf. Apple : une seule "couche" de mouvement, pas une par écran).
//
// Répartition volontaire :
//  - CSS/transform/opacity + View Transitions API → tout le mouvement
//    quotidien (System 3) : tourne sur le thread compositeur GPU, 60fps
//    fiable même sur WebView Android contraint, zéro Ko de bundle.
//  - Framer Motion (chargé en lazy ici) → réservé aux moments cinématiques
//    (présentation 1er lancement, deep-dives, célébrations). Jamais pour
//    les micro-interactions courantes.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";

// ─── Tokens de durée ──────────────────────────────────────────────────────
// Quotidien : 120/180/240ms. Cinéma (1er lancement, célébrations) : 400ms+.
export const DUR = {
  fast: 120,
  base: 180,
  slow: 240,
  cinematic: 450,
};

// ─── Courbes d'easing ─────────────────────────────────────────────────────
// Signature "ressort" déjà de facto standard dans l'app (.lift/.pop-press
// dans App.jsx) — réutilisée plutôt que d'en inventer une nouvelle, pour ne
// pas introduire une deuxième signature de mouvement.
export const EASE_SIGNATURE = "cubic-bezier(.34,1.56,.64,1)";
// Courbe plus calme pour les grands déplacements (transitions d'écran,
// View Transitions) — déjà utilisée par .screen-in.
export const EASE_SMOOTH = "cubic-bezier(.22,1,.36,1)";

// Variables CSS correspondantes, injectées une fois dans :root (voir le
// bloc CSS dans App.jsx) — générées depuis les mêmes constantes JS pour que
// les deux ne divergent jamais.
export const MOTION_CSS_VARS = `--dur-fast:${DUR.fast}ms;--dur-base:${DUR.base}ms;--dur-slow:${DUR.slow}ms;--dur-cinematic:${DUR.cinematic}ms;--ease-signature:${EASE_SIGNATURE};--ease-smooth:${EASE_SMOOTH};`;

// ─── prefers-reduced-motion ───────────────────────────────────────────────
// La règle CSS globale (voir App.jsx) neutralise déjà automatiquement toutes
// les animations CSS/keyframes existantes. Ce hook sert aux décisions prises
// depuis le JS (View Transitions, Framer Motion, logique conditionnelle).
export function prefersReducedMotion(){
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  catch { return false; }
}
export function usePrefersReducedMotion(){
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(()=>{
    let mql;
    try { mql = window.matchMedia("(prefers-reduced-motion: reduce)"); } catch { return; }
    const onChange = ()=> setReduced(mql.matches);
    if(mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange); // Safari/WebView anciens
    return ()=>{
      if(mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  },[]);
  return reduced;
}

// ─── View Transitions API ─────────────────────────────────────────────────
// Exécute `updateFn` (le changement d'état React qui fait basculer l'écran)
// à l'intérieur d'une View Transition same-document si l'API est disponible
// et que l'utilisateur n'a pas demandé moins de mouvement ; sinon, exécute
// directement — repli synchrone, aucune régression fonctionnelle. Le WebView
// Android ciblé (minSdk 24) peut ne pas supporter l'API selon l'appareil :
// ce repli n'est pas un cas limite, c'est un chemin normal.
export function withViewTransition(updateFn){
  if(typeof document !== "undefined" && document.startViewTransition && !prefersReducedMotion()){
    document.startViewTransition(updateFn);
  } else {
    updateFn();
  }
}
export function supportsViewTransitions(){
  return typeof document !== "undefined" && !!document.startViewTransition;
}

// ─── Framer Motion — chargement différé ───────────────────────────────────
// `m`/`LazyMotion` (réexportés ci-dessous) sont la partie légère toujours
// chargée ; c'est le "features bundle" (le moteur d'animation lui-même,
// domAnimation) qui est code-splitté via loadDomAnimationFeatures, passé en
// prop `features` à <LazyMotion strict>. Réservé aux Phases 2-4 (présentation
// 1er lancement, deep-dives, célébrations) — jamais pour du quotidien.
export { m, LazyMotion, AnimatePresence } from "framer-motion";

let domAnimationPromise = null;
export function loadDomAnimationFeatures(){
  if(!domAnimationPromise){
    domAnimationPromise = import("framer-motion").then(mod => mod.domAnimation);
  }
  return domAnimationPromise;
}
