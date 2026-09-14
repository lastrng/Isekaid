import { getCurrentTripDay, getDailyProgress, getNextActivity, getTripTiming } from "../../entities/user/japanJourneyState.js";
import { getTripLifecycleStatus, TRIP_STATUS } from "../../entities/trip/tripLifecycle.js";
import { calculateReadinessScore } from "../readiness/readinessScore.js";

export const TRAVEL_DASHBOARD_STATE = Object.freeze({
  NO_TRIP: "NO_TRIP",
  PRE_TRIP: "PRE_TRIP",
  ACTIVE_TRIP: "ACTIVE_TRIP",
  POST_TRIP: "POST_TRIP",
});

const activityList = trip => (trip?.jours || []).flatMap(day => (day.activites || []).map(activity => ({ activity, day })));
const validTime = value => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(value || ""));

function sortableTripDate(trip) {
  const value = trip?.completedAt || trip?.dateFin || trip?.dateDebut || trip?.updatedAt || "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function selectDashboardTrip(trips, currentDate) {
  const available = (trips || []).filter(trip => trip && trip.status !== TRIP_STATUS.CANCELLED);
  const active = available.find(trip => getTripLifecycleStatus(trip,currentDate) === TRIP_STATUS.ACTIVE);
  if (active) return active;
  const planned = available
    .filter(trip => getTripLifecycleStatus(trip,currentDate) === TRIP_STATUS.PLANNED)
    .map((trip,index) => ({ trip, index, timing:getTripTiming(trip,currentDate) }))
    .sort((a,b) => {
      const aDays = a.timing?.status === "upcoming" ? a.timing.daysUntil : Number.POSITIVE_INFINITY;
      const bDays = b.timing?.status === "upcoming" ? b.timing.daysUntil : Number.POSITIVE_INFINITY;
      return aDays - bDays || sortableTripDate(b.trip) - sortableTripDate(a.trip) || a.index - b.index;
    })[0]?.trip;
  if (planned) return planned;
  return available
    .filter(trip => [TRIP_STATUS.COMPLETED,TRIP_STATUS.AWAITING_CONFIRMATION].includes(getTripLifecycleStatus(trip,currentDate)))
    .sort((a,b) => sortableTripDate(b) - sortableTripDate(a))[0] || null;
}

/**
 * Une ville peut venir du tableau historique `villes`, d'une étape, d'une
 * journée ou du lieu placé. Consolider ces sources évite le compteur « 1 ville »
 * pour un itinéraire dont les journées couvrent réellement deux destinations.
 */
export function getTripCityIds(trip, db = {}) {
  const placeById = new Map([...(db.lieux || []),...(trip?.customLieux || [])].map(place => [String(place.id),place]));
  const ids = new Set((trip?.villes || []).filter(Boolean).map(String));
  for (const step of trip?.etapes || []) if (step?.villeId) ids.add(String(step.villeId));
  for (const day of trip?.jours || []) {
    if (day?.villeId) ids.add(String(day.villeId));
    for (const activity of day?.activites || []) {
      const place = placeById.get(String(activity?.lieuId));
      const cityId = place?.villeId || place?.cityId;
      if (cityId) ids.add(String(cityId));
    }
  }
  return [...ids];
}

function getTripStats(trip, db) {
  const entries = activityList(trip);
  const placeIds = new Set(entries.map(({activity}) => activity?.lieuId || activity?.id).filter(Boolean));
  const visitedPlaceIds = new Set(entries.filter(({activity}) => activity?.fait === true).map(({activity}) => activity?.lieuId || activity?.id).filter(Boolean));
  const visitedCityIds = new Set(entries.filter(({activity}) => activity?.fait === true).map(({day}) => day?.villeId).filter(Boolean).map(String));
  const cityIds = getTripCityIds(trip,db);
  const cityById = new Map((db.villes || []).map(city => [String(city.id),city]));
  const prefectures = new Set([...visitedCityIds].map(id => cityById.get(id)?.prefectureId || cityById.get(id)?.prefecture).filter(Boolean));
  const checklist = trip?.checklist || [];
  return {
    days:trip?.jours?.length || 0,
    cityIds,
    cityNames:cityIds.map(id => cityById.get(id)?.nom || id),
    cities:cityIds.length,
    places:placeIds.size,
    visitedPlaces:visitedPlaceIds.size,
    visitedCities:visitedCityIds.size,
    visitedPrefectures:prefectures.size,
    activities:entries.length,
    checklistDone:checklist.filter(item => item?.fait === true).length,
    checklistTotal:checklist.length,
  };
}

