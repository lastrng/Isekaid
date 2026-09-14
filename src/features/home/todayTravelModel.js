import { getCurrentTripDay, getNextActivity, getTripTiming } from "../../entities/user/japanJourneyState.js";

function activeTrips(trips) {
  return (Array.isArray(trips) ? trips : []).filter(trip => trip && trip.status !== "cancelled");
}

function placesFor(trip, db) {
  return new Map([...(db?.lieux || []), ...(trip?.customLieux || [])].filter(Boolean).map(place => [String(place.id), place]));
}

function placeFor(activity, trip, db) {
  return activity?.lieuId ? placesFor(trip, db).get(String(activity.lieuId)) || null : null;
}

function firstPlannedActivity(trip, db) {
  for (const day of trip?.jours || []) {
    const activity = getNextActivity(day);
    if (activity) return { day, activity, place: placeFor(activity, trip, db) };
  }
  return null;
}

function durationLabel(trip) {
  const count = Math.max(1, trip?.jours?.length || Number(trip?.dureeJours) || 1);
  return `${count} jour${count > 1 ? "s" : ""}`;
}

function destinationLabel(trip, day, db) {
  const city = (db?.villes || []).find(item => String(item.id) === String(day?.villeId));
  if (city?.nom) return city.nom;
  const title = String(trip?.titre || "Japon").split("·")[0].trim();
  return title || "Japon";
}

function activityTitle(item) {
  return item?.place?.nom || item?.activity?.titre || item?.activity?.nom || item?.day?.titre || "Ta prochaine étape";
}

function activityTime(activity) {
  return activity?.arrivee || activity?.heure || activity?.time || null;
}

function usefulLearningContext(item) {
  const source = `${item?.place?.nom || ""} ${item?.place?.categorie || ""} ${item?.day?.titre || ""}`.toLowerCase();
  if (/restaurant|ramen|sushi|izakaya|repas|café/.test(source)) return { label:"Commander au restaurant", scenarioId:"restaurant" };
  if (/gare|train|transport|métro|station/.test(source)) return { label:"Demander son quai", scenarioId:"train" };
  if (/ryokan|hôtel|hotel|hébergement/.test(source)) return { label:"Arriver dans un hébergement", scenarioId:"hotel" };
  return { label:"Les codes sociaux essentiels", scenarioId:"presentation" };
}

function usefulLearning(item) {
  return usefulLearningContext(item).label;
}

function contextualRecommendation(item, prefix = "À préparer") {
  return { prefix, ...usefulLearningContext(item), kind: "learning" };
}

function completedTrip(trips, currentDate) {
  return activeTrips(trips)
    .map(trip => ({ trip, timing: getTripTiming(trip, currentDate) }))
    .filter(({ trip, timing }) => trip.status === "completed" || timing?.status === "past")
    .sort((a, b) => (b.timing?.end?.valueOf() || Date.parse(b.trip.updatedAt || 0) || 0) - (a.timing?.end?.valueOf() || Date.parse(a.trip.updatedAt || 0) || 0))[0]?.trip || null;
}

/**
 * Source de vérité compacte pour le seul bloc Voyage de la page Aujourd'hui.
 * Aucun état n'est persisté ici : le modèle lit les voyages existants, y
 * compris leur cache local hors ligne, sans modifier leur schéma.
 */
