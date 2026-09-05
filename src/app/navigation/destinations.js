export const PRIMARY_DESTINATIONS = Object.freeze(["home","voyage","explore","profile"]);

const ALIASES = Object.freeze({
  today:"home", aujourd_hui:"home", travel:"voyage", voyager:"voyage",
  discover:"explore", decouvrir:"explore", my_japan:"profile", mon_japon:"profile",
  learn:"learn", scenarios:"scenarios", tutor:"tutor", daily:"daily",
});

export function resolveDestination(value, fallback = "home") {
  if (PRIMARY_DESTINATIONS.includes(value)) return value;
  return ALIASES[value] || fallback;
}

export function isPrimaryDestination(value) { return PRIMARY_DESTINATIONS.includes(value); }