function savedPlacesWaiting(trip, favorites = []) {
  const placed = new Set(activityList(trip).map(({activity}) => String(activity?.lieuId || "")).filter(Boolean));
  return favorites
    .filter(favorite => favorite?.type === "lieu" && favorite?.item?.id)
    .map(favorite => favorite.item)
    .filter(place => !placed.has(String(place.id)));
}

function contextualJapaneseAction(trip, db) {
  const placeById = new Map([...(db.lieux || []),...(trip?.customLieux || [])].map(place => [String(place.id),place]));
  const corpus = activityList(trip).map(({activity}) => {
    const place = placeById.get(String(activity?.lieuId));
    return `${place?.nom || ""} ${place?.categorie || ""} ${place?.type || ""} ${activity?.arrivee?.mode || ""}`;
  }).join(" ").toLowerCase();
  if (/restaurant|ramen|sushi|izakaya|repas|café|cafe/.test(corpus)) return { title:"Commander au restaurant", description:"Révise les phrases utiles pour ton itinéraire.", label:"Apprendre maintenant", target:"phrases" };
  if (/train|gare|métro|metro|shinkansen|transport/.test(corpus)) return { title:"Demander son quai", description:"Prépare les expressions utiles en gare.", label:"Voir les expressions", target:"phrases" };
  if (/ryokan|hôtel|hotel|hébergement|hebergement/.test(corpus)) return { title:"Arriver dans un hébergement", description:"Quelques phrases suffisent pour une arrivée sereine.", label:"Voir les expressions", target:"phrases" };
  if (/onsen|bain|therm/.test(corpus)) return { title:"Comprendre les règles de l’onsen", description:"Relis les usages et le vocabulaire essentiel.", label:"Me préparer", target:"phrases" };
  return null;
}

export function getTravelNextAction({ trip, db = {}, favorites = [], offlineReady = false } = {}) {
  if (!trip) return null;
  const stats = getTripStats(trip,db);
  const waiting = savedPlacesWaiting(trip,favorites);
  if (!trip.dateDebut) return { id:"add_dates", icon:"calendar", priority:1, title:"Ajoute tes dates", description:"Active le compte à rebours et le mode Japon.", label:"Ajouter mes dates", target:"summary" };
  if (!stats.cities) return { id:"add_cities", icon:"route", priority:2, title:"Définis tes étapes", description:"Choisis les villes qui structureront ton séjour.", label:"Ajouter une ville", target:"summary" };
  if (waiting.length) return { id:"place_saved", icon:"pin", priority:3, title:`${waiting.length} lieu${waiting.length > 1 ? "x" : ""} attend${waiting.length > 1 ? "ent" : ""} d’être placé${waiting.length > 1 ? "s" : ""}`, description:"Ajoute tes favoris à une journée de l’itinéraire.", label:"Placer mes lieux", target:"kept" };
  if (!stats.days || !stats.activities) return { id:"organize_days", icon:"day", priority:4, title:"Organise tes journées", description:"Place une première activité dans ton programme.", label:"Organiser mon séjour", target:"day" };
  const emptyDay = (trip.jours || []).find(day => !(day.activites || []).length);
  if (emptyDay) return { id:"complete_day", icon:"day", priority:5, title:`Complète le jour ${emptyDay.num || (trip.jours.indexOf(emptyDay) + 1)}`, description:"Cette journée n’a encore aucune étape.", label:"Organiser cette journée", target:"day" };
  if (stats.checklistTotal && stats.checklistDone < stats.checklistTotal) {
    const remaining = stats.checklistTotal - stats.checklistDone;
    return { id:"checklist", icon:"check", priority:6, title:`${remaining} préparatif${remaining > 1 ? "s" : ""} à vérifier`, description:"Avance sur l’essentiel avant le départ.", label:"Ouvrir la checklist", target:"checklist" };
  }
  const japanese = contextualJapaneseAction(trip,db);
  if (japanese) return { id:"travel_japanese", icon:"book", priority:7, ...japanese };
  if (!offlineReady) return { id:"practical", icon:"info", priority:8, title:"Relis les infos pratiques", description:"Transports, usages et repères utiles avant le départ.", label:"Voir les infos pratiques", target:"practical" };
  return { id:"review", icon:"route", priority:9, title:"Ton voyage est prêt à être relu", description:"Vérifie une dernière fois l’ordre des étapes.", label:"Revoir mon itinéraire", target:"summary" };
}

