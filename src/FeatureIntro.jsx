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
import { Home, Compass, Plane, UserRound } from "lucide-react";
import { m, LazyMotion, AnimatePresence, loadDomAnimationFeatures, usePrefersReducedMotion, DUR } from "./motion";

// Fond clair, identique au reste de l'app (identité crème/rouge/or) — comme
// Onboarding, cette présentation ne dépend pas du thème choisi par l'utilisateur.
const BG = "#FDFBF7";
const INK = "#12121F";

// Présentation alignée sur les quatre espaces actuels de l'application.
const CHAPTERS = [
  { id:"today", kanji:"今日", label:"AUJOURD’HUI", jp:"今日の日本", Icon:Home,
    color:"#B83838", promise:"Ton Japon, un peu chaque jour.", detail:"Une découverte, une expression et une situation pour créer un rituel court et satisfaisant." },
  { id:"travel", kanji:"旅", label:"VOYAGER", jp:"夢の旅へ", Icon:Plane,
    color:"#D96B86", promise:"Prépare et vis ton voyage.", detail:"Itinéraire, journées, carte, checklist et outils utiles avant le départ comme sur place." },
  { id:"explore", kanji:"探", label:"DÉCOUVRIR", jp:"日本を知る", Icon:Compass,
    color:"#4276A0", promise:"Comprends le Japon dans toute sa richesse.", detail:"Culture, gastronomie, régions, japonais pratique, traditions et contenus reliés entre eux." },
  { id:"my-japan", kanji:"私", label:"MON JAPON", jp:"わたしの日本", Icon:UserRound,
    color:"#C9A961", promise:"Garde une trace de ce qui devient ton Japon.", detail:"Progression, souvenirs, voyages passés, tampons et découvertes à collectionner." },
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
          style={{position:"absolute",top:18,right:18,zIndex:10,background:"rgba(26,20,16,0.05)",border:"1px solid rgba(26,20,16,0.1)",borderRadius:20,padding:"7px 16px",color:"rgba(26,20,16,0.6)",fontSize:12,cursor:"pointer"}}>
          Passer
        </button>

        {/* Progression — la couleur qui avance = la couleur qui évolue de chapitre en chapitre */}
        <div style={{display:"flex",gap:6,padding:"50px 26px 0"}}>
          {CHAPTERS.map((c,idx)=>(
            <div key={c.id} style={{height:2,flex:1,borderRadius:1,background:idx<=i?c.color:"rgba(26,20,16,0.12)",transition:"background var(--dur-slow,.24s) var(--ease-smooth,ease)"}}/>
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
                style={{width:96,height:96,borderRadius:24,background:`${ch.color}14`,border:`1px solid ${ch.color}44`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:22}}>
                <ch.Icon size={46} color={ch.color} strokeWidth={1.75}/>
              </m.div>

              <m.div {...rise} transition={{duration:dur(0.5), ease:[0.22,1,0.36,1], delay:reduced?0:0.22}}
                style={{fontSize:11,letterSpacing:".3em",color:"rgba(26,20,16,0.4)",marginBottom:18,textTransform:"uppercase"}}>
                {ch.kanji} · {ch.label}
              </m.div>

              <m.div {...rise} transition={{duration:dur(0.5), ease:[0.22,1,0.36,1], delay:reduced?0:0.3}}
                style={{fontFamily:"'Noto Serif JP',serif",fontWeight:300,fontSize:22,color:INK,marginBottom:14}}>
                {ch.jp}
              </m.div>

              <m.div {...rise} transition={{duration:dur(0.5), ease:[0.22,1,0.36,1], delay:reduced?0:0.38}}
                style={{fontSize:15,color:"rgba(26,20,16,0.65)",lineHeight:1.5,maxWidth:280}}>
                {ch.promise}
              </m.div>
              <m.div {...rise} transition={{duration:dur(0.5), ease:[0.22,1,0.36,1], delay:reduced?0:0.46}}
                style={{fontSize:12,color:"rgba(26,20,16,0.5)",lineHeight:1.55,maxWidth:300,marginTop:12}}>
                {ch.detail}
              </m.div>
            </m.div>
          </AnimatePresence>
        </div>

        {/* Navigation — boutons, pas de minuterie ni de swipe (cohérent avec Onboarding) */}
        <div style={{display:"flex",gap:10,padding:"14px 26px 34px",position:"relative",zIndex:5}}>
          {i>0 && (
            <button onClick={prev} className="pop-press"
              style={{flex:"0 0 auto",padding:"14px 18px",background:"rgba(26,20,16,0.04)",border:"1px solid rgba(26,20,16,0.1)",borderRadius:999,color:"rgba(26,20,16,0.65)",fontSize:14,cursor:"pointer"}}>
              ‹
            </button>
          )}
          <button onClick={next} className="pop-press"
            style={{flex:1,padding:"15px",background:ch.color,border:"none",borderRadius:999,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:".03em"}}>
            {last ? "Commencer 🌸" : "Suivant →"}
          </button>
        </div>
      </div>
    </LazyMotion>
  );
}
