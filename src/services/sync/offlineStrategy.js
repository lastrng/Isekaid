import { readJson, writeJson } from "../../lib/storage.js";
import { buildJapanGraph, buildTripConnections, relatedToActivity } from "../../entities/content/japanGraph.js";
import { getTripLifecycleStatus, TRIP_STATUS } from "../../entities/trip/tripLifecycle.js";

export const OFFLINE_PRIORITY = Object.freeze([
  "activeTrip", "tripDays", "tripPlaces", "placeEssentials", "sos", "savedExpressions", "travelJapanese", "checklist",
]);

const OFFLINE_CONTENT_KEY = "isekaid_offline_content_v1";
const PLACE_FIELDS = ["id","villeId","cityId","nom","nom_jp","type","categorie","emoji","quartier","description","conseil","duree","budget","lat","lng","horaires","acces","prix_detail","site_web"];
const EXPRESSION_FIELDS = ["id","expression","kana","romaji","traduction","contexte","exemple_jp","exemple_fr","emoji"];

function compact(source, fields) {
  if (!source || typeof source !== "object") return null;
  return Object.fromEntries(fields.filter(field => source[field] !== undefined && source[field] !== null).map(field => [field,source[field]]));
}

function uniqueById(items) {
  const seen = new Set();
  return (items || []).filter(item => {
    const id = item?.id || item?.expression || `${item?.kind}:${item?.title}`;
    if (!id || seen.has(id)) return false;
    seen.add(id); return true;
  });
}

