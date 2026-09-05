import { JAPAN_RELATIONSHIP, normalizeProfile } from "./profileModel.js";

const DAY_MS = 86_400_000;
export const SOON_THRESHOLD_DAYS = 30;

// Trip dates are calendar days in Japan, independent of the device timezone.
const japanDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
export const RETURNED_THRESHOLD_DAYS = 90;
function localDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    const parts = Object.fromEntries(japanDate.formatToParts(value).map(part => [part.type, part.value]));
    value = `${parts.year}-${parts.month}-${parts.day}`;
  }
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function getPlannedDepartureTiming(user, currentDate = new Date()) {
  const start = localDate(user?.plannedDeparture);
  const today = localDate(currentDate);
  if (!start || !today || start < today) return null;
  return { daysUntil: Math.round((start - today) / DAY_MS) };
}

export function getTripDateRange(trip) {
  const start = localDate(trip?.dateDebut);
  if (!start) return null;
  const explicitEnd = localDate(trip?.dateFin);
  const duration = Math.max(1, Array.isArray(trip?.jours) ? trip.jours.length : Number(trip?.dureeJours) || 1);
  const end = explicitEnd || new Date(start.valueOf() + (duration - 1) * DAY_MS);
  return { start, end: end < start ? start : end, duration };
}

export function getTripTiming(trip, currentDate = new Date()) {
  const range = getTripDateRange(trip);
  const today = localDate(currentDate);
  if (!range || !today) return null;
  const daysUntil = Math.round((range.start - today) / DAY_MS);
  if (daysUntil > 0) return { status: "upcoming", daysUntil, ...range };
  if (today <= range.end) {
    return { status: "active", dayNumber: Math.round((today - range.start) / DAY_MS) + 1, ...range };
  }
  return { status: "past", daysSince: Math.round((today - range.end) / DAY_MS), ...range };
}

export function getActiveTrip(trips, currentDate = new Date()) {
  const candidates = (Array.isArray(trips) ? trips : [])
    .filter(trip => !["cancelled", "completed"].includes(trip?.status))
    .map(trip => ({ trip, timing: getTripTiming(trip, currentDate) }))
    .filter(item => item.timing?.status === "active")
    .sort((a, b) => b.timing.start - a.timing.start);
  return candidates[0]?.trip || null;
}

export function getCurrentTripDay(trip, currentDate = new Date()) {
  const timing = getTripTiming(trip, currentDate);
  if (timing?.status !== "active") return null;
  return trip?.jours?.[timing.dayNumber - 1] || null;
}

export function getNextActivity(day) {
  return (Array.isArray(day?.activites) ? day.activites : []).find(activity=>activity?.fait !== true) || null;
}

export function getDailyProgress(day) {
  const activities = Array.isArray(day?.activites) ? day.activites : [];
  const completed = activities.filter(activity=>activity?.fait === true).length;
  return { completed, total:activities.length, percent:activities.length ? Math.round(completed/activities.length*100) : 0, isComplete:activities.length>0 && completed===activities.length };
}

export function getJapanJourneyState(user, trips, currentDate = new Date(), location = null) {
  // La localisation ne prime que lorsqu'elle a été explicitement autorisée.
  if (location?.permissionGranted === true && location?.inJapan === true) {
    return JAPAN_RELATIONSHIP.IN_JAPAN;
  }
  const timings = (Array.isArray(trips) ? trips : [])
    .filter(trip => trip?.status !== "cancelled")
    .filter(trip => trip?.status !== "completed" || getTripTiming(trip,currentDate)?.status === "past")
    .map(trip => getTripTiming(trip, currentDate))
    .filter(Boolean);
  if (timings.some(timing => timing.status === "active")) return JAPAN_RELATIONSHIP.IN_JAPAN;
  const upcoming = timings.filter(timing => timing.status === "upcoming");
  if (upcoming.some(timing => timing.daysUntil <= SOON_THRESHOLD_DAYS)) return JAPAN_RELATIONSHIP.SOON;
  if (upcoming.length) return JAPAN_RELATIONSHIP.PLANNING;
  const candidates = (Array.isArray(trips) ? trips : []).filter(trip => trip && !["cancelled", "completed"].includes(trip.status));
  // The onboarding date is only a fallback when no dated upcoming trip exists.
  const departure = getPlannedDepartureTiming(user, currentDate);
  if (departure) return departure.daysUntil <= SOON_THRESHOLD_DAYS ? JAPAN_RELATIONSHIP.SOON : JAPAN_RELATIONSHIP.PLANNING;
  if (candidates.some(trip => !getTripDateRange(trip))) return JAPAN_RELATIONSHIP.PLANNING;
  const past = timings.filter(timing => timing.status === "past");
  if (past.length) return Math.min(...past.map(timing => timing.daysSince)) <= RETURNED_THRESHOLD_DAYS
    ? JAPAN_RELATIONSHIP.RETURNED : JAPAN_RELATIONSHIP.JAPAN_LOVER;
  return normalizeProfile(user)?.japanRelationship || JAPAN_RELATIONSHIP.DREAMING;
}
