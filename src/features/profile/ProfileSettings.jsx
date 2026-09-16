import { Bell, ChevronRight, Cloud, Crown, Database, LogOut, RotateCcw, Sparkles, Trash2, Type, Volume2 } from "lucide-react";

import { ProductCard, SectionHeading } from "../shared/ProductUI.jsx";
import { TripConflicts } from "../my-japan/TripConflicts.jsx";
import { DetailHeader } from "../my-japan/MyJapanDetailPages.jsx";
import { ProgressConflicts } from "./ProgressConflicts.jsx";
import { useJapaneseDisplay } from "../../components/JapaneseDisplay.jsx";

function Switch({ C, on, onClick, label }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={event => { event.stopPropagation(); onClick?.(); }} className="my-japan-switch" style={{ background: on ? C.red : C.s3 }}><span style={{ transform: `translateX(${on ? 20 : 0}px)` }}/></button>;
}

function SettingsRow({ C, Icon, label, sub, control, onClick, danger = false, last = false }) {
  const Tag = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} onClick={onClick} className="my-japan-settings-row" style={{ borderBottom: last ? "none" : `1px solid ${C.border}`, color: danger ? C.red : C.text }}>
    <Icon size={19} color={danger ? C.red : C.t3}/>
    <span><strong>{label}</strong>{sub && <small style={{ color: C.t3 }}>{sub}</small>}</span>
    {control}
  </Tag>;
}

