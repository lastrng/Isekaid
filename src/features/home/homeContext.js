import { getActiveTrip, getCurrentTripDay, getJapanJourneyState, getNextActivity, getTripTiming } from "../../entities/user/japanJourneyState.js";
import { JAPAN_RELATIONSHIP } from "../../entities/user/profileModel.js";

export function buildHomeJourneyContext({user,trips=[],currentDate=new Date()}={}){
  const state=getJapanJourneyState(user,trips,currentDate);
  const activeTrip=getActiveTrip(trips,currentDate);
  const currentDay=activeTrip?getCurrentTripDay(activeTrip,currentDate):null;
  const nextActivity=getNextActivity(currentDay);
  const nextTrip=trips.map(trip=>({trip,timing:getTripTiming(trip,currentDate)}))
    .filter(item=>item.timing?.status==="upcoming")
    .sort((a,b)=>a.timing.daysUntil-b.timing.daysUntil)[0];
  return {state,activeTrip,currentDay,nextActivity,nextTrip};
}

export function getHomePrimaryAction(context,places=[]){
  if(context.state===JAPAN_RELATIONSHIP.IN_JAPAN){
    const place=places.find(item=>item.id===context.nextActivity?.lieuId);
    return {eyebrow:"MODE JAPON",title:place?.nom||context.currentDay?.titre||(context.nextActivity?"Ta prochaine activité":"Ta journée au Japon"),text:context.activeTrip?`Jour ${getTripTiming(context.activeTrip)?.dayNumber||1} · retrouve ton programme et ta carte.`:"Les outils utiles sur place, accessibles rapidement.",tab:"voyage",emoji:"🇯🇵"};
  }
  if(context.nextTrip)return {eyebrow:"PROCHAIN DÉPART",title:`J-${context.nextTrip.timing.daysUntil}`,text:`Continue la préparation de « ${context.nextTrip.trip.titre} »`,tab:"voyage",emoji:"🧳"};
  if(context.state===JAPAN_RELATIONSHIP.RETURNED)return {eyebrow:"MON JAPON",title:"Ton voyage continue ici",text:"Retrouve tes voyages, favoris et découvertes du Japon.",tab:"profile",emoji:"📔"};
  return {eyebrow:"TON JAPON COMMENCE ICI",title:"Qu’as-tu envie de découvrir ?",text:"Inspire-toi, apprends quelques mots et fais grandir ton projet.",tab:"explore",emoji:"✨"};
}
