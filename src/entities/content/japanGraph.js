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
  speak: ["phrase", "situation", "scenario"],
  explore: ["culture", "tradition", "place", "city", "region", "history", "food", "specialty"],
  personal: ["trip", "memory"],
};

export const CONTEXT_BRIDGE_RULES = Object.freeze([
  Object.freeze({ id:"restaurant-learning", themes:["food"], threshold:1, targets:["scenario:restaurant","situation:restaurant"], title:"Apprendre à commander au restaurant", emoji:"🍜", pillar:"learn" }),
  Object.freeze({ id:"onsen-rules", themes:["onsen"], threshold:1, targets:["tip:onsen-rules","code:onsen-lavage","code:onsen-tatouages"], title:"Connaître les règles de l’onsen", emoji:"♨️", pillar:"explore" }),
  Object.freeze({ id:"train-learning", themes:["transport"], threshold:2, targets:["scenario:train","situation:train","daily:trains"], title:"Japonais : prendre le train", emoji:"🚃", pillar:"learn" }),
]);

function stableSourceId(item,kind,index){
  return item?.id||item?.expression||normalize(item?.romaji||item?.nom_jp||item?.nom||item?.titre||item?.title||`${kind}-${index}`).replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}

export function contextualNodeTarget(node){
  if(!node)return null;
  const item=node.raw;
  if(node.kind==="place")return {pillar:"explore",type:"content",kind:"lieu",item};
  if(node.kind==="tradition")return {pillar:"explore",type:"content",kind:"tradition",item};
  if(node.kind==="code")return {pillar:"explore",type:"content",kind:"code",item};
  if(node.kind==="daily")return {pillar:"explore",type:"content",kind:"vie",item};
  if(node.kind==="history")return {pillar:"explore",type:"content",kind:"history",item};
  if(node.kind==="food")return {pillar:"explore",type:"content",kind:"repas",item};
  if(node.kind==="culture")return {pillar:"explore",type:"content",kind:"culture",item};
  if(node.kind==="region")return {pillar:"explore",type:"content",kind:"region",item};
  if(node.kind==="phrase")return {pillar:"learn",type:"content",kind:"expr",item};
  if(node.kind==="situation")return {pillar:"learn",type:"lesson",mode:"situations",situationId:node.sourceId,item};
  if(node.kind==="scenario")return {pillar:"learn",type:"scenario",scenarioId:node.sourceId,item};
  if(node.kind==="trip")return {pillar:"travel",type:"trip",tripId:node.sourceId,item};
  if(node.kind==="memory")return {pillar:"my-japan",type:"memory",memoryId:node.sourceId,item};
  return null;
}
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
  const specialties=(db.regions||[]).flatMap(region=>(region.specialites||[]).map((title,index)=>({id:`${region.id||normalize(region.nom)}-${index}`,title,regionId:region.id||normalize(region.nom),emoji:"🍱",sourceRegion:region.id||region.nom})));
  const groups = [["tip",CONTEXTUAL_CONTENT],["culture",db.culture],["tradition",db.traditions],["code",db.codes_sociaux],["daily",db.vie_quotidienne],["phrase",db.expressions],["situation",db.situations],["scenario",db.scenarios],["history",db.histoire],["food",db.repas],["specialty",specialties],["place",db.lieux],["city",db.villes],["region",db.regions]];
  const cities = new Map((db.villes || []).map(city => [city.id, city]));
  const regions = new Map((db.regions || []).flatMap(region => [[normalize(region.nom), region.id], [normalize(region.id), region.id]]));
  const catalog = groups.flatMap(([kind,items]) => (items || []).map((item,index) => {
    const sourceId=stableSourceId(item,kind,index);
    const cityId=item.cityId||item.villeId||(kind === "city" ? item.id : null);
    const rawRegion=item.regionId||item.region||cities.get(cityId)?.region||(kind==="region"?item.id:null);
    const node={
    id: `${kind}:${sourceId}`, kind, sourceId,
    title: item.title || item.titre || item.nom || item.romaji || item.nom_jp || item.traduction,
    summary: item.summary || item.resume || item.tagline || item.contexte || item.description || "",
    cityId,cityIds:cityId?[cityId]:[],
    regionId: regions.get(normalize(rawRegion)) || rawRegion || null,
    themeIds: item.themeIds || CONTENT_RELATIONS[`${kind}:${item.id || item.expression}`] || graphThemes(item), tags: item.tags || [], relations: item.relations || [], relatedContent: item.relatedContent || [], raw: item,
    };
    return {...node,target:contextualNodeTarget(node)};
  }));
  const placeById = new Map((db.lieux || []).map(place => [place.id, place]));
  const personal = [];
  for (const trip of trips || []) {
    if (!trip?.id) continue;
    const tripPlaces = [...new Set((trip.jours || []).flatMap(day => (day.activites || []).map(activity => activity.lieuId).filter(Boolean)))];
    const tripNode={ id: `trip:${trip.id}`, kind: "trip", sourceId: trip.id, title: trip.titre || "Mon voyage au Japon", summary: "Voyage personnel", cityId: null, cityIds:[...(trip.villes||[])], regionId: null, themeIds: [], tags: [], relations: tripPlaces.map(id => `place:${id}`), relatedContent: tripPlaces.map(id => `place:${id}`), raw: trip };
    personal.push({...tripNode,target:contextualNodeTarget(tripNode)});
    (trip.jours || []).forEach(day => (day.activites || []).forEach(activity => {
      if (!activity?.fait || (!activity.note && !activity.memoryPhoto)) return;
      const place = placeById.get(activity.lieuId);
      const memoryNode={ id: `memory:${trip.id}:${day.num}:${activity.id || activity.lieuId}`, kind: "memory", sourceId: activity.id || activity.lieuId, title: place?.nom || "Souvenir de voyage", summary: activity.note || "Souvenir enregistré", cityId: day.villeId || place?.villeId || null, cityIds:[day.villeId || place?.villeId].filter(Boolean), regionId: place?.regionId || null, themeIds: graphThemes(place || {}), tags: ["souvenir"], relations: [`trip:${trip.id}`, ...(activity.lieuId ? [`place:${activity.lieuId}`] : [])], relatedContent: activity.lieuId ? [`place:${activity.lieuId}`] : [], raw: { ...activity, tripId: trip.id, dayNumber: day.num } };
      personal.push({...memoryNode,target:contextualNodeTarget(memoryNode)});
    }));
  }
  for (const memory of memories || []) if (memory?.id && !personal.some(item => item.id === `memory:${memory.id}`)) {
    const memoryNode={ id: `memory:${memory.id}`, kind: "memory", sourceId: memory.id, title: memory.placeName || "Souvenir de voyage", summary: memory.note || "Souvenir enregistré", cityId: memory.cityId || null, cityIds:[memory.cityId].filter(Boolean), regionId: null, themeIds: [], tags: ["souvenir"], relations: memory.placeId ? [`place:${memory.placeId}`] : [], relatedContent: memory.placeId ? [`place:${memory.placeId}`] : [], raw: memory };
    personal.push({...memoryNode,target:contextualNodeTarget(memoryNode)});
  }
  return [...catalog, ...personal];
}