function tripStart(trip) {
  const time = trip?.dateDebut ? new Date(`${trip.dateDebut}T00:00:00Z`).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

/** Priorité au voyage actif, puis au prochain voyage afin qu'il soit prêt avant le départ. */
export function selectOfflineTrip(trips = [], currentDate = new Date()) {
  const candidates = (trips || []).filter(trip => trip && ![TRIP_STATUS.CANCELLED,TRIP_STATUS.COMPLETED].includes(trip.status));
  return candidates.find(trip => getTripLifecycleStatus(trip,currentDate) === TRIP_STATUS.ACTIVE)
    || candidates.filter(trip => getTripLifecycleStatus(trip,currentDate) === TRIP_STATUS.PLANNED).sort((a,b)=>tripStart(a)-tripStart(b))[0]
    || null;
}

function travelJapanese(trip, db, limit = 16) {
  if (!trip) return [];
  const graph = buildJapanGraph(db);
  const placeIds = new Set((trip.jours || []).flatMap(day => (day.activites || []).map(activity => activity.lieuId)).filter(Boolean));
  const places = (db.lieux || []).filter(place => placeIds.has(place.id));
  const nodes = [
    ...buildTripConnections(trip,graph,{limit:8}),
    ...places.flatMap(place => relatedToActivity(place,graph,{purpose:"speak",limit:5})),
  ].filter(node => ["phrase","situation","scenario"].includes(node.kind));
  return uniqueById(nodes).slice(0,limit).map(node => ({
    id:node.id, kind:node.kind, title:node.actionTitle || node.title, reason:node.reason || "Lié au voyage",
    raw:node.kind === "phrase" ? compact(node.raw,EXPRESSION_FIELDS) : {...compact(node.raw,["id","titre","title","nom_jp","emoji","contexte","description","niveau"]),phrases:(node.raw?.phrases || []).slice(0,12)},
  }));
}

/** Crée le paquet voyage minimal : aucune encyclopédie complète n'est copiée. */
export function buildTravelOfflineSnapshot({ trips = [], db = {}, favorites = [], sos = [], currentDate = new Date() } = {}) {
  const trip = selectOfflineTrip(trips,currentDate);
  const placeIds = new Set((trip?.jours || []).flatMap(day => (day.activites || []).map(activity => activity.lieuId)).filter(Boolean));
  const customPlaces = trip?.customLieux || [];
  const places = uniqueById([...(db.lieux || []).filter(place => placeIds.has(place.id)),...customPlaces.filter(place => placeIds.has(place.id))]).map(place => compact(place,PLACE_FIELDS));
  const savedExpressions = uniqueById((favorites || []).filter(favorite => ["expr","expression"].includes(favorite?.type)).map(favorite => compact(favorite.item,EXPRESSION_FIELDS)));
  return {
    trip:trip || null,
    tripStatus:trip ? getTripLifecycleStatus(trip,currentDate) : null,
    days:trip?.jours || [],
    places,
    checklist:trip?.checklist || [],
    sos:Array.isArray(sos) ? sos : [],
    savedExpressions,
    travelJapanese:travelJapanese(trip,db),
  };
}

/** Cache local des ressources critiques déjà connues, sans appel réseau. */
export function cacheCriticalOfflineData({ daily = null, travel = null, activeTrip = null, tripDays = [], savedPlaces = [], checklist = [], progress = null, sos = [], essentialPhrases = [], savedExpressions = [], travelJapanese:linkedJapanese = [], contextualContent = [] } = {}) {
  const normalizedTravel = travel || {
    trip:activeTrip,
    tripStatus:activeTrip ? TRIP_STATUS.ACTIVE : null,
    days:Array.isArray(tripDays) ? tripDays : [],
    places:Array.isArray(savedPlaces) ? savedPlaces.map(place=>compact(place,PLACE_FIELDS)) : [],
    checklist:Array.isArray(checklist) ? checklist : [],
    sos:Array.isArray(sos) ? sos : [],
    savedExpressions:Array.isArray(savedExpressions) && savedExpressions.length ? savedExpressions : (Array.isArray(essentialPhrases) ? essentialPhrases.slice(0,24) : []),
    travelJapanese:Array.isArray(linkedJapanese) && linkedJapanese.length ? linkedJapanese : (Array.isArray(contextualContent) ? contextualContent.slice(0,24) : []),
  };
  return writeJson(OFFLINE_CONTENT_KEY, { version:2, cachedAt:new Date().toISOString(), daily, travel:normalizedTravel, progress:progress && typeof progress === "object" ? progress : null });
}

export function loadCriticalOfflineData() {
  return readJson(OFFLINE_CONTENT_KEY,null);
}

export function getCachedOfflineTravel(data = loadCriticalOfflineData()) {
  const travel = data?.version >= 2 ? data.travel || {} : {
    trip:data?.activeTrip, days:data?.tripDays, places:data?.savedPlaces, checklist:data?.checklist,
    sos:data?.sos, savedExpressions:data?.essentialPhrases, travelJapanese:data?.contextualContent,
  };
  const result = {
    trip:travel.trip || null,
    status:travel.tripStatus || null,
    days:Array.isArray(travel.days) ? travel.days : [],
    places:Array.isArray(travel.places) ? travel.places : [],
    checklist:Array.isArray(travel.checklist) ? travel.checklist : [],
    sos:Array.isArray(travel.sos) ? travel.sos : [],
    savedExpressions:Array.isArray(travel.savedExpressions) ? travel.savedExpressions : [],
    travelJapanese:Array.isArray(travel.travelJapanese) ? travel.travelJapanese : [],
    cachedAt:data?.cachedAt || null,
  };
  return {...result,ready:hasTravelOfflineData(result)};
}

export function getOfflineCapabilities({ data = null, trip = null, days = [], tripPlaces = [], savedPlaces = tripPlaces, sos = [], savedExpressions = [], essentialPhrases = savedExpressions, travelJapanese = [], contextualContent = travelJapanese, progress = null } = {}) {
  const source = data ? getCachedOfflineTravel(data) : {trip,days,places:savedPlaces,sos,savedExpressions:essentialPhrases,travelJapanese:contextualContent,checklist:trip?.checklist};
  const expectedPlaceIds = new Set((source.trip?.jours || []).flatMap(day => (day.activites || []).map(activity => activity.lieuId)).filter(Boolean));
  const cachedPlaceIds = new Set((source.places || []).map(place => place?.id));
  const placeCoverage = [...expectedPlaceIds].every(id => cachedPlaceIds.has(id));
  return {
    activeTrip:Boolean(source.trip),
    tripDays:Boolean(source.trip && Array.isArray(source.days) && source.days.length === (source.trip.jours || []).length),
    tripPlaces:placeCoverage,
    savedPlaces:placeCoverage,
    placeEssentials:placeCoverage && (source.places || []).every(place => Boolean(place?.id && place?.nom)),
    checklist:Boolean(source.trip && Array.isArray(source.checklist)),
    sos:Array.isArray(source.sos) && source.sos.length > 0,
    savedExpressions:Array.isArray(source.savedExpressions),
    essentialPhrases:Array.isArray(source.savedExpressions),
    travelJapanese:Array.isArray(source.travelJapanese),
    contextualContent:Array.isArray(source.travelJapanese),
    progress:Boolean(progress && typeof progress === "object"),
  };
}

export function hasTravelOfflineData(data = loadCriticalOfflineData()) {
  const travel = data?.trip !== undefined && data?.days !== undefined ? data : getCachedOfflineTravel(data);
  const capabilities = getOfflineCapabilities({trip:travel.trip,days:travel.days,savedPlaces:travel.places,sos:travel.sos,essentialPhrases:travel.savedExpressions,contextualContent:travel.travelJapanese});
  return OFFLINE_PRIORITY.every(key => capabilities[key]);
}

export function hasCriticalOfflineData(data = loadCriticalOfflineData()) {
  if (!data) return false;
  if (data.version >= 2) return hasTravelOfflineData(data) || Boolean(data.daily?.activities?.length && data.travel?.sos?.length);
  return Boolean(data?.daily?.activities?.length && data?.sos?.length && data?.essentialPhrases?.length);
}

export function buildOfflineDatabase(snapshot = getCachedOfflineTravel()) {
  const japanese = snapshot.travelJapanese || [];
  return {
    offlineOnly:true,
    lieux:snapshot.places || [],
    villes:[], regions:[], prefectures:[], culture:[], repas:[], traditions:[], codes_sociaux:[], vie_quotidienne:[], histoire:[], wiki:[], voyages_preconcus:[],
    expressions:uniqueById([...(snapshot.savedExpressions || []),...japanese.filter(item=>item.kind==="phrase").map(item=>item.raw)]),
    situations:japanese.filter(item=>item.kind==="situation").map(item=>item.raw),
    scenarios:japanese.filter(item=>item.kind==="scenario").map(item=>item.raw),
  };
}

export function summarizeOfflineSync({ online = true, pending = 0, lastSyncedAt = null, error = false } = {}) {
  if (error) return { state:"error", label:"Synchronisation à reprendre", pending, lastSyncedAt };
  if (!online) return { state:"offline", label:pending ? `${pending} modification${pending > 1 ? "s" : ""} en attente` : "Hors connexion", pending, lastSyncedAt };
  if (pending) return { state:"pending", label:`${pending} modification${pending > 1 ? "s" : ""} à synchroniser`, pending, lastSyncedAt };
  return { state:"synced", label:lastSyncedAt ? "Données synchronisées" : "Données conservées sur cet appareil", pending:0, lastSyncedAt };
}

export { OFFLINE_CONTENT_KEY };
