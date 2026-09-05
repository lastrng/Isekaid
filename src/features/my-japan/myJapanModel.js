import { getTripLifecycleStatus, TRIP_STATUS } from "../../entities/trip/tripLifecycle.js";

export function buildMyJapanSummary({ trips = [], cities = [], places = [], regionsCatalog = [], currentDate = new Date() } = {}) {
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
  const stamps = [...visitedCityIds].map(id=>{
    const city = cityById.get(id);
    return { id:`city:${id}`, cityId:id, label:`${city?.nom || id} Stamp`, emoji:city?.emoji || "🗾", unlockedBy:"place_completed" };
  });
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
    cityIds:[...visitedCityIds], regionNames:[...regions], placeIds:[...visitedPlaceIds], stamps, completedTripDetails, memories,
    collections:[
      {id:"cities",label:"Villes",emoji:"🏙️",count:visitedCityIds.size,total:null},
      {id:"regions",label:"Régions",emoji:"🗾",count:regions.size,total:regionsCatalog.length || null},
      {id:"places",label:"Lieux",emoji:"⛩️",count:visitedPlaceIds.size,total:null},
      {id:"stamps",label:"Tampons",emoji:"🔴",count:stamps.length,total:null},
    ],
    awaitingConfirmation,
  };
}
