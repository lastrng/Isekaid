// ─────────────────────────────────────────────────────────────────────────────
// ExploreDiscoveries.jsx — "Découvertes du jour" dans Explorer
//
// Contenu généré quotidiennement par le service VPS /opt/isekaid-explore
// (table explore_discoveries, RLS lecture publique). Contrairement au reste
// d'Explorer (traditions, codes sociaux…) qui est du JSON statique packagé
// au build, ceci suit le pattern dynamique déjà en place pour DailyFeed.jsx.
//
// Toutes les découvertes de base sont accessibles. La date de publication
// sert uniquement à choisir la suggestion du jour, jamais à créer un paywall.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { fetchExploreDiscoveries } from "./supabase";
import { SpeakButton } from "./tts";

export function useExploreDiscoveries(){
  const [items, setItems] = useState(null); // null = chargement, [] = vide
  useEffect(()=>{
    let alive = true;
    fetchExploreDiscoveries().then(data=>{ if(alive) setItems(data); }).catch(()=>{ if(alive) setItems([]); });
    return ()=>{ alive = false; };
  },[]);
  return items;
}

// Nom conservé pour compatibilité : la suggestion correspond désormais à la
// dernière découverte publiée et ne dépend plus du streak ni de Premium.
export function useLatestUnlockedDiscovery(){
  const items = useExploreDiscoveries();
  if(!items || items.length === 0) return null;
  return items[items.length-1];
}

