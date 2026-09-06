import { JAPAN_RELATIONSHIP, normalizeProfile, normalizeProfileDate, normalizeTripDuration } from "../../entities/user/profileModel.js";
export const TRAVEL_RELATIONSHIPS = ["planning", "soon", "in_japan", "returned", "japan_lover"];
export function validateOnboardingTravel({ relationship, departureDate, duration }) {
  if (!Object.values(JAPAN_RELATIONSHIP).includes(relationship)) return "Choisis où tu en es avec le Japon.";
  if (!TRAVEL_RELATIONSHIPS.includes(relationship)) return "";
  if (departureDate && !normalizeProfileDate(departureDate)) return "Indique une date valide ou laisse ce champ vide.";
  if (duration !== "" && duration != null && normalizeTripDuration(duration) === null) return "Indique une durée entière entre 1 et 365 jours, ou laisse ce champ vide.";
  return "";
}
export function buildOnboardingProfile({ relationship, departureDate, duration, firstTrip, ...fields }) {
  const error = validateOnboardingTravel({ relationship, departureDate, duration });
  if (error) throw new Error(error);
  const travel = TRAVEL_RELATIONSHIPS.includes(relationship);
  const preparing = ["planning", "soon"].includes(relationship);
  return normalizeProfile({ ...fields, japanRelationship: relationship,
    goal: ["planning", "soon", "in_japan"].includes(relationship) ? "travel" : "imm",
    plannedDeparture: preparing ? departureDate : null,
    journeyStartDate: travel && !preparing ? departureDate : null,
    plannedDurationDays: travel ? duration : null,
    firstTrip: travel ? firstTrip : null,
  });
}
