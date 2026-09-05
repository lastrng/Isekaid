// Modèle de profil compatible avec toutes les versions historiques.
// La normalisation est non destructive : les champs inconnus sont conservés.
export const PROFILE_MODEL_VERSION = 3;

export const JAPAN_RELATIONSHIP = Object.freeze({
  DREAMING: "dreaming",
  PLANNING: "planning",
  SOON: "soon",
  IN_JAPAN: "in_japan",
  RETURNED: "returned",
  JAPAN_LOVER: "japan_lover",
});

const RELATIONSHIPS = new Set(Object.values(JAPAN_RELATIONSHIP));

function inferLegacyRelationship(profile) {
  if (profile?.goal === "travel") return JAPAN_RELATIONSHIP.PLANNING;
  if (profile?.goal === "live") return JAPAN_RELATIONSHIP.JAPAN_LOVER;
  return JAPAN_RELATIONSHIP.DREAMING;
}

export function normalizeProfileDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : null;
}
export function normalizeTripDuration(value) {
  if (value === null || value === undefined || value === "") return null;
  if (!["string", "number"].includes(typeof value)) return null;
  const days = Number(value);
  return Number.isInteger(days) && days >= 1 && days <= 365 ? days : null;
}

export function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
  const relationship = RELATIONSHIPS.has(profile.japanRelationship)
    ? profile.japanRelationship
    : inferLegacyRelationship(profile);
  return {
    ...profile,
    profileModelVersion: PROFILE_MODEL_VERSION,
    japanRelationship: relationship,
    why: Array.isArray(profile.why) ? [...new Set(profile.why.filter(Boolean))] : [],
    goal: typeof profile.goal === "string" ? profile.goal : "",
    level: typeof profile.level === "string" && profile.level ? profile.level : "beginner",
    name: typeof profile.name === "string" && profile.name.trim() ? profile.name.trim() : "Voyageur",
    plannedDeparture: normalizeProfileDate(profile.plannedDeparture),
    journeyStartDate: normalizeProfileDate(profile.journeyStartDate),
    plannedDurationDays: normalizeTripDuration(profile.plannedDurationDays),
    emojiAvatar: profile.emojiAvatar || (profile.photo ? null : "🦊"),
    firstTrip: typeof profile.firstTrip === "boolean" ? profile.firstTrip : null,
  };
}
