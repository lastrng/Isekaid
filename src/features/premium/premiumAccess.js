import { getTripLifecycleStatus, TRIP_STATUS } from "../../entities/trip/tripLifecycle.js";

export const PREMIUM_FEATURES = Object.freeze({
  MULTIPLE_TRIPS:"multiple_trips",
  ITINERARY_ASSISTED:"itinerary_assisted",
  TUTOR_ADVANCED:"tutor_advanced",
  TUTOR_EXTRA_MESSAGES:"tutor_extra_messages",
  CUSTOM_PLACES:"custom_places",
  ADVANCED_JOURNALS:"advanced_journals",
  EXTRA_PERSONALIZATION:"extra_personalization",
  ADVANCED_TRAVEL_TOOLS:"advanced_travel_tools",
});

export const ESSENTIAL_FEATURES = Object.freeze({
  SOS:"sos",
  SAFETY_INFORMATION:"safety_information",
  ACTIVE_TRIP:"active_trip",
  TRIP_DAYS:"trip_days",
  TRIP_PLACES:"trip_places",
  OFFLINE_ESSENTIALS:"offline_essentials",
  BASIC_DISCOVERY:"basic_discovery",
  BASIC_LEARNING:"basic_learning",
});

export const PREMIUM_BENEFITS = Object.freeze([
  Object.freeze({id:PREMIUM_FEATURES.MULTIPLE_TRIPS,emoji:"🗺️",title:"Plusieurs voyages",description:"Prépare plusieurs itinéraires en parallèle."}),
  Object.freeze({id:PREMIUM_FEATURES.ITINERARY_ASSISTED,emoji:"✨",title:"Itinéraires assistés",description:"Organise les villes et lieux sauvegardés en journées cohérentes."}),
  Object.freeze({id:PREMIUM_FEATURES.TUTOR_EXTRA_MESSAGES,emoji:"🧑‍🏫",title:"Davantage de conversations",description:"Profite de quotas de messages quotidiens élargis avec le tuteur."}),
  Object.freeze({id:PREMIUM_FEATURES.CUSTOM_PLACES,emoji:"📍",title:"Lieux personnalisés",description:"Ajoute tes propres adresses à tes itinéraires."}),
  Object.freeze({id:PREMIUM_FEATURES.ADVANCED_JOURNALS,emoji:"📔",title:"Carnets avancés",description:"Génère une version PDF enrichie de tes souvenirs de voyage."}),
]);

export const ALWAYS_FREE_PROMISES = Object.freeze([
  "SOS et informations de sécurité",
  "Fonctions essentielles du voyage actif et accès hors ligne",
  "Découverte du Japon et des 47 préfectures",
  "Kana, expressions et apprentissage de base",
]);

/**
 * Frontière centrale des droits produit. RevenueCat fournit seulement le
 * statut Premium ; cette fonction décide ensuite localement ce qui est
 * accessible. Les fonctions vitales sont explicitement autorisées et ne
 * doivent jamais dépendre d'un paywall.
 */
export function getPremiumAccess(feature,{isPremium=false,usage=0,freeLimit=0}={}){
  if(Object.values(ESSENTIAL_FEATURES).includes(feature))return {allowed:true,tier:"essential",reason:"always_free"};
  if(feature===PREMIUM_FEATURES.MULTIPLE_TRIPS&&usage<freeLimit)return {allowed:true,tier:"free",reason:"free_allowance",remaining:freeLimit-usage};
  if(Object.values(PREMIUM_FEATURES).includes(feature))return {allowed:Boolean(isPremium),tier:"premium",reason:isPremium?"entitled":"premium_required"};
  return {allowed:false,tier:"unknown",reason:"unknown_feature"};
}

export function canUsePremiumFeature(feature,context){
  return getPremiumAccess(feature,context).allowed;
}

// Le quota gratuit concerne les voyages en préparation ou en cours, pas les
// souvenirs terminés. Un utilisateur peut donc conserver ses anciens carnets
// et préparer son prochain départ sans devoir effacer son histoire.
export function countConcurrentTripSlots(trips=[],currentDate=new Date()){
  return (trips||[]).filter(trip=>{
    const status=getTripLifecycleStatus(trip,currentDate);
    return status===TRIP_STATUS.PLANNED||status===TRIP_STATUS.ACTIVE;
  }).length;
}
