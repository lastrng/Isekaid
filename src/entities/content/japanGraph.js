import { CONTEXTUAL_CONTENT } from "./relatedContent.js";

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const THEMES = {
  onsen: ["onsen", "bain", "spa"], shrine: ["sanctuaire", "shinto", "torii", "jinja", "kitsune"],
  temple: ["temple", "bouddhisme", "bouddhiste", "zen"], food: ["restaurant", "repas", "gastro", "gastronomie", "izakaya", "ramen", "sushi"],
  transport: ["train", "shinkansen", "gare", "transport", "suica", "metro"],
  nature: ["jardin", "parc", "nature", "randonnee"], sakura: ["sakura", "hanami", "cerisier"],
  shopping: ["shopping", "boutique", "achat", "magasin"], hotel: ["hotel", "hebergement", "ryokan"],
};
// Editorial links reference existing catalog records; user data is never migrated.
export const CONTENT_RELATIONS = {
  "code:onsen-tatouages": ["onsen"],
  "code:onsen-lavage": ["onsen"],
  "code:temple-sanctuaire-priere": ["temple", "shrine"],
  "code:argent": ["food", "shopping"],
  "code:baguettes": ["food"],
  "code:transports": ["transport"],
  "daily:trains": ["transport"],
  "situation:train": ["transport"],
  "situation:restaurant": ["food"],
  "situation:hotel": ["hotel"],
};
const PURPOSE_KINDS = {
  before: ["tip", "code", "daily"],
  speak: ["phrase", "situation"],
  explore: ["tradition", "place", "city", "region", "history"],
  personal: ["trip", "memory"],
};
export function graphThemes(item = {}) {
  const text = normalize([item.nom,item.titre,item.title,item.type,item.categorie,item.description,item.conseil,item.resume,item.contexte,item.summary,...(item.tags || []),...(item.contextTags || []),...(item.caracteristiques || []),...(item.interets || [])].join(" "));
  return [...new Set([...(item.themeIds || []), ...Object.entries(THEMES).filter(([,words]) => words.some(word => new RegExp(`(?:^|[^a-z])${word}s?(?=$|[^a-z])`).test(text))).map(([id]) => id)])];
}

