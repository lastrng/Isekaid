import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

import { ProductCard, SectionHeading } from "../shared/ProductUI.jsx";
import { MemoryJournal } from "./MemoryJournal.jsx";

export function DetailHeader({ C, title, eyebrow, onBack }) {
  return <header className="my-japan-detail-header">
    <button type="button" className="my-japan-icon-button" style={{ background: C.s1, borderColor: C.border, color: C.text }} onClick={onBack} aria-label="Retour à Mon Japon"><ChevronLeft size={20}/></button>
    <div><div className="my-japan-kicker" style={{ color: C.red }}>{eyebrow}</div><h1 style={{ color: C.text }}>{title}</h1></div>
  </header>;
}

function Stat({ C, value, label }) {
  return <div className="my-japan-detail-stat" style={{ background: C.s1, borderColor: C.border }}><strong style={{ color: C.text }}>{value}</strong><span style={{ color: C.t3 }}>{label}</span></div>;
}

export function PassportPage({ C, summary, user, rank, streak, onBack, onOpenPrefectures }) {
  return <div className="my-japan-detail-page">
    <DetailHeader C={C} eyebrow="Passeport Isekaid" title="Mon passeport" onBack={onBack}/>
    <ProductCard C={C} style={{ padding: 16, background: `linear-gradient(140deg,${C.red}16,${C.s1} 64%)` }}>
      <div className="my-japan-identity">
        <div className="my-japan-avatar my-japan-avatar--large" style={{ background: C.s1, borderColor: C.border, color: C.red }}>
          {user?.photo ? <img src={user.photo} alt="" referrerPolicy="no-referrer"/> : user?.emojiAvatar || (user?.name || "V")[0].toUpperCase()}
        </div>
        <div><strong className="my-japan-name" style={{ color: C.text }}>{user?.name || "Mon Japon"}</strong><span className="my-japan-rank" style={{ color: C.t3 }}>{rank?.emoji || "🌱"} {rank?.title || "Curieux du Japon"} · {rank?.jp || "興味"}</span></div>
      </div>
      <div className="my-japan-passport-streak" style={{ color: C.red, borderTopColor: C.border }}>🔥 {streak?.count || 0} jour{(streak?.count || 0) > 1 ? "s" : ""} de série</div>
    </ProductCard>
    <SectionHeading C={C} eyebrow="Progression" title="Le Japon que je construis"/>
    <div className="my-japan-detail-grid">
      <Stat C={C} value={`${summary.discoveredPrefectures || 0}/${summary.prefectureTotal || 47}`} label="Préfectures découvertes"/>
      <Stat C={C} value={summary.visitedPrefectures ?? 0} label="Préfectures visitées"/>
      <Stat C={C} value={summary.savedPlaces || 0} label="Lieux sauvegardés"/>
      <Stat C={C} value={summary.visitedPlaces || 0} label="Lieux visités"/>
      <Stat C={C} value={summary.completedTrips || 0} label="Voyages terminés"/>
      <Stat C={C} value={`${summary.stamps?.length || 0} · ${summary.badges?.length || 0}`} label="Tampons · badges"/>
    </div>
    <button type="button" className="my-japan-primary-link my-japan-primary-link--wide" style={{ background: C.red }} onClick={onOpenPrefectures}>Voir mon Japon exploré <ChevronRight size={16}/></button>
    <p style={{ color: C.t3, fontSize: 10, lineHeight: 1.5, margin: "10px 2px 0" }}>La carte et les fiches des préfectures restent dans Découvrir. Ici, ton passeport en reflète seulement la progression personnelle.</p>
  </div>;
}

function favoriteMeta(favorite) {
  const item = favorite?.item || {};
  return {
    expr:{emoji:item.emoji||"🗣️",title:item.expression,sub:item.traduction}, expression:{emoji:item.emoji||"🗣️",title:item.expression,sub:item.traduction},
    cult:{emoji:item.emoji||"🏮",title:item.titre,sub:item.tag}, culture:{emoji:item.emoji||"🏮",title:item.titre,sub:item.tag}, history:{emoji:item.emoji||"📜",title:item.titre,sub:item.periode},
    repas:{emoji:item.emoji||"🍱",title:item.nom_jp||item.nom,sub:item.traduction}, tradition:{emoji:item.emoji||"⛩️",title:item.nom,sub:item.mois}, code:{emoji:item.emoji||"🎌",title:item.titre,sub:item.categorie},
    region:{emoji:item.emoji||"🗾",title:item.nom,sub:item.position}, prefecture:{emoji:item.flag||item.symbol||"🗾",title:item.nameFr||item.name,sub:item.nameJa||item.region},
    vie:{emoji:item.emoji||"🏙️",title:item.titre,sub:item.categorie}, lieu:{emoji:item.emoji||"📍",title:item.nom,sub:item.quartier}, place:{emoji:item.emoji||"📍",title:item.nom||item.name,sub:item.quartier},
  }[favorite?.type] || { emoji:"♥", title:item.title||item.titre||item.nom||"Élément sauvegardé", sub:"" };
}

