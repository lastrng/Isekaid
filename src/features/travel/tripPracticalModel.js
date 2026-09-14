export function itineraryPlaceIds(trip) {
  return [...new Set((trip?.jours || []).flatMap(day =>
    [...(day.activites || []), ...(day.etapes || [])].map(item => item.lieuId).filter(Boolean)
  ))];
}

export function itineraryCityIds(trip, places = []) {
  return [...new Set([
    ...(trip?.jours || []).map(day => day.villeId),
    ...(trip?.villes || []).filter(id => typeof id === "string"),
    ...places.map(place => place.villeId),
  ].filter(Boolean))];
}

export function relatedGuides(db, places = []) {
  const context = places.map(place => `${place.nom || ""} ${place.categorie || ""} ${place.type || ""}`).join(" ");
  const signals = [
    /restaurant|repas|gastr|izakaya|ramen|sushi/i.test(context) && /restaurant|izakaya|repas|commande/i,
    /train|gare|transport|métro|station/i.test(context) && /transport|train|gare|métro|carte ic/i,
    /onsen|ryokan|hébergement|hôtel/i.test(context) && /onsen|ryokan|hôtel|logement/i,
  ].filter(Boolean);
  const guides = db?.vie_quotidienne || [];
  const contextual = signals.flatMap(pattern => guides.filter(item => pattern.test(`${item.id} ${item.titre} ${item.categorie} ${item.resume}`)));
  const essentials = guides.filter(item => /transport|paiement|argent|konbini/i.test(`${item.id} ${item.titre} ${item.categorie} ${item.resume}`));
  return [...new Map([...contextual, ...essentials].map(item => [item.id, item])).values()].slice(0, 3);
}
