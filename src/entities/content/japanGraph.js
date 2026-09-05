import { CONTEXTUAL_CONTENT } from "./relatedContent.js";

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const THEMES = {
  onsen: ["onsen", "bain", "spa"], shrine: ["sanctuaire", "shinto", "torii", "jinja", "kitsune"],
  temple: ["temple", "bouddh", "zen"], food: ["restaurant", "repas", "gastro", "izakaya", "ramen", "sushi"],
  transport: ["train", "shinkansen", "gare", "transport", "suica", "metro"],
  nature: ["jardin", "parc", "nature", "randonnee"], sakura: ["sakura", "hanami", "cerisier"],
  shopping: ["shopping", "boutique", "achat", "magasin"], hotel: ["hotel", "hebergement", "ryokan"],
};
export function graphThemes(item) {
  const text = normalize([item.nom,item.titre,item.title,item.categorie,item.description,item.resume,item.contexte,item.summary,...(item.tags || []),...(item.interets || [])].join(" "));
  return [...new Set([...(item.themeIds || []), ...Object.entries(THEMES).filter(([,words]) => words.some(word => text.includes(word))).map(([id]) => id)])];
}

export function buildJapanGraph(db = {}) {
  const groups = [["tip",CONTEXTUAL_CONTENT],["tradition",db.traditions],["code",db.codes_sociaux],["daily",db.vie_quotidienne],["phrase",db.expressions],["situation",db.situations],["place",db.lieux],["city",db.villes]];
  const cities = new Map((db.villes || []).map(city => [city.id, city]));
  return groups.flatMap(([kind,items]) => (items || []).map(item => ({
    id: `${kind}:${item.id || item.expression}`, kind, sourceId: item.id || item.expression,
    title: item.title || item.titre || item.nom || item.traduction,
    summary: item.summary || item.resume || item.tagline || item.contexte || item.description || "",
    cityId: item.cityId || item.villeId || (kind === "city" ? item.id : null),
    regionId: item.regionId || item.region || cities.get(item.villeId)?.region || null,
    themeIds: graphThemes(item), raw: item,
  })));
}

export function relatedToActivity(place, graph, { limit = 5 } = {}) {
  if (!place) return [];
  const themes = new Set(graphThemes(place));
  const ranked = graph.filter(node => !(node.kind === "place" && node.sourceId === place.id)).map(node => {
    const shared = node.themeIds.filter(theme => themes.has(theme));
    const nearby = (place.a_proximite || []).includes(node.sourceId) && node.kind === "place";
    const sameCity = Boolean(place.villeId && node.cityId === place.villeId);
    const score = shared.length * 4 + (nearby ? 9 : 0) + (sameCity ? 2 : 0) + (shared.length && node.kind === "tip" ? 8 : 0) + (shared.length && ["phrase","situation"].includes(node.kind) ? 3 : 0);
    return {...node, score, reason: nearby ? "À proximité" : shared.length ? "Pour cette activité" : "Dans cette ville"};
  }).filter(node => node.score > 0).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
  const counts = new Map();
  return ranked.filter(node => {
    const count = counts.get(node.kind) || 0;
    counts.set(node.kind, count + 1);
    return count < 2;
  }).slice(0,limit);
}
