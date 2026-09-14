export const PRIMARY_NAV_ITEMS = Object.freeze([
  Object.freeze({
    id:"home",
    label:"Aujourd’hui",
    promise:"Ton point d’entrée quotidien personnalisé",
  }),
  Object.freeze({
    id:"voyage",
    label:"Voyage",
    promise:"Prépare ton séjour et utilise Isekaid sur place",
  }),
  Object.freeze({
    id:"learn",
    label:"Apprendre",
    promise:"Du japonais pour les situations réelles",
  }),
  Object.freeze({
    id:"explore",
    label:"Découvrir",
    promise:"Culture, gastronomie, histoire et société",
  }),
  Object.freeze({
    id:"profile",
    label:"Mon Japon",
    promise:"Ton identité, tes favoris et tes souvenirs",
  }),
]);

export const PRIMARY_DESTINATIONS = Object.freeze(PRIMARY_NAV_ITEMS.map(item=>item.id));

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
  if (["scenarios", "tutor"].includes(destination)) return "learn";
  if (destination === "daily") return "home";
  return destination;
}

// Le shell garde chaque route montée après sa première visite. Cette fonction
// pure centralise la déduplication afin que le comportement soit testable sans
// dépendre du rendu React.
export function retainVisitedRoutes(visited, activeRoute) {
  const current = resolveDestination(activeRoute);
  const routes = Array.isArray(visited)
    ? visited.filter(route=>typeof route === "string")
    : [];
  return routes.includes(current) ? routes : [...routes, current];
}
