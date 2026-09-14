import { graphThemes } from "../entities/content/japanGraph.js";

function text(value) {
  return value ?? "";
}

export const SEARCH_GROUPS = Object.freeze([
  { id:"prefectures", label:"Préfectures", kinds:["prefecture"] },
  { id:"cities", label:"Villes", kinds:["ville"] },
  { id:"places", label:"Lieux", kinds:["lieu", "region"] },
  { id:"discover", label:"Découvrir", kinds:["article", "culture", "wiki", "tradition", "repas", "code", "vie", "history"] },
  { id:"learn", label:"Apprendre", kinds:["expr", "lesson", "situation", "scenario"] },
  { id:"trips", label:"Voyages", kinds:["trip", "trip_template"] },
]);

const GROUP_BY_KIND = new Map(SEARCH_GROUPS.flatMap(group => group.kinds.map(kind => [kind, group.id])));
const ENTITY_BY_KIND = {
  prefecture:"prefecture", ville:"city", lieu:"place", culture:"article", wiki:"article", tradition:"tradition",
  repas:"dish", code:"article", vie:"article", history:"article", region:"article", expr:"expression",
  lesson:"lesson", situation:"situation", scenario:"situation", trip:"trip", trip_template:"trip",
};

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

function identity(entry, fallback) {
  return entry?.id || entry?.slug || entry?.expression || entry?.titre || entry?.nom || entry?.mot || fallback;
}

function cityAliases(city, prefecture) {
  return [city?.id, city?.nom, city?.nom_jp, city?.region, prefecture?.id, prefecture?.nameFr, prefecture?.nameJa, prefecture?.nameKana, prefecture?.capital].filter(Boolean).join(" ");
}

