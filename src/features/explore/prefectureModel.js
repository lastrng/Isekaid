import { TRIP_STATUS, getTripLifecycleStatus } from "../../entities/trip/tripLifecycle.js";

export const PREFECTURE_PROGRESS_KEY = "isekaid_prefecture_progress_v1";
export const PREFECTURE_TOTAL = 47;

const EMPTY_EDITORIAL = Object.freeze({
  flag:null,
  symbol:null,
  heroImage:null,
  shortDescription:null,
  description:null,
  history:null,
  geography:null,
  culture:null,
  localFood:[],
  specialties:[],
  festivals:[],
  prominentPlaces:[],
  nature:null,
  cities:[],
  bestSeasons:[],
  travelTips:[],
  funFacts:[],
  relatedContent:[],
  relatedPlaces:[],
});

// Métadonnées d'identité uniquement. Les champs éditoriaux restent vides et
// pourront être alimentés par `db.prefectures` sans modifier les interfaces.
const PREFECTURE_IDENTITIES = [
  ["hokkaido","Hokkaidō","北海道","ほっかいどう","Hokkaidō","Sapporo",14,1],
  ["aomori","Aomori","青森県","あおもりけん","Tōhoku","Aomori",13,2],
  ["iwate","Iwate","岩手県","いわてけん","Tōhoku","Morioka",14,3],
  ["miyagi","Miyagi","宮城県","みやぎけん","Tōhoku","Sendai",14,4],
  ["akita","Akita","秋田県","あきたけん","Tōhoku","Akita",12,3],
  ["yamagata","Yamagata","山形県","やまがたけん","Tōhoku","Yamagata",12,4],
  ["fukushima","Fukushima","福島県","ふくしまけん","Tōhoku","Fukushima",13,5],
  ["ibaraki","Ibaraki","茨城県","いばらきけん","Kantō","Mito",14,6],
  ["tochigi","Tochigi","栃木県","とちぎけん","Kantō","Utsunomiya",13,6],
  ["gunma","Gunma","群馬県","ぐんまけん","Kantō","Maebashi",12,6],
  ["saitama","Saitama","埼玉県","さいたまけん","Kantō","Saitama",13,7],
  ["chiba","Chiba","千葉県","ちばけん","Kantō","Chiba",15,8],
  ["tokyo","Tokyo","東京都","とうきょうと","Kantō","Tokyo",14,8],
  ["kanagawa","Kanagawa","神奈川県","かながわけん","Kantō","Yokohama",13,9],
  ["niigata","Niigata","新潟県","にいがたけん","Chūbu","Niigata",11,5],
  ["toyama","Toyama","富山県","とやまけん","Chūbu","Toyama",10,6],
  ["ishikawa","Ishikawa","石川県","いしかわけん","Chūbu","Kanazawa",9,6],
  ["fukui","Fukui","福井県","ふくいけん","Chūbu","Fukui",8,7],
  ["yamanashi","Yamanashi","山梨県","やまなしけん","Chūbu","Kōfu",12,8],
  ["nagano","Nagano","長野県","ながのけん","Chūbu","Nagano",11,7],
  ["gifu","Gifu","岐阜県","ぎふけん","Chūbu","Gifu",10,7],
  ["shizuoka","Shizuoka","静岡県","しずおかけん","Chūbu","Shizuoka",11,9],
  ["aichi","Aichi","愛知県","あいちけん","Chūbu","Nagoya",9,8],
  ["mie","Mie","三重県","みえけん","Kansai","Tsu",8,9],
  ["shiga","Shiga","滋賀県","しがけん","Kansai","Ōtsu",8,8],
  ["kyoto","Kyoto","京都府","きょうとふ","Kansai","Kyoto",7,8],
  ["osaka","Osaka","大阪府","おおさかふ","Kansai","Osaka",7,9],
  ["hyogo","Hyōgo","兵庫県","ひょうごけん","Kansai","Kobe",6,8],
  ["nara","Nara","奈良県","ならけん","Kansai","Nara",8,10],
  ["wakayama","Wakayama","和歌山県","わかやまけん","Kansai","Wakayama",7,11],
  ["tottori","Tottori","鳥取県","とっとりけん","Chūgoku","Tottori",5,7],
  ["shimane","Shimane","島根県","しまねけん","Chūgoku","Matsue",4,7],
  ["okayama","Okayama","岡山県","おかやまけん","Chūgoku","Okayama",5,8],
  ["hiroshima","Hiroshima","広島県","ひろしまけん","Chūgoku","Hiroshima",4,8],
  ["yamaguchi","Yamaguchi","山口県","やまぐちけん","Chūgoku","Yamaguchi",3,8],
  ["tokushima","Tokushima","徳島県","とくしまけん","Shikoku","Tokushima",6,10],
  ["kagawa","Kagawa","香川県","かがわけん","Shikoku","Takamatsu",5,9],
  ["ehime","Ehime","愛媛県","えひめけん","Shikoku","Matsuyama",4,10],
  ["kochi","Kōchi","高知県","こうちけん","Shikoku","Kōchi",5,11],
  ["fukuoka","Fukuoka","福岡県","ふくおかけん","Kyūshū & Okinawa","Fukuoka",2,9],
  ["saga","Saga","佐賀県","さがけん","Kyūshū & Okinawa","Saga",1,9],
  ["nagasaki","Nagasaki","長崎県","ながさきけん","Kyūshū & Okinawa","Nagasaki",0,10],
  ["kumamoto","Kumamoto","熊本県","くまもとけん","Kyūshū & Okinawa","Kumamoto",2,11],
  ["oita","Ōita","大分県","おおいたけん","Kyūshū & Okinawa","Ōita",3,10],
  ["miyazaki","Miyazaki","宮崎県","みやざきけん","Kyūshū & Okinawa","Miyazaki",3,12],
  ["kagoshima","Kagoshima","鹿児島県","かごしまけん","Kyūshū & Okinawa","Kagoshima",2,13],
  ["okinawa","Okinawa","沖縄県","おきなわけん","Kyūshū & Okinawa","Naha",0,13],
];

