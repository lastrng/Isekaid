import { buildHomeJourneyContext } from "./homeContext.js";
import { getTripTiming, getPlannedDepartureTiming } from "../../entities/user/japanJourneyState.js";
import { buildMyJapanSummary } from "../my-japan/myJapanModel.js";
import { buildJapanGraph, relatedToActivity } from "../../entities/content/japanGraph.js";
import { getHomeRecommendations } from "./homeRecommendations.js";

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
  const anchorId = planning ? trip?.jours?.flatMap(day=>day.activites||[])[0]?.lieuId : recent?.places[0]?.id;
  const anchor = db.lieux?.find(place=>place.id===anchorId);
  const related = relatedToActivity(anchor,buildJapanGraph(db,{ trips }),{limit:50}).find(item=>item.kind==="tradition" || (item.kind==="place"&&!visitedIds.has(item.sourceId)));
  const memory = summary.memories.find(item=>item.tripId===recent?.id && item.note);
  const recommendations = getHomeRecommendations({ context, hasRelated: Boolean(related), readiness: null });
  return {mode,trip,preparationTrips,summary,recent,memory,related,recommendations,
    daysUntil:context.nextTrip?.timing.daysUntil ?? getPlannedDepartureTiming(user,currentDate)?.daysUntil ?? null,
    title:planning ? (context.nextTrip || getPlannedDepartureTiming(user,currentDate) ? `J-${context.nextTrip?.timing.daysUntil ?? getPlannedDepartureTiming(user,currentDate).daysUntil} avant le Japon` : trip ? "Ton voyage prend forme" : "Prépare ton premier séjour") : summary.awaitingConfirmation.length ? "Ton retour du Japon" : "Le voyage continue ici",
    description:planning ? (trip?.titre || "Des premières envies à ton itinéraire, une étape à la fois.") : recent ? `${recent.title} · ${recent.completedPlaces} activités marquées comme faites` : "Retrouve tes souvenirs et garde un lien avec le Japon.",
  };
}
