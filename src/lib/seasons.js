export const SEASON_ACCENT = {
  printemps: { accent: "#E08BA8", soft: "rgba(224,139,168,0.10)", emoji: "🌸", particle: "🌸", label: "Printemps", tagline: "Saison du hanami — les cerisiers en fleurs", saisonFr: "ce printemps" },
  "été": { accent: "#3C9DC4", soft: "rgba(60,157,196,0.10)", emoji: "🎐", particle: "💧", label: "Été", tagline: "Saison des matsuri et des feux d'artifice", saisonFr: "cet été" },
  automne: { accent: "#C97D3C", soft: "rgba(201,125,60,0.10)", emoji: "🍁", particle: "🍁", label: "Automne", tagline: "Saison du momiji — les érables flamboient", saisonFr: "cet automne" },
  hiver: { accent: "#7B9BB5", soft: "rgba(123,155,181,0.12)", emoji: "❄️", particle: "❄️", label: "Hiver", tagline: "Saison des illuminations et de l'onsen", saisonFr: "cet hiver" },
};

export function currentSeasonKey(date = new Date()) {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "printemps";
  if (month >= 5 && month <= 7) return "été";
  if (month >= 8 && month <= 10) return "automne";
  return "hiver";
}

export function seasonalLieux(database, seasonKey) {
  return (database?.lieux || []).filter((place) => place.saison_ideale === seasonKey);
}