function minutesUntilActivity(activity, currentDate) {
  const time = activity?.heure || activity?.time;
  if (!validTime(time)) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone:"Asia/Tokyo", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).formatToParts(currentDate).map(part => [part.type,part.value]));
  const [hour,minute] = time.split(":").map(Number);
  const diff = hour * 60 + minute - (Number(parts.hour) * 60 + Number(parts.minute));
  return diff >= 0 ? diff : null;
}

function activeTripDetails(trip, db, currentDate) {
  const day = getCurrentTripDay(trip,currentDate);
  const places = new Map([...(db.lieux || []),...(trip?.customLieux || [])].map(place => [String(place.id),place]));
  const remaining = (day?.activites || []).filter(activity => activity?.fait !== true);
  const template = (db.voyages_preconcus || []).find(item => String(item.id) === String(trip.source));
  const templateDay = (template?.jours || []).find(item => Number(item.num) === Number(day?.num));
  const enrich = activity => {
    if (!activity) return null;
    const sourceStep = (templateDay?.etapes || []).find(item => String(item.lieuId) === String(activity.lieuId));
    const place = places.get(String(activity.lieuId));
    return { ...activity, place, title:place?.nom || activity.note || "Étape du jour", time:activity.heure || activity.time || sourceStep?.heure || "" };
  };
  const next = enrich(getNextActivity(day));
  return {
    day,
    progress:getDailyProgress(day),
    next,
    following:remaining.slice(next ? 1 : 0, next ? 3 : 2).map(enrich),
    minutesUntil:minutesUntilActivity(next,currentDate),
    city:(db.villes || []).find(city => String(city.id) === String(day?.villeId)) || null,
    dateLabel:new Intl.DateTimeFormat("fr-FR", { weekday:"long", day:"numeric", month:"long", timeZone:"Asia/Tokyo" }).format(currentDate),
  };
}

export function getTravelContext({ trips = [], db = {}, favorites = [], currentDate = new Date(), offlineSnapshot = null, readiness = {} } = {}) {
  const trip = selectDashboardTrip(trips,currentDate);
  if (!trip) return { state:TRAVEL_DASHBOARD_STATE.NO_TRIP, trip:null, otherTrips:trips.filter(Boolean), offlineReady:false };
  const lifecycle = getTripLifecycleStatus(trip,currentDate);
  const state = lifecycle === TRIP_STATUS.ACTIVE ? TRAVEL_DASHBOARD_STATE.ACTIVE_TRIP
    : lifecycle === TRIP_STATUS.PLANNED ? TRAVEL_DASHBOARD_STATE.PRE_TRIP
    : TRAVEL_DASHBOARD_STATE.POST_TRIP;
  const timing = getTripTiming(trip,currentDate);
  const stats = getTripStats(trip,db);
  // La formule existante reste la source de vérité ; seul l'ancien tableau de
  // villes potentiellement incomplet est normalisé avec les données observées.
  const score = calculateReadinessScore({ trip:{...trip,villes:stats.cityIds}, ...readiness });
  const offlineReady = Boolean(offlineSnapshot?.ready && String(offlineSnapshot?.trip?.id) === String(trip.id));
  return {
    state, trip, lifecycle, timing, stats, progress:score.global, progressEvidence:score.evidence,
    nextAction:state === TRAVEL_DASHBOARD_STATE.PRE_TRIP ? getTravelNextAction({trip,db,favorites,offlineReady}) : null,
    active:state === TRAVEL_DASHBOARD_STATE.ACTIVE_TRIP ? activeTripDetails(trip,db,currentDate) : null,
    otherTrips:trips.filter(item => item && String(item.id) !== String(trip.id)),
    offlineReady,
  };
}
