import { getTripLifecycleStatus, TRIP_STATUS } from "../../entities/trip/tripLifecycle.js";
import { getTripDateRange } from "../../entities/user/japanJourneyState.js";
import { deriveVisitedPrefectureIds, JAPAN_PREFECTURES, prefectureProgressSummary } from "../explore/prefectureModel.js";
import { normalizeMemoryPhotos } from "./memoryPhotos.js";

function countLearnedExpressions(progress) {
  if (progress === null || progress === undefined) return null;
  if (Array.isArray(progress)) return progress.filter(Boolean).length;
  return Object.values(progress).filter(item => item === true || item?.learned === true || (item?.level || 0) >= 3).length;
}
function countLearnedKana(progress) {
  if (progress === null || progress === undefined) return null;
  return Object.values(progress).filter(item => (item?.level || item?.box || 0) >= 3).length;
}

export const PASSPORT_BADGES = Object.freeze([
  { id: "first_trip", label: "Première aventure", description: "Terminer un premier voyage", emoji: "🎒", check: summary => summary.completedTrips >= 1 },
  { id: "ramen_rookie", label: "Ramen Rookie", description: "Visiter ou enregistrer un lieu lié aux ramen", emoji: "🍜", check: summary => summary.memories.some(memory => /ramen/i.test(`${memory.placeName} ${memory.note}`)) || summary.favoriteCollections?.find(collection=>collection.id==="saved_places")?.items.some(favorite=>/ramen/i.test(JSON.stringify(favorite.item||{}))) },
  { id: "sumimasen_master", label: "Expressions essentielles", description: "Apprendre au moins 5 expressions", emoji: "🈶", check: summary => (summary.learnedExpressions || 0) >= 5 },
  { id: "city_collector", label: "Explorateur de villes", description: "Visiter 3 villes japonaises", emoji: "🗾", check: summary => summary.visitedCities >= 3 },
  { id: "japan_addict", label: "Japan Addict", description: "Maintenir une série quotidienne de 30 jours", emoji: "🔥", check: (_summary, context) => Math.max(context.streak?.count || 0, context.streak?.best || 0) >= 30 },
]);

export function buildPassportBadges(summary, context = {}) {
  return PASSPORT_BADGES.filter(definition => definition.check(summary, context)).map(({ check, ...badge }) => badge);
}

export const STAMP_TYPE_DEFINITIONS = Object.freeze([
  Object.freeze({ id:"prefecture", label:"Préfecture", emoji:"🗾" }),
  Object.freeze({ id:"city", label:"Ville", emoji:"🏙️" }),
  Object.freeze({ id:"culture", label:"Culture", emoji:"🏮" }),
  Object.freeze({ id:"learning", label:"Apprentissage", emoji:"🈶" }),
  Object.freeze({ id:"trip", label:"Voyage", emoji:"🎒" }),
  Object.freeze({ id:"special", label:"Événement spécial", emoji:"✨" }),
]);

export const FAVORITE_COLLECTION_DEFINITIONS = Object.freeze([
  Object.freeze({ id:"saved_places", label:"Lieux sauvegardés", emoji:"📍", types:["lieu","place"] }),
  Object.freeze({ id:"saved_content", label:"Contenus sauvegardés", emoji:"📚", types:["cult","culture","history","tradition","code","vie","region"] }),
  Object.freeze({ id:"favorite_food", label:"Plats favoris", emoji:"🍱", types:["repas","food","dish"] }),
  Object.freeze({ id:"favorite_prefectures", label:"Préfectures favorites", emoji:"🗾", types:["prefecture"] }),
  Object.freeze({ id:"favorite_expressions", label:"Expressions favorites", emoji:"🗣️", types:["expr","expression"] }),
]);

function buildFavoriteCollections(favorites) {
  const source=Array.isArray(favorites)?favorites:[];
  return FAVORITE_COLLECTION_DEFINITIONS.map(definition=>({
    id:definition.id,label:definition.label,emoji:definition.emoji,
    items:source.filter(favorite=>definition.types.includes(favorite?.type)),
  })).map(collection=>({...collection,count:collection.items.length}));
}

function tripCard(trip,status){
  return {
    id:trip.id,title:trip.titre||"Voyage au Japon",status,
    startDate:trip.dateDebut||null,endDate:trip.dateFin||null,
    days:trip.jours?.length||0,cities:[...new Set((trip.jours||[]).map(day=>day.villeId).filter(Boolean))],
  };
}

