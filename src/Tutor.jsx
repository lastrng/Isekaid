// ─────────────────────────────────────────────────────────────────────────────
// Tutor.jsx — Tuteur conversationnel japonais (Phase 3)
//
// Appelle l'Edge Function tutor-chat (jamais l'API Anthropic directement — la
// clé ne quitte jamais le serveur). Le gating premium (Phase 4) n'est pas ici :
// la seule limite active pour l'instant est le plafond quotidien serveur.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { supabaseEnabled, fetchTutorConversations, fetchTutorMessages, sendTutorMessage } from "./supabase";
import { TUTOR_SCENARIOS, getTutorScenario } from "./tutorScenarios";
import { SpeakButton } from "./tts";

// Niveau estimé à partir de ce que l'utilisateur a déjà accompli ailleurs
// dans l'app (maîtrise SRS des kana, scénarios de dialogue réussis, meilleur
// streak) — transmis à l'Edge Function à chaque appel pour adapter le ton
// (proportion FR/JP, romaji, longueur des phrases).
const NIVEAU_ORDER = ["débutant", "faux-débutant", "intermédiaire"];
// Niveau déclaré à l'onboarding (LEVELS: beginner/intermediate/advanced,
// App.jsx) → plancher du niveau du tuteur. Sans ce plancher, quelqu'un qui
// se dit "Avancé" au premier lancement est traité comme grand débutant tant
// que le comportement réel (SRS/scénarios/streak) n'a pas eu le temps de le
// confirmer — parfois plusieurs semaines.
const SELF_REPORT_FLOOR = { beginner: "débutant", intermediate: "faux-débutant", advanced: "intermédiaire" };
export function estimateNiveau(kanaProgress, scenProgress, streak, selfReportedLevel){
  const mastered = Object.values(kanaProgress || {}).filter(v=>(v.box||0)>=5).length;
  const scenDone = (scenProgress?.done || []).length;
  const best = streak?.best || 0;
  let behavioral = "débutant";
  if(mastered >= 60 || scenDone >= 5) behavioral = "intermédiaire";
  else if(mastered >= 20 || scenDone >= 2 || best >= 14) behavioral = "faux-débutant";
  const floor = SELF_REPORT_FLOOR[selfReportedLevel];
  if(!floor) return behavioral;
  return NIVEAU_ORDER[Math.max(NIVEAU_ORDER.indexOf(behavioral), NIVEAU_ORDER.indexOf(floor))];
}
const NIVEAU_LABEL = { "débutant":"Débutant", "faux-débutant":"Faux-débutant", "intermédiaire":"Intermédiaire" };
// Repère CECRL indicatif — le tuteur n'évalue pas formellement le niveau,
// c'est une équivalence approximative pour donner un repère à ceux qui
// connaissent déjà cette échelle (n'apparaît que dans l'infobulle).
const NIVEAU_CEFR = { "débutant":"A1", "faux-débutant":"A2", "intermédiaire":"B1" };

// Libellé de niveau "friendly" (Débutant/Faux-débutant/Intermédiaire) + petite
// infobulle tap-to-reveal donnant l'équivalent CECRL — composant partagé pour
// que le niveau affiché soit identique partout dans l'app (Tuteur IA, Profil…)
// au lieu de deux échelles différentes qui se contredisaient.
export function NiveauInfo({C, niveau, style}){
  const [open,setOpen] = useState(false);
  const label = NIVEAU_LABEL[niveau] || niveau;
  const cefr = NIVEAU_CEFR[niveau];
  return (
    <span style={{position:"relative",display:"inline-flex",alignItems:"center",gap:5,...style}}>
      {label}
      {cefr && (
        <>
          <button onClick={()=>setOpen(o=>!o)} aria-label="Équivalent CECRL" style={{width:15,height:15,borderRadius:"50%",border:`1px solid ${C.t3}`,background:"transparent",color:C.t3,fontSize:9,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0}}>i</button>
          {open && (
            <span onClick={()=>setOpen(false)} style={{position:"absolute",top:"100%",left:0,marginTop:4,background:C.s1,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:11,color:C.t2,whiteSpace:"nowrap",zIndex:20,boxShadow:C.shadow||"0 4px 12px rgba(0,0,0,0.15)",cursor:"pointer"}}>
              Équivalent CECRL : <b style={{color:C.text}}>{cefr}</b>
            </span>
          )}
        </>
      )}
    </span>
  );
}

