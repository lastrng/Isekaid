import { buildHomeJourneyContext } from "./homeContext.js";
import { getTripTiming, getPlannedDepartureTiming } from "../../entities/user/japanJourneyState.js";
import { buildMyJapanSummary } from "../my-japan/myJapanModel.js";
import { buildJapanGraph, relatedToActivity } from "../../entities/content/japanGraph.js";
import { getHomeRecommendations } from "./homeRecommendations.js";

function tripActivities(trip) {
  return (trip?.jours || []).flatMap(day => (day.activites || []).map(activity => ({ activity, day })));
}

function preparationRecommendation(trip) {
  if (!trip) return "Crée ton itinéraire et ajoute une première étape.";
  if (!trip.dateDebut) return "Ajoute tes dates pour activer le compte à rebours et le mode Japon.";
  const checklistItem = (trip.checklist || []).find(item => item.fait !== true);
  if (checklistItem) return checklistItem.texte || checklistItem.label || "Continue ta checklist de départ.";
  if (!tripActivities(trip).length) return "Ajoute une première activité à ton programme.";
  return "Relis ton programme et garde tes documents essentiels hors ligne.";
}

function usefulJapanese(db, place) {
  const text = `${place?.nom || ""} ${place?.categorie || ""}`.toLowerCase();
  const preferred = text.match(/restaurant|ramen|sushi|izakaya|repas/) ? "restaurant"
    : text.match(/gare|train|transport|métro/) ? "train"
    : text.match(/konbini|boutique|shopping/) ? "konbini"
    : "politesse";
  const situations = db.situations || db.scenarios || [];
  const situation = situations.find(item => item.id === preferred) || situations.find(item => item.id === "urgence") || situations[0];
  const phrase = situation?.phrases?.[0];
  if (phrase) return { ...phrase, situationTitle: situation.titre || "Japonais utile" };
  const expression = (db.expressions || [])[0];
  return expression ? { jp:expression.expression, kana:expression.kana, romaji:expression.romaji, fr:expression.traduction, situationTitle:"Japonais utile" } : null;
}

export function buildJourneyHome({ user, trips = [], db = {}, currentDate = new Date() } = {}) {
  const context = buildHomeJourneyContext({user,trips,currentDate});
  if (context.state === "in_japan") return null;
  const preparationTrips = trips.filter(trip => !["cancelled","completed"].includes(trip.status) && getTripTiming(trip,currentDate)?.status!=="past");
  const trip = context.nextTrip?.trip || preparationTrips[0];
  const summary = buildMyJapanSummary({trips,cities:db.villes,places:db.lieux,regionsCatalog:db.regions,currentDate});
  const planning = Boolean(context.nextTrip) || ["planning","soon"].includes(context.state) || (trip && !["returned","japan_lover"].includes(context.state));
  if (!planning && !["returned","japan_lover"].includes(context.state) && !summary.completedTrips && !summary.awaitingConfirmation.length) return null;
  const mode = planning ? "planning" : "returned";
  const recent = summary.completedTripDetails[0];
  const visitedIds = new Set(summary.placeIds);
  const nextPlanned = planning ? tripActivities(trip).find(({activity})=>activity.fait!==true) : null;
  const anchorId = planning ? nextPlanned?.activity?.lieuId : recent?.places[0]?.id;
  const anchor = db.lieux?.find(place=>place.id===anchorId);
  const related = relatedToActivity(anchor,buildJapanGraph(db,{ trips }),{limit:50}).find(item=>item.kind==="tradition" || (item.kind==="place"&&!visitedIds.has(item.sourceId)));
  const memory = summary.memories.find(item=>item.tripId===recent?.id && item.note);
  const recommendations = getHomeRecommendations({ context, hasRelated: Boolean(related), readiness: null });
  return {mode,trip,preparationTrips,summary,recent,memory,related,recommendations,
    nextStep: nextPlanned ? { dayNumber:nextPlanned.day?.num || null, dayTitle:nextPlanned.day?.titre || "", place:anchor, activity:nextPlanned.activity } : null,
    preparationRecommendation: preparationRecommendation(trip),
    usefulJapanese: planning ? usefulJapanese(db,anchor) : null,
    returnActions: planning ? [] : [
      {id:"journal",emoji:"📔",title:"Compléter le carnet",text:summary.awaitingConfirmation.length?"Confirme ton voyage puis ajoute tes notes.":"Ajoute les détails qui rendent le souvenir vivant."},
      {id:"visited_places",emoji:"📍",title:"Ajouter les lieux visités",text:`${summary.visitedPlaces || 0} lieu${summary.visitedPlaces>1?"x":""} déjà conservé${summary.visitedPlaces>1?"s":""}.`},
      {id:"stamps",emoji:"🔴",title:"Récupérer les stamps",text:`${summary.stamps.length} stamp${summary.stamps.length>1?"s":""} dans ton passeport.`},
      {id:"memories",emoji:"✨",title:"Revoir les souvenirs",text:`${summary.memories.length} souvenir${summary.memories.length>1?"s":""} à retrouver.`},
    ],
    daysUntil:context.nextTrip?.timing.daysUntil ?? getPlannedDepartureTiming(user,currentDate)?.daysUntil ?? null,
    title:planning ? (context.nextTrip || getPlannedDepartureTiming(user,currentDate) ? `J-${context.nextTrip?.timing.daysUntil ?? getPlannedDepartureTiming(user,currentDate).daysUntil} avant le Japon` : trip ? "Ton voyage prend forme" : "Prépare ton premier séjour") : summary.awaitingConfirmation.length ? "Ton retour du Japon" : "Le voyage continue ici",
    description:planning ? (trip?.titre || "Des premières envies à ton itinéraire, une étape à la fois.") : recent ? `${recent.title} · ${recent.completedPlaces} activités marquées comme faites` : "Retrouve tes souvenirs et garde un lien avec le Japon.",
  };
}