export function getTravelAnniversaries(trips = [], currentDate = new Date()) {
  const date = currentDate instanceof Date ? currentDate : new Date(currentDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return trips.filter(trip => {
    if (!trip?.dateDebut || trip.status === TRIP_STATUS.CANCELLED) return false;
    const start = new Date(`${trip.dateDebut}T12:00:00`);
    return !Number.isNaN(start.getTime()) && start.getMonth() + 1 === month && start.getDate() === day && start.getFullYear() < date.getFullYear();
  }).map(trip => ({
    tripId: trip.id,
    title: trip.titre || "Voyage au Japon",
    yearsAgo: date.getFullYear() - new Date(`${trip.dateDebut}T12:00:00`).getFullYear(),
    date: trip.dateDebut,
  }));
}

/**
 * Builds the unlocked passport collection from actions recorded in trips.
 * Every stamp carries its unlock rule and evidence so the collection can be
 * extended without inventing rewards unrelated to the user's activity.
 */
export function buildPassportStamps({ visitedCityIds = [], visitedPrefectureIds = [], cityById = new Map(), completedTrips = [], learnedExpressions = 0, learnedKana = 0 } = {}) {
  const stamps = [];
  const prefectureById=new Map(JAPAN_PREFECTURES.map(prefecture=>[prefecture.id,prefecture]));
  for (const prefectureId of visitedPrefectureIds) {
    const prefecture=prefectureById.get(prefectureId);
    stamps.push({
      id:`prefecture:${prefectureId}`,type:"prefecture",prefectureId,
      label:`${prefecture?.nameFr||prefectureId} · Préfecture`,emoji:prefecture?.symbol||"🗾",
      unlockedBy:"prefecture_visited",evidence:{prefectureId},
    });
  }
  for (const cityId of visitedCityIds) {
    const city = cityById.get(cityId);
    stamps.push({
      id: `city:${cityId}`,
      type: "city",
      cityId,
      label: `${city?.nom || cityId} Stamp`,
      emoji: city?.emoji || "🗾",
      unlockedBy: "place_or_day_completed",
      evidence: { cityId },
    });
  }
  for (const trip of completedTrips) {
    stamps.push({
      id: `trip:${trip.id}`,
      type: "trip",
      tripId: trip.id,
      label: `${trip.titre || "Voyage au Japon"} · accompli`,
      emoji: "🎒",
      unlockedBy: "trip_completed",
      evidence: { tripId: trip.id },
    });
  }
  if(learnedExpressions>=5)stamps.push({id:"learning:expressions-5",type:"learning",label:"5 expressions maîtrisées",emoji:"🗣️",unlockedBy:"expressions_learned",evidence:{count:learnedExpressions,threshold:5}});
  if(learnedKana>=10)stamps.push({id:"learning:kana-10",type:"learning",label:"10 kana maîtrisés",emoji:"あ",unlockedBy:"kana_mastered",evidence:{count:learnedKana,threshold:10}});
  return stamps;
}

export function buildMyJapanSummary({ trips = [], cities = [], places = [], regionsCatalog = [], expressionProgress, kanaProgress, favorites, prefectureProgress, streak, currentDate = new Date() } = {}) {
  const cityById = new Map(cities.map(city=>[city.id,city]));
  const placeById = new Map(places.map(place=>[place.id,place]));
  const completedTrips = trips.filter(trip=>getTripLifecycleStatus(trip,currentDate)===TRIP_STATUS.COMPLETED);
  const awaitingConfirmation = trips.filter(trip=>getTripLifecycleStatus(trip,currentDate)===TRIP_STATUS.AWAITING_CONFIRMATION).map(trip=>({id:trip.id,title:trip.titre||"Voyage au Japon",startDate:trip.dateDebut||null,days:trip.jours?.length||0}));
  const visitedPlaceIds = new Set();
  const visitedCityIds = new Set();
  for (const trip of trips) {
    if(getTripLifecycleStatus(trip,currentDate)===TRIP_STATUS.CANCELLED) continue;
    for (const day of trip?.jours || []) {
    const completedActivities = (day.activites || []).filter(activity=>activity.fait === true);
    if (!completedActivities.length) continue;
    if (day.villeId) visitedCityIds.add(day.villeId);
    completedActivities.forEach(activity=>activity.lieuId && visitedPlaceIds.add(activity.lieuId));
    }
  }
  const regions = new Set([...visitedCityIds].map(id=>cityById.get(id)?.region).filter(Boolean));
  const prefectureValues = [...visitedCityIds].map(id=>cityById.get(id)?.prefecture || cityById.get(id)?.prefectureId).filter(Boolean);
  const prefecturesKnown = visitedCityIds.size === 0 || prefectureValues.length === visitedCityIds.size;
  const visitedPrefectureIds=deriveVisitedPrefectureIds({trips,cities});
  const prefectureStats = prefectureProgress===undefined ? null : prefectureProgressSummary({progress:prefectureProgress,visitedIds:visitedPrefectureIds});
  const learnedExpressions = countLearnedExpressions(expressionProgress);
  const learnedKana = countLearnedKana(kanaProgress);
  const favoritesCount = Array.isArray(favorites) ? favorites.length : null;
  const favoriteCollections=buildFavoriteCollections(favorites);
  const datedCompletedTrips = completedTrips.map(trip=>getTripDateRange(trip)).filter(Boolean);
  const daysInJapanKnown = completedTrips.length === datedCompletedTrips.length && completedTrips.length > 0;
  const daysInJapan = daysInJapanKnown ? datedCompletedTrips.reduce((sum, range)=>sum + range.duration, 0) : null;
  const stamps = buildPassportStamps({ visitedCityIds, visitedPrefectureIds, cityById, completedTrips, learnedExpressions:learnedExpressions||0, learnedKana:learnedKana||0 });
  const memories = [];
  const completedTripDetails = completedTrips.map(trip=>{
    const dateRange = getTripDateRange(trip);
    const done = (trip.jours||[]).flatMap(day=>(day.activites||[]).filter(activity=>activity.fait===true).map(activity=>({activity,day})));
    const cityIds = [...new Set(done.map(({day})=>day.villeId).filter(Boolean))];
    const notes = done.map(({activity})=>activity.note?.trim()).filter(Boolean);
    done.forEach(({activity,day})=>{
      const note=activity.note?.trim();
      const photos=normalizeMemoryPhotos(activity);
      memories.push({id:`${trip.id}:${day.num}:${activity.id||activity.lieuId}`,activityId:activity.id||null,tripId:trip.id,tripTitle:trip.titre||"Voyage au Japon",dayNumber:day.num||null,date:day.date||null,placeId:activity.lieuId||null,placeName:placeById.get(activity.lieuId)?.nom||"Souvenir",placeEmoji:placeById.get(activity.lieuId)?.emoji||"📍",note:note||"",photos,photo:photos[0]||null});
    });
    return {
      id:trip.id, title:trip.titre || "Voyage au Japon", startDate:trip.dateDebut || null,
      endDate:trip.dateFin || null, days:trip.jours?.length || 0,
      daysInJapan:dateRange?.duration ?? null,
      completedPlaces:new Set(done.map(({activity})=>activity.lieuId).filter(Boolean)).size,
      visitedPrefectures:deriveVisitedPrefectureIds({trips:[trip],cities}).size,
      notes:notes.length,
      noteEntries:done.filter(({activity})=>activity.note?.trim()).map(({activity,day})=>({
        text:activity.note.trim(), dayNumber:day.num || null, date:day.date || null,
        placeId:activity.lieuId || null,
      })),
      cities:cityIds.map(id=>({id,name:cityById.get(id)?.nom||id,emoji:cityById.get(id)?.emoji||"📍"})),
      places:done.map(({activity})=>({id:activity.lieuId,name:placeById.get(activity.lieuId)?.nom||"Lieu visité",emoji:placeById.get(activity.lieuId)?.emoji||"📍"})),
    };
  }).sort((a,b)=>String(b.startDate||"").localeCompare(String(a.startDate||"")));
  const tripCollections={upcoming:[],current:[],completed:[]};
  for(const trip of trips){
    const status=getTripLifecycleStatus(trip,currentDate);
    if(status===TRIP_STATUS.PLANNED)tripCollections.upcoming.push(tripCard(trip,status));
    if(status===TRIP_STATUS.ACTIVE)tripCollections.current.push(tripCard(trip,status));
    if(status===TRIP_STATUS.COMPLETED)tripCollections.completed.push(tripCard(trip,status));
  }
  const summary = {
    completedTrips:completedTrips.length,
    completedDays:completedTrips.reduce((sum,trip)=>sum+(trip.jours||[]).filter(day=>(day.activites||[]).some(activity=>activity.fait===true)).length,0),
    visitedCities:visitedCityIds.size,
    visitedRegions:regions.size,
    visitedPlaces:visitedPlaceIds.size,
    discoveredPrefectures:prefectureStats?.discovered??0,
    visitedPrefectures:prefectureStats?.visited??(prefecturesKnown ? new Set(prefectureValues).size : null),
    prefectureTotal:prefectureStats?.total??47,
    prefectureNames:prefectureStats?prefectureStats.visitedIds:(prefecturesKnown ? [...new Set(prefectureValues)] : []),
    discoveredPrefectureIds:prefectureStats?.discoveredIds||[],
    visitedPrefectureIds:prefectureStats?.visitedIds||[...visitedPrefectureIds],
    prefecturesKnown:prefectureStats?true:prefecturesKnown,
    daysInJapan, daysInJapanKnown,
    learnedExpressions, learnedExpressionsKnown: learnedExpressions !== null,
    learnedKana, learnedKanaKnown: learnedKana !== null,
    favoritesCount, favoritesKnown: favoritesCount !== null,
    cityIds:[...visitedCityIds], regionNames:[...regions], placeIds:[...visitedPlaceIds], stamps,
    savedPlaces:favoriteCollections.find(collection=>collection.id==="saved_places")?.count||0,
    favoriteCollections,
    customCollections:[],
    collectionSchema:{version:1,supportsCustomCollections:true},
    tripCollections,
    completedTripDetails, tripRecaps:completedTripDetails, memories, journalEntries:memories,
    collections:[
      {id:"cities",label:"Villes",emoji:"🏙️",count:visitedCityIds.size,total:null},
      {id:"regions",label:"Régions",emoji:"🗾",count:regions.size,total:regionsCatalog.length || null},
      {id:"places",label:"Lieux",emoji:"⛩️",count:visitedPlaceIds.size,total:null},
      {id:"stamps",label:"Tampons",emoji:"🔴",count:stamps.length,total:null},
      ...(prefectureStats ? [
        {id:"prefectures_discovered",label:"Préfectures découvertes",emoji:"🧭",count:prefectureStats.discovered,total:prefectureStats.total},
        {id:"prefectures_visited",label:"Préfectures visitées",emoji:"🗾",count:prefectureStats.visited,total:prefectureStats.total},
      ] : prefecturesKnown && prefectureValues.length ? [{id:"prefectures",label:"Préfectures",emoji:"🗾",count:new Set(prefectureValues).size,total:null}] : []),
      ...(favoritesCount !== null ? [{id:"favorites",label:"Favoris",emoji:"♥️",count:favoritesCount,total:null}] : []),
      ...(learnedKana !== null || learnedExpressions !== null ? [{id:"learning",label:"Apprentissages",emoji:"🈶",count:(learnedKana || 0) + (learnedExpressions || 0),total:null}] : []),
    ],
    awaitingConfirmation,
  };
  summary.carnets=completedTripDetails.map(trip=>({
    id:`carnet:${trip.id}`,tripId:trip.id,title:`Carnet · ${trip.title}`,
    startDate:trip.startDate,endDate:trip.endDate,notes:trip.notes,
    photos:memories.filter(memory=>memory.tripId===trip.id).reduce((count,memory)=>count+(memory.photos?.length||0),0),
    visitedPlaces:trip.completedPlaces,status:trip.notes>0||memories.some(memory=>memory.tripId===trip.id&&memory.photo)?"started":"ready",
  }));
  summary.badgeProgress=PASSPORT_BADGES.map(({check,...badge})=>({...badge,unlocked:Boolean(check(summary,{streak}))}));
  summary.badges = summary.badgeProgress.filter(badge=>badge.unlocked);
  summary.nextBadge = summary.badgeProgress.find(badge=>!badge.unlocked) || null;
  summary.latestMemory = completedTripDetails[0] || null;
  summary.dashboardCollections = [
    {id:"saved_places",label:"Lieux",emoji:"♥️",count:favoriteCollections.find(collection=>collection.id==="saved_places")?.count||0},
    {id:"saved_content",label:"Contenus",emoji:"📚",count:favoriteCollections.find(collection=>collection.id==="saved_content")?.count||0},
    {id:"favorite_food",label:"Saveurs",emoji:"🍜",count:favoriteCollections.find(collection=>collection.id==="favorite_food")?.count||0},
    {id:"favorite_expressions",label:"Expressions",emoji:"💬",count:favoriteCollections.find(collection=>collection.id==="favorite_expressions")?.count||0},
  ];
  summary.stampTypes=STAMP_TYPE_DEFINITIONS;
  summary.anniversaries = getTravelAnniversaries(trips, currentDate);
  return summary;
}