// ─── Entrée sur l'accueil ───────────────────────────────────────────────────
// En-tête réplique le style de SH (App.jsx) — pas d'import cross-fichier
// pour garder Tutor.jsx autonome, même convention que DailyFeed.jsx /
// ExploreDiscoveries.jsx.
export function TutorEntryCard({C, onOpen}){
  return (
    <div>
      <div style={{fontFamily:"'Noto Serif JP',serif",fontWeight:600,fontSize:15,color:C.text,marginBottom:12}}>Ton tuteur</div>
      <div onClick={onOpen} className="lift" style={{cursor:"pointer",padding:"16px 18px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,boxShadow:C.shadow||"none",display:"flex",alignItems:"center",gap:14}}>
        <span style={{fontSize:32,flexShrink:0}}>🧑‍🏫</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,color:C.text,fontWeight:500,marginBottom:2}}>Parler avec ton tuteur</div>
          <div style={{fontSize:12,color:C.t2,lineHeight:1.4}}>Conversations guidées en japonais, corrections et scénarios personnalisés.</div>
        </div>
        <span style={{fontSize:18,color:C.t3,flexShrink:0}}>›</span>
      </div>
    </div>
  );
}

// ─── Écran principal : sélection de scénario / historique / chat ──────────
export function TutorScreen({C, session, kanaProgress, scenProgress, streak, isPremium, onOpenPremium, selfReportedLevel, initialBridge, onBridgeConsumed, onMissionTrigger, onBack}){
  // Pont Scénarios scriptés → Tuteur : si un contexte de pont est en attente
  // (App.jsx), on saute le picker et on ouvre directement le chat dessus, une
  // seule fois — consommé immédiatement pour ne pas rouvrir en boucle.
  const [view, setView] = useState(initialBridge ? "chat" : "picker"); // "picker" | "history" | "chat"
  const [activeScenarioId, setActiveScenarioId] = useState(initialBridge?.tutorScenarioId || null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [bridgeContext, setBridgeContext] = useState(initialBridge?.bridgeContext || null);
  const niveau = estimateNiveau(kanaProgress, scenProgress, streak, selfReportedLevel);

  useEffect(()=>{
    if(initialBridge) onBridgeConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const openScenario = (scenarioId)=>{
    setActiveScenarioId(scenarioId);
    setActiveConversationId(null);
    setBridgeContext(null);
    setView("chat");
  };
  const openConversation = (conv)=>{
    setActiveScenarioId(conv.scenario);
    setActiveConversationId(conv.id);
    setBridgeContext(null);
    setView("chat");
  };

  if(view === "chat"){
    return (
      <ChatView C={C} niveau={niveau} scenarioId={activeScenarioId || "libre"}
        conversationId={activeConversationId} bridgeContext={bridgeContext}
        isPremium={isPremium} onOpenPremium={onOpenPremium}
        onConversationCreated={setActiveConversationId}
        onMissionTrigger={onMissionTrigger}
        onBack={()=>setView(activeConversationId ? "history" : "picker")}
      />
    );
  }
  if(view === "history"){
    return <HistoryView C={C} session={session} onOpen={openConversation} onBack={()=>setView("picker")}/>;
  }

  const card = { background:C.s1, border:`1px solid ${C.border}`, borderRadius:16, boxShadow:C.shadow||"none" };
  return (
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      {/* En-tête — Header.tsx (bolt) */}
      <div style={{padding:"50px 20px 14px",background:`${C.bg}e6`,backdropFilter:"blur(10px)",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10,display:"flex",alignItems:"center",gap:10}}>
        {onBack && (
          <button onClick={onBack} aria-label="Retour" style={{width:34,height:34,borderRadius:"50%",border:"none",background:"transparent",color:C.t2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>‹</button>
        )}
        <div>
          <div style={{fontFamily:"'Noto Serif JP',serif",fontWeight:600,fontSize:18,color:C.text}}>Tuteur IA</div>
          <div style={{fontSize:12,color:C.t3,marginTop:1}}>Pratique le japonais en conversation</div>
        </div>
      </div>

      <div style={{padding:"18px 20px 110px",maxWidth:640,margin:"0 auto",display:"flex",flexDirection:"column",gap:22}}>
        {/* Niveau estimé */}
        <div style={{...card,background:C.s2,border:"none",padding:16,display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:48,height:48,borderRadius:12,background:C.s1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🤖</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:500,color:C.text}}>Niveau estimé : <NiveauInfo C={C} niveau={niveau}/></div>
            <div style={{fontSize:11,color:C.t3}}>Basé sur ta progression</div>
          </div>
        </div>

        {/* Limite quotidienne */}
        {!isPremium && (
          <div style={{...card,background:`linear-gradient(135deg,${C.indigo}14,transparent)`,border:`1px solid ${C.indigo}33`,padding:16}}>
            <div style={{fontSize:13,fontWeight:500,color:C.text,marginBottom:3}}>Tuteur gratuit</div>
            <div style={{fontSize:12,color:C.t2,marginBottom:10}}>8 messages par jour · Premium débloque l'illimité</div>
            <button onClick={onOpenPremium} style={{background:"none",border:"none",color:C.indigo,fontSize:13,fontWeight:600,cursor:"pointer",padding:0}}>Passer Premium →</button>
          </div>
        )}

        {/* Conversations récentes */}
        <div>
          <div style={{fontFamily:"'Noto Serif JP',serif",fontWeight:600,fontSize:16,color:C.text,marginBottom:12}}>Conversations récentes</div>
          <button onClick={()=>setView("history")} style={{width:"100%",boxSizing:"border-box",display:"flex",alignItems:"center",gap:10,padding:"13px 16px",...card,color:C.t2,fontSize:13,cursor:"pointer"}}>
            <span style={{fontSize:16}}>🕓</span> Voir mes conversations précédentes
          </button>
        </div>

        {/* Scénarios guidés */}
        <div>
          <div style={{fontFamily:"'Noto Serif JP',serif",fontWeight:600,fontSize:16,color:C.text,marginBottom:12}}>Scénarios guidés</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {TUTOR_SCENARIOS.map(s=>(
              <div key={s.id} onClick={()=>openScenario(s.id)} className="lift" style={{...card,cursor:"pointer",display:"flex",alignItems:"center",gap:14,padding:16}}>
                <div style={{width:44,height:44,borderRadius:12,background:C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{s.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:500,color:C.text,marginBottom:2}}>{s.titre}</div>
                  <div style={{fontSize:12,color:C.t3,lineHeight:1.4}}>{s.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Historique des conversations ──────────────────────────────────────────
function HistoryView({C, session, onOpen, onBack}){
  const [conversations, setConversations] = useState(null); // null = chargement
  const userId = session?.user?.id;

  useEffect(()=>{
    let cancelled = false;
    if(!supabaseEnabled || !userId){ setConversations([]); return; }
    fetchTutorConversations(userId).then(rows=>{ if(!cancelled) setConversations(rows); });
    return ()=>{ cancelled = true; };
  },[userId]);

  return (
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"16px 14px 90px",maxWidth:640,margin:"0 auto"}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0,marginBottom:14}}>
          ‹ Scénarios
        </button>
        <h1 style={{fontSize:22,fontWeight:900,color:C.text,margin:"0 0 16px"}}>Tes conversations</h1>

        {conversations === null && (
          <div style={{textAlign:"center",padding:40,color:C.t3,fontSize:14}}>Chargement…</div>
        )}
        {conversations && conversations.length === 0 && (
          <div style={{textAlign:"center",padding:"40px 20px",color:C.t3,fontSize:14,border:`1px dashed ${C.border}`,borderRadius:16}}>
            Pas encore de conversation. Choisis un scénario pour commencer 🎌
          </div>
        )}
        {conversations && conversations.map(c=>{
          const scenario = getTutorScenario(c.scenario);
          return (
            <div key={c.id} onClick={()=>onOpen(c)} className="lift" style={{cursor:"pointer",display:"flex",alignItems:"center",gap:12,padding:"13px 15px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:10}}>
              <span style={{fontSize:24,flexShrink:0}}>{scenario.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,color:C.text,fontWeight:600,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.titre || scenario.titre}</div>
                <div style={{fontSize:11,color:C.t3}}>{relativeDate(c.updated_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function relativeDate(iso){
  if(!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if(days <= 0) return "Aujourd'hui";
  if(days === 1) return "Hier";
  if(days < 7) return `Il y a ${days} jours`;
  return d.toLocaleDateString("fr-FR", { day:"numeric", month:"short" });
}

// Résumé compact d'une erreur JS/réseau/Supabase, affiché à l'écran pour le
// diagnostic — sans ça, "Failed to fetch" (offline), une erreur CORS et un
// 500 serveur produisent tous le même message générique et rien pour trancher.
function describeError(e){
  const status = e?.context?.status;
  // FunctionsFetchError (pas de réponse HTTP du tout) porte l'erreur fetch
  // brute dans .context — c'est là qu'est le vrai détail (AbortError = notre
  // timeout de 25s, TypeError = échec réseau réel).
  const cause = !status && e?.context ? (e.context.name || e.context.message) : null;
  const parts = [e?.name || "Error", status ? `HTTP ${status}` : null, cause, e?.message].filter(Boolean);
  return parts.join(" · ") || String(e);
}

// ─── Chat ───────────────────────────────────────────────────────────────────
function ChatView({C, niveau, scenarioId, conversationId, bridgeContext, isPremium, onOpenPremium, onConversationCreated, onMissionTrigger, onBack}){
  const scenario = getTutorScenario(scenarioId);
  const [convId, setConvId] = useState(conversationId);
  const [messages, setMessages] = useState([]); // {role, content_jp, content_fr, romaji, correction}
  const [loadingHistory, setLoadingHistory] = useState(!!conversationId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null); // "network" | "limit" | "premium" | null
  const [errorDetail, setErrorDetail] = useState(null); // message technique brut, pour diagnostic
  const [freeLimit, setFreeLimit] = useState(8);
  const scrollRef = useRef(null);

  useEffect(()=>{
    let cancelled = false;
    if(!conversationId){ setLoadingHistory(false); return; }
    fetchTutorMessages(conversationId).then(rows=>{
      if(cancelled) return;
      setMessages(rows);
      setLoadingHistory(false);
    });
    return ()=>{ cancelled = true; };
  },[conversationId]);

  useEffect(()=>{
    if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  },[messages, sending]);

  const send = async (text)=>{
    const trimmed = (text ?? input).trim();
    if(!trimmed || sending) return;
    setInput("");
    setSuggestions([]);
    setError(null);
    setErrorDetail(null);
    setMessages(prev=>[...prev, { role:"user", content_jp: trimmed }]);
    setSending(true);
    try {
      // Le contexte de pont (scénario scripté → tuteur) n'est envoyé qu'à la
      // toute première requête d'une conversation encore sans id — le serveur
      // le persiste sur la conversation, pas besoin de le renvoyer ensuite.
      const res = await sendTutorMessage({ message: trimmed, scenarioId, niveau, conversationId: convId, bridgeContext: !convId ? bridgeContext : undefined });
      if(res?.limitReached || res?.premiumRequired){
        setError(res.premiumRequired ? "premium" : "limit");
        if(res.premiumRequired && res.limit) setFreeLimit(res.limit);
        // Le serveur rejette avant d'enregistrer quoi que ce soit : la bulle
        // optimiste ne correspond à rien de persisté, on la retire.
        setMessages(prev=>prev.slice(0, -1));
        setInput(trimmed);
        return;
      }
      // Réponse serveur inattendue (mauvais Content-Type, corps vide…) : on ne
      // fait jamais confiance aveuglément à sa forme avant de l'afficher.
      if(!res || typeof res !== "object" || typeof res.reply_jp !== "string"){
        throw Object.assign(new Error("Réponse du serveur illisible"), { name: "MalformedResponseError" });
      }
      if(!convId && res.conversationId){
        setConvId(res.conversationId);
        onConversationCreated?.(res.conversationId);
      }
      setMessages(prev=>[...prev, {
        role:"assistant", content_jp: res.reply_jp, content_fr: res.reply_fr || "",
        romaji: res.romaji || "", correction: res.correction || "",
      }]);
      setSuggestions(Array.isArray(res.suggestions) ? res.suggestions : []);
      onMissionTrigger?.("tutor");
    } catch(e){
      console.error("[tutor] échec envoi message:", e);
      // Un JWT expiré/absent (session hors-ligne, cf. mode skipAuth de l'app)
      // mérite un message distinct de "vérifie ta connexion" — se reconnecter
      // est le vrai geste à faire, pas réessayer.
      setError(e?.context?.status === 401 ? "auth" : "network");
      setErrorDetail(describeError(e));
      // On retire le message optimiste raté pour ne pas laisser un état incohérent
      setMessages(prev=>prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:C.bg}}>
      <div style={{padding:"14px 14px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t2,fontSize:20,cursor:"pointer",padding:0,lineHeight:1}}>‹</button>
        <span style={{fontSize:24}}>{scenario.emoji}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text}}>{scenario.titre}</div>
          <div style={{fontSize:11,color:C.t3}}>{NIVEAU_LABEL[niveau]}</div>
        </div>
      </div>

      <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"16px 14px"}}>
        {loadingHistory && (
          <div style={{textAlign:"center",padding:30,color:C.t3,fontSize:13}}>Chargement de la conversation…</div>
        )}
        {!loadingHistory && messages.length === 0 && (
          <div style={{textAlign:"center",padding:"30px 20px",color:C.t3,fontSize:13,border:`1px dashed ${C.border}`,borderRadius:16}}>
            {bridgeContext
              ? "Ton tuteur reprend la scène que tu viens de réussir, en version libre 🎌"
              : scenario.description}
            <br/>Écris un premier message pour commencer.
          </div>
        )}
        {messages.map((m, i)=> m.role === "user"
          ? <UserBubble key={i} C={C} text={m.content_jp}/>
          : <TutorBubble key={i} C={C} m={m}/>
        )}
        {sending && (
          <div style={{display:"flex",gap:8,alignItems:"center",color:C.t3,fontSize:12,padding:"4px 2px"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.t3,display:"inline-block",animation:"pulse 1s ease infinite"}}/>
            Le tuteur réfléchit…
          </div>
        )}
        {(error === "network" || error === "auth") && (
          <div style={{padding:"10px 14px",background:"rgba(201,70,61,0.08)",border:"1px solid rgba(201,70,61,0.3)",borderRadius:12,color:C.red,fontSize:12,marginTop:6}}>
            {error === "auth"
              ? "Session expirée ou hors ligne au moment de la connexion. Reconnecte-toi (Profil) puis réessaie."
              : "Connexion impossible. Vérifie ta connexion et réessaie."}
            {errorDetail && (
              <div style={{marginTop:5,fontFamily:"monospace",fontSize:10.5,color:C.t3,opacity:0.85,wordBreak:"break-word"}}>
                {errorDetail}
              </div>
            )}
          </div>
        )}
        {error === "limit" && (
          <div style={{padding:"14px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:12,marginTop:6,textAlign:"center"}}>
            Tu as atteint ta limite de messages pour aujourd'hui. Reviens demain pour continuer cette conversation 🎌
          </div>
        )}
        {error === "premium" && (
          <div style={{padding:"18px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,marginTop:6}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>
              Tu as utilisé tes {freeLimit} messages gratuits du jour 🎌
            </div>
            <div style={{fontSize:12.5,color:C.t2,lineHeight:1.6,marginBottom:14}}>
              Premium débloque le tuteur illimité, tous les scénarios et l'historique complet de tes conversations.
            </div>
            <button onClick={onOpenPremium} style={{width:"100%",boxSizing:"border-box",padding:"12px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:13.5,fontWeight:700,cursor:"pointer"}}>
              Passer Premium
            </button>
          </div>
        )}
        {!sending && suggestions.length > 0 && (
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
            {suggestions.map((s,i)=>(
              <button key={i} onClick={()=>send(s)} style={{padding:"8px 13px",borderRadius:20,border:`1px solid ${C.border}`,background:C.s1,color:C.text,fontSize:12.5,cursor:"pointer"}}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error !== "limit" && error !== "premium" && (
        <div style={{display:"flex",gap:8,padding:"10px 14px",borderTop:`1px solid ${C.border}`,flexShrink:0,paddingBottom:"calc(10px + env(safe-area-inset-bottom))"}}>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }}
            placeholder="Écris en japonais ou en français…"
            disabled={sending || loadingHistory}
            style={{flex:1,minWidth:0,padding:"12px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:24,color:C.text,fontSize:14,fontFamily:"inherit"}}
          />
          <button onClick={()=>send()} disabled={sending || loadingHistory || !input.trim()} style={{width:44,height:44,borderRadius:"50%",border:"none",background:C.red,color:"#fff",fontSize:16,cursor:"pointer",flexShrink:0,opacity:(sending||loadingHistory||!input.trim())?0.5:1}}>
            ➤
          </button>
        </div>
      )}
    </div>
  );
}

function UserBubble({C, text}){
  return (
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
      <div style={{maxWidth:"78%",padding:"10px 14px",background:C.red,color:"#fff",borderRadius:"16px 16px 4px 16px",fontSize:14.5,lineHeight:1.5}}>
        {text}
      </div>
    </div>
  );
}

function TutorBubble({C, m}){
  const [showRomaji, setShowRomaji] = useState(true);
  return (
    <div style={{display:"flex",justifyContent:"flex-start",marginBottom:14}}>
      <div style={{maxWidth:"82%"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"11px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:"16px 16px 16px 4px"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,color:C.text,lineHeight:1.6}}>{m.content_jp}</div>
            {m.romaji && (
              <div onClick={()=>setShowRomaji(v=>!v)} style={{fontSize:11.5,color:C.t3,marginTop:3,cursor:"pointer",fontStyle:"italic"}}>
                {showRomaji ? m.romaji : "romaji ›"}
              </div>
            )}
            {m.content_fr && (
              <div style={{fontSize:12.5,color:C.t2,marginTop:6,lineHeight:1.5}}>{m.content_fr}</div>
            )}
          </div>
          <SpeakButton C={C} text={m.content_jp} size={26} hideIfNoVoice/>
        </div>
        {m.correction && (
          <div style={{marginTop:6,padding:"9px 12px",background:"rgba(158,122,26,0.08)",border:"1px solid rgba(158,122,26,0.3)",borderRadius:12,fontSize:12,color:C.gold,lineHeight:1.5}}>
            <b>✏️ Correction</b> — {m.correction}
          </div>
        )}
      </div>
    </div>
  );
}
