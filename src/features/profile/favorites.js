// Persistance locale des favoris du profil. Les écrans ne connaissent que
// l'API métier et ne dépendent pas de la clé de stockage.
const FAV_KEY = "isekaid_favs_v1";

export function loadFavs() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavs(list) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  } catch { /* stockage indisponible ou plein : l'appelant garde son état */ }
}

export function favId(type, item) {
  const label = item?.expression || item?.titre || item?.nom_jp || item?.nom || "";
  return `${type}:${label}`;
}
