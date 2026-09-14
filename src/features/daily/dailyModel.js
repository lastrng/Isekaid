import { dayKey } from "../progress/streak.js";
import { readJson, writeJson } from "../../lib/storage.js";
import { getDailyContent } from "../../entities/user/userContext.js";

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

function shortText(value, limit = 240) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).replace(/\s+\S*$/, "")}…`;
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
    summary: shortText(item.insight || item.contenu || "Une découverte japonaise en quelques minutes."),
    raw: item,
  }));
  const expressions = (db.expressions || []).map((item, index) => ({
    id: item.id || `expression-${index}`,
    type: "expression",
    label: "Japonais",
    title: item.expression || item.romaji || "Expression utile",
    summary: shortText(item.traduction || item.contexte || "Une expression à garder avec soi."),
    raw: item,
  }));
  const situations = (db.situations || db.scenarios || []).map((item, index) => ({
    id: item.id || `situation-${index}`,
    type: "situation",
    label: "Situation réelle",
    title: item.titre || item.title || item.nom || "Une situation du quotidien",
    summary: shortText(item.description || item.contexte || item.subtitle || "Un entraînement pratique pour le Japon."),
    raw: item,
  }));
  const food = (db.repas || []).map((item, index) => ({
    id: item.id || `repas-${index}`,
    type: "gastronomie",
    label: "Gastronomie",
    title: item.romaji || item.nom_jp || "Une saveur japonaise",
    summary: shortText(item.description || item.fun_fact || "Une découverte gourmande du Japon."),
    raw: item,
  }));
  const traditions = (db.traditions || []).map((item, index) => ({
    id: item.id || `tradition-${index}`,
    type: "tradition",
    label: "Tradition japonaise",
    title: item.nom || item.titre || "Une tradition japonaise",
    summary: shortText(item.tagline || item.description || item.contenu || "Un geste et une histoire à découvrir."),
    raw: item,
  }));
  const history = (db.histoire || []).map((item, index) => ({
    id: item.id || `histoire-${index}`,
    type: "history",
    label: "Histoire",
    title: item.titre || "Un moment de l’histoire japonaise",
    summary: shortText(item.resume || item.anecdote || item.contenu),
    raw: item,
  }));
  const social = (db.codes_sociaux || []).map((item, index) => ({
    id: item.id || `code-${index}`,
    type: "social_code",
    label: "Société",
    title: item.titre || "Un code social japonais",
    summary: shortText(item.resume || item.explication || item.description),
    raw: item,
  }));
  const dailyLife = (db.vie_quotidienne || []).map((item, index) => ({
    id: item.id || `vie-${index}`,
    type: "daily_life",
    label: "Vie quotidienne",
    title: item.titre || "Le quotidien au Japon",
    summary: shortText(item.resume || item.description || item.contenu),
    raw: item,
  }));
  const regions = (db.regions || []).map((item, index) => ({
    id: item.id || `region-${index}`,
    type: "region",
    label: "Territoires",
    title: item.nom || "Une région du Japon",
    summary: shortText(item.tagline || item.ambiance || item.a_savoir),
    raw: item,
  }));
  const places = (db.lieux || []).map((item, index) => placeItem(item, index, false, false));
  return { culture, expressions, situations, food, traditions, history, social, dailyLife, regions, places };
}

function placeItem(place, index, seasonal = false, relatedToTrip = false) {
  return {
    id: place.id || `place-${index}`,
    type: "place",
    label: seasonal ? "Saison japonaise" : relatedToTrip ? "Dans ton voyage" : "Lieu du Japon",
    title: place.nom || "Un lieu à découvrir",
    summary: shortText(place.description || place.quartier || "Une étape à relier à ton itinéraire."),
    raw: place,
  };
}

function recommendationItem(node) {
  if (!node?.raw) return null;
  const type = ({food:"gastronomie",phrase:"expression",daily:"daily_life",code:"social_code"})[node.kind] || node.kind;
  const label = ({food:"Gastronomie",phrase:"Japonais",situation:"Situation réelle",scenario:"Situation réelle",tradition:"Tradition japonaise",history:"Histoire",code:"Société",daily:"Vie quotidienne",region:"Territoires",place:"Dans ton voyage",culture:"Culture"})[node.kind] || "Pour toi";
  return { id:node.sourceId, type, label, title:node.title, summary:shortText(node.summary), raw:node.raw };
}

function buildUnderstandingActivity(learn, expressions, dateKey) {
  if (!learn?.raw) return null;
  const answer = learn.raw.traduction || learn.summary;
  if (!answer) return null;
  const distractors = expressions
    .filter(item => item.id !== learn.id)
    .map(item => item.raw?.traduction || item.summary)
    .filter((value, index, values) => value && value !== answer && values.indexOf(value) === index)
    .sort((a, b) => hash(`${dateKey}:quiz:${a}`) - hash(`${dateKey}:quiz:${b}`))
    .slice(0, 2);
  const choices = [answer, ...distractors]
    .sort((a, b) => hash(`${dateKey}:choice:${a}`) - hash(`${dateKey}:choice:${b}`));
  return {
    id: `quiz-${learn.id}`,
    type: "quiz",
    label: "Mini-quiz",
    title: `Que signifie « ${learn.raw.expression || learn.raw.kana || learn.raw.romaji || learn.title} » ?`,
    summary: "Choisis le sens qui convient.",
    question: {
      prompt: `Que signifie « ${learn.raw.expression || learn.raw.kana || learn.raw.romaji || learn.title} » ?`,
      choices,
      answer,
      explanation: shortText(learn.raw.contexte || `« ${learn.raw.romaji || learn.title} » signifie « ${answer} ».`, 320),
    },
    raw: { expressionId: learn.id },
  };
}

function buildMissionActivity(mission) {
  if (!mission?.id || !mission?.label) return null;
  return {
    id: `mission-${mission.id}`,
    type: "mission",
    label: "Mission",
    title: mission.label,
    summary: mission.hint ? `À faire dans ${mission.hint}.` : "Une petite action pour faire avancer ton Japon.",
    raw: {
      missionId: mission.id,
      trigger: mission.trigger || null,
      targetTab: mission.targetTab || null,
      hint: mission.hint || null,
      emoji: mission.emoji || "🎯",
    },
    done: mission.done === true,
  };
}

export function buildDailyRitual({ db = {}, date = new Date(), travelContext = null, personalization = travelContext, userContext = null, mission = null } = {}) {
  const dateKey = typeof date === "string" ? date : dayKey(date);
  const pools = contentItems(db);
  const travelPlaces = (travelContext?.relatedPlaces || []).map((place, index) => placeItem(place, index, false, true));
  const seasonalPlaces = (travelContext?.seasonalPlaces || []).map((place, index) => placeItem(place, index, true));
  const seasonalTraditions = pools.traditions.filter(item => !travelContext?.seasonKey || item.raw?.saison === travelContext.seasonKey).map(item => ({ ...item, label: "Saison japonaise" }));
  const seasonalPool = [...seasonalPlaces, ...seasonalTraditions];
  // Une candidate par famille évite que les catalogues les plus volumineux
  // (lieux, traditions, vie quotidienne) écrasent histoire, gastronomie ou
  // territoires dans la rotation quotidienne.
  const genericPool = [pools.culture,pools.food,pools.traditions,pools.history,pools.social,pools.dailyLife,pools.regions,pools.places]
    .map((items,index)=>pick(personalizedPool(items,personalization,dateKey),dateKey,20+index))
    .filter(Boolean);
  const culturePool = travelPlaces.length ? travelPlaces : seasonalPool.length ? seasonalPool : personalizedPool(genericPool, personalization, dateKey);
  const recommendations = userContext ? getDailyContent({context:userContext,db,date:dateKey}) : null;
  const discover = recommendationItem(recommendations?.discovery?.[0]) || pick(culturePool.length ? culturePool : pools.food, dateKey, 1);
  const learn = recommendationItem(recommendations?.learning?.[0]) || pick(personalizedPool(pools.expressions, personalization, dateKey), dateKey, 2);
  const understand = buildUnderstandingActivity(learn, pools.expressions, dateKey);
  const dailyMission = buildMissionActivity(mission);
  const steps = [
    { item: discover, kind: "discover", durationMinutes: 2 },
    { item: learn, kind: "learn", durationMinutes: 1 },
    { item: understand, kind: "understand", durationMinutes: 1 },
    { item: dailyMission, kind: "mission", durationMinutes: 2 },
  ];
  const activities = steps.filter(step => step.item).map(({ item, kind, durationMinutes }, index) => ({
    ...item,
    id: `${dateKey}:${kind}:${item.id}:${index}`,
    kind,
    durationMinutes,
    done: item.done === true,
  }));
  const complete = activities.length > 0 && activities.every(item => item.done);
  return {
    version: 2,
    date: dateKey,
    personalizationKey: userContext?.fingerprint || personalizationKey({ ...travelContext, ...personalization }),
    activities,
    completedAt: complete ? new Date().toISOString() : null,
    offlineReady: activities.length >= 3,
    lastSyncedAt: activities.length > 0 ? new Date().toISOString() : null,
  };
}

export function loadDailyRitual({ db = {}, date = new Date(), travelContext = null, personalization = travelContext, userContext = null, mission = null } = {}) {
  const dateKey = typeof date === "string" ? date : dayKey(date);
  const saved = readJson(DAILY_KEY, null);
  const pools = contentItems(db);
  const hasContent = Object.values(pools).some(items => items.length > 0);
  // Une fois générée, la session ne change plus jusqu'au lendemain, même si
  // le profil, le voyage actif ou la saison sont resynchronisés entre-temps.
  if (saved?.date === dateKey && saved?.version >= 2 && Array.isArray(saved.activities) && (saved.activities.length > 0 || !hasContent)) {
    // Un snapshot peut avoir été préparé par la synchronisation avant que la
    // mission du jour ne soit disponible. On complète alors uniquement cette
    // étape manquante sans jamais remplacer les contenus déjà choisis.
    if (mission && !saved.activities.some(item => item.kind === "mission")) {
      const missionItem = buildMissionActivity(mission);
      if (missionItem) {
        const activity = {...missionItem,id:`${dateKey}:mission:${missionItem.id}:${saved.activities.length}`,kind:"mission",durationMinutes:2,done:missionItem.done===true};
        const next = {...saved,activities:[...saved.activities,activity],completedAt:activity.done?saved.completedAt:null,offlineReady:true};
        writeJson(DAILY_KEY,next);
        return next;
      }
    }
    return saved;
  }
  // Hors ligne, une session v1 déjà en cache reste préférable à un écran vide.
  if (saved?.date === dateKey && Array.isArray(saved.activities) && !hasContent) return saved;
  const next = buildDailyRitual({ db, date: dateKey, travelContext, personalization, userContext, mission });
  if (saved?.date === dateKey && Array.isArray(saved.activities)) {
    next.activities = next.activities.map(activity => {
      const previous = saved.activities.find(item => item.kind === activity.kind);
      return previous?.done ? { ...activity, done: true } : activity;
    });
    if (next.activities.length > 0 && next.activities.every(item => item.done)) next.completedAt = saved.completedAt || new Date().toISOString();
  }
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

export function answerDailyQuestion(ritual, activityId, selectedAnswer) {
  const activity = ritual?.activities?.find(item => item.id === activityId);
  const choices = activity?.question?.choices || [];
  if (!activity || activity.kind !== "understand" || activity.done || !choices.includes(selectedAnswer)) return ritual;
  const activities = ritual.activities.map(item => item.id === activityId ? {
    ...item,
    done: true,
    selectedAnswer,
    answerCorrect: selectedAnswer === item.question.answer,
    answeredAt: new Date().toISOString(),
  } : item);
  const completedAt = activities.every(item => item.done) ? new Date().toISOString() : ritual.completedAt || null;
  const next = { ...ritual, activities, completedAt };
  writeJson(DAILY_KEY, next);
  return next;
}

export function syncDailyMissionProgress(ritual, completedMissionIds = []) {
  const completed = new Set(Array.isArray(completedMissionIds) ? completedMissionIds : []);
  const mission = ritual?.activities?.find(item => item.kind === "mission");
  if (!mission || mission.done || !completed.has(mission.raw?.missionId)) return ritual;
  return completeDailyActivity(ritual, mission.id);
}

export function dailyProgress(ritual) {
  const total = ritual?.activities?.length || 0;
  const done = ritual?.activities?.filter(item => item.done).length || 0;
  return { done, total, percent: total ? Math.round(done / total * 100) : 0, complete: total > 0 && done === total };
}

export function getCurrentDailyStep(ritual) {
  const activities = Array.isArray(ritual?.activities) ? ritual.activities : [];
  const index = activities.findIndex(item => item.done !== true);
  return {
    activity: index >= 0 ? activities[index] : null,
    index: index >= 0 ? index : activities.length,
    complete: activities.length > 0 && index < 0,
  };
}

export function dailySessionMinutes(ritual, { remaining = false } = {}) {
  return (ritual?.activities || [])
    .filter(item => !remaining || !item.done)
    .reduce((total, item) => total + (Number(item.durationMinutes) || 1), 0);
}

export function isDailyOfflineReady(ritual) {
  return Boolean(ritual?.offlineReady && ritual?.date && ritual.activities?.length);
}

const DAILY_DETAIL_META = {
  culture: { kind: "culture", color: "#8B6FB0" },
  gastronomie: { kind: "repas", color: "#3A6645" },
  expression: { kind: "expr", color: "#C9463D" },
  history: { kind: "history", color: "#9E7A1A" },
};

// Adapte les découvertes du rituel au gabarit de fiche déjà utilisé par la
// recherche. Les lieux et traditions ont leur propre fiche riche dans App.
export function dailyActivityDetailResult(activity) {
  const meta = DAILY_DETAIL_META[activity?.type];
  if (!meta || !activity?.raw) return null;
  return {
    ...meta,
    type: activity.label || (activity.type === "gastronomie" ? "Gastronomie" : activity.type === "expression" ? "Expression" : activity.type === "history" ? "Histoire" : "Culture"),
    emoji: activity.raw.emoji || (activity.type === "gastronomie" ? "🍱" : activity.type === "expression" ? "💬" : activity.type === "history" ? "🏺" : "🎋"),
    title: activity.title,
    sub: activity.raw.romaji || activity.raw.tag || "",
    summary: activity.summary,
    raw: activity.raw,
  };
}

export function dailyActivityTarget(activity) {
  if (activity?.type === "place" && activity.raw) return { kind: "place", item: activity.raw };
  if (activity?.type === "tradition" && activity.raw) return { kind: "tradition", item: activity.raw };
  if (activity?.type === "situation" && activity.raw) return { kind: "situation", item: activity.raw };
  if (activity?.type === "social_code" && activity.raw) return { kind: "detail", type: "code", item: activity.raw };
  if (activity?.type === "daily_life" && activity.raw) return { kind: "detail", type: "vie", item: activity.raw };
  if (activity?.type === "region" && activity.raw) return { kind: "detail", type: "region", item: activity.raw };
  if (activity?.kind === "mission" && activity.raw?.targetTab) return { kind: "tab", tab: activity.raw.targetTab };
  const result = dailyActivityDetailResult(activity);
  if (result) return { kind: "article", result };
  if (activity?.kind === "learn") return { kind: "tab", tab: "learn" };
  if (activity?.kind === "understand") return { kind: "none" };
  return { kind: "tab", tab: "explore" };
}

export { DAILY_KEY, contentItems };