/** Construit un index universel sans lecture du stockage et sans appel réseau. */
export function buildSearchIndex(database, { prefectures = [], trips = [], lessons = [] } = {}) {
  if (!database) return [];
  const items = [];
  const cities = database.villes || [];
  const cityById = new Map(cities.map(city => [city.id, city]));
  const prefectureById = new Map(prefectures.map(prefecture => [prefecture.id, prefecture]));
  const prefectureByCityId = new Map(prefectures.flatMap(prefecture => (prefecture.cities || []).map(city => [typeof city === "string" ? city : city.id, prefecture])));
  const placeById = new Map((database.lieux || []).map(place => [place.id, place]));
  const cityContext = city => cityAliases(city, prefectureByCityId.get(city?.id));
  const add = item => {
    const kind = item.kind || "article";
    const id = `${kind}:${identity(item.raw, items.length)}`;
    items.push({ ...item, id, entityType:item.entityType || ENTITY_BY_KIND[kind] || "article", group:item.group || GROUP_BY_KIND.get(kind) || "discover", searchText:normalizeSearchText(item.blob), geographySearchText:normalizeSearchText(item.geographyBlob), relationSearchText:normalizeSearchText(item.relationBlob) });
  };

  const placeThemesByCity = new Map();
  for (const place of database.lieux || []) {
    const cityId = place.villeId || place.cityId;
    if (!cityId) continue;
    const themes = placeThemesByCity.get(cityId) || new Set();
    graphThemes(place).forEach(theme => themes.add(theme));
    placeThemesByCity.set(cityId, themes);
  }
  const thematicGeography = entry => {
    const themes = new Set(graphThemes(entry));
    if (!themes.size) return "";
    return cities.filter(city => [...(placeThemesByCity.get(city.id) || [])].some(theme => themes.has(theme))).map(cityContext).join(" ");
  };
  const geographicalRelation = entry => {
    const city = cityById.get(entry?.villeId || entry?.cityId);
    const prefecture = prefectureById.get(entry?.prefectureId || entry?.prefecture);
    return [cityContext(city), prefecture ? `${prefecture.id} ${prefecture.nameFr} ${prefecture.nameJa} ${prefecture.nameKana} ${prefecture.region}` : "", entry?.regionId, entry?.region].filter(Boolean).join(" ");
  };

  for (const prefecture of prefectures) add({ type:"Préfecture", emoji:prefecture.emoji || "🗾", color:"#C9463D", title:prefecture.nameFr, jp:prefecture.nameJa, sub:`${prefecture.region} · capitale ${prefecture.capital}`, blob:`${prefecture.id} ${prefecture.slug} ${prefecture.nameFr} ${prefecture.nameJa} ${prefecture.nameKana} ${prefecture.region} ${prefecture.capital}`, raw:prefecture, kind:"prefecture" });
  for (const city of cities) {
    const prefecture = prefectureByCityId.get(city.id);
    add({ type:"Ville", emoji:city.emoji || "🏙️", color:"#4276A0", title:city.nom, jp:city.nom_jp, sub:[prefecture?.nameFr,city.region,city.tagline].filter(Boolean).join(" · "), blob:`${city.id} ${text(city.nom)} ${text(city.nom_jp)} ${text(city.region)} ${text(city.tagline)} ${text(city.description)}`, geographyBlob:cityAliases(city,prefecture), prefectureId:prefecture?.id || city.prefectureId || null, raw:city, kind:"ville" });
  }
  for (const entry of database.lieux || []) add({ type:"Lieu", emoji:entry.emoji || "📍", color:"#4276A0", title:entry.nom, jp:entry.nom_jp, sub:[cityById.get(entry.villeId)?.nom,entry.quartier,entry.categorie].filter(Boolean).join(" · "), blob:`${text(entry.nom)} ${text(entry.nom_jp)} ${text(entry.quartier)} ${text(entry.categorie)} ${text(entry.description)}`, geographyBlob:geographicalRelation(entry), raw:entry, kind:"lieu" });

  for (const entry of database.wiki || []) add({ type:"Article", emoji:"📖", color:"#9E7A1A", title:entry.mot, jp:entry.jp, sub:entry.definition, blob:`${text(entry.mot)} ${text(entry.romaji)} ${text(entry.jp)} ${text(entry.definition)} ${text(entry.categorie)}`, relationBlob:thematicGeography(entry), raw:entry, kind:"wiki" });
  for (const entry of database.culture || []) add({ type:"Article", emoji:entry.emoji || "🎋", color:"#8B6FB0", title:entry.titre, sub:entry.insight, blob:`${text(entry.titre)} ${text(entry.tag)} ${text(entry.insight)} ${text(entry.contenu)}`, geographyBlob:geographicalRelation(entry), relationBlob:thematicGeography(entry), raw:entry, kind:"culture" });
  for (const entry of database.traditions || []) add({ type:"Tradition", emoji:entry.emoji || "⛩️", color:"#C4956A", title:entry.nom, jp:entry.nom_jp, sub:entry.tagline, blob:`${text(entry.nom)} ${text(entry.nom_jp)} ${text(entry.tagline)} ${text(entry.histoire)} ${text(entry.saison)}`, geographyBlob:geographicalRelation(entry), relationBlob:thematicGeography(entry), raw:entry, kind:"tradition" });
  for (const entry of database.repas || []) add({ type:"Plat", emoji:entry.emoji || "🍱", color:"#3A6645", title:entry.romaji || entry.nom_jp, jp:entry.nom_jp, sub:entry.description, blob:`${text(entry.nom_jp)} ${text(entry.romaji)} ${text(entry.description)} ${text(entry.region)} ${text(entry.specialite)}`, geographyBlob:geographicalRelation(entry), relationBlob:thematicGeography(entry), raw:entry, kind:"repas" });
  for (const entry of database.codes_sociaux || []) add({ type:"Article", emoji:entry.emoji || "🤫", color:"#8B6FB0", title:entry.titre, jp:entry.nom_jp, sub:entry.resume, blob:`${text(entry.titre)} ${text(entry.nom_jp)} ${text(entry.resume)} ${text(entry.explication)}`, relationBlob:thematicGeography(entry), raw:entry, kind:"code" });
  for (const entry of database.vie_quotidienne || []) add({ type:"Article", emoji:entry.emoji || "🏙️", color:"#5B7E9B", title:entry.titre, jp:entry.nom_jp, sub:entry.resume, blob:`${text(entry.titre)} ${text(entry.nom_jp)} ${text(entry.resume)} ${text(entry.description)}`, relationBlob:thematicGeography(entry), raw:entry, kind:"vie" });
  for (const entry of database.regions || []) add({ type:"Région", emoji:entry.emoji || "🗾", color:"#4E8060", title:entry.nom, jp:entry.nom_jp, sub:entry.tagline, blob:`${text(entry.nom)} ${text(entry.nom_jp)} ${text(entry.tagline)} ${text(entry.ambiance)}`, raw:entry, kind:"region" });
  for (const entry of database.histoire || []) add({ type:"Article", emoji:entry.emoji || "📜", color:"#9E7A1A", title:entry.titre, jp:entry.titre_jp, sub:entry.periode, blob:`${text(entry.titre)} ${text(entry.titre_jp)} ${text(entry.periode)} ${text(entry.theme)} ${text(entry.resume)} ${text(entry.contenu)} ${text(entry.anecdote)}`, geographyBlob:geographicalRelation(entry), relationBlob:thematicGeography(entry), raw:entry, kind:"history" });

  for (const entry of database.expressions || []) add({ type:"Expression", emoji:"💬", color:"#C9463D", title:entry.traduction || entry.romaji, jp:entry.expression, sub:entry.romaji, blob:`${text(entry.expression)} ${text(entry.romaji)} ${text(entry.traduction)} ${text(entry.contexte)}`, relationBlob:thematicGeography(entry), raw:entry, kind:"expr" });
  for (const entry of lessons) add({ type:"Leçon", emoji:entry.emoji || "📚", color:"#9E7A1A", title:entry.title, sub:entry.goal, blob:`${text(entry.title)} ${text(entry.goal)} ${text(entry.type)} ${text(entry.situationId)}`, relationBlob:thematicGeography({...entry,description:`${entry.title} ${entry.goal} ${entry.situationId || ""}`}), raw:entry, kind:"lesson" });
  for (const entry of database.situations || []) add({ type:"Situation", emoji:entry.emoji || "🗣️", color:"#9E7A1A", title:entry.titre || entry.title, jp:entry.nom_jp, sub:entry.contexte || entry.description, blob:`${text(entry.titre)} ${text(entry.title)} ${text(entry.nom_jp)} ${text(entry.contexte)} ${text(entry.description)} ${(entry.phrases || []).flatMap(phrase => [phrase.jp,phrase.romaji,phrase.fr]).join(" ")}`, relationBlob:thematicGeography(entry), raw:entry, kind:"situation" });
  for (const entry of database.scenarios || []) add({ type:"Situation", emoji:entry.emoji || "🎭", color:"#C9463D", title:entry.titre || entry.title, jp:entry.nom_jp, sub:entry.contexte || entry.description, blob:`${text(entry.titre)} ${text(entry.title)} ${text(entry.nom_jp)} ${text(entry.contexte)} ${text(entry.description)} ${text(entry.niveau)}`, relationBlob:thematicGeography(entry), raw:entry, kind:"scenario" });

  const tripItem = (entry, kind) => {
    const cityIds = [...new Set([...(entry.villes || []), ...(entry.jours || []).map(day => day.villeId)].filter(Boolean))];
    const placeIds = (entry.jours || []).flatMap(day => (day.activites || []).map(activity => activity.lieuId).filter(Boolean));
    const relationBlob = [...cityIds.map(id => cityContext(cityById.get(id))), ...placeIds.map(id => `${placeById.get(id)?.nom || ""} ${geographicalRelation(placeById.get(id))}`)].join(" ");
    add({ type:"Voyage", emoji:entry.emoji || "🧳", color:"#C9463D", title:entry.titre || "Mon voyage au Japon", sub:entry.description || `${entry.jours?.length || 0} jours`, blob:`${text(entry.titre)} ${text(entry.description)} ${text(entry.theme)} ${text(entry.sousTitre)}`, geographyBlob:relationBlob, raw:entry, kind });
  };
  (database.voyages_preconcus || []).forEach(entry => tripItem(entry,"trip_template"));
  trips.forEach(entry => tripItem(entry,"trip"));
  return items;
}

export function searchCatalog(index, query, limit = 60) {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return [];
  const terms = normalized.split(/\s+/).filter(Boolean);
  return index.map(item => {
    const direct = terms.every(term => item.searchText.includes(term));
    const geographic = terms.every(term => `${item.searchText} ${item.geographySearchText}`.includes(term));
    const related = terms.every(term => `${item.searchText} ${item.geographySearchText} ${item.relationSearchText}`.includes(term));
    if (!related) return null;
    const title = normalizeSearchText(item.title);
    const score = title === normalized ? 100 : title.startsWith(normalized) ? 80 : title.includes(normalized) ? 60 : geographic && !direct ? 50 : direct ? 40 : 18;
    return {...item,match:direct?"direct":geographic?"geographic":"related",score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,"fr")).slice(0,limit);
}

export function groupSearchResults(results, { limitPerGroup = 8 } = {}) {
  return SEARCH_GROUPS.map(group => ({ ...group, items:(results || []).filter(item => item.group === group.id).slice(0,limitPerGroup) })).filter(group => group.items.length);
}
