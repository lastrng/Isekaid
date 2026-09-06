import { ProgressConflicts } from "./ProgressConflicts.jsx";
import { TripConflicts } from "../my-japan/TripConflicts.jsx";
import { useState } from "react";
import * as sfx from "../../sfx.js";
import { NiveauInfo } from "../companion/NiveauInfo.jsx";
import { estimateNiveau } from "../companion/niveau.js";
import { disableDailyReminder, enableDailyReminder, loadDailyReminder, supportsDailyReminder } from "../reminders/dailyReminder.js";
import { MyJapanSection } from "../my-japan/MyJapanSection.jsx";
import { useMyJapanProfile } from "../my-japan/useMyJapanProfile.js";
import { Bell, ChevronLeft, ChevronRight, Crown, Flame, Heart, LogOut, RotateCcw, Sparkles, Trash2, Type, Volume2 } from "lucide-react";

export function ProfileScreen({ui,C,user,dark,setDark,db,onReset,onDeleteAccount,onLogout,onRestoreProgress,session,streak,favs,toggleFav,rank,kanaProgress,unlocks,scenProgress,onShowTour,pathProgress,isPremium,onOpenPremium,accent,chooseAccent,script,setScript,onBack,onOpenLieu,onOpenTradition,onOpenDetail}){
  const {SectionCard,SectionTitle,iconTileStyle,computeAchievements}=ui;
  const [reminders,setRemindersState] = useState(()=>{ try { return localStorage.getItem("isekaid_reminders_v1")!=="off"; } catch { return true; } });
  const [dailyReminder,setDailyReminder] = useState(()=>loadDailyReminder());
  const [reminderError,setReminderError] = useState(null);
  // Badges : seules les 2 premières lignes (grille 3 colonnes = 6 badges)
  // sont visibles par défaut, le reste se dévoile au clic — voir la section
  // "Badges" plus bas.
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [soundOn,setSoundOnState] = useState(()=>sfx.isSoundOn());
  const toggleSound = ()=>{
    setSoundOnState(prev=>{
      const next = !prev;
      sfx.setSoundOn(next);
      if(next) sfx.playTap();
      return next;
    });
  };
  const setReminders = (fn)=>{
    setRemindersState(prev=>{
      const next = typeof fn==="function" ? fn(prev) : fn;
      try { localStorage.setItem("isekaid_reminders_v1", next?"on":"off"); } catch {}
      return next;
    });
  };
  const toggleDailyReminder = async ()=>{
    setReminderError(null);
    try {
      if(dailyReminder.enabled){
        setDailyReminder(await disableDailyReminder());
        return;
      }
      const result = await enableDailyReminder(dailyReminder);
      if(result.ok) setDailyReminder(result.settings);
      else setReminderError(result.reason);
    } catch(error){
      console.warn("[reminder] configuration impossible:", error);
      setReminderError("error");
    }
  };
  const goalL={travel:"Voyager",live:"Vivre au Japon",learn:"Apprendre",imm:"Immersion"};
  const {summary:myJapan,resolveTrip:resolveMyJapanTrip,getPhotoUrl:getMemoryPhotoUrl,changePhoto:changeMemoryPhoto,changeNote:changeMemoryNote,retrySync:retryProfileSync,syncStatus:profileSyncStatus}=useMyJapanProfile({db,session,expressionProgress:user?.expressionProgress,kanaProgress,favorites:favs});
  // Rangée de préférence bolt-style : icône + libellé + contrôle (switch ou
  // texte), posée dans une carte à séparateurs (`divide-y`) plutôt qu'une
  // carte isolée par réglage.
  const Switch = ({on,onClick})=>(
    <div onClick={onClick} style={{width:44,height:24,borderRadius:12,background:on?C.red:C.s3,cursor:"pointer",position:"relative",transition:"background .25s",flexShrink:0}}>
      <div style={{position:"absolute",top:2,left:on?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .25s",boxShadow:"0 1px 4px rgba(0,0,0,.22)"}}/>
    </div>
  );
  const PrefRow = ({Icon,label,sub,control,onClick,danger,last})=>(
    <div onClick={onClick} style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:last?"none":`1px solid ${C.border}`,cursor:onClick?"pointer":"default"}}>
      <Icon size={19} color={danger?C.red:C.t3}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,color:danger?C.red:C.text}}>{label}</div>
        {sub && <div style={{fontSize:11,color:C.t3,marginTop:1,lineHeight:1.4}}>{sub}</div>}
      </div>
      {control}
    </div>
  );
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 110px"}}>
        {onBack && (
          <button onClick={onBack} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",gap:5}}>
            <ChevronLeft size={14}/> Accueil
          </button>
        )}
        <h1 style={{ color: C.text, fontFamily: "'Noto Serif JP',serif", fontSize: 24, margin: "0 0 18px" }}>Mon Japon</h1>
        {/* Carte identité — centrée, comme ProfileScreen.tsx (bolt) */}
        <SectionCard C={C} style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:20,marginBottom:16}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:C.s2,border:`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:user.emojiAvatar?34:26,fontFamily:"'Noto Serif JP',serif",color:C.red,marginBottom:12,overflow:"hidden"}}>
            {user.photo
              ? <img src={user.photo} alt="" referrerPolicy="no-referrer" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={(e)=>{e.target.style.display="none"; e.target.parentNode.textContent=user.emojiAvatar||(user.name||"V")[0].toUpperCase();}}/>
              : user.emojiAvatar
              ? user.emojiAvatar
              : (user.name||"V")[0].toUpperCase()}
          </div>
          <div style={{fontFamily:"'Noto Serif JP',serif",fontWeight:700,fontSize:19,color:C.text}}>{user.name}</div>
          {user.email && <div style={{fontSize:13,color:C.t3,marginTop:2}}>{user.email}</div>}
          {isPremium && (
            <span style={{marginTop:8,fontSize:12,fontWeight:600,color:C.gold,background:`${C.gold}14`,padding:"5px 12px",borderRadius:999,display:"inline-flex",alignItems:"center",gap:5}}>
              <Crown size={12}/> Premium
            </span>
          )}
        </SectionCard>

        {session?.user && <ProgressConflicts C={C} userId={session.user.id} onRestore={onRestoreProgress}/>}
        {session?.user && <TripConflicts C={C} userId={session.user.id}/>}
        <MyJapanSection C={C} summary={myJapan} onResolveTrip={resolveMyJapanTrip} onMemoryPhoto={changeMemoryPhoto} onMemoryNote={changeMemoryNote} getMemoryPhotoUrl={getMemoryPhotoUrl} syncStatus={session?.user?profileSyncStatus:null} onSyncNow={retryProfileSync}/>

        {/* Ma collection (favoris) */}
        <SectionTitle C={C} title="Ma collection" action={<span style={{fontSize:11,color:C.t3}}>{favs?.length||0} sauvegardé{(favs?.length||0)>1?"s":""}</span>}/>
        {(!favs || favs.length===0) ? (
          <div style={{padding:"22px 16px",textAlign:"center",background:C.s2,border:`1px dashed ${C.s3}`,borderRadius:16,marginBottom:16}}>
            <Heart size={22} color={C.t3} style={{marginBottom:8}}/>
            <div style={{fontSize:12,color:C.t3,lineHeight:1.6}}>Touche le cœur sur une carte<br/>pour la sauvegarder ici</div>
          </div>
        ) : (
          <SectionCard C={C} style={{padding:8,marginBottom:16}}>
            {favs.map((f,i)=>{
              const it=f.item;
              const meta={
                expr:{emoji:it.emoji||"🗣️", title:it.expression, sub:it.traduction, c:C.gold},
                cult:{emoji:it.emoji||"🏮", title:it.titre, sub:it.tag, c:C.red},
                repas:{emoji:it.emoji||"🍱", title:it.nom_jp, sub:it.traduction, c:C.green},
                tradition:{emoji:it.emoji||"⛩️", title:it.nom, sub:it.mois, c:C.red},
                code:{emoji:it.emoji||"🎌", title:it.titre, sub:it.categorie, c:C.red},
                region:{emoji:it.emoji||"🗾", title:it.nom, sub:it.position, c:C.green},
                vie:{emoji:it.emoji||"🏙️", title:it.titre, sub:it.categorie, c:"#5B7E9B"},
                lieu:{emoji:it.emoji||"📍", title:it.nom, sub:it.quartier, c:C.indigo},
              }[f.type]||{emoji:"♥",title:"",sub:"",c:C.red};
              // Ouvre la fiche détail correspondante — seuls les types reliés à un
              // écran de détail existant sont cliquables (lieu/tradition/code/vie/
              // région) ; expr/cult/repas restent des lignes d'info seules, aucun
              // écran de détail réel n'existe encore pour ces types dans l'app.
              const open = f.type==="lieu" ? ()=>onOpenLieu&&onOpenLieu(it)
                : f.type==="tradition" ? ()=>onOpenTradition&&onOpenTradition(it)
                : (f.type==="code"||f.type==="vie"||f.type==="region") ? ()=>onOpenDetail&&onOpenDetail(f.type,it)
                : null;
              return(
                <div key={i} onClick={open||undefined} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 6px",borderBottom:i<favs.length-1?`1px solid ${C.border}`:"none",cursor:open?"pointer":"default"}}>
                  <span style={{fontSize:22,flexShrink:0}}>{meta.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:C.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.title}</div>
                    <div style={{fontSize:11,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.sub}</div>
                  </div>
                  <span style={{fontSize:8,padding:"2px 7px",borderRadius:20,background:`${meta.c}1a`,color:meta.c,letterSpacing:".08em",textTransform:"uppercase",flexShrink:0}}>{f.type}</span>
                  <button onClick={(e)=>{e.stopPropagation(); toggleFav(f.type,it);}} aria-label="Retirer" style={{background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:15,flexShrink:0,padding:4}}>♥</button>
                  {open && <ChevronRight size={16} color={C.t3} style={{flexShrink:0}}/>}
                </div>
              );
            })}
          </SectionCard>
        )}

        <details style={{ marginBottom: 18, color: C.text }}>
          <summary style={{ padding: "15px 0", cursor: "pointer", fontWeight: 650 }}>Ma progression et mes badges</summary>
        {/* 2 tuiles stats — streak / niveau (XP retiré : redondant avec le
            streak, dont il n'était qu'un alias — voir computeXP) */}
        {/* Niveau : même calcul que "Niveau estimé" du Tuteur IA (estimateNiveau)
            — auparavant cette tuile affichait le niveau déclaré à l'onboarding
            (échelle différente : Débutant/Intermédiaire/Avancé, jamais recalculé),
            ce qui contredisait le Tuteur (Débutant/Faux-débutant/Intermédiaire). */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[
            {Icon:Flame, label:"Streak", value:`${streak?.count||0}j`, color:C.red},
            {Icon:Sparkles, label:"Niveau", value:<NiveauInfo C={C} niveau={estimateNiveau(kanaProgress, scenProgress, streak, user?.level)}/>, color:C.indigo},
          ].map(s=>(
            <SectionCard key={s.label} C={C} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"14px 8px"}}>
              <div style={iconTileStyle(s.color, 34, 10)}><s.Icon size={17} color={s.color}/></div>
              <div style={{fontFamily:"'Noto Serif JP',serif",fontWeight:700,fontSize:14,color:C.text}}>{s.value}</div>
              <div style={{fontSize:10,color:C.t3}}>{s.label}</div>
            </SectionCard>
          ))}
        </div>

        {(()=>{
          const achievements = computeAchievements({ streak, unlocks, scenProgress, kanaProgress, favs, pathProgress });
          const earned = achievements.filter(a=>a.unlocked).length;
          // 2 lignes de 3 colonnes = 6 badges visibles par défaut, le reste
          // se dévoile au clic sur "Voir tout" (jamais masqué si l'utilisateur
          // a déjà déplié, même si la liste redevient courte entre-temps).
          const BADGES_VISIBLE = 6;
          const hasMore = achievements.length > BADGES_VISIBLE;
          const shown = showAllBadges ? achievements : achievements.slice(0, BADGES_VISIBLE);
          return(
            <div style={{marginBottom:16}}>
              <SectionTitle C={C} title="Badges" action={<span style={{fontSize:11,color:C.t2,fontWeight:600}}>{earned}/{achievements.length}</span>}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
                {shown.map((b,i)=>(
                  <div key={i} title={b.desc} style={{background:C.s1,border:`1px solid ${b.unlocked?"rgba(201,70,61,.32)":C.border}`,borderRadius:18,padding:"14px 8px",textAlign:"center",opacity:b.unlocked?1:.5,transition:"all .3s"}}>
                    <div style={{width:44,height:44,margin:"0 auto 7px",borderRadius:"50%",background:b.unlocked?C.s2:C.s3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,filter:b.unlocked?"none":"grayscale(1)"}}>{b.emoji}</div>
                    <div style={{fontSize:10,color:b.unlocked?C.text:C.t3,lineHeight:1.25,marginBottom:3}}>{b.label}</div>
                    <div style={{fontSize:8,color:C.t3,lineHeight:1.3}}>{b.unlocked?"✓":b.desc}</div>
                  </div>
                ))}
              </div>
              {hasMore && (
                <button onClick={()=>setShowAllBadges(v=>!v)} className="pop-press" style={{width:"100%",marginTop:10,padding:"10px",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:12,color:C.t2,fontSize:12,cursor:"pointer"}}>
                  {showAllBadges ? "▲ Réduire" : `▼ Voir tout (${achievements.length})`}
                </button>
              )}
            </div>
          );
        })()}

        </details>

        {/* Bannière Premium — calquée sur ProfileScreen.tsx (bolt) */}
        <button onClick={onOpenPremium} className="lift" style={{width:"100%",marginBottom:16,padding:16,borderRadius:20,cursor:"pointer",textAlign:"left",background:isPremium?`linear-gradient(135deg,${C.gold}22,${C.red}0d)`:`linear-gradient(90deg,${C.gold}22,${C.gold}0d)`,border:`1px solid ${C.gold}44`,display:"flex",alignItems:"center",gap:14}}>
          <Crown size={24} color={C.gold} style={{flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Noto Serif JP',serif",fontWeight:600,fontSize:15,color:C.gold}}>{isPremium?"Membre Premium":"Passer Premium"}</div>
            <div style={{fontSize:11,color:C.t2,marginTop:1}}>{isPremium?"Merci de ton soutien — gérer mon abonnement":"Débloque tout le contenu"}</div>
          </div>
          <ChevronRight size={20} color={C.gold}/>
        </button>

        <details style={{ marginBottom: 18, color: C.text }}>
          <summary style={{ padding: "15px 0", cursor: "pointer", fontWeight: 650 }}>Mes préférences et mon compte</summary>
        {/* Préférences — carte à séparateurs, comme ProfileScreen.tsx (bolt) */}
        <SectionTitle C={C} title="Préférences"/>
        <SectionCard C={C} style={{padding:0,marginBottom:16}}>
          <PrefRow Icon={dark?Volume2:Sparkles} label={dark?"Mode sombre":"Mode clair"} sub="Basculer le thème de l'app" control={<Switch on={dark} onClick={()=>setDark(d=>!d)}/>}/>
          <PrefRow Icon={Bell} label="Alerte streak dans l'app" sub="Bandeau sur l'accueil si la mission du jour n'est pas faite" control={<Switch on={reminders} onClick={()=>setReminders(r=>!r)}/>}/>
          <PrefRow Icon={Bell} label="Rappel quotidien" sub={supportsDailyReminder()?(reminderError==="permission_denied"?"Autorisation refusée dans les réglages du téléphone":`Chaque jour à ${String(dailyReminder.hour).padStart(2,"0")}:${String(dailyReminder.minute).padStart(2,"0")}`):"Disponible dans l’application mobile"} control={<Switch on={dailyReminder.enabled} onClick={toggleDailyReminder}/>}/>
          <PrefRow Icon={Volume2} label="Son" sub="Jingles de réussite, streak, niveau" control={<Switch on={soundOn} onClick={toggleSound}/>}/>
          <PrefRow Icon={Type} label="Affichage des kana" sub="Comment le japonais s'affiche dans l'app" last control={
            <div style={{display:"flex",gap:4}}>
              {[{id:"kana",label:"あ"},{id:"kanji",label:"漢"},{id:"romaji",label:"A"}].map(opt=>(
                <button key={opt.id} onClick={()=>setScript(opt.id)} style={{width:28,height:28,borderRadius:8,border:`1px solid ${script===opt.id?C.red:C.s3}`,background:script===opt.id?`${C.red}14`:"transparent",color:script===opt.id?C.red:C.t3,fontSize:13,fontWeight:600,cursor:"pointer"}}>{opt.label}</button>
              ))}
            </div>
          }/>
        </SectionCard>

        {/* Compte */}
        <SectionTitle C={C} title="Compte"/>
        <SectionCard C={C} style={{padding:0,marginBottom:16}}>
          <PrefRow Icon={Sparkles} label="Revoir la présentation" onClick={()=>onShowTour&&onShowTour()} control={<ChevronRight size={18} color={C.t3}/>}/>
          {session?.user && (
            <PrefRow Icon={LogOut} label="Se déconnecter" onClick={async ()=>{ if(confirm("Te déconnecter ? Tes données restent sauvegardées dans le cloud.")) await onLogout&&onLogout(); }}/>
          )}
          <PrefRow Icon={RotateCcw} label="Réinitialiser le profil" onClick={()=>{ if(confirm("Réinitialiser ton profil ? Tu repasseras par l'onboarding.")) onReset&&onReset(); }}/>
          <PrefRow Icon={Trash2} label="Supprimer mon compte" danger last onClick={()=>onDeleteAccount&&onDeleteAccount()}/>
        </SectionCard>

        <div style={{textAlign:"center",fontSize:11,color:C.t3,paddingBottom:4}}>Isekai'd v1.0.0 — Le Japon, un peu chaque jour</div>
        </details>
      </div>
    </div>
  );
  }
