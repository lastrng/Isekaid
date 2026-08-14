// ─────────────────────────────────────────────────────────────────────────────
// FeatureIntro.jsx — Présentation des 5 piliers au premier lancement (Système 1)
//
// Séquence cinématique jouée une fois entre l'onboarding et l'accueil (voir
// completeOnboarding/finishIntro dans App.jsx) : un chapitre par pilier, dans
// l'ordre de la barre de navigation, avec la couleur d'accent qui évolue de
// chapitre en chapitre. Seul endroit de l'app où Framer Motion est utilisé
// pour du texte/mise en scène — moment-clé, cf. motion.js. Toujours skippable,
// jamais de minuterie automatique (navigation par boutons, comme Onboarding).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { m, LazyMotion, AnimatePresence, loadDomAnimationFeatures, usePrefersReducedMotion, DUR } from "./motion";

// Fond quasi noir de l'identité de l'app (cf. thème sombre établi) — pas
// C=LIGHT comme Onboarding : cette présentation montre l'identité réelle.
const BG = "#0a0a0a";

// Couleur par pilier : pas de mapping strict existant ailleurs dans l'app
// (la BottomNav est toujours rouge), donc choix ancré sur les usages les
// plus proches déjà en place plutôt qu'inventé — voir la discussion en amont.
const CHAPTERS = [
  { id:"home",      kanji:"家", label:"HOME",      jp:"きみの一日",   emoji:"🏠",
    color:"#C9463D", promise:"Ton rendez-vous quotidien avec le Japon." },
  { id:"explore",   kanji:"探", label:"EXPLORER",  jp:"日本を知る",   emoji:"🗺️",
    color:"#9E7A1A", promise:"La culture japonaise, un jour à la fois." },
  { id:"scenarios", kanji:"場", label:"SCÉNARIOS", jp:"その場で話す", emoji:"🎭",
    color:"#2E4374", promise:"Mets-toi en situation — on te corrige, en douceur." },
  { id:"learn",     kanji:"学", label:"APPRENDRE", jp:"一歩ずつ",     emoji:"🎴",
    color:"#3A6645", promise:"Apprends le japonais qui te servira vraiment." },
  { id:"voyage",    kanji:"旅", label:"VOYAGE",    jp:"夢の旅へ",     emoji:"🧳",
    color:"#5B9BD5", promise:"Prépare le voyage dont tu rêves." },
];

export function FeatureIntroScreen({ onDone }){
  const [i, setI] = useState(0);
  const reduced = usePrefersReducedMotion();
  const last = i === CHAPTERS.length - 1;
  const ch = CHAPTERS[i];

  const next = ()=> last ? onDone() : setI(v=>v+1);
  const prev = ()=> setI(v=>Math.max(0, v-1));

  // Variants resserrés (fade seul) quand prefers-reduced-motion est actif —
  // le contenu doit tout de même apparaître, juste sans le mouvement.
  const rise  = reduced ? {initial:{opacity:0}, animate:{opacity:1}} : {initial:{opacity:0,y:14}, animate:{opacity:1,y:0}};
  const dur = (s)=> reduced ? 0.15 : s;

  return (
    <LazyMotion features={loadDomAnimationFeatures} strict>
      <div style={{height:"100%",display:"flex",flexDirection:"column",background:BG,position:"relative",overflow:"hidden"}}>
        {/* Passer — toujours visible, dès le 1er chapitre */}
        <button onClick={onDone} className="pop-press"
          style={{position:"absolute",top:18,right:18,zIndex:10,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.14)",borderRadius:20,padding:"7px 16px",color:"rgba(255,255,255,0.75)",fontSize:12,cursor:"pointer"}}>
          Passer
        </button>

        {/* Progression — la couleur qui avance = la couleur qui évolue de chapitre en chapitre */}
        <div style={{display:"flex",gap:6,padding:"50px 26px 0"}}>
          {CHAPTERS.map((c,idx)=>(
            <div key={c.id} style={{height:2,flex:1,borderRadius:1,background:idx<=i?c.color:"rgba(255,255,255,0.14)",transition:"background var(--dur-slow,.24s) var(--ease-smooth,ease)"}}/>
          ))}
        </div>

        {/* Chapitre courant */}
        <div style={{flex:1,position:"relative"}}>
          <AnimatePresence mode="wait">
            <m.div key={ch.id}
              initial={reduced?{opacity:0}:{opacity:0,y:18}}
              animate={{opacity:1,y:0}}
              exit={reduced?{opacity:0}:{opacity:0,y:-18}}
              transition={{duration:dur(DUR.cinematic/1000), ease:[0.22,1,0.36,1]}}
              style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px",textAlign:"center"}}>

              {/* Halo coloré, propre à chaque pilier */}
              <div aria-hidden style={{position:"absolute",inset:0,background:`radial-gradient(circle at 50% 42%, ${ch.color}33, transparent 60%)`,pointerEvents:"none"}}/>

              <m.div {...rise} transition={{duration:dur(0.5), ease:[0.34,1.56,0.64,1], delay:reduced?0:0.05}}
                style={{fontSize:38,marginBottom:8}}>
                {ch.emoji}
              </m.div>

              <m.div {...rise} transition={{duration:dur(0.5), ease:[0.22,1,0.36,1], delay:reduced?0:0.14}}
                style={{fontFamily:"'Noto Serif JP',serif",fontWeight:200,fontSize:96,lineHeight:1,color:ch.color,marginBottom:10}}>
                {ch.kanji}
              </m.div>

              <m.div {...rise} transition={{duration:dur(0.5), ease:[0.22,1,0.36,1], delay:reduced?0:0.22}}
                style={{fontSize:11,letterSpacing:".3em",color:"rgba(255,255,255,0.45)",marginBottom:18,textTransform:"uppercase"}}>
                {ch.kanji} · {ch.label}
              </m.div>

              <m.div {...rise} transition={{duration:dur(0.5), ease:[0.22,1,0.36,1], delay:reduced?0:0.3}}
                style={{fontFamily:"'Noto Serif JP',serif",fontWeight:300,fontSize:22,color:"#F0E6D3",marginBottom:14}}>
                {ch.jp}
              </m.div>

              <m.div {...rise} transition={{duration:dur(0.5), ease:[0.22,1,0.36,1], delay:reduced?0:0.38}}
                style={{fontSize:15,color:"rgba(255,255,255,0.7)",lineHeight:1.5,maxWidth:280}}>
                {ch.promise}
              </m.div>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Navigation — boutons, pas de minuterie ni de swipe (cohérent avec Onboarding) */}
        <div style={{display:"flex",gap:10,padding:"14px 26px 34px",position:"relative",zIndex:5}}>
          {i>0 && (
            <button onClick={prev} className="pop-press"
              style={{flex:"0 0 auto",padding:"14px 18px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.14)",borderRadius:12,color:"rgba(255,255,255,0.75)",fontSize:14,cursor:"pointer"}}>
              ‹
            </button>
          )}
          <button onClick={next} className="pop-press"
            style={{flex:1,padding:"15px",background:ch.color,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:".03em"}}>
            {last ? "Commencer 🌸" : "Suivant →"}
          </button>
        </div>
      </div>
    </LazyMotion>
  );
}
