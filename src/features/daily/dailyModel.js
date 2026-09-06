import { dayKey } from "../progress/streak.js";
import { readJson, writeJson } from "../../lib/storage.js";

const DAILY_KEY = "isekaid_daily_ritual_v1";

export function dailyDateKey(date = new Date(), timeZone) {
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date instanceof Date ? date : new Date(date));
    const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    if (values.year && values.month && values.day) return `${values.year}-${values.month}-${values.day}`;
  } catch {}
  return dayKey(date instanceof Date ? date : new Date(date));
}

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

const INTEREST_TERMS = {
  gastro: ["gastronomie", "repas", "restaurant", "ramen", "sushi", "izakaya", "food"],
  langue: ["japonais", "expression", "situation", "communication"],
  culture: ["culture", "tradition", "histoire", "coutume"],
  anime: ["anime", "manga", "pop", "jeu", "musique", "mode", "urbain"],
  voyage: ["voyage", "région", "lieu", "ville", "transport"],
  lifestyle: ["vie", "quotidien", "onsen", "konbini", "social"],
};
const GOAL_TERMS = {
  travel: ["voyage", "lieu", "région", "ville", "transport"],
  learn: ["japonais", "expression", "situation", "culture"],
  imm: ["culture", "tradition", "histoire", "quotidien"],
  live: ["vie", "quotidien", "social", "expression"],
};

function relevance(item, personalization = {}) {
  const context = personalization || {};
  const terms = (context.interests || []).flatMap(value => INTEREST_TERMS[value] || [value]);
  terms.push(...(GOAL_TERMS[context.goal] || []));
  const normalizedTerms = terms.map(value => String(value).toLowerCase());
  if (!normalizedTerms.length) return 0;
  const raw = item.raw || {};
  const related = [raw.tags, raw.tag, raw.themes, raw.themeIds, raw.cityId, raw.regionId, raw.categorie, raw.category, raw.type, raw.interets]
    .flatMap(value => Array.isArray(value) ? value : [value]).filter(Boolean).join(" ");
  const text = `${item.label} ${item.title} ${item.summary} ${related}`.toLowerCase();
  return normalizedTerms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

function personalizedPool(items, personalization, seed) {
  const ranked = items.map((item, index) => ({ item, index, score: relevance(item, personalization) })).sort((a, b) => b.score - a.score || a.index - b.index);
  const best = ranked.filter(entry => entry.score > 0).map(entry => entry.item);
  return best.length ? best : items;
}

function personalizationKey(context) {
  const value = context || {};
  return JSON.stringify({
    interests: Array.isArray(value.interests) ? [...value.interests].sort() : [],
    goal: value.goal || null,
    places: (value.relatedPlaces || []).map(place => place.id).filter(Boolean).sort(),
    season: value.seasonKey || null,
  });
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
  const traditions = (db.traditions || []).map((item, index) => ({
    id: item.id || `tradition-${index}`,
    type: "tradition",
    label: "Tradition japonaise",
    title: item.nom || item.titre || "Une tradition japonaise",
    summary: item.tagline || item.description || item.contenu || "Un geste et une histoire à découvrir.",
    raw: item,
  }));
  return { culture, expressions, situations, food, traditions };
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

export function buildDailyRitual({ db = {}, date = new Date(), travelContext = null, personalization = travelContext } = {}) {
  const dateKey = typeof date === "string" ? date : dayKey(date);
  const pools = contentItems(db);
  const travelPlaces = (travelContext?.relatedPlaces || []).map((place, index) => placeItem(place, index, false));
  const seasonalPlaces = (travelContext?.seasonalPlaces || []).map((place, index) => placeItem(place, index, true));
  const seasonalTraditions = pools.traditions.filter(item => !travelContext?.seasonKey || item.raw?.saison === travelContext.seasonKey).map(item => ({ ...item, label: "Saison japonaise" }));
  const seasonalPool = [...seasonalPlaces, ...seasonalTraditions];
  const genericPool = personalization?.interests?.includes("gastro") ? [...pools.culture, ...pools.food] : [...pools.culture, ...pools.traditions];
  const culturePool = travelPlaces.length ? travelPlaces : seasonalPool.length ? seasonalPool : personalizedPool(genericPool, personalization, dateKey);
  const discover = pick(culturePool.length ? culturePool : pools.food, dateKey, 1);
  const learn = pick(personalizedPool(pools.expressions, personalization, dateKey), dateKey, 2);
  const practice = pick(personalizedPool(pools.situations.length ? pools.situations : [...pools.food, ...pools.culture], personalization, dateKey), dateKey, 3);
  const activities = [discover, learn, practice].filter(Boolean).map((item, index) => ({
    ...item,
    id: `${dateKey}:${item.type}:${item.id}:${index}`,
    kind: index === 0 ? "discover" : index === 1 ? "learn" : "practice",
    done: false,
  }));
  return { version: 1, date: dateKey, personalizationKey: personalizationKey({ ...travelContext, ...personalization }), activities, completedAt: null, offlineReady: activities.length > 0, lastSyncedAt: activities.length > 0 ? new Date().toISOString() : null };
}

export function loadDailyRitual({ db = {}, date = new Date(), travelContext = null, personalization = travelContext } = {}) {
  const dateKey = typeof date === "string" ? date : dayKey(date);
  const saved = readJson(DAILY_KEY, null);
  const pools = contentItems(db);
  const hasContent = Object.values(pools).some(items => items.length > 0);
  const expectedKey = personalizationKey({ ...travelContext, ...personalization });
  if (saved?.date === dateKey && saved?.personalizationKey === expectedKey && Array.isArray(saved.activities) && (saved.activities.length > 0 || !hasContent)) return saved;
  const next = buildDailyRitual({ db, date: dateKey, travelContext, personalization });
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

export function isDailyOfflineReady(ritual) {
  return Boolean(ritual?.offlineReady && ritual?.date && ritual.activities?.length);
}

export { DAILY_KEY, contentItems };
