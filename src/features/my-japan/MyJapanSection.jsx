import { AlertTriangle, ChevronRight, Settings } from "lucide-react";

import { ProductCard, SectionHeading } from "../shared/ProductUI.jsx";

function ActionRow({ C, children, detail, onClick, icon, last = false }) {
  return <button type="button" onClick={onClick} className="my-japan-action-row" style={{ borderBottom: last ? "none" : `1px solid ${C.border}`, color: C.text }}>
    <span className="my-japan-action-icon" aria-hidden>{icon}</span>
    <span style={{ flex: 1, minWidth: 0 }}>
      <strong>{children}</strong>
      {detail && <small style={{ color: C.t3 }}>{detail}</small>}
    </span>
    <ChevronRight size={17} color={C.t3}/>
  </button>;
}

function formatTripDates(trip) {
  if (!trip?.startDate) return "Voyage terminé";
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const start = formatter.format(new Date(`${trip.startDate}T12:00:00`));
  if (!trip.endDate || trip.endDate === trip.startDate) return start;
  return `${start} – ${formatter.format(new Date(`${trip.endDate}T12:00:00`))}`;
}

export function MyJapanHeader({ C, onSettings }) {
  return <header className="my-japan-header">
    <div>
      <div className="my-japan-kicker" style={{ color: C.red }}>私の日本</div>
      <h1 style={{ color: C.text }}>Mon Japon</h1>
    </div>
    <button type="button" className="my-japan-icon-button" style={{ background: C.s1, borderColor: C.border, color: C.text }} onClick={onSettings} aria-label="Ouvrir Profil et réglages">
      <Settings size={20}/>
    </button>
  </header>;
}

