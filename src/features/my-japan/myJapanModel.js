import { getTripLifecycleStatus, TRIP_STATUS } from "../../entities/trip/tripLifecycle.js";
import { getTripDateRange } from "../../entities/user/japanJourneyState.js";

function countLearnedExpressions(progress) {
  if (progress === null || progress === undefined) return null;
  if (Array.isArray(progress)) return progress.filter(Boolean).length;
  return Object.values(progress).filter(item => item === true || item?.learned === true || (item?.level || 0) >= 3).length;
}
function countLearnedKana(progress) {
  if (progress === null || progress === undefined) return null;
  return Object.values(progress).filter(item => (item?.level || item?.box || 0) >= 3).length;
}

/**
 * Builds the unlocked passport collection from actions recorded in trips.
 * Every stamp carries its unlock rule and evidence so the collection can be
 * extended without inventing rewards unrelated to the user's activity.
 */
export function buildPassportStamps({ visitedCityIds = [], cityById = new Map(), regions = new Set(), completedTrips = [] } = {}) {
  const stamps = [];
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
  for (const region of regions) {
    stamps.push({
      id: `region:${region}`,
      type: "region",
      region,
      label: `${region} Stamp`,
      emoji: "🗾",
      unlockedBy: "region_discovered",
      evidence: { region },
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
  return stamps;
}

export function buildMyJapanSummary({ trips = [], cities = [], places = [], regionsCatalog = [], expressionProgress, kanaProgress, favorites, currentDate = new Date() } = {}) {
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
  const learnedExpressions = countLearnedExpressions(expressionProgress);
  const learnedKana = countLearnedKana(kanaProgress);
  const favoritesCount = Array.isArray(favorites) ? favorites.length : null;
  const datedCompletedTrips = completedTrips.map(trip=>getTripDateRange(trip)).filter(Boolean);
  const daysInJapanKnown = completedTrips.length === datedCompletedTrips.length && completedTrips.length > 0;
  const daysInJapan = daysInJapanKnown ? datedCompletedTrips.reduce((sum, range)=>sum + range.duration, 0) : null;
  const stamps = buildPassportStamps({ visitedCityIds, cityById, regions, completedTrips });
  const memories = [];
  const completedTripDetails = completedTrips.map(trip=>{
    const done = (trip.jours||[]).flatMap(day=>(day.activites||[]).filter(activity=>activity.fait===true).map(activity=>({activity,day})));
    const cityIds = [...new Set(done.map(({day})=>day.villeId).filter(Boolean))];
    const notes = done.map(({activity})=>activity.note?.trim()).filter(Boolean);
    done.forEach(({activity,day})=>{
      const note=activity.note?.trim();
      memories.push({id:`${trip.id}:${day.num}:${activity.id||activity.lieuId}`,activityId:activity.id||null,tripId:trip.id,tripTitle:trip.titre||"Voyage au Japon",dayNumber:day.num||null,date:day.date||null,placeId:activity.lieuId||null,placeName:placeById.get(activity.lieuId)?.nom||"Souvenir",placeEmoji:placeById.get(activity.lieuId)?.emoji||"📍",note:note||"",photo:activity.memoryPhoto||null});
    });
    return {
      id:trip.id, title:trip.titre || "Voyage au Japon", startDate:trip.dateDebut || null,
      days:trip.jours?.length || 0, completedPlaces:done.length, notes:notes.length,
      cities:cityIds.map(id=>({id,name:cityById.get(id)?.nom||id,emoji:cityById.get(id)?.emoji||"📍"})),
      places:done.map(({activity})=>({id:activity.lieuId,name:placeById.get(activity.lieuId)?.nom||"Lieu visité",emoji:placeById.get(activity.lieuId)?.emoji||"📍"})),
    };
  }).sort((a,b)=>String(b.startDate||"").localeCompare(String(a.startDate||"")));
  return {
    completedTrips:completedTrips.length,
    completedDays:completedTrips.reduce((sum,trip)=>sum+(trip.jours||[]).filter(day=>(day.activites||[]).some(activity=>activity.fait===true)).length,0),
    visitedCities:visitedCityIds.size,
    visitedRegions:regions.size,
    visitedPlaces:visitedPlaceIds.size,
    visitedPrefectures: prefecturesKnown ? new Set(prefectureValues).size : null,
    prefectureNames: prefecturesKnown ? [...new Set(prefectureValues)] : [],
    prefecturesKnown,
    daysInJapan, daysInJapanKnown,
    learnedExpressions, learnedExpressionsKnown: learnedExpressions !== null,
    learnedKana, learnedKanaKnown: learnedKana !== null,
    favoritesCount, favoritesKnown: favoritesCount !== null,
    cityIds:[...visitedCityIds], regionNames:[...regions], placeIds:[...visitedPlaceIds], stamps, completedTripDetails, memories,
    collections:[
      {id:"cities",label:"Villes",emoji:"🏙️",count:visitedCityIds.size,total:null},
      {id:"regions",label:"Régions",emoji:"🗾",count:regions.size,total:regionsCatalog.length || null},
      {id:"places",label:"Lieux",emoji:"⛩️",count:visitedPlaceIds.size,total:null},
      {id:"stamps",label:"Tampons",emoji:"🔴",count:stamps.length,total:null},
      ...(prefecturesKnown && prefectureValues.length ? [{id:"prefectures",label:"Préfectures",emoji:"🗾",count:new Set(prefectureValues).size,total:null}] : []),
      ...(favoritesCount !== null ? [{id:"favorites",label:"Favoris",emoji:"♥️",count:favoritesCount,total:null}] : []),
      ...(learnedKana !== null || learnedExpressions !== null ? [{id:"learning",label:"Apprentissages",emoji:"🈶",count:(learnedKana || 0) + (learnedExpressions || 0),total:null}] : []),
    ],
    awaitingConfirmation,
  };
}
