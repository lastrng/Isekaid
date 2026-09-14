import { useEffect, useRef, useState } from "react";

import * as sfx from "../../sfx.js";
import { popHistory, pushHistory } from "../../app/navigation/history.js";
import { MyJapanSection } from "../my-japan/MyJapanSection.jsx";
import { BadgesPage, CollectionsPage, MemoriesPage, PassportPage, StampsPage } from "../my-japan/MyJapanDetailPages.jsx";
import { useMyJapanProfile } from "../my-japan/useMyJapanProfile.js";
import { disableDailyReminder, enableDailyReminder, loadDailyReminder, supportsDailyReminder } from "../reminders/dailyReminder.js";
import { DataSyncPage, ProfileSettingsPage } from "./ProfileSettings.jsx";
import { Personalization } from "../onboarding/components/Personalization.jsx";

export function ProfileScreen({ guide, showGuide, onGuideDone, ui, C, user, dark, setDark, db, onUpdateProfile, onDeleteAccount, onLogout, onRestoreProgress, session, streak, favs, toggleFav, rank, kanaProgress, prefectureProgress, onShowTour, isPremium, onOpenPremium, script, setScript, onOpenLieu, onOpenTradition, onOpenDetail, onOpenContent, onOpenPrefecture, onOpenTrip, onOpenTravel, backRef }) {
  const { SectionIntro } = ui;
  const rootRef = useRef(null);
  const passportTourRef = useRef(null);
  const [view, setView] = useState("home");
  const viewHistoryRef = useRef([]);
  const openView = nextView => {
    viewHistoryRef.current = pushHistory(viewHistoryRef.current, view, nextView);
    setView(nextView);
  };
  const closeView = () => {
    if (view === "home") return false;
    const popped = popHistory(viewHistoryRef.current, "home");
    viewHistoryRef.current = popped.history;
    setView(popped.destination);
    return true;
  };
  const [reminders, setRemindersState] = useState(() => { try { return localStorage.getItem("isekaid_reminders_v1") !== "off"; } catch { return true; } });
  const [dailyReminder, setDailyReminder] = useState(() => loadDailyReminder());
  const [reminderError, setReminderError] = useState(null);
  const [soundOn, setSoundOnState] = useState(() => sfx.isSoundOn());

  useEffect(() => { rootRef.current?.scrollTo?.({ top: 0, behavior: "instant" }); }, [view]);
  useEffect(() => {
    if (!backRef) return;
    backRef.current = closeView;
    return () => { if (backRef.current === closeView) backRef.current = null; };
  });

  const toggleSound = () => {
    setSoundOnState(previous => {
      const next = !previous;
      sfx.setSoundOn(next);
      if (next) sfx.playTap();
      return next;
    });
  };
  const setReminders = valueOrUpdater => {
    setRemindersState(previous => {
      const next = typeof valueOrUpdater === "function" ? valueOrUpdater(previous) : valueOrUpdater;
      try { localStorage.setItem("isekaid_reminders_v1", next ? "on" : "off"); } catch {}
      return next;
    });
  };
  const toggleDailyReminder = async () => {
    setReminderError(null);
    try {
      if (dailyReminder.enabled) {
        setDailyReminder(await disableDailyReminder());
        return;
      }
      const result = await enableDailyReminder(dailyReminder);
      if (result.ok) setDailyReminder(result.settings);
      else setReminderError(result.reason);
    } catch (error) {
      console.warn("[reminder] configuration impossible:", error);
      setReminderError("error");
    }
  };

  const {
    summary: myJapan,
    getPhotoUrl: getMemoryPhotoUrl,
    addMemoryPhotos,
    removeMemoryPhoto,
    updateMemoryPhoto,
    reorderMemoryPhoto,
    changeNote: changeMemoryNote,
    retrySync: retryProfileSync,
    syncStatus: profileSyncStatus,
  } = useMyJapanProfile({ db, session, expressionProgress: user?.expressionProgress, kanaProgress, favorites: favs, prefectureProgress, streak });

  const openFavorite = favorite => {
    const item = favorite?.item;
    if (!item) return;
    if (favorite.type === "lieu" || favorite.type === "place") onOpenLieu?.(item);
    else if (favorite.type === "tradition") onOpenTradition?.(item);
    else if (favorite.type === "prefecture") onOpenPrefecture?.(item);
    else if (["code", "vie", "region"].includes(favorite.type)) onOpenDetail?.(favorite.type, item);
    else if (["culture", "cult", "repas", "history"].includes(favorite.type)) onOpenContent?.(favorite.type, item);
  };

  const goHome = closeView;
  let content;
  if (view === "passport") content = <PassportPage C={C} summary={myJapan} user={user} rank={rank} streak={streak} onBack={goHome} onOpenPrefectures={() => onOpenPrefecture?.(null)}/>;
  else if (view === "collections") content = <CollectionsPage C={C} summary={myJapan} onBack={goHome} onOpenFavorite={openFavorite} onToggleFavorite={favorite => toggleFav?.(favorite.type, favorite.item)}/>;
  else if (view === "memories") content = <MemoriesPage C={C} summary={myJapan} onBack={goHome} onOpenTrip={onOpenTrip} getMemoryPhotoUrl={getMemoryPhotoUrl} onAddMemoryPhotos={addMemoryPhotos} onRemoveMemoryPhoto={removeMemoryPhoto} onUpdateMemoryPhoto={updateMemoryPhoto} onReorderMemoryPhoto={reorderMemoryPhoto} onMemoryNote={changeMemoryNote}/>;
  else if (view === "stamps") content = <StampsPage C={C} summary={myJapan} onBack={goHome}/>;
  else if (view === "badges") content = <BadgesPage C={C} summary={myJapan} onBack={goHome}/>;
  else if (view === "settings") content = <ProfileSettingsPage C={C} user={user} session={session} dark={dark} setDark={setDark} reminders={reminders} setReminders={setReminders} dailyReminder={dailyReminder} reminderSupported={supportsDailyReminder()} reminderError={reminderError} toggleDailyReminder={toggleDailyReminder} soundOn={soundOn} toggleSound={toggleSound} script={script} setScript={setScript} isPremium={isPremium} onOpenPremium={onOpenPremium} syncStatus={session?.user ? profileSyncStatus : null} onDataSync={() => openView("data-sync")} onShowTour={() => { viewHistoryRef.current=[]; setView("home"); onShowTour?.(); }} onLogout={async () => { if (confirm("Te déconnecter ? Tes données restent sauvegardées dans le cloud.")) await onLogout?.(); }} onPersonalize={() => openView("personalization")} onDeleteAccount={onDeleteAccount} onBack={goHome}/>;
  else if (view === "data-sync") content = <DataSyncPage C={C} session={session} syncStatus={session?.user ? profileSyncStatus : null} onSyncNow={retryProfileSync} onRestoreProgress={onRestoreProgress} onBack={closeView}/>;
  else content = <MyJapanSection guideRef={passportTourRef} C={C} summary={myJapan} user={user} rank={rank} streak={streak} syncStatus={session?.user ? profileSyncStatus : null} onNavigate={openView} onOpenTravel={onOpenTravel}/>;

  if(view==="personalization")content=<Personalization user={user} onSave={onUpdateProfile} onClose={closeView}/>;
  return <div ref={rootRef} className="my-japan-screen" style={{ background: C.bg }}>
    {showGuide&&view==="home"&&SectionIntro&&<SectionIntro C={C} color={C.red} guide={guide} targetRef={passportTourRef} onDone={onGuideDone}/>}
    <div className="my-japan-screen-content">{content}</div>
  </div>;
}
