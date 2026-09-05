import { getActiveTrip, getCurrentTripDay, getDailyProgress, getNextActivity } from "../../entities/user/japanJourneyState.js";
import { getHomeRecommendations } from "../home/homeRecommendations.js";

export function buildJapanMode(trips, db={}, currentDate=new Date()) {
  const trip=getActiveTrip(trips,currentDate);
  const day=trip?getCurrentTripDay(trip,currentDate):null;
  const places=new Map([...(db.lieux||[]),...(trip?.customLieux||[])].map(place=>[place.id,place]));
  const next=getNextActivity(day);
  const context = { state: trip ? "in_japan" : "dreaming", nextActivity: next };
  return {trip,day,progress:getDailyProgress(day),next,place:places.get(next?.lieuId), recommendations:getHomeRecommendations({ context }),
    activities:(day?.activites||[]).map(activity=>({...activity,place:places.get(activity.lieuId)}))};
}

export function toggleTodayActivity(trips,tripId,activityId,currentDate=new Date()) {
  const trip=trips.find(item=>item.id===tripId);
  if(!trip || ["cancelled","completed"].includes(trip.status))throw new Error("inactive_trip");
  const day=getCurrentTripDay(trip,currentDate);
  if(!activityId || !day?.activites?.some(item=>item.id===activityId))throw new Error("activity_not_today");
  return trips.map(item=>item.id!==tripId?item:{...item,updatedAt:currentDate.toISOString(),jours:item.jours.map(value=>value!==day?value:{...value,activites:value.activites.map(activity=>activity.id!==activityId?activity:{...activity,fait:!activity.fait})})});
}
