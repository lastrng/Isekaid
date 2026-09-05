import { dayKey } from "../progress/streak.js";
import { readJson, writeJson } from "../../lib/storage.js";

const DAILY_KEY = "isekaid_daily_ritual_v1";

function hash(value) {
  let result = 2166136261;
  for (const char of String(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function pick(items, seed, offset = 0) {
  if (!items.length) return null;
  return items[(hash(`${seed}:${offset}`) % items.length + items.length) % items.length];
}

function contentItems(db = {}) {
  const culture = (db.culture || []).map((item, index) => ({
    id: item.id || `culture-${index}`,
    type: "culture",
    label: item.tag || "Culture",
    title: item.titre || "Une histoire du Japon",
    summary: item.insight || item.contenu || "Une découverte japonaise en quelques minutes.",
    raw: item,
  }));
  const expressions = (db.expressions || []).map((item, index) => ({
    id: item.id || `expression-${index}`,
    type: "expression",
    label: "Japonais",
    title: item.expression || item.romaji || "Expression utile",
    summary: item.traduction || item.contexte || "Une expression à garder avec soi.",
    raw: item,
  }));
  const situations = (db.situations || db.scenarios || []).map((item, index) => ({
    id: item.id || `situation-${index}`,
    type: "situation",
    label: "Situation réelle",
    title: item.titre || item.title || item.nom || "Une situation du quotidien",
    summary: item.description || item.contexte || item.subtitle || "Un entraînement pratique pour le Japon.",
    raw: item,
  }));
  const food = (db.repas || []).map((item, index) => ({
    id: item.id || `repas-${index}`,
    type: "gastronomie",
    label: "Gastronomie",
    title: item.romaji || item.nom_jp || "Une saveur japonaise",
    summary: item.description || item.fun_fact || "Une découverte gourmande du Japon.",
    raw: item,
  }));
  return { culture, expressions, situations, food };
}

function placeItem(place, index, seasonal = false) {
  return {
    id: place.id || `place-${index}`,
    type: "place",
    label: seasonal ? "Saison japonaise" : "Dans ton voyage",
    title: place.nom || "Un lieu à découvrir",
    summary: place.description || place.quartier || "Une étape à relier à ton itinéraire.",
    raw: place,
  };
}

export function buildDailyRitual({ db = {}, date = new Date(), travelContext = null } = {}) {
  const dateKey = typeof date === "string" ? date : dayKey(date);
  const pools = contentItems(db);
  const travelPlaces = (travelContext?.relatedPlaces || []).map((place, index) => placeItem(place, index, false));
  const seasonalPlaces = (travelContext?.seasonalPlaces || []).map((place, index) => placeItem(place, index, true));
  const culturePool = travelPlaces.length ? travelPlaces : seasonalPlaces.length ? seasonalPlaces : pools.culture;
  const discover = pick(culturePool.length ? culturePool : pools.food, dateKey, 1);
  const learn = pick(pools.expressions, dateKey, 2);
  const practice = pick(pools.situations.length ? pools.situations : [...pools.food, ...pools.culture], dateKey, 3);
  const activities = [discover, learn, practice].filter(Boolean).map((item, index) => ({
    ...item,
    id: `${dateKey}:${item.type}:${item.id}:${index}`,
    kind: index === 0 ? "discover" : index === 1 ? "learn" : "practice",
    done: false,
  }));
  return { version: 1, date: dateKey, activities, completedAt: null };
}

export function loadDailyRitual({ db = {}, date = new Date(), travelContext = null } = {}) {
  const dateKey = typeof date === "string" ? date : dayKey(date);
  const saved = readJson(DAILY_KEY, null);
  const pools = contentItems(db);
  const hasContent = Object.values(pools).some(items => items.length > 0);
  if (saved?.date === dateKey && Array.isArray(saved.activities) && (saved.activities.length > 0 || !hasContent)) return saved;
  const next = buildDailyRitual({ db, date: dateKey, travelContext });
  if (hasContent) writeJson(DAILY_KEY, next);
  return next;
}

export function completeDailyActivity(ritual, activityId) {
  if (!ritual?.activities?.some(item => item.id === activityId)) return ritual;
  const activities = ritual.activities.map(item => item.id === activityId ? { ...item, done: true } : item);
  const completedAt = activities.length > 0 && activities.every(item => item.done) ? new Date().toISOString() : ritual.completedAt || null;
  const next = { ...ritual, activities, completedAt };
  writeJson(DAILY_KEY, next);
  return next;
}

export function dailyProgress(ritual) {
  const total = ritual?.activities?.length || 0;
  const done = ritual?.activities?.filter(item => item.done).length || 0;
  return { done, total, percent: total ? Math.round(done / total * 100) : 0, complete: total > 0 && done === total };
}

export { DAILY_KEY, contentItems };
