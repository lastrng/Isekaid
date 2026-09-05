import { buildHomeJourneyContext } from "../home/homeContext.js";
import { sanitizeJourneyContext } from "../../../supabase/functions/tutor-chat/journey-context.js";

export function buildTutorJourneyContext({ user, trips = [], db = {}, currentDate = new Date() } = {}) {
  const context = buildHomeJourneyContext({user,trips,currentDate});
  const trip = context.activeTrip || context.nextTrip?.trip;
  const day = context.currentDay || trip?.jours?.[0];
  const activity = context.nextActivity || day?.activites?.find(item => !item.fait);
  // Catalogue public uniquement : aucune note, adresse privée ou photo utilisateur.
  const place = db.lieux?.find(item => item.id === activity?.lieuId);
  const city = db.villes?.find(item => item.id === (place?.villeId || day?.villeId));
  return sanitizeJourneyContext({state:context.state,city:city?.nom,activity:place?.nom,category:place?.categorie,interests:user?.why});
}