function PassportSummary({ C, summary, user, rank, streak, onOpen }) {
  const stats = [
    [`${summary.visitedPrefectures || 0}/${summary.prefectureTotal || 47}`, "Préfectures visitées"],
    [summary.savedPlaces || 0, "Lieux"],
    [summary.completedTrips || 0, "Voyages"],
  ];
  return <ProductCard C={C} className="my-japan-passport" style={{ padding: 0, overflow: "hidden", background: `linear-gradient(145deg,${C.s1},${C.s2})` }}>
    <div className="my-japan-passport-top" style={{ background: `linear-gradient(135deg,${C.red}18,transparent 68%)`, borderBottomColor: C.border }}>
      <div className="my-japan-kicker" style={{ color: C.red }}>PASSEPORT ISEKAI'D</div>
      <div className="my-japan-identity">
        <div className="my-japan-avatar" style={{ background: C.s1, borderColor: C.border, color: C.red }}>
          {user?.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer"/> : user?.emojiAvatar || (user?.name || "V")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong className="my-japan-name" style={{ color: C.text }}>{user?.name || "Mon Japon"}</strong>
          <span className="my-japan-rank" style={{ color: C.t3 }}>{rank?.emoji || "🌱"} {rank?.title || "Curieux du Japon"}</span>
        </div>
        <div className="my-japan-streak" style={{ background: `${C.red}10`, color: C.red }} aria-label={`${streak?.count || 0} jours de série`}>
          🔥 <strong>{streak?.count || 0}</strong> j
        </div>
      </div>
    </div>
    <div className="my-japan-passport-stats">
      {stats.map(([value, label]) => <div key={label}><strong style={{ color: C.text }}>{value}</strong><small style={{ color: C.t3 }}>{label}</small></div>)}
    </div>
    <button type="button" className="my-japan-card-link" style={{ color: C.red, borderTopColor: C.border }} onClick={onOpen}>Voir mon passeport <ChevronRight size={15}/></button>
  </ProductCard>;
}

function CollectionsSummary({ C, summary, onOpen }) {
  return <section>
    <SectionHeading C={C} eyebrow="Mes collections" title="Ce que j’ai gardé"/>
    <div className="my-japan-collection-grid">
      {(summary.dashboardCollections || []).map(collection => <button key={collection.id} type="button" onClick={onOpen} style={{ background: C.s1, borderColor: C.border, color: C.text }}>
        <span aria-hidden>{collection.emoji}</span><strong>{collection.label}</strong><b style={{ color: collection.count ? C.red : C.t3 }}>{collection.count}</b>
      </button>)}
    </div>
    <button type="button" className="my-japan-text-link" style={{ color: C.red }} onClick={onOpen}>Voir toutes mes collections <ChevronRight size={15}/></button>
  </section>;
}

function MemoriesSummary({ C, summary, onOpen, onOpenTravel }) {
  const memory = summary.latestMemory;
  return <section>
    <SectionHeading C={C} eyebrow="Mes souvenirs" title={memory ? "Mon histoire au Japon" : "La suite de mon histoire"}/>
    {memory ? <ProductCard C={C} style={{ padding: 15 }}>
      <div className="my-japan-memory-title" style={{ color: C.text }}>{memory.title}</div>
      <div className="my-japan-memory-date" style={{ color: C.t3 }}>{formatTripDates(memory)}</div>
      <div className="my-japan-memory-meta" style={{ color: C.t2 }}>
        <span>{memory.completedPlaces} lieu{memory.completedPlaces > 1 ? "x" : ""} visité{memory.completedPlaces > 1 ? "s" : ""}</span>
        <span>{memory.visitedPrefectures || 0} préfecture{memory.visitedPrefectures > 1 ? "s" : ""}</span>
        <span>{memory.daysInJapan || memory.days || 0} jour{(memory.daysInJapan || memory.days) > 1 ? "s" : ""}</span>
      </div>
      <button type="button" className="my-japan-primary-link" style={{ background: C.red }} onClick={onOpen}>Voir mon carnet <ChevronRight size={15}/></button>
    </ProductCard> : <ProductCard C={C} style={{ padding: 15 }}>
      <strong style={{ color: C.text, fontSize: 13 }}>Ton histoire au Japon commencera ici.</strong>
      <p style={{ color: C.t2, fontSize: 11, lineHeight: 1.55, margin: "6px 0 12px" }}>Après ton premier voyage, retrouve ton itinéraire, tes lieux visités et ton carnet.</p>
      <button type="button" className="my-japan-text-link my-japan-text-link--flush" style={{ color: C.red }} onClick={onOpenTravel}>Voir mon voyage <ChevronRight size={15}/></button>
    </ProductCard>}
  </section>;
}

function AchievementsSummary({ C, summary, onStamps, onBadges }) {
  const next = summary.nextBadge;
  return <section>
    <SectionHeading C={C} eyebrow="Mes accomplissements" title="Les étapes qui comptent"/>
    <ProductCard C={C} style={{ padding: "0 13px" }}>
      <ActionRow C={C} icon="🔴" detail="Tampons de voyage et d’apprentissage" onClick={onStamps}>Tampons <b style={{ color: C.t3 }}>{summary.stamps?.length || 0}</b></ActionRow>
      <ActionRow C={C} icon="🏅" detail={next ? `Prochain : ${next.label}` : "Tous les badges sont débloqués"} onClick={onBadges} last>Badges <b style={{ color: C.t3 }}>{summary.badges?.length || 0}/{summary.badgeProgress?.length || 0}</b></ActionRow>
    </ProductCard>
  </section>;
}

export function MyJapanSection({ C, summary, user, rank, streak, collectionsRef, guideRef, syncStatus, onNavigate, onOpenTravel }) {
  const needsSync = Boolean(syncStatus?.hasError || syncStatus?.pending);
  return <section aria-label="Ce que j’ai gardé, vécu et accompli" className="my-japan-dashboard">
    <MyJapanHeader C={C} onSettings={() => onNavigate("settings")}/>
    {needsSync && <button type="button" className="my-japan-sync-alert" style={{ background: `${C.gold}12`, borderColor: `${C.gold}55`, color: C.text }} onClick={() => onNavigate("data-sync")}>
      <AlertTriangle size={17} color={C.gold}/><span><strong>{syncStatus.hasError ? "Synchronisation nécessaire" : "Synchronisation en attente"}</strong><small style={{ color: C.t3 }}>Résoudre dans Données & synchronisation</small></span><ChevronRight size={16} color={C.t3}/>
    </button>}
    <div ref={guideRef}><PassportSummary C={C} summary={summary} user={user} rank={rank} streak={streak} onOpen={() => onNavigate("passport")}/></div>
    <div ref={collectionsRef}><CollectionsSummary C={C} summary={summary} onOpen={() => onNavigate("collections")}/></div>
    <MemoriesSummary C={C} summary={summary} onOpen={() => onNavigate("memories")} onOpenTravel={onOpenTravel}/>
    <AchievementsSummary C={C} summary={summary} onStamps={() => onNavigate("stamps")} onBadges={() => onNavigate("badges")}/>
  </section>;
}