export function getTodayTravelContext({ trips = [], db = {}, currentDate = new Date() } = {}) {
  const candidates = activeTrips(trips);
  const dated = candidates
    .filter(trip => trip.status !== "completed")
    .map(trip => ({ trip, timing: getTripTiming(trip, currentDate) }))
    .filter(item => item.timing);
  const active = dated.filter(item => item.timing.status === "active").sort((a, b) => b.timing.start - a.timing.start)[0];

  if (active) {
    const day = getCurrentTripDay(active.trip, currentDate) || active.trip.jours?.[active.timing.dayNumber - 1] || null;
    const activities = day?.activites || [];
    const next = getNextActivity(day);
    const nextIndex = next ? activities.indexOf(next) : -1;
    const nextItem = next ? { day, activity: next, place: placeFor(next, active.trip, db) } : null;
    const following = nextIndex >= 0 ? activities.slice(nextIndex + 1).find(activity => activity?.fait !== true) : null;
    const followingItem = following ? { day, activity: following, place: placeFor(following, active.trip, db) } : null;
    return {
      state: "active",
      eyebrow: `AUJOURD’HUI À ${destinationLabel(active.trip, day, db).toUpperCase()}`,
      title: nextItem ? activityTitle(nextItem) : "Ta journée est à jour",
      meta: nextItem ? [activityTime(next), `Jour ${day?.num || active.timing.dayNumber}`].filter(Boolean).join(" · ") : `Jour ${day?.num || active.timing.dayNumber}`,
      following: followingItem ? `${activityTime(following) ? `${activityTime(following)} · ` : ""}${activityTitle(followingItem)}` : null,
      recommendation: contextualRecommendation(nextItem, "Utile maintenant"),
      primary: { label: "Voir ma journée", kind: "trip", tripId: active.trip.id, sub: "day" },
      trip: active.trip,
    };
  }

  const upcoming = dated.filter(item => item.timing.status === "upcoming").sort((a, b) => a.timing.daysUntil - b.timing.daysUntil)[0];
  if (upcoming) {
    const nextItem = firstPlannedActivity(upcoming.trip, db);
    const destination = destinationLabel(upcoming.trip, nextItem?.day, db);
    return {
      state: "upcoming",
      eyebrow: "MON VOYAGE",
      title: `J-${upcoming.timing.daysUntil} avant ${destination}`,
      meta: `${upcoming.trip.titre || destination} · ${durationLabel(upcoming.trip)}`,
      next: nextItem ? { label: "Prochaine étape", title: activityTitle(nextItem), detail: `Jour ${nextItem.day?.num || 1}` } : null,
      recommendation: contextualRecommendation(nextItem),
      primary: { label: "Voir mon voyage", kind: "trip", tripId: upcoming.trip.id, sub: "day" },
      trip: upcoming.trip,
    };
  }

  const draft = candidates.find(trip => trip.status !== "completed" && !getTripTiming(trip, currentDate));
  if (draft) {
    const nextItem = firstPlannedActivity(draft, db);
    return {
      state: "draft",
      eyebrow: "MON VOYAGE",
      title: draft.titre || "Mon voyage au Japon",
      meta: durationLabel(draft),
      next: nextItem ? { label: "Prochaine étape", title: activityTitle(nextItem), detail: `Jour ${nextItem.day?.num || 1}` } : null,
      description: "Ajoute tes dates pour activer le compte à rebours.",
      recommendation: contextualRecommendation(nextItem),
      primary: { label: "Voir mon voyage", kind: "trip", tripId: draft.id, sub: "day" },
      trip: draft,
    };
  }

  const completed = completedTrip(candidates, currentDate);
  if (completed) {
    return {
      state: "completed",
      eyebrow: "MON VOYAGE",
      title: "Ton voyage est terminé",
      meta: completed.titre || "Ton séjour au Japon",
      description: "Garde une trace des lieux visités et des moments qui comptent.",
      primary: { label: "Compléter mon carnet", kind: "profile" },
      trip: completed,
    };
  }

  return {
    state: "none",
    eyebrow: "MON VOYAGE",
    title: "Ton Japon commence ici",
    description: "Prépare ton premier voyage.",
    primary: { label: "Créer un voyage", kind: "create" },
    trip: null,
  };
}

export function dedupeTodayTravelRecommendation(model, resumeActivity) {
  if (!model?.recommendation || !resumeActivity) return model;
  const sameScenario = model.recommendation.scenarioId && model.recommendation.scenarioId === resumeActivity.target?.scenarioId;
  const sameTitle = String(model.recommendation.label || "").toLocaleLowerCase("fr") === String(resumeActivity.title || "").toLocaleLowerCase("fr");
  return sameScenario || sameTitle ? { ...model, recommendation:null } : model;
}

export { activityTitle, durationLabel, usefulLearning };
