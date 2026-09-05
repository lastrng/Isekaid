import { getTripTiming } from "../user/japanJourneyState.js";

export const TRIP_STATUS = Object.freeze({
  PLANNED:"planned", ACTIVE:"active", AWAITING_CONFIRMATION:"awaiting_confirmation",
  COMPLETED:"completed", CANCELLED:"cancelled",
});

function hasCompletedActivity(trip) {
  return (trip?.jours||[]).some(day=>(day.activites||[]).some(activity=>activity.fait===true));
}

export function getTripLifecycleStatus(trip, currentDate = new Date()) {
  if(trip?.status===TRIP_STATUS.CANCELLED) return TRIP_STATUS.CANCELLED;
  if(trip?.status===TRIP_STATUS.COMPLETED) return TRIP_STATUS.COMPLETED;
  const timing=getTripTiming(trip,currentDate);
  if(timing?.status==="active") return TRIP_STATUS.ACTIVE;
  if(timing?.status==="past") return hasCompletedActivity(trip) ? TRIP_STATUS.COMPLETED : TRIP_STATUS.AWAITING_CONFIRMATION;
  return TRIP_STATUS.PLANNED;
}

export function resolvePastTrip(trip, didTravel, resolvedAt = new Date()) {
  if(!trip) return trip;
  return didTravel
    ? {...trip,status:TRIP_STATUS.COMPLETED,completedAt:resolvedAt.toISOString(),cancelledAt:undefined,updatedAt:resolvedAt.toISOString()}
    : {...trip,status:TRIP_STATUS.CANCELLED,cancelledAt:resolvedAt.toISOString(),completedAt:undefined,updatedAt:resolvedAt.toISOString()};
}

// Persiste automatiquement un voyage passé dès qu'une activité a réellement
// été marquée comme faite. Un voyage passé sans preuve reste à confirmer afin
// de ne jamais transformer une simple date échue en souvenir inventé.
export function normalizeCompletedTrips(trips, currentDate = new Date(), resolvedAt = currentDate) {
  let changed = false;
  const normalized = (trips || []).map(trip => {
    if (!trip || trip.status === TRIP_STATUS.COMPLETED || trip.status === TRIP_STATUS.CANCELLED) return trip;
    if (getTripLifecycleStatus(trip, currentDate) !== TRIP_STATUS.COMPLETED) return trip;
    changed = true;
    const completedAt = trip.completedAt || (trip.dateFin ? new Date(`${trip.dateFin}T23:59:59Z`).toISOString() : resolvedAt.toISOString());
    return { ...trip, status: TRIP_STATUS.COMPLETED, completedAt, updatedAt: trip.updatedAt || completedAt };
  });
  return { trips: normalized, changed };
}
