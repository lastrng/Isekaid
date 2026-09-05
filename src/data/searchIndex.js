function text(value) {
  return value ?? "";
}

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

export function buildSearchIndex(database) {
  if (!database) return [];
  const items = [];
  const add = (item) => items.push({ ...item, searchText: normalizeSearchText(item.blob) });

  (database.wiki || []).forEach((entry) => add({ type: "Wiki", emoji: "📖", color: "#9E7A1A", title: entry.mot, jp: entry.jp, sub: entry.definition, blob: `${text(entry.mot)} ${text(entry.romaji)} ${text(entry.jp)} ${text(entry.definition)} ${text(entry.categorie)}`, raw: entry, kind: "wiki" }));
  (database.expressions || []).forEach((entry) => add({ type: "Expression", emoji: "💬", color: "#C9463D", title: entry.traduction, jp: entry.expression, sub: entry.romaji, blob: `${text(entry.expression)} ${text(entry.romaji)} ${text(entry.traduction)} ${text(entry.contexte)}`, raw: entry, kind: "expr" }));
  (database.repas || []).forEach((entry) => add({ type: "Repas", emoji: entry.emoji || "🍱", color: "#3A6645", title: entry.nom_jp, jp: entry.nom_jp, sub: entry.description || entry.romaji, blob: `${text(entry.nom_jp)} ${text(entry.romaji)} ${text(entry.description)}`, raw: entry, kind: "repas" }));
  (database.traditions || []).forEach((entry) => add({ type: "Tradition", emoji: entry.emoji || "⛩️", color: "#C4956A", title: entry.nom, jp: entry.nom_jp, sub: entry.tagline, blob: `${text(entry.nom)} ${text(entry.nom_jp)} ${text(entry.tagline)} ${text(entry.histoire)} ${text(entry.saison)}`, raw: entry, kind: "tradition" }));
  (database.codes_sociaux || []).forEach((entry) => add({ type: "Code social", emoji: entry.emoji || "🤫", color: "#8B6FB0", title: entry.titre, jp: entry.nom_jp, sub: entry.resume, blob: `${text(entry.titre)} ${text(entry.nom_jp)} ${text(entry.resume)} ${text(entry.explication)}`, raw: entry, kind: "code" }));
  (database.vie_quotidienne || []).forEach((entry) => add({ type: "Vie quotidienne", emoji: entry.emoji || "🏙️", color: "#5B7E9B", title: entry.titre, jp: entry.nom_jp, sub: entry.resume, blob: `${text(entry.titre)} ${text(entry.nom_jp)} ${text(entry.resume)} ${text(entry.description)}`, raw: entry, kind: "vie" }));
  (database.regions || []).forEach((entry) => add({ type: "Région", emoji: entry.emoji || "🗾", color: "#4E8060", title: entry.nom, jp: entry.nom_jp, sub: entry.tagline, blob: `${text(entry.nom)} ${text(entry.nom_jp)} ${text(entry.tagline)} ${text(entry.ambiance)}`, raw: entry, kind: "region" }));
  (database.lieux || []).forEach((entry) => add({ type: "Lieu", emoji: entry.emoji || "📍", color: "#4276A0", title: entry.nom, jp: entry.nom_jp, sub: [entry.quartier, entry.categorie].filter(Boolean).join(" · "), blob: `${text(entry.nom)} ${text(entry.nom_jp)} ${text(entry.quartier)} ${text(entry.categorie)} ${text(entry.description)}`, raw: entry, kind: "lieu" }));

  return items;
}

export function searchCatalog(index, query, limit = 40) {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return [];
  const terms = normalized.split(/\s+/).filter(Boolean);
  return index.filter((item) => terms.every((term) => item.searchText.includes(term))).slice(0, limit);
}
