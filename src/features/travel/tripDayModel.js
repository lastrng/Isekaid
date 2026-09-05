// Calculs métier d'une journée d'itinéraire. Aucun état React ou effet de
// bord : le modèle peut être réutilisé par la carte, le récapitulatif et les
// contrôles de charge d'une journée.
function tripDurationMinutes(value) {
  const text = String(value || "").toLowerCase();
  const hour = Number(text.match(/([\d.,]+)\s*h/)?.[1]?.replace(",", ".")) || 0;
  const mins = Number(text.match(/([\d.,]+)\s*min/)?.[1]?.replace(",", ".")) || 0;
  if (hour || mins) return Math.round(hour * 60 + mins);
  const range = text.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2) * 60;
  return 90;
}

export function haversineKm(a, b) {
  if (!a || !b || typeof a.lat !== "number" || typeof a.lng !== "number" || typeof b.lat !== "number" || typeof b.lng !== "number") return null;
  const radius = 6371;
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(s));
}

export function tripDayMetrics(day, lieuById = {}) {
  const places = (day?.activites || []).map(activity => lieuById[activity.lieuId]).filter(Boolean);
  const visitMinutes = places.reduce((sum, place) => sum + tripDurationMinutes(place.duree), 0);
  let km = 0;
  for (let index = 1; index < places.length; index += 1) km += haversineKm(places[index - 1], places[index]) || 0;
  const totalMinutes = visitMinutes + Math.max(0, places.length - 1) * 25;
  return { places, km, totalMinutes, overloaded: places.length > 4 || totalMinutes > 9 * 60 };
}
