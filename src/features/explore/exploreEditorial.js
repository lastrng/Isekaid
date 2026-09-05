import { dayKey } from "../progress/streak.js";
import { readJson, writeJson } from "../../lib/storage.js";

const SEEN_KEY = "isekaid_explore_editorial_seen_v1";

function hash(value) {
  let result = 2166136261;
  for (const char of String(value)) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); }
  return result >>> 0;
}

function normalize(item, type, index) {
  if (!item) return null;
  if (type === "food") return { id: item.id || `repas-${index}`, type, label: "Gastronomie", title: item.romaji || item.nom_jp || "Une saveur japonaise", summary: item.description || item.fun_fact || "Une découverte gourmande du Japon.", raw: item };
  return { id: item.id || `culture-${index}`, type: "culture", label: item.tag || "Japon contemporain", title: item.titre || "Une histoire du Japon", summary: item.insight || item.contenu || "Une découverte japonaise en quelques minutes.", raw: item };
}

export function editorialPools(db = {}) {
  const culture = (db.culture || []).map((item, index) => normalize(item, "culture", index));
  const food = (db.repas || []).map((item, index) => normalize(item, "food", index));
  const contemporary = culture.filter(item => /pop|anime|manga|jeu|musique|mode|urbain|contemporain|gacha|karaoke/i.test(`${item.label} ${item.title} ${item.summary}`));
  return { culture, food, contemporary: contemporary.length ? contemporary : culture };
}

export function loadSeenEditorial() { return readJson(SEEN_KEY, []); }
export function markEditorialSeen(id) {
  if (!id) return;
  const seen = loadSeenEditorial();
  if (!seen.includes(id)) writeJson(SEEN_KEY, [...seen, id].slice(-200));
}

export function pickEditorial(pool, date = new Date(), salt = "daily", { unseenOnly = false } = {}) {
  const items = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (!items.length) return null;
  const unseen = unseenOnly ? items.filter(item => !loadSeenEditorial().includes(item.id)) : items;
  const candidates = unseen.length ? unseen : items;
  return candidates[hash(`${typeof date === "string" ? date : dayKey(date)}:${salt}`) % candidates.length];
}

export function buildExploreEditorial({ db, date = new Date() } = {}) {
  const pools = editorialPools(db);
  return {
    featured: pickEditorial([...pools.culture, ...pools.food], date, "featured"),
    gastronomy: pickEditorial(pools.food, date, "gastronomy"),
    contemporary: pickEditorial(pools.contemporary, date, "contemporary"),
    pools,
  };
}

export { SEEN_KEY };
