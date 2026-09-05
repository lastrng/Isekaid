export const PRIMARY_DESTINATIONS = Object.freeze(["home","voyage","explore","profile"]);

const ALIASES = Object.freeze({
  today:"home", aujourd_hui:"home", travel:"voyage", voyager:"voyage",
  discover:"explore", decouvrir:"explore", my_japan:"profile", mon_japon:"profile",
  learn:"learn", scenarios:"scenarios", tutor:"tutor", daily:"daily",
});

export function resolveDestination(value, fallback = "home") {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (PRIMARY_DESTINATIONS.includes(normalized)) return normalized;
  return ALIASES[normalized] || fallback;
}

export function isPrimaryDestination(value) { return PRIMARY_DESTINATIONS.includes(value); }

// Preserve the internal destination while retaining its parent in the bottom bar.
export function primaryDestination(value) {
  const destination = resolveDestination(value);
  if (["learn", "scenarios", "tutor", "daily"].includes(destination)) return "explore";
  return destination;
}