export function relatedToActivity(place, graph, { limit = 5, purpose } = {}) {
  if (!place) return [];
  const themes = new Set(graphThemes(place));
  const source = graph.find(node => node.kind === "place" && node.sourceId === place.id);
  const cityIds = new Set([place.cityId,place.villeId,...(place.cityIds||[]),...(place.cities||[]).map(city=>typeof city==="string"?city:city?.id)].filter(Boolean));
  const regionId = place.regionId || source?.regionId;
  const territoryNames=[place.nameFr,place.name,place.nom,place.capital].map(normalize).filter(Boolean);
  const ranked = graph.filter(node => !purpose || (PURPOSE_KINDS[purpose] || []).includes(node.kind)).filter(node => !(node.kind === "place" && node.sourceId === place.id)).map(node => {
    const shared = node.themeIds.filter(theme => themes.has(theme));
    const nearby = (place.a_proximite || []).includes(node.sourceId) && node.kind === "place";
    const sameCity = Boolean(node.cityId&&cityIds.has(node.cityId));
    const sameRegion = Boolean(regionId&&node.regionId&&normalize(regionId)===normalize(node.regionId));
    const namedLocal=territoryNames.some(name=>name.length>2&&normalize(node.title).includes(name));
    const explicit = (place.relatedContent || []).includes(node.id) || (node.relatedContent || []).includes(`place:${place.id}`) || (node.relations || []).includes(`place:${place.id}`);
    const score = (explicit ? 20 : 0) + (sameRegion ? 3 : 0) + (namedLocal ? 10 : 0) + shared.length * 4 + (nearby ? 9 : 0) + (sameCity ? 7 : 0) + (shared.length && node.kind === "tip" ? 8 : 0) + (shared.length && ["phrase","situation","scenario"].includes(node.kind) ? 3 : 0);
    return {...node, score, reason: explicit ? "Lié à ce lieu" : namedLocal&&node.kind==="specialty" ? "Spécialité locale" : nearby ? "À proximité" : sameCity ? "Dans cette ville" : sameRegion ? "Dans cette région" : shared.length ? "Pour cette activité" : "Relation contextuelle"};
  }).filter(node => node.score > 0).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
  const counts = new Map();
  return ranked.filter(node => {
    const count = counts.get(node.kind) || 0;
    counts.set(node.kind, count + 1);
    return count < 2;
  }).slice(0,limit);
}