function FavoriteRow({ C, favorite, onOpen, onRemove, last }) {
  const meta = favoriteMeta(favorite);
  return <div className="my-japan-favorite-row" style={{ borderBottom: last ? "none" : `1px solid ${C.border}` }}>
    <button type="button" className="my-japan-favorite-open" onClick={() => onOpen?.(favorite)} disabled={!onOpen} aria-label={`Ouvrir ${meta.title}`}>
      <span aria-hidden>{meta.emoji}</span><span><strong style={{ color: C.text }}>{meta.title}</strong>{meta.sub && <small style={{ color: C.t3 }}>{meta.sub}</small>}</span>
    </button>
    <button type="button" aria-label={`Retirer ${meta.title} des favoris`} onClick={event => { event.stopPropagation(); onRemove?.(favorite); }} style={{ color: C.red }}>♥</button>
    {onOpen && <ChevronRight size={15} color={C.t3}/>}
  </div>;
}

export function CollectionsPage({ C, summary, onBack, onOpenFavorite, onToggleFavorite }) {
  const firstFilled = summary.favoriteCollections?.find(collection => collection.count > 0)?.id || summary.favoriteCollections?.[0]?.id;
  const [openCollection, setOpenCollection] = useState(firstFilled || null);
  return <div className="my-japan-detail-page">
    <DetailHeader C={C} eyebrow="Ce que j’ai gardé" title="Toutes mes collections" onBack={onBack}/>
    <p className="my-japan-page-intro" style={{ color: C.t2 }}>Retrouve ici tes lieux, lectures, saveurs, préfectures et expressions favorites.</p>
    <ProductCard C={C} style={{ padding: "2px 12px" }}>
      {(summary.favoriteCollections || []).map((collection, index) => {
        const open = openCollection === collection.id;
        return <div key={collection.id} style={{ borderBottom: index < summary.favoriteCollections.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <button type="button" className="my-japan-collection-row" onClick={() => setOpenCollection(open ? null : collection.id)} style={{ color: C.text }} aria-expanded={open}>
            <span aria-hidden>{collection.emoji}</span><strong>{collection.label}</strong><b style={{ color: C.t3 }}>{collection.count}</b>{open ? <ChevronUp size={16} color={C.t3}/> : <ChevronDown size={16} color={C.t3}/>}
          </button>
          {open && <div className="my-japan-collection-content">{collection.items.length ? collection.items.map((favorite, itemIndex) => <FavoriteRow key={favorite.id || `${favorite.type}:${itemIndex}`} C={C} favorite={favorite} onOpen={onOpenFavorite} onRemove={onToggleFavorite} last={itemIndex === collection.items.length - 1}/>) : <p style={{ color: C.t3 }}>Cette collection se remplira avec tes favoris.</p>}</div>}
        </div>;
      })}
    </ProductCard>
  </div>;
}

function dateRange(trip) {
  if (!trip.startDate) return "Voyage terminé";
  const f = new Intl.DateTimeFormat("fr-FR", { day:"numeric", month:"short", year:"numeric" });
  const start = f.format(new Date(`${trip.startDate}T12:00:00`));
  return trip.endDate && trip.endDate !== trip.startDate ? `${start} – ${f.format(new Date(`${trip.endDate}T12:00:00`))}` : start;
}

export function MemoriesPage({ C, summary, onBack, onOpenTrip, getMemoryPhotoUrl, onAddMemoryPhotos, onRemoveMemoryPhoto, onUpdateMemoryPhoto, onReorderMemoryPhoto, onMemoryNote }) {
  const [selectedTripId, setSelectedTripId] = useState(summary.latestMemory?.id || null);
  const selected = summary.completedTripDetails?.find(trip => trip.id === selectedTripId) || null;
  const memories = useMemo(() => summary.memories?.filter(memory => memory.tripId === selectedTripId) || [], [summary.memories, selectedTripId]);
  return <div className="my-japan-detail-page">
    <DetailHeader C={C} eyebrow="Ce que j’ai vécu" title="Mes souvenirs" onBack={onBack}/>
    {!summary.completedTripDetails?.length ? <ProductCard C={C} style={{ padding: 16 }}><strong style={{ color: C.text }}>Ton premier souvenir apparaîtra après ton voyage.</strong><p style={{ color: C.t3, fontSize: 11, lineHeight: 1.5, marginBottom: 0 }}>Les voyages futurs et en cours restent dans l’onglet Voyage.</p></ProductCard> : <>
      <div className="my-japan-memory-list">{summary.completedTripDetails.map(trip => <button key={trip.id} type="button" onClick={() => setSelectedTripId(trip.id)} style={{ background: selectedTripId === trip.id ? `${C.red}10` : C.s1, borderColor: selectedTripId === trip.id ? `${C.red}66` : C.border, color: C.text }}>
        <span><strong>{trip.title}</strong><small style={{ color: C.t3 }}>{dateRange(trip)} · {trip.completedPlaces} lieu{trip.completedPlaces > 1 ? "x" : ""}</small></span><ChevronRight size={16} color={C.t3}/>
      </button>)}</div>
      {selected && <section>
        <SectionHeading C={C} eyebrow="Carnet" title={selected.title} detail={`${selected.notes} note${selected.notes > 1 ? "s" : ""}`}/>
        <MemoryJournal C={C} memories={memories} getPhotoUrl={getMemoryPhotoUrl} onAddPhotos={onAddMemoryPhotos} onRemovePhoto={onRemoveMemoryPhoto} onUpdatePhoto={onUpdateMemoryPhoto} onReorderPhoto={onReorderMemoryPhoto} onNote={onMemoryNote}/>
        <button type="button" className="my-japan-primary-link my-japan-primary-link--wide" style={{ background:C.red }} onClick={() => onOpenTrip?.(selected.id, "carnet")}>Exporter mon carnet PDF <ChevronRight size={15}/></button>
        <button type="button" className="my-japan-text-link my-japan-text-link--flush" style={{ color: C.red }} onClick={() => onOpenTrip?.(selected.id, "day")}>Revoir l’itinéraire <ChevronRight size={15}/></button>
      </section>}
    </>}
  </div>;
}

export function StampsPage({ C, summary, onBack }) {
  const countByType = typeId => summary.stamps?.filter(stamp => stamp.type === typeId).length || 0;
  return <div className="my-japan-detail-page">
    <DetailHeader C={C} eyebrow="Mes accomplissements" title="Mes tampons" onBack={onBack}/>
    <p className="my-japan-page-intro" style={{ color: C.t2 }}>Chaque tampon correspond à une étape réellement accomplie dans Isekaid.</p>
    {summary.stamps?.length ? <div className="my-japan-stamp-grid">{summary.stamps.map(stamp => <ProductCard C={C} key={stamp.id} style={{ padding: 12, textAlign: "center" }}><div className="my-japan-stamp" style={{ borderColor: C.red, background: `${C.red}10` }}>{stamp.emoji}</div><strong style={{ color: C.text }}>{stamp.label}</strong><small style={{ color: C.t3 }}>Débloqué</small></ProductCard>)}</div> : <ProductCard C={C} style={{ padding: 16 }}><strong style={{ color: C.text }}>Ton passeport attend son premier tampon.</strong><p style={{ color: C.t3, fontSize: 11, marginBottom: 0 }}>Il apparaîtra après une vraie étape de voyage ou d’apprentissage.</p></ProductCard>}
    <SectionHeading C={C} eyebrow="Catégories" title="Toutes les traces de ton parcours"/>
    <ProductCard C={C} style={{ padding: "2px 13px" }}>{(summary.stampTypes || []).map((type, index) => <div key={type.id} className="my-japan-simple-row" style={{ borderBottom: index < summary.stampTypes.length - 1 ? `1px solid ${C.border}` : "none", color: C.text }}><span>{type.emoji}</span><strong>{type.label}</strong><b style={{ color: C.t3 }}>{countByType(type.id)}</b></div>)}</ProductCard>
  </div>;
}

export function BadgesPage({ C, summary, onBack }) {
  return <div className="my-japan-detail-page">
    <DetailHeader C={C} eyebrow="Mes accomplissements" title="Mes badges" onBack={onBack}/>
    <p className="my-japan-page-intro" style={{ color: C.t2 }}>{summary.badges?.length || 0} badge{summary.badges?.length > 1 ? "s" : ""} sur {summary.badgeProgress?.length || 0} débloqué{summary.badges?.length > 1 ? "s" : ""}.</p>
    <div className="my-japan-badge-list">{(summary.badgeProgress || []).map(badge => <ProductCard C={C} key={badge.id} style={{ padding: 13, opacity: badge.unlocked ? 1 : .68, borderColor: badge.unlocked ? `${C.red}55` : C.border }}>
      <div className="my-japan-badge-emoji" style={{ background: badge.unlocked ? `${C.red}10` : C.s2, filter: badge.unlocked ? "none" : "grayscale(1)" }}>{badge.emoji}</div>
      <div><strong style={{ color: C.text }}>{badge.label}</strong><small style={{ color: C.t3 }}>{badge.unlocked ? "Débloqué · étape accomplie" : badge.description}</small></div>
    </ProductCard>)}</div>
  </div>;
}