export function ProfileSettingsPage({ C, user, session, dark, setDark, reminders, setReminders, dailyReminder, reminderSupported, reminderError, toggleDailyReminder, soundOn, toggleSound, script, setScript, isPremium, onOpenPremium, syncStatus, onDataSync, onShowTour, onLogout, onPersonalize, onDeleteAccount, onBack }) {
  const {showRomaji,setShowRomaji}=useJapaneseDisplay();
  const syncLabel = !session?.user ? "Données conservées sur cet appareil" : syncStatus?.hasError ? "Intervention nécessaire" : syncStatus?.pending ? `${syncStatus.pending} élément${syncStatus.pending > 1 ? "s" : ""} en attente` : "Synchronisation à jour";
  return <div className="my-japan-detail-page">
    <DetailHeader C={C} eyebrow="Mon compte" title="Profil & réglages" onBack={onBack}/>
    <ProductCard C={C} style={{ padding: 14 }}>
      <div className="my-japan-identity">
        <div className="my-japan-avatar" style={{ background: C.s2, borderColor: C.border, color: C.red }}>{user?.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer"/> : user?.emojiAvatar || (user?.name || "V")[0].toUpperCase()}</div>
        <div style={{ minWidth: 0 }}><strong className="my-japan-name" style={{ color: C.text }}>{user?.name || "Mon profil"}</strong><span className="my-japan-rank" style={{ color: C.t3 }}>{session?.user?.email || "Profil conservé localement"}</span></div>
      </div>
    </ProductCard>

    <SectionHeading C={C} eyebrow="Compte" title="Abonnement et données"/>
    <ProductCard C={C} style={{ padding: 0, overflow: "hidden" }}>
      <SettingsRow C={C} Icon={Crown} label={isPremium ? "Mon abonnement Premium" : "Découvrir Premium"} sub={isPremium ? "Gérer mes avantages Isekaid" : "Voyages, tuteur et carnets avancés"} onClick={onOpenPremium} control={<ChevronRight size={18} color={C.gold}/>}/>
      <SettingsRow C={C} Icon={Database} label="Données & synchronisation" sub={syncLabel} onClick={onDataSync} control={<ChevronRight size={18} color={C.t3}/>} last/>
    </ProductCard>

    <SectionHeading C={C} eyebrow="Préférences" title="Mon expérience Isekaid"/>
    <ProductCard C={C} style={{ padding: 0, overflow: "hidden" }}>
      <SettingsRow C={C} Icon={dark ? Volume2 : Sparkles} label={dark ? "Mode sombre" : "Mode clair"} sub="Basculer le thème de l’application" control={<Switch C={C} on={dark} onClick={() => setDark(value => !value)} label="Changer de thème"/>}/>
      <SettingsRow C={C} Icon={Bell} label="Alerte streak dans l’app" sub="Rappel discret sur Aujourd’hui" control={<Switch C={C} on={reminders} onClick={() => setReminders(value => !value)} label="Activer l’alerte de streak"/>}/>
      <SettingsRow C={C} Icon={Bell} label="Rappel quotidien" sub={!reminderSupported ? "Disponible dans l’application mobile" : reminderError === "permission_denied" ? "Autorisation refusée dans les réglages du téléphone" : `Chaque jour à ${String(dailyReminder.hour).padStart(2,"0")}:${String(dailyReminder.minute).padStart(2,"0")}`} control={<Switch C={C} on={dailyReminder.enabled} onClick={toggleDailyReminder} label="Activer le rappel quotidien"/>}/>
      <SettingsRow C={C} Icon={Volume2} label="Son" sub="Jingles de réussite, streak et niveau" control={<Switch C={C} on={soundOn} onClick={toggleSound} label="Activer les sons"/>}/>
      <SettingsRow C={C} Icon={Type} label="Afficher le romaji" sub="La prononciation en lettres latines, partout où elle est disponible" control={<Switch C={C} on={showRomaji} onClick={()=>setShowRomaji(value=>!value)} label="Afficher le romaji"/>}/>
      <SettingsRow C={C} Icon={Type} label="Affichage du japonais" sub="Kana, kanji ou transcription" last control={<div className="my-japan-script-choice">{[{id:"kana",label:"あ"},{id:"kanji",label:"漢"},{id:"romaji",label:"A"}].map(option => <button type="button" key={option.id} aria-label={`Écriture ${option.id}`} aria-pressed={script === option.id} onClick={() => {setScript(option.id);if(option.id==="romaji")setShowRomaji(true);}} style={{ borderColor: script === option.id ? C.red : C.border, background: script === option.id ? `${C.red}14` : "transparent", color: script === option.id ? C.red : C.t3 }}>{option.label}</button>)}</div>}/>
    </ProductCard>

    <SectionHeading C={C} eyebrow="Isekaid" title="Aide et compte"/>
    <ProductCard C={C} style={{ padding: 0, overflow: "hidden" }}>
      <SettingsRow C={C} Icon={Sparkles} label="Rejouer l’onboarding" sub="Revoir la présentation d’Isekaid" onClick={onShowTour} control={<ChevronRight size={18} color={C.t3}/>}/>
      {session?.user && <SettingsRow C={C} Icon={LogOut} label="Se déconnecter" onClick={onLogout}/>}
      <SettingsRow C={C} Icon={RotateCcw} label="Personnaliser mon expérience" sub="Prénom, intérêts, niveau et relation au Japon" onClick={onPersonalize}/>
      <SettingsRow C={C} Icon={Trash2} label="Supprimer mon compte" danger last onClick={onDeleteAccount}/>
    </ProductCard>
    <div className="my-japan-version" style={{ color: C.t3 }}>Isekai'd v1.0.0 — Le Japon, un peu chaque jour</div>
  </div>;
}

export function DataSyncPage({ C, session, syncStatus, onSyncNow, onRestoreProgress, onBack }) {
  const connected = Boolean(session?.user);
  const status = !connected ? "Données locales" : syncStatus?.hasError ? "Synchronisation interrompue" : syncStatus?.pending ? "Synchronisation en attente" : "Sauvegarde cloud à jour";
  return <div className="my-japan-detail-page">
    <DetailHeader C={C} eyebrow="Profil & réglages" title="Données & synchronisation" onBack={onBack}/>
    <ProductCard C={C} style={{ padding: 15 }}>
      <div className="my-japan-data-status"><Cloud size={20} color={syncStatus?.hasError ? C.red : C.green}/><span><strong style={{ color: C.text }}>{status}</strong><small style={{ color: C.t3 }}>{connected ? "Tes données locales restent disponibles hors ligne." : "Connecte-toi pour activer la sauvegarde cloud."}</small></span></div>
      {connected && syncStatus?.lastSyncedAt && <p style={{ color: C.t3, fontSize: 10, margin: "10px 0 0" }}>Dernière sauvegarde : {new Date(syncStatus.lastSyncedAt).toLocaleString("fr-FR")}</p>}
      {connected && (syncStatus?.pending > 0 || syncStatus?.hasError) && <button type="button" className="my-japan-primary-link my-japan-primary-link--wide" style={{ background: C.red, marginTop: 12 }} onClick={onSyncNow}>Relancer la synchronisation</button>}
    </ProductCard>
    {connected ? <>
      <SectionHeading C={C} eyebrow="Versions récupérables" title="Copies conservées sans écrasement"/>
      <p className="my-japan-page-intro" style={{ color: C.t2 }}>Les conflits de progression ou de voyage restent ici jusqu’à ce que tu choisisses quoi restaurer.</p>
      <ProgressConflicts C={C} userId={session.user.id} onRestore={onRestoreProgress}/>
      <TripConflicts C={C} userId={session.user.id}/>
      <ProductCard C={C} style={{ padding: 14 }}><strong style={{ color: C.text, fontSize: 12 }}>Aucune version n’est supprimée automatiquement.</strong><p style={{ color: C.t3, fontSize: 10.5, lineHeight: 1.5, marginBottom: 0 }}>Si aucune copie n’apparaît ci-dessus, tes données ne nécessitent actuellement aucune intervention.</p></ProductCard>
    </> : <ProductCard C={C} style={{ padding: 14, marginTop: 14 }}><strong style={{ color: C.text }}>Mode hors ligne prêt</strong><p style={{ color: C.t3, fontSize: 11, lineHeight: 1.5, marginBottom: 0 }}>Tes collections, voyages et progressions continuent d’utiliser le stockage local existant.</p></ProductCard>}
  </div>;
}
