// Modèle de profil compatible avec toutes les versions historiques.
// La normalisation est non destructive : les champs inconnus sont conservés.
export const PROFILE_MODEL_VERSION = 2;

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
    firstTrip: typeof profile.firstTrip === "boolean" ? profile.firstTrip : null,
  };
}
