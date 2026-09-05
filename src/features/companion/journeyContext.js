import { buildHomeJourneyContext } from "../home/homeContext.js";
import { sanitizeJourneyContext } from "../../../supabase/functions/tutor-chat/journey-context.js";

export function buildTutorJourneyContext({ user, trips = [], db = {}, currentDate = new Date(), recentExpressions = [] } = {}) {
  const context = buildHomeJourneyContext({user,trips,currentDate});
  const trip = context.activeTrip || context.nextTrip?.trip;
  const day = context.currentDay || trip?.jours?.[0];
  const activity = context.nextActivity || day?.activites?.find(item => !item.fait);
  // Catalogue public uniquement : aucune note, adresse privée ou photo utilisateur.
  const place = db.lieux?.find(item => item.id === activity?.lieuId);
  const city = db.villes?.find(item => item.id === (place?.villeId || day?.villeId));
  const nextTripTiming = context.nextTrip?.timing;
  return sanitizeJourneyContext({
    state:context.state,
    level:user?.level,
    city:city?.nom,
    activity:place?.nom,
    category:place?.categorie,
    tripTitle:(context.activeTrip || context.nextTrip?.trip)?.titre,
    daysUntil:nextTripTiming?.daysUntil,
    interests:user?.why,
    recentExpressions,
  });
}
