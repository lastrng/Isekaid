import { contentReadingId, isContentRead, readingCount } from "./contentReading.js";
import { buildPrefectures } from "./prefectureModel.js";
import { getRecommendedDiscovery } from "../../entities/user/userContext.js";

export { JAPAN_PREFECTURES } from "./prefectureModel.js";

export const DISCOVER_SECTIONS = Object.freeze([
  { id:"culture",title:"Culture",emoji:"⛩️",accent:"red",description:"Rites, imaginaires et formes du Japon.",topics:[
    {id:"traditions",label:"Traditions",route:"traditions",available:true},
    {id:"festivals",label:"Fêtes",route:"traditions",filter:"saison",available:true},
    {id:"religion",label:"Religion",available:false},{id:"arts",label:"Arts",available:false},
    {id:"architecture",label:"Architecture",available:false},{id:"folklore",label:"Folklore",available:false},
  ]},
  { id:"society",title:"Société",emoji:"👥",accent:"indigo",description:"Comprendre les relations et le quotidien.",topics:[
    {id:"codes",label:"Codes sociaux",route:"codes",available:true},
    {id:"communication",label:"Communication",route:"codes",available:true},
    {id:"family",label:"Famille",route:"codes",available:true},
    {id:"work",label:"Travail",route:"vie",available:true},
    {id:"school",label:"École",route:"vie",available:true},
    {id:"daily",label:"Vie quotidienne",route:"vie",available:true},
  ]},
  { id:"gastronomy",title:"Gastronomie",emoji:"🍜",accent:"green",description:"Goûter le Japon et comprendre sa table.",catalog:"gastronomy",topics:[
    {id:"dishes",label:"Plats",catalog:"gastronomy",available:true},
    {id:"ingredients",label:"Ingrédients",available:false},{id:"regional",label:"Spécialités régionales",available:false},
    {id:"drinks",label:"Boissons",available:false},{id:"restaurants",label:"Restaurants",catalog:"gastronomy",available:true},
    {id:"etiquette",label:"Étiquette",route:"vie",available:true},
  ]},
  { id:"history",title:"Histoire",emoji:"📜",accent:"gold",description:"Périodes, événements et traces du passé.",route:"histoire",topics:[
    {id:"periods",label:"Périodes",route:"histoire",available:true},
    {id:"events",label:"Événements",route:"histoire",available:true},
    {id:"people",label:"Personnages",available:false},{id:"places",label:"Lieux historiques",catalog:"historical_places",cat:"histoire",available:true},
  ]},
  { id:"pop",title:"Pop culture",emoji:"🎮",accent:"pink",description:"Les cultures japonaises qui voyagent.",catalog:"pop",topics:[
    {id:"anime",label:"Anime / Manga",catalog:"pop",available:true},
    {id:"games",label:"Jeux vidéo",catalog:"pop",available:true},
    {id:"cinema",label:"Cinéma",catalog:"pop",available:true},
    {id:"music",label:"Musique",catalog:"pop",available:true},
    {id:"fashion",label:"Mode",catalog:"pop",available:true},
    {id:"trends",label:"Tendances",catalog:"pop",available:true},
  ]},
  { id:"practical",title:"Japon pratique",emoji:"🚃",accent:"blue",description:"Les gestes utiles avant et sur place.",catalog:"practical",topics:[
    {id:"transport",label:"Transports",catalog:"practical",available:true},
    {id:"konbini",label:"Konbini",catalog:"practical",available:true},
    {id:"onsen",label:"Onsen",catalog:"practical",available:true},
    {id:"restaurants",label:"Restaurants",catalog:"practical",available:true},
    {id:"payments",label:"Paiements",catalog:"practical",available:true},
    {id:"hotels",label:"Hôtels",catalog:"practical",available:true},
    {id:"waste",label:"Déchets",catalog:"practical",available:true},
    {id:"rules",label:"Règles du quotidien",route:"vie",available:true},
  ]},
]);

export function prefecturesWithContent(db = {}, options = {}) {
  return buildPrefectures({db,...options});
}

const RESULT_META = Object.freeze({
  culture:{kind:"culture",type:"Culture",emoji:"🎋",color:"#8B6FB0"},
  repas:{kind:"repas",type:"Gastronomie",emoji:"🍜",color:"#3A6645"},
  tradition:{kind:"tradition",type:"Tradition",emoji:"⛩️",color:"#C9463D"},
  code:{kind:"code",type:"Société",emoji:"👥",color:"#8B6FB0"},
  vie:{kind:"vie",type:"Japon pratique",emoji:"🏙️",color:"#5B7E9B"},
  region:{kind:"region",type:"Territoire",emoji:"🗾",color:"#4E8060"},
  history:{kind:"history",type:"Histoire",emoji:"📜",color:"#9E7A1A"},
  lieu:{kind:"lieu",type:"Lieu",emoji:"📍",color:"#4276A0"},
});

export function discoveryResult(type, item) {
  const meta = RESULT_META[type] || RESULT_META.culture;
  return {...meta,emoji:item?.emoji||meta.emoji,title:item?.titre||item?.nom||item?.romaji||item?.nom_jp||"Découverte du Japon",sub:item?.nom_jp||item?.tag||item?.categorie||"",summary:item?.resume||item?.tagline||item?.description||item?.insight||"",raw:item};
}

