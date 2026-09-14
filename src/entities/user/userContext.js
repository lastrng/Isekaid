import { currentSeasonKey } from "../../lib/seasons.js";
import { getTripLifecycleStatus, TRIP_STATUS } from "../trip/tripLifecycle.js";
import { buildJapanGraph, buildTripConnections, graphThemes } from "../content/japanGraph.js";

export const USER_CONTEXT_VERSION = 1;

const LEVELS = ["beginner", "intermediate", "advanced"];
const LEVEL_ALIASES = {
  debutant: "beginner", débutant: "beginner", beginner: "beginner", novice: "beginner",
  intermediaire: "intermediate", intermédiaire: "intermediate", intermediate: "intermediate",
  avance: "advanced", avancé: "advanced", advanced: "advanced",
};
const INTEREST_THEMES = {
  gastro: ["food"], gastronomie: ["food"], food: ["food"],
  langue: ["language"], japonais: ["language"], learn: ["language"],
  culture: ["culture", "shrine", "temple"], imm: ["culture", "shrine", "temple"],
  anime: ["pop"], manga: ["pop"], pop: ["pop"],
  voyage: ["travel", "transport"], travel: ["travel", "transport"],
  lifestyle: ["daily", "onsen", "shopping"], live: ["daily", "language"],
  nature: ["nature", "sakura"], histoire: ["history"], history: ["history"],
};
const KIND_THEMES = {
  food: ["food"], specialty: ["food"], phrase: ["language"], situation: ["language"], scenario: ["language"],
  tradition: ["culture"], culture: ["culture"], history: ["history"], daily: ["daily"], code: ["daily"],
  place: ["travel"], city: ["travel"], region: ["travel"],
};
const DISCOVERY_KINDS = new Set(["culture", "food", "tradition", "code", "daily", "history", "place", "region"]);
const LEARNING_KINDS = new Set(["phrase", "situation", "scenario"]);
const READING_KIND = { culture:"culture", food:"repas", tradition:"tradition", code:"code", daily:"vie", history:"history", place:"lieu", region:"region" };
const EMOJI = { culture:"🎋",food:"🍜",tradition:"⛩️",code:"👥",daily:"🏙️",history:"📜",place:"📍",region:"🗾",phrase:"💬",situation:"🗣️",scenario:"🎭",specialty:"🍱" };

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const unique = values => [...new Set((values || []).filter(Boolean))];