// Pastille "Nouveau" — même convention que le reste de l'app (App.jsx :
// isFeedNew/isLieuNew, DailyFeed.jsx : isFeedNew), clé localStorage partagée
// "isekaid_seen_v1", réimplémentée localement comme dans DailyFeed.jsx plutôt
// que de coupler les fichiers pour un simple accès localStorage.
const SEEN_KEY = "isekaid_seen_v1";
function loadSeen(){
  try { const raw = localStorage.getItem(SEEN_KEY); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}
function saveSeen(s){ try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch {} }
export function isDiscoveryNew(slug){ return !!slug && loadSeen().discoverySlug !== slug; }
export function markDiscoverySeen(slug){ if(!slug) return; saveSeen({...loadSeen(), discoverySlug: slug}); }

// ─── Carte teaser pour l'accueil — habillage repris de HomeDailyCard ───────
// Usage : <DiscoveryTeaserCard C={C} discovery={d} isNew={isNew} onOpen={()=>onGoTab("explore")}/>
export function DiscoveryTeaserCard({C, discovery, isNew, onOpen}){
  if(!discovery) return null;
  const surface = C.s1 || "#161f38";
  const border = C.border || "rgba(255,255,255,.12)";
  return (
    <div
      onClick={()=>{ markDiscoverySeen(discovery.slug); onOpen && onOpen(); }}
      style={{cursor:"pointer",borderRadius:18,overflow:"hidden",border:`1px solid ${border}`,background:surface,boxShadow:C.shadow||"none",position:"relative"}}
    >
      {discovery.image_url && (
        <div style={{position:"relative",width:"100%",aspectRatio:"16 / 9",background:C.bg}}>
          <img src={discovery.image_url} alt={discovery.title||"Découverte du jour"} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          <div style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,.55)",backdropFilter:"blur(4px)",color:"#fff",fontSize:10,fontWeight:700,letterSpacing:".12em",padding:"5px 10px",borderRadius:999}}>
            🎴 DÉCOUVERTE DU JOUR
          </div>
        </div>
      )}
      <div style={{padding:"14px 16px"}}>
        {!discovery.image_url && (
          <div style={{fontSize:10,color:C.gold,letterSpacing:".14em",marginBottom:6,textTransform:"uppercase"}}>🎴 DÉCOUVERTE DU JOUR</div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{fontSize:16,fontWeight:800,color:C.text,lineHeight:1.25}}>{discovery.title}</div>
          {isNew && <span aria-label="Nouveau" style={{width:7,height:7,borderRadius:"50%",background:C.gold,flexShrink:0}}/>}
        </div>
        {discovery.subtitle && <div style={{fontSize:13,color:C.t2||C.t3,marginTop:4}}>{discovery.subtitle}</div>}
        <div style={{fontSize:12,color:C.gold,fontWeight:600,marginTop:10}}>Découvrir →</div>
      </div>
    </div>
  );
}

export function DiscoveriesScreen({C, onBack, backRef}){
  const items = useExploreDiscoveries();
  const [selected, setSelected] = useState(null);
  useEffect(()=>{
    if(!backRef)return;
    const pop=()=>{if(selected){setSelected(null);return true;}return false;};
    backRef.current=pop;
    return()=>{if(backRef.current===pop)backRef.current=null;};
  },[backRef,selected]);

  if(selected){
    return <DiscoveryDetail C={C} d={selected} onBack={()=>setSelected(null)}/>;
  }

  return (
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"calc(24px + env(safe-area-inset-top, 0px)) 20px 12px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        {onBack && <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0,marginBottom:8}}>‹ Explorer</button>}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>発見 · DÉCOUVERTES</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>Découvertes du jour</div>
      </div>

      <div className="stagger" style={{padding:"18px 20px 110px",display:"flex",flexDirection:"column",gap:11}}>
        {items===null && (
          <div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>Chargement…</div>
        )}
        {items && items.length===0 && (
          <div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12,border:`1px dashed ${C.border}`,borderRadius:16}}>
            La première découverte arrive bientôt 🎌
          </div>
        )}
        {items && items.map(d=>(
            <div key={d.id} className="lift" onClick={()=>setSelected(d)} style={{
              background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"16px 16px",
              display:"flex",alignItems:"center",gap:14,cursor:"pointer",
              boxShadow:"0 2px 10px rgba(0,0,0,0.03)",
            }}>
              {d.image_url ? (
                <img src={d.image_url} alt="" loading="lazy" onError={(e)=>{e.target.style.display="none";}} style={{width:56,height:56,borderRadius:16,objectFit:"cover",flexShrink:0}}/>
              ) : (
                <span style={{fontSize:28,flexShrink:0,width:56,height:56,borderRadius:"50%",background:C.s2,display:"flex",alignItems:"center",justifyContent:"center"}}>🎴</span>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:3}}>
                  <span style={{fontSize:15,color:C.text,fontWeight:500}}>{d.title}</span>
                  {d.kanji && <span style={{fontSize:12,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{d.kanji}</span>}
                </div>
                <div style={{fontSize:12,color:C.t2,lineHeight:1.45}}>{d.subtitle}</div>
              </div>
              <div style={{fontSize:18,color:C.t3,flexShrink:0}}>›</div>
            </div>
        ))}
      </div>
    </div>
  );
}

function DiscoveryDetail({C, d, onBack}){
  return (
    <div style={{height:"100%",overflowY:"auto",background:C.bg,animation:"fadeIn .3s ease"}}>
      {d.image_url && (
        <div style={{width:"100%",height:200,overflow:"hidden",position:"relative"}}>
          <img src={d.image_url} alt="" loading="lazy" onError={(e)=>{e.target.parentNode.style.display="none";}} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,0.1),rgba(15,11,8,0.55))"}}/>
        </div>
      )}
      <div style={{padding:"calc(24px + env(safe-area-inset-top, 0px)) 20px 24px",background:`linear-gradient(160deg,rgba(201,70,61,0.1) 0%,transparent 90%)`}}>
        <button onClick={onBack} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",marginBottom:20}}>
          ‹ Découvertes
        </button>
        {d.category && (
          <div style={{fontSize:11,color:C.red,letterSpacing:".2em",marginBottom:6,textTransform:"uppercase"}}>{d.category}</div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:2}}>
          <div style={{fontSize:26,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>{d.title}</div>
          {d.kanji && <SpeakButton C={C} text={d.kanji} size={26}/>}
        </div>
        {(d.kanji || d.romaji) && (
          <div style={{fontSize:14,color:C.t3,fontFamily:"'Noto Serif JP',serif",marginTop:4}}>
            {d.kanji}{d.kanji && d.romaji ? " · " : ""}{d.romaji}
          </div>
        )}
        {d.subtitle && <div style={{fontSize:14,color:C.t2,fontStyle:"italic",lineHeight:1.5,marginTop:10}}>{d.subtitle}</div>}
      </div>

      <div style={{padding:"4px 20px 90px"}}>
        {d.body && <p style={{fontSize:14,color:C.t2,lineHeight:1.85,margin:0}}>{d.body}</p>}
        {d.image_attribution && (
          <div style={{marginTop:24,fontSize:10,color:C.t3,lineHeight:1.5}}>
            Photo : {d.image_attribution}{d.image_licence ? ` (${d.image_licence})` : ""}
            {d.image_source_url && <> — <a href={d.image_source_url} target="_blank" rel="noreferrer" style={{color:C.t3}}>source</a></>}
          </div>
        )}
      </div>
    </div>
  );
}
