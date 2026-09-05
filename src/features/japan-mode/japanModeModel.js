import { getActiveTrip, getCurrentTripDay, getDailyProgress, getNextActivity } from "../../entities/user/japanJourneyState.js";

export function buildJapanMode(trips, db={}, currentDate=new Date()) {
  const trip=getActiveTrip(trips,currentDate);
  const day=trip?getCurrentTripDay(trip,currentDate):null;
  const places=new Map([...(db.lieux||[]),...(trip?.customLieux||[])].map(place=>[place.id,place]));
  const next=getNextActivity(day);
  return {trip,day,progress:getDailyProgress(day),next,place:places.get(next?.lieuId),
    activities:(day?.activites||[]).map(activity=>({...activity,place:places.get(activity.lieuId)}))};
}

export function toggleTodayActivity(trips,tripId,activityId,currentDate=new Date()) {
  const trip=trips.find(item=>item.id===tripId);
  if(!trip || ["cancelled","completed"].includes(trip.status))throw new Error("inactive_trip");
  const day=getCurrentTripDay(trip,currentDate);
  if(!activityId || !day?.activites?.some(item=>item.id===activityId))throw new Error("activity_not_today");
  return trips.map(item=>item.id!==tripId?item:{...item,updatedAt:currentDate.toISOString(),jours:item.jours.map(value=>value!==day?value:{...value,activites:value.activites.map(activity=>activity.id!==activityId?activity:{...activity,fait:!activity.fait})})});
}