export const JAPAN_PREFECTURES = Object.freeze(PREFECTURE_IDENTITIES.map(([id,nameFr,nameJa,nameKana,region,capital,mapX,mapY],index)=>Object.freeze({
  ...EMPTY_EDITORIAL,
  id,
  slug:id,
  nameFr,
  nameJa,
  nameKana,
  name:nameFr,
  region,
  capital,
  number:index+1,
  mapX,
  mapY,
  visited:false,
  favorite:false,
  discovered:false,
  stampUnlocked:false,
})));

const CITY_PREFECTURES = Object.freeze({
  tokyo:"tokyo",kyoto:"kyoto",osaka:"osaka",nara:"nara",hiroshima:"hiroshima",
  hakone:"kanagawa",yokohama:"kanagawa",kanazawa:"ishikawa",takayama:"gifu",
  uji:"kyoto",himeji:"hyogo",sapporo:"hokkaido",fukuoka:"fukuoka",naha:"okinawa",
});

function normalizeId(value){
  const normalized=String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  const match=JAPAN_PREFECTURES.find(item=>item.id===normalized||normalizeIdShallow(item.nameFr)===normalized||item.nameJa===value);
  return match?.id||normalized;
}
function normalizeIdShallow(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");}

export function emptyPrefectureProgress(){return {version:1,entries:{}};}

export function normalizePrefectureProgress(value){
  if(!value||typeof value!=="object")return emptyPrefectureProgress();
  const source=value.entries&&typeof value.entries==="object"?value.entries:{};
  const entries={};
  for(const [rawId,entry] of Object.entries(source)){
    const id=normalizeId(rawId);
    if(!JAPAN_PREFECTURES.some(item=>item.id===id)||!entry||typeof entry!=="object")continue;
    entries[id]={
      discovered:entry.discovered===true,
      discoveredAt:typeof entry.discoveredAt==="string"?entry.discoveredAt:null,
    };
  }
  return {version:1,entries};
}

export function loadPrefectureProgress(storage=globalThis.localStorage){
  try{return normalizePrefectureProgress(JSON.parse(storage?.getItem(PREFECTURE_PROGRESS_KEY)||"null"));}
  catch{return emptyPrefectureProgress();}
}

export function savePrefectureProgress(progress,storage=globalThis.localStorage){
  try{storage?.setItem(PREFECTURE_PROGRESS_KEY,JSON.stringify(normalizePrefectureProgress(progress)));return true;}
  catch{return false;}
}

export function markPrefectureDiscovered(progress,prefectureId,now=new Date()){
  const current=normalizePrefectureProgress(progress);
  const id=normalizeId(prefectureId);
  if(!JAPAN_PREFECTURES.some(item=>item.id===id))return current;
  const previous=current.entries[id];
  if(previous?.discovered)return current;
  return {...current,entries:{...current.entries,[id]:{discovered:true,discoveredAt:now.toISOString()}}};
}

export function discoveredPrefectureIds(progress){
  const normalized=normalizePrefectureProgress(progress);
  return new Set(Object.entries(normalized.entries).filter(([,entry])=>entry.discovered).map(([id])=>id));
}

export function deriveVisitedPrefectureIds({trips=[],cities=[]}={}){
  const cityById=new Map(cities.map(city=>[city.id,city]));
  const visited=new Set();
  for(const trip of trips){
    if(getTripLifecycleStatus(trip)===TRIP_STATUS.CANCELLED)continue;
    for(const day of trip?.jours||[]){
      if(!(day.activites||[]).some(activity=>activity.fait===true))continue;
      const city=cityById.get(day.villeId);
      const raw=city?.prefectureId||city?.prefecture||CITY_PREFECTURES[day.villeId];
      const id=normalizeId(raw);
      if(JAPAN_PREFECTURES.some(item=>item.id===id))visited.add(id);
    }
  }
  return visited;
}

export function prefectureProgressSummary({progress,visitedIds=new Set()}={}){
  const discovered=discoveredPrefectureIds(progress);
  for(const id of visitedIds)discovered.add(id);
  return {discovered:discovered.size,visited:visitedIds.size,total:PREFECTURE_TOTAL,discoveredIds:[...discovered],visitedIds:[...visitedIds]};
}

function editorialRecord(db,prefecture){
  return (db?.prefectures||[]).find(item=>normalizeId(item.id||item.slug||item.nameFr||item.name)===prefecture.id)||{};
}

export function buildPrefectures({db={},progress,favorites=[],trips=[]}={}){
  const discovered=discoveredPrefectureIds(progress);
  const visited=deriveVisitedPrefectureIds({trips,cities:db.villes||[]});
  const favoriteIds=new Set((favorites||[]).filter(item=>item.type==="prefecture").map(item=>normalizeId(item.item?.id||item.item?.slug||item.item?.nameFr||item.item?.name)));
  return JAPAN_PREFECTURES.map(prefecture=>{
    const editorial=editorialRecord(db,prefecture);
    const cities=(db.villes||[]).filter(city=>normalizeId(city.prefectureId||city.prefecture||CITY_PREFECTURES[city.id])===prefecture.id);
    const cityIds=new Set(cities.map(city=>city.id));
    const places=(db.lieux||[]).filter(place=>cityIds.has(place.villeId)||normalizeId(place.prefectureId||place.prefecture)===prefecture.id);
    const editorialRelated=Array.isArray(editorial.relatedPlaces)?editorial.relatedPlaces:[];
    const relatedPlaces=[...places];
    for(const reference of editorialRelated){
      const resolved=typeof reference==="string"?(db.lieux||[]).find(place=>place.id===reference)||reference:reference;
      if(typeof resolved==="string"||!relatedPlaces.some(item=>typeof item!=="string"&&item.id===resolved?.id))relatedPlaces.push(resolved);
    }
    const merged={...prefecture,...editorial,id:prefecture.id,slug:prefecture.slug,nameFr:editorial.nameFr||prefecture.nameFr,name:editorial.nameFr||prefecture.nameFr,nameJa:editorial.nameJa||prefecture.nameJa,nameKana:editorial.nameKana||prefecture.nameKana,region:editorial.region||prefecture.region,capital:editorial.capital||prefecture.capital};
    const editorialAvailable=["shortDescription","description","history","geography","culture","localFood","specialties","festivals","prominentPlaces","nature","bestSeasons","travelTips","funFacts","relatedContent"].some(field=>Array.isArray(editorial[field])?editorial[field].length:Boolean(editorial[field]));
    return {...merged,cities:editorial.cities?.length?editorial.cities:cities,places:relatedPlaces,relatedPlaces,available:Boolean(editorialAvailable||relatedPlaces.length),discovered:discovered.has(prefecture.id)||visited.has(prefecture.id),favorite:favoriteIds.has(prefecture.id),visited:visited.has(prefecture.id),stampUnlocked:visited.has(prefecture.id)};
  });
}