function decorateConnection(node,overrides={}){
  return {...node,emoji:overrides.emoji||node.raw?.emoji||({scenario:"🎭",situation:"🗣️",phrase:"💬",place:"📍",food:"🍱",specialty:"🍱",tip:"💡",code:"🎌",daily:"🚃"}[node.kind]||"🔗"),pillar:overrides.pillar||node.target?.pillar||"explore",actionTitle:overrides.title||node.title,target:node.target||contextualNodeTarget(node),connectionId:overrides.connectionId||node.id};
}

function firstTarget(graph,ids){
  const candidates=ids.map(id=>graph.find(node=>node.id===id)).filter(Boolean);
  return candidates.find(node=>node.target)||candidates[0]||null;
}

export function buildActivityConnections(activity,graph,{limit=3}={}){
  const themeCounts=new Map(graphThemes(activity).map(theme=>[theme,1]));
  const ruled=CONTEXT_BRIDGE_RULES.filter(rule=>rule.themes.some(theme=>(themeCounts.get(theme)||0)>=rule.threshold)).map(rule=>{
    const node=firstTarget(graph,rule.targets);
    return node?decorateConnection(node,{...rule,connectionId:rule.id}):null;
  }).filter(Boolean);
  const contextual=relatedToActivity(activity,graph,{purpose:"speak",limit:6}).filter(node=>node.target).map(decorateConnection);
  return [...ruled,...contextual].filter((item,index,items)=>items.findIndex(other=>other.target?.type===item.target?.type&&(other.target?.scenarioId||other.target?.situationId||other.id)===(item.target?.scenarioId||item.target?.situationId||item.id))===index).slice(0,limit);
}

export function buildPrefectureConnections(prefecture,graph,{limitPerGroup=3}={}){
  if(!prefecture)return [];
  const cityIds=(prefecture.cities||[]).map(city=>typeof city==="string"?city:city?.id).filter(Boolean);
  const localPlaceNodes=graph.filter(node=>node.kind==="place"&&cityIds.includes(node.cityId));
  const subject={...prefecture,cityIds,regionId:prefecture.region,themeIds:[...new Set(localPlaceNodes.flatMap(node=>node.themeIds))]};
  const candidates=relatedToActivity(subject,graph,{limit:60});
  const definitions=[
    {id:"places",label:"Lieux de la préfecture",kinds:["place"],pillar:"explore"},
    {id:"specialties",label:"Une spécialité locale",kinds:["specialty","food"],pillar:"explore"},
    {id:"language",label:"Japonais pertinent",kinds:["scenario","situation","phrase"],pillar:"learn"},
  ];
  return definitions.map(definition=>({...definition,items:candidates.filter(node=>definition.kinds.includes(node.kind)).map(decorateConnection).slice(0,limitPerGroup)})).filter(group=>group.items.length);
}

function tripTransportCount(trip){
  const values=[...(trip.transportSegments||[]).map(segment=>segment.mode||segment.type),...(trip.jours||[]).flatMap(day=>[day.transport,...(day.activites||[]).map(activity=>activity.transport||activity.arrivee?.mode)])].filter(Boolean);
  return values.filter(value=>/train|shinkansen|metro|métro|rail/i.test(String(value))).length;
}

export function buildTripConnections(trip,graph,{limit=3}={}){
  if(!trip)return [];
  const placeIds=(trip.jours||[]).flatMap(day=>(day.activites||[]).map(activity=>activity.lieuId).filter(Boolean));
  const themeCounts=new Map();
  for(const placeId of placeIds){
    const node=graph.find(candidate=>candidate.kind==="place"&&candidate.sourceId===placeId);
    for(const theme of node?.themeIds||[])themeCounts.set(theme,(themeCounts.get(theme)||0)+1);
  }
  const transportCount=tripTransportCount(trip);
  if(transportCount)themeCounts.set("transport",Math.max(themeCounts.get("transport")||0,transportCount));
  return CONTEXT_BRIDGE_RULES.filter(rule=>rule.themes.some(theme=>(themeCounts.get(theme)||0)>=rule.threshold)).map(rule=>{
    const node=firstTarget(graph,rule.targets);
    return node?decorateConnection(node,{...rule,connectionId:`trip:${trip.id}:${rule.id}`}):null;
  }).filter(Boolean).slice(0,limit);
}
