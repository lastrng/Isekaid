import { JAPAN_RELATIONSHIP, normalizeProfile } from "./profileModel.js";

const DAY_MS = 86_400_000;
export const SOON_THRESHOLD_DAYS = 30;

function localDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.valueOf()) ? null : date;
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
    .map(trip => getTripTiming(trip, currentDate))
    .filter(Boolean);
  if (timings.some(timing => timing.status === "active")) return JAPAN_RELATIONSHIP.IN_JAPAN;
  const upcoming = timings.filter(timing => timing.status === "upcoming");
  if (upcoming.some(timing => timing.daysUntil <= SOON_THRESHOLD_DAYS)) return JAPAN_RELATIONSHIP.SOON;
  if (upcoming.length) return JAPAN_RELATIONSHIP.PLANNING;
  if (timings.some(timing => timing.status === "past")) return JAPAN_RELATIONSHIP.RETURNED;
  return normalizeProfile(user)?.japanRelationship || JAPAN_RELATIONSHIP.DREAMING;
}