function stableHash(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function sourceIdentity(item = {}) {
  return item.id || item.slug || item.expression || item.titre || item.nom || item.nom_jp || null;
}

function normalizedLevel(value) {
  return LEVEL_ALIASES[normalize(value)] || "beginner";
}

function kanaMastery(kanaProgress = {}) {
  return Object.values(kanaProgress || {}).filter(entry => (entry?.level || 0) >= 3 || entry?.mastered === true).length;
}

function tripDate(trip) {
  const value = trip?.dateDebut || trip?.date_debut || trip?.startDate;
  const time = value ? new Date(`${value}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function resolveTrips(trips, currentDate) {
  const usable = (trips || []).filter(Boolean);
  const activeTrip = usable.find(trip => getTripLifecycleStatus(trip, currentDate) === TRIP_STATUS.ACTIVE) || null;
  const nextTrip = usable
    .filter(trip => getTripLifecycleStatus(trip, currentDate) === TRIP_STATUS.PLANNED)
    .sort((a, b) => tripDate(a) - tripDate(b) || String(a.id || "").localeCompare(String(b.id || "")))[0] || null;
  return { activeTrip, nextTrip, anchorTrip: activeTrip || nextTrip };
}

/**
 * Construit le snapshot local partagé par Aujourd'hui, Apprendre, Découvrir et Voyage.
 * Cette fonction est pure : elle ne lit ni stockage, ni réseau, et ne déclenche aucun appel IA.
 */
export function getUserContext({
  user = {}, favorites = [], readingProgress = null, kanaProgress = {}, scenarioProgress = {},
  pathProgress = {}, prefectureProgress = null, trips = [], db = {}, streak = null, currentDate = new Date(),
} = {}) {
  const date = currentDate instanceof Date ? currentDate : new Date(currentDate);
  const safeDate = Number.isNaN(date.valueOf()) ? new Date() : date;
  const { activeTrip, nextTrip, anchorTrip } = resolveTrips(trips, safeDate);
  const cityIds = unique([
    ...(anchorTrip?.villes || []),
    ...(anchorTrip?.jours || []).map(day => day.villeId),
  ]);
  const placeIds = unique((anchorTrip?.jours || []).flatMap(day => (day.activites || []).map(activity => activity.lieuId)));
  const plannedPrefectureIds = unique((anchorTrip?.plannedPrefectures || []).map(item => item.prefectureId));
  const cityById = new Map((db.villes || []).map(city => [city.id, city]));
  const placeById = new Map((db.lieux || []).map(place => [place.id, place]));
  const regionIds = unique([
    ...cityIds.map(id => cityById.get(id)?.region || cityById.get(id)?.regionId),
    ...placeIds.map(id => placeById.get(id)?.regionId || cityById.get(placeById.get(id)?.villeId)?.region),
  ]);
  const tripThemeIds = unique([
    ...placeIds.flatMap(id => graphThemes(placeById.get(id) || {})),
    ...(anchorTrip?.jours || []).flatMap(day => (day.activites || []).flatMap(activity => graphThemes(activity))),
    ...graphThemes({ description:[
      ...(anchorTrip?.transportSegments || []).map(segment => segment.mode || segment.type),
      ...(anchorTrip?.jours || []).flatMap(day => [day.transport, ...(day.activites || []).map(activity => activity.transport || activity.arrivee?.mode)]),
    ].filter(Boolean).join(" ") }),
  ]);
  const favoriteIds = unique(favorites.map(favorite => {
    const id = sourceIdentity(favorite?.item || {});
    return id ? `${favorite.type}:${id}` : null;
  }));
  const favoriteKinds = unique(favorites.map(favorite => favorite?.type));
  const favoriteThemeIds = unique(favorites.flatMap(favorite => graphThemes(favorite?.item || {})));
  const viewedContentIds = Object.keys(readingProgress?.read || {}).sort();
  const interests = unique([...(user?.why || []), ...(user?.interests || [])].map(normalize));
  const interestThemeIds = unique([
    ...interests.flatMap(interest => INTEREST_THEMES[interest] || [interest]),
    ...(INTEREST_THEMES[normalize(user?.goal)] || []),
  ]);
  const discoveredPrefectureIds = Object.entries(prefectureProgress?.entries || {}).filter(([,entry]) => entry?.discovered).map(([id]) => id);
  const visitedPrefectureIds = Object.entries(prefectureProgress?.entries || {}).filter(([,entry]) => entry?.visited).map(([id]) => id);
  const level = normalizedLevel(user?.level);
  const completedScenarioIds = unique(scenarioProgress?.done || scenarioProgress?.completed || []);
  const completedPathStepIds = unique(pathProgress?.completed || []);
  const progress = {
    masteredKana: kanaMastery(kanaProgress),
    completedScenarioIds,
    completedPathStepIds,
    discoveredPrefectureIds,
    visitedPrefectureIds,
    viewedCount: viewedContentIds.length,
  };
  const season = currentSeasonKey(safeDate);
  const streakCount = Number(streak?.count ?? streak?.current ?? 0) || 0;
  const fingerprint = JSON.stringify({ interests, interestThemeIds, favoriteIds:[...favoriteIds].sort(), viewedContentIds, level, season, streakCount, cityIds, regionIds, placeIds, tripThemeIds, completedScenarioIds, completedPathStepIds });
  return {
    version: USER_CONTEXT_VERSION,
    generatedFor: safeDate.toISOString().slice(0, 10),
    interests,
    goal: user?.goal || null,
    interestThemeIds,
    favorites: { ids:favoriteIds, kinds:favoriteKinds, themeIds:favoriteThemeIds },
    viewedContentIds,
    progress,
    japaneseLevel: { id:level, index:LEVELS.indexOf(level) },
    season,
    streak: { current:streakCount, best:Number(streak?.best || streakCount) || 0 },
    trip: { activeTrip, nextTrip, anchorTrip, cityIds, regionIds, placeIds, plannedPrefectureIds, themeIds:tripThemeIds },
    fingerprint,
  };
}

function readingId(node) {
  const kind = READING_KIND[node.kind];
  const id = sourceIdentity(node.raw);
  return kind && id ? `${kind}:${id}` : null;
}

function nodeLevel(node) {
  return normalizedLevel(node.raw?.niveau || node.raw?.level || "beginner");
}

function rankNodes(nodes, context, { dateKey = context?.generatedFor || "today", purpose = "discovery" } = {}) {
  const viewed = new Set(context?.viewedContentIds || []);
  const favoriteIds = new Set(context?.favorites?.ids || []);
  const interestThemes = new Set(context?.interestThemeIds || []);
  const favoriteThemes = new Set(context?.favorites?.themeIds || []);
  const tripCities = new Set(context?.trip?.cityIds || []);
  const tripRegions = new Set((context?.trip?.regionIds || []).map(normalize));
  const tripPlaces = new Set(context?.trip?.placeIds || []);
  const tripThemes = new Set(context?.trip?.themeIds || []);
  const completedScenarios = new Set(context?.progress?.completedScenarioIds || []);
  return nodes.map(node => {
    let score = 0;
    const reasons = [];
    const themes = unique([...(node.themeIds || []), ...(KIND_THEMES[node.kind] || [])]);
    const sharedInterests = themes.filter(theme => interestThemes.has(theme));
    const sharedFavorites = themes.filter(theme => favoriteThemes.has(theme));
    const sharedTripThemes = themes.filter(theme => tripThemes.has(theme));
    if (sharedInterests.length) { score += sharedInterests.length * 9; reasons.push("Tes centres d’intérêt"); }
    if (sharedFavorites.length) { score += sharedFavorites.length * 6; reasons.push("Proche de tes favoris"); }
    if (sharedTripThemes.length) { score += sharedTripThemes.length * 11; reasons.push("Utile pour ton itinéraire"); }
    if (favoriteIds.has(`${READING_KIND[node.kind] || node.kind}:${sourceIdentity(node.raw)}`)) { score += 8; reasons.push("Dans tes favoris"); }
    if (tripPlaces.has(node.sourceId)) { score += 28; reasons.push("Dans ton voyage"); }
    else if (node.cityId && tripCities.has(node.cityId)) { score += 20; reasons.push("Dans une ville de ton voyage"); }
    else if (node.regionId && tripRegions.has(normalize(node.regionId))) { score += 14; reasons.push("Dans une région de ton voyage"); }
    const nodeSeason = normalize(node.raw?.saison_ideale || node.raw?.saison || node.raw?.season);
    if (nodeSeason && nodeSeason === normalize(context?.season)) { score += 10; reasons.push("De saison"); }
    const id = readingId(node);
    if (id && !viewed.has(id)) score += 7;
    if (id && viewed.has(id)) score -= 24;
    if (LEARNING_KINDS.has(node.kind)) {
      const distance = Math.abs(LEVELS.indexOf(nodeLevel(node)) - (context?.japaneseLevel?.index || 0));
      score += Math.max(0, 7 - distance * 4);
      if (["scenario", "situation"].includes(node.kind) && completedScenarios.has(node.sourceId)) score -= 22;
      if ((context?.streak?.current || 0) <= 2 && nodeLevel(node) === "beginner") score += 3;
      if ((context?.streak?.current || 0) >= 14 && nodeLevel(node) !== "beginner") score += 3;
    }
    if (purpose === "travel" && context?.trip?.anchorTrip && (node.target?.pillar === "learn" || ["code", "daily", "place", "specialty"].includes(node.kind))) score += 4;
    const tieBreak = stableHash(`${dateKey}:${context?.fingerprint || "guest"}:${node.id}`) / 0xffffffff;
    return { ...node, score, reasons:unique(reasons), reason:reasons[0] || "À découvrir", emoji:node.raw?.emoji || EMOJI[node.kind] || "✨", tieBreak };
  }).sort((a, b) => b.score - a.score || b.tieBreak - a.tieBreak || a.id.localeCompare(b.id));
}

function graphFor(db, context) {
  const trips = unique([context?.trip?.activeTrip, context?.trip?.nextTrip, context?.trip?.anchorTrip]).filter(Boolean);
  return buildJapanGraph(db, { trips });
}

export function getRecommendedDiscovery({ context, db = {}, limit = 8, date = context?.generatedFor } = {}) {
  const nodes = graphFor(db, context).filter(node => DISCOVERY_KINDS.has(node.kind) && node.target);
  return rankNodes(nodes, context, { dateKey:String(date || "today"), purpose:"discovery" }).slice(0, limit);
}

export function getRecommendedLearning({ context, db = {}, limit = 4, date = context?.generatedFor } = {}) {
  const nodes = graphFor(db, context).filter(node => LEARNING_KINDS.has(node.kind) && node.target);
  return rankNodes(nodes, context, { dateKey:String(date || "today"), purpose:"learning" }).slice(0, limit);
}

export function getTravelRelatedContent({ context, db = {}, limit = 4, date = context?.generatedFor } = {}) {
  const graph = graphFor(db, context);
  const trip = context?.trip?.anchorTrip;
  if (!trip) return [];
  const bridge = buildTripConnections(trip, graph, { limit });
  const bridgeIds = new Set(bridge.map(item => item.id));
  const contextual = rankNodes(graph.filter(node => node.target && !["trip", "memory"].includes(node.kind) && !bridgeIds.has(node.id)), context, { dateKey:String(date || "today"), purpose:"travel" });
  return [...bridge, ...contextual].filter((item, index, items) => items.findIndex(other => other.id === item.id) === index).slice(0, limit);
}

export function getDailyContent({ context, db = {}, date = context?.generatedFor, discoveryLimit = 1, learningLimit = 1, travelLimit = 1 } = {}) {
  const dateKey = String(date || "today");
  const learningPool = getRecommendedLearning({ context, db, limit:Math.max(learningLimit, 8), date:dateKey });
  const dailyLearning = [...learningPool.filter(item => item.kind === "phrase"), ...learningPool.filter(item => item.kind !== "phrase")].slice(0, learningLimit);
  return {
    date: dateKey,
    discovery: getRecommendedDiscovery({ context, db, limit:discoveryLimit, date:dateKey }),
    learning: dailyLearning,
    travel: getTravelRelatedContent({ context, db, limit:travelLimit, date:dateKey }),
  };
}