export function catalogItems(db = {}, catalog = "gastronomy") {
  if (catalog === "gastronomy") return (db.repas || []).map(item=>discoveryResult("repas",item));
  if (catalog === "historical_places") return (db.lieux || []).filter(item=>/temple|sanctuaire|château|histor|musée|patrimoine/i.test(`${item.nom} ${item.categorie} ${item.description}`)).map(item=>discoveryResult("lieu",item));
  if (catalog === "pop") return (db.culture || []).filter(item=>/pop|anime|manga|jeu|cinéma|film|musique|mode|tendance|karaoke|gacha/i.test(`${item.tag} ${item.titre} ${item.contenu} ${item.insight}`)).map(item=>discoveryResult("culture",item));
  if (catalog === "practical") return (db.vie_quotidienne || []).filter(item=>/transport|train|gare|konbini|onsen|restaurant|paiement|argent|hôtel|ryokan|déchet|règle|logement|commer|service/i.test(`${item.categorie} ${item.titre} ${item.resume} ${item.description}`)).map(item=>discoveryResult("vie",item));
  return [];
}

export function buildDiscoverHome({ db = {}, readingProgress = null, favorites = [], prefectureProgress = null, trips = [], userContext = null } = {}) {
  const readIds = new Set(Object.keys(readingProgress?.read || {}));
  const countKinds = kinds => [...readIds].filter(id=>kinds.some(kind=>id.startsWith(`${kind}:`))).length;
  const totals = {
    culture:(db.traditions||[]).length+(db.culture||[]).length,
    society:(db.codes_sociaux||[]).length+(db.vie_quotidienne||[]).length,
    gastronomy:(db.repas||[]).length,
    history:(db.histoire||[]).length,
    pop:catalogItems(db,"pop").length,
    practical:catalogItems(db,"practical").length,
  };
  return {
    sections:DISCOVER_SECTIONS.map(section=>({...section,total:totals[section.id]||0,read:countKinds(section.id==="culture"?["tradition","culture"]:section.id==="society"?["code","vie"]:section.id==="gastronomy"?["repas"]:section.id==="history"?["history"]:section.id==="pop"?["culture"]:["vie"]),availableTopics:section.topics.filter(topic=>topic.available).length})),
    prefectures:prefecturesWithContent(db,{progress:prefectureProgress,favorites,trips}),
    reading:{total:readingCount(readingProgress),ids:readIds},
    favorites: favorites.filter(favorite=>favorite?.item),
    suggestedUnread:userContext
      ? getRecommendedDiscovery({context:userContext,db,limit:8}).map(node=>discoveryResult(({food:"repas",daily:"vie",place:"lieu"})[node.kind]||node.kind,node.raw))
      : [
        ...(db.culture||[]).slice(0,2).map(item=>discoveryResult("culture",item)),
        ...(db.repas||[]).slice(0,2).map(item=>discoveryResult("repas",item)),
        ...(db.traditions||[]).slice(0,2).map(item=>discoveryResult("tradition",item)),
        ...(db.codes_sociaux||[]).slice(0,2).map(item=>discoveryResult("code",item)),
        ...(db.vie_quotidienne||[]).slice(0,2).map(item=>discoveryResult("vie",item)),
        ...(db.histoire||[]).slice(0,2).map(item=>discoveryResult("history",item)),
      ].filter(item=>!isContentRead(readingProgress,item.kind,item.raw)).slice(0,8),
  };
}

export function favoriteDiscoveryResult(favorite) {
  if (!favorite?.item) return null;
  const type = ({expression:"culture"})[favorite.type] || favorite.type;
  return discoveryResult(type,favorite.item);
}

function tokens(value) {
  return new Set(String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g," ").toLowerCase().split(/[^a-z0-9]+/).filter(token=>token.length>3));
}

export function relatedDiscoveries(db = {}, result, limit = 4) {
  if (!result?.raw) return [];
  const sourceId = contentReadingId(result.kind,result.raw);
  const sourceTokens = tokens([result.title,result.sub,result.summary,result.raw.categorie,result.raw.tag,result.raw.description,result.raw.contenu].join(" "));
  const pools = [
    ...(db.culture||[]).map(item=>discoveryResult("culture",item)),
    ...(db.repas||[]).map(item=>discoveryResult("repas",item)),
    ...(db.traditions||[]).map(item=>discoveryResult("tradition",item)),
    ...(db.codes_sociaux||[]).map(item=>discoveryResult("code",item)),
    ...(db.vie_quotidienne||[]).map(item=>discoveryResult("vie",item)),
    ...(db.histoire||[]).map(item=>discoveryResult("history",item)),
    ...(db.regions||[]).map(item=>discoveryResult("region",item)),
  ];
  return pools.map(item=>{
    const itemTokens=tokens([item.title,item.sub,item.summary,item.raw?.description,item.raw?.contenu].join(" "));
    let score=0; for(const token of sourceTokens) if(itemTokens.has(token)) score++;
    if(item.kind===result.kind) score+=0.25;
    return {...item,_score:score};
  }).filter(item=>contentReadingId(item.kind,item.raw)!==sourceId&&item._score>0).sort((a,b)=>b._score-a._score||a.title.localeCompare(b.title,"fr")).slice(0,limit);
}

export function filterCatalog(items, filter, readingProgress, favorites = []) {
  if (filter === "unread") return items.filter(item=>!isContentRead(readingProgress,item.kind,item.raw));
  if (filter === "favorites") {
    const ids = new Set(favorites.map(favorite=>contentReadingId(favorite.type,favorite.item)));
    return items.filter(item=>ids.has(contentReadingId(item.kind,item.raw)));
  }
  return items;
}
