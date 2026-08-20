// ─────────────────────────────────────────────────────────────────────────────
// Celebration.jsx — Célébration cinématique ponctuelle (Système 3, Phase 4)
//
// Réservée aux vrais moments-clés (mission accomplie, voyage créé) où le
// cinéma est permis — cf. motion.js. Brève (auto-dismiss), non-envahissante,
// et skippable en tapant n'importe où. Framer Motion en lazy, même chunk que
// FeatureIntro (voir loadDomAnimationFeatures dans motion.js) : pas de coût
// supplémentaire si l'utilisateur a déjà vu la présentation 1er lancement.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { m, LazyMotion, AnimatePresence, loadDomAnimationFeatures, usePrefersReducedMotion } from "./motion";

const PARTICLES = ["✨","🎉","🎊","⭐","🌸"];

export function CelebrationOverlay({ C, emoji="🎉", title, subtitle, color="#C9463D", duration=1800, onDone }){
  const s1 = C?.s1 || "#1A1410";
  const text = C?.text || "#F0E6D3";
  const t2 = C?.t2 || "rgba(240,230,211,0.7)";
  const shadow = C ? "0 20px 60px rgba(28,20,16,0.18)" : "0 20px 60px rgba(0,0,0,0.5)";
  const [visible, setVisible] = useState(true);
  const reduced = usePrefersReducedMotion();

  useEffect(()=>{
    const t = setTimeout(()=>setVisible(false), duration);
    return ()=>clearTimeout(t);
  },[duration]);

  return (
    <LazyMotion features={loadDomAnimationFeatures} strict>
      {/* onExitComplete plutôt qu'un timer côté appelant : le parent ne
          retire réellement l'overlay qu'une fois l'animation de sortie
          terminée (sinon AnimatePresence n'a pas le temps de l'animer). */}
      <AnimatePresence onExitComplete={onDone}>
        {visible && (
          <m.div key="celebration" onClick={()=>setVisible(false)}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            transition={{duration:reduced?0.12:0.2}}
            style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)",cursor:"pointer"}}>

            {/* Burst de particules — purement décoratif, coupé en reduced-motion */}
            {!reduced && Array.from({length:10}).map((_,i)=>{
              const angle = (i/10)*Math.PI*2;
              const dist = 86 + (i%3)*20;
              return (
                <m.span key={i}
                  initial={{opacity:1, x:0, y:0, scale:0.6}}
                  animate={{opacity:0, x:Math.cos(angle)*dist, y:Math.sin(angle)*dist, scale:1}}
                  transition={{duration:0.9, ease:[0.22,1,0.36,1], delay:0.05}}
                  style={{position:"absolute",fontSize:20,pointerEvents:"none"}}>
                  {PARTICLES[i%PARTICLES.length]}
                </m.span>
              );
            })}

            <m.div
              initial={reduced?{opacity:0}:{opacity:0,scale:0.7}}
              animate={{opacity:1,scale:1}}
              exit={reduced?{opacity:0}:{opacity:0,scale:0.9}}
              transition={reduced?{duration:0.12}:{type:"spring",stiffness:340,damping:20}}
              style={{background:s1,border:`1px solid ${color}55`,borderRadius:24,padding:"26px 30px",textAlign:"center",boxShadow:shadow,maxWidth:280}}>
              <div style={{fontSize:46,marginBottom:10}}>{emoji}</div>
              <div style={{fontSize:17,fontFamily:"'Noto Serif JP',serif",fontWeight:600,color:text,marginBottom:subtitle?4:0}}>{title}</div>
              {subtitle && <div style={{fontSize:13,color:t2}}>{subtitle}</div>}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
