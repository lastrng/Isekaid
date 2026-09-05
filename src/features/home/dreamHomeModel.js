const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
function dailyPick(items, seed) {
  if (!items.length) return null;
  const index = [...seed].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
  return items[index % items.length];
}

export function buildDreamHome({ user = {}, db = {}, currentDate = new Date() } = {}) {
  const interests = new Set(Array.isArray(user.why) ? user.why : []);
  const places = db.lieux || [];
  const matching = places.filter(place => (place.interets || []).some(interest => interests.has(interest)));
  const seed = dayFormat.format(currentDate);
  return {
    place: dailyPick(matching.length ? matching : places, seed),
    tradition: dailyPick(db.traditions || [], `${seed}:culture`),
    personalized: matching.length > 0,
  };
}