/** Retourne les conseils courts pertinents avant une activité ou un lieu. */
export function getContextualContent(activity, graph, { limit = 3 } = {}) {
  const target = activity?.place || activity?.lieu || activity;
  if (!target) return [];
  return relatedToActivity(target, graph, { purpose: "before", limit: Math.max(limit, 20) })
    .filter(node => node.kind === "tip" || node.kind === "code" || node.kind === "daily")
    .sort((a, b) => (b.reason === "Lié à ce lieu" ? 1 : 0) - (a.reason === "Lié à ce lieu" ? 1 : 0) || (b.kind === "tip" ? 1 : 0) - (a.kind === "tip" ? 1 : 0) || b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function buildJapanGraph(db = {}, { trips = [], memories = [] } = {}) {
  const groups = [["tip",CONTEXTUAL_CONTENT],["tradition",db.traditions],["code",db.codes_sociaux],["daily",db.vie_quotidienne],["phrase",db.expressions],["situation",db.situations],["history",db.histoire],["place",db.lieux],["city",db.villes],["region",db.regions]];
  const cities = new Map((db.villes || []).map(city => [city.id, city]));
  const regions = new Map((db.regions || []).flatMap(region => [[normalize(region.nom), region.id], [normalize(region.id), region.id]]));
  const catalog = groups.flatMap(([kind,items]) => (items || []).map(item => ({
    id: `${kind}:${item.id || item.expression}`, kind, sourceId: item.id || item.expression,
    title: item.title || item.titre || item.nom || item.traduction,
    summary: item.summary || item.resume || item.tagline || item.contexte || item.description || "",
    cityId: item.cityId || item.villeId || (kind === "city" ? item.id : null),
    regionId: item.regionId || regions.get(normalize(item.region || cities.get(item.cityId || item.villeId)?.region)) || item.region || cities.get(item.villeId)?.region || null,
    themeIds: item.themeIds || CONTENT_RELATIONS[`${kind}:${item.id || item.expression}`] || graphThemes(item), tags: item.tags || [], relations: item.relations || [], relatedContent: item.relatedContent || [], raw: item,
  })));
  const placeById = new Map((db.lieux || []).map(place => [place.id, place]));
  const personal = [];
  for (const trip of trips || []) {
    if (!trip?.id) continue;
    const tripPlaces = [...new Set((trip.jours || []).flatMap(day => (day.activites || []).map(activity => activity.lieuId).filter(Boolean)))];
    personal.push({ id: `trip:${trip.id}`, kind: "trip", sourceId: trip.id, title: trip.titre || "Mon voyage au Japon", summary: "Voyage personnel", cityId: null, regionId: null, themeIds: [], tags: [], relations: tripPlaces.map(id => `place:${id}`), relatedContent: tripPlaces.map(id => `place:${id}`), raw: trip });
    (trip.jours || []).forEach(day => (day.activites || []).forEach(activity => {
      if (!activity?.fait || (!activity.note && !activity.memoryPhoto)) return;
      const place = placeById.get(activity.lieuId);
      personal.push({ id: `memory:${trip.id}:${day.num}:${activity.id || activity.lieuId}`, kind: "memory", sourceId: activity.id || activity.lieuId, title: place?.nom || "Souvenir de voyage", summary: activity.note || "Souvenir enregistré", cityId: day.villeId || place?.villeId || null, regionId: place?.regionId || null, themeIds: graphThemes(place || {}), tags: ["souvenir"], relations: [`trip:${trip.id}`, ...(activity.lieuId ? [`place:${activity.lieuId}`] : [])], relatedContent: activity.lieuId ? [`place:${activity.lieuId}`] : [], raw: { ...activity, tripId: trip.id, dayNumber: day.num } });
    }));
  }
  for (const memory of memories || []) if (memory?.id && !personal.some(item => item.id === `memory:${memory.id}`)) personal.push({ id: `memory:${memory.id}`, kind: "memory", sourceId: memory.id, title: memory.placeName || "Souvenir de voyage", summary: memory.note || "Souvenir enregistré", cityId: memory.cityId || null, regionId: null, themeIds: [], tags: ["souvenir"], relations: memory.placeId ? [`place:${memory.placeId}`] : [], relatedContent: memory.placeId ? [`place:${memory.placeId}`] : [], raw: memory });
  return [...catalog, ...personal];
}

export function relatedToActivity(place, graph, { limit = 5, purpose } = {}) {
  if (!place) return [];
  const themes = new Set(graphThemes(place));
  const source = graph.find(node => node.kind === "place" && node.sourceId === place.id);
  const cityId = place.cityId || place.villeId;
  const regionId = place.regionId || source?.regionId;
  const ranked = graph.filter(node => !purpose || (PURPOSE_KINDS[purpose] || []).includes(node.kind)).filter(node => !(node.kind === "place" && node.sourceId === place.id)).map(node => {
    const shared = node.themeIds.filter(theme => themes.has(theme));
    const nearby = (place.a_proximite || []).includes(node.sourceId) && node.kind === "place";
    const sameCity = Boolean(cityId && node.cityId === cityId);
    const sameRegion = node.kind === "region" && Boolean(regionId && node.sourceId === regionId);
    const explicit = (place.relatedContent || []).includes(node.id) || (node.relatedContent || []).includes(`place:${place.id}`) || (node.relations || []).includes(`place:${place.id}`);
    const score = (explicit ? 20 : 0) + (sameRegion ? 1 : 0) + shared.length * 4 + (nearby ? 9 : 0) + (sameCity ? 2 : 0) + (shared.length && node.kind === "tip" ? 8 : 0) + (shared.length && ["phrase","situation"].includes(node.kind) ? 3 : 0);
    return {...node, score, reason: explicit ? "Lié à ce lieu" : sameRegion ? "Dans cette région" : nearby ? "À proximité" : shared.length ? "Pour cette activité" : "Dans cette ville"};
  }).filter(node => node.score > 0).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
  const counts = new Map();
  return ranked.filter(node => {
    const count = counts.get(node.kind) || 0;
    counts.set(node.kind, count + 1);
    return count < 2;
  }).slice(0,limit);
}
