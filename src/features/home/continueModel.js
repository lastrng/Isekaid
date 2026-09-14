export const CONTINUE_ACTIVITY_KEY = "isekaid_continue_activity_v1";

const CONTENT_COLLECTIONS = Object.freeze({
  place: "lieux",
  tradition: "traditions",
  situation: "situations",
  social_code: "codes_sociaux",
  daily_life: "vie_quotidienne",
  region: "regions",
  culture: "culture",
  gastronomie: "repas",
  expression: "expressions",
  history: "histoire",
});

const ICONS = Object.freeze({
  lesson: "🈶",
  scenario: "🎭",
  prefecture: "🗾",
  article: "📖",
  trip: "🧳",
  trip_day: "📍",
  review: "🔁",
});

const LABELS = Object.freeze({
  lesson: "Leçon",
  scenario: "Scénario",
  prefecture: "Territoire",
  article: "Article",
  trip: "Voyage",
  trip_day: "Journée de voyage",
  review: "Révision",
});

const ALLOWED_KINDS = new Set(Object.keys(ICONS));

function cleanText(value, limit = 180) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

function normalizeTarget(target = {}) {
  return {
    tab: cleanText(target.tab, 24) || null,
    mode: cleanText(target.mode, 32) || null,
    tripId: cleanText(target.tripId, 100) || null,
    sub: cleanText(target.sub, 24) || null,
    scenarioId: cleanText(target.scenarioId, 100) || null,
    contentType: cleanText(target.contentType, 40) || null,
    contentId: cleanText(target.contentId, 120) || null,
  };
}

export function normalizeContinueActivity(activity) {
  if (!activity || !ALLOWED_KINDS.has(activity.kind)) return null;
  const title = cleanText(activity.title);
  if (!title) return null;
  return {
    kind: activity.kind,
    id: cleanText(activity.id, 140) || `${activity.kind}:${title}`,
    title,
    subtitle: cleanText(activity.subtitle, 240),
    eyebrow: LABELS[activity.kind],
    emoji: ICONS[activity.kind],
    target: normalizeTarget(activity.target),
    updatedAt: typeof activity.updatedAt === "string" ? activity.updatedAt : new Date().toISOString(),
  };
}

export function loadContinueActivity(storage = globalThis.localStorage) {
  try {
    return normalizeContinueActivity(JSON.parse(storage?.getItem(CONTINUE_ACTIVITY_KEY) || "null"));
  } catch {
    return null;
  }
}

export function saveContinueActivity(activity, storage = globalThis.localStorage) {
  const normalized = normalizeContinueActivity({ ...activity, updatedAt: new Date().toISOString() });
  if (!normalized) return null;
  try { storage?.setItem(CONTINUE_ACTIVITY_KEY, JSON.stringify(normalized)); } catch {}
  return normalized;
}

export function resolveContinueContent(db = {}, target = {}) {
  const collection = CONTENT_COLLECTIONS[target.contentType];
  if (!collection || !target.contentId) return null;
  return (db[collection] || []).find(item => String(item?.id) === String(target.contentId)) || null;
}

function savedActivityAvailable(saved, trips, db) {
  if (!saved) return false;
  if (saved.target.tripId) return trips.some(trip => String(trip.id) === String(saved.target.tripId));
  if (saved.target.contentType) return Boolean(resolveContinueContent(db, saved.target));
  return true;
}

/**
 * Choisit une reprise réelle avant tout : activité explicitement ouverte,
 * révision due, puis parcours commencé. Le voyage n'est pas utilisé comme
 * repli ici : sa carte contextuelle dédiée évite ce doublon sur Aujourd'hui.
 * Aucun faux « reprendre » n'est affiché à un nouvel utilisateur.
 */
export function buildContinueRecommendation({ saved = null, trips = [], db = {}, dueReviewCount = 0, hasKanaProgress = false, pathProgress = {} } = {}) {
  if (savedActivityAvailable(saved, trips, db)) return normalizeContinueActivity(saved);
  if (hasKanaProgress && dueReviewCount > 0) {
    return normalizeContinueActivity({
      kind: "review",
      id: "kana-review",
      title: `${dueReviewCount} kana à revoir`,
      subtitle: "Ta prochaine révision espacée est prête.",
      target: { tab: "learn", mode: "review" },
    });
  }
  const completedPath = Array.isArray(pathProgress?.completed) ? pathProgress.completed.length : 0;
  if (completedPath > 0 && completedPath < 8) {
    return normalizeContinueActivity({
      kind: "lesson",
      id: "tokyo-path",
      title: "Survivre à Tokyo",
      subtitle: `Continue ton parcours · ${completedPath}/8 étapes terminées.`,
      target: { tab: "learn", mode: "path" },
    });
  }
  return null;
}

export function continueActivityFromDaily(activity) {
  if (!activity?.raw || !activity?.title) return null;
  const contentId = activity.raw.id;
  if (!contentId) return null;
  const isPrefecture = activity.type === "region";
  return normalizeContinueActivity({
    kind: isPrefecture ? "prefecture" : "article",
    id: `${activity.type}:${contentId}`,
    title: activity.title,
    subtitle: isPrefecture ? "Continue ta découverte des territoires japonais." : "Reprends ta lecture là où tu l'avais laissée.",
    target: { tab: "explore", contentType: activity.type, contentId },
  });
}
