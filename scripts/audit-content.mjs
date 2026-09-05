#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";

const data = JSON.parse(await readFile("src/japan-data.json", "utf8"));
const editorial = JSON.parse(await readFile("src/lieu-editorial.json", "utf8"));
const errors = [];
const warnings = [];
const stats = {};

const schemas = {
  expressions: ["expression","romaji","traduction","contexte","exemple_jp","exemple_fr","kana"],
  repas: ["nom_jp","romaji","traduction","moment","description","fun_fact","kana"],
  proverbes: ["jp","romaji","fr","sens","kana"],
  lieux: ["id","villeId","nom","description","conseil","image"]
};

// Longueurs minimales des champs éditoriaux réellement lus comme du contenu.
// Les identifiants, titres, traductions et libellés courts ne sont pas concernés.
const minimumLengths = {
  expressions: { contexte: 45, exemple_fr: 20 },
  culture: { contenu: 170, insight: 100 },
  repas: { description: 80, fun_fact: 75 },
  songs: { histoire: 170, pourquoi_japon: 100 },
  traditions: { histoire: 220 },
  codes_sociaux: { resume: 35, explication: 280 },
  regions: { ambiance: 240, a_savoir: 100 },
  wiki: { definition: 90 },
  vie_quotidienne: { resume: 35, description: 240, etiquette: 90 },
  histoire: { resume: 80, contenu: 320, anecdote: 120 },
};

for (const [name, fields] of Object.entries(schemas)) {
  const items = data[name] || [];
  stats[name] = items.length;
  items.forEach((item, index) => fields.forEach((field) => {
    if (item[field] === undefined || item[field] === null || item[field] === "") errors.push(`${name}[${index}].${field} est vide`);
  }));
}

for (const [name, fields] of Object.entries(minimumLengths)) {
  (data[name] || []).forEach((item, index) => Object.entries(fields).forEach(([field, minimum]) => {
    const length = typeof item[field] === "string" ? item[field].trim().length : 0;
    if (length < minimum) errors.push(`${name}[${index}].${field} est trop court (${length}/${minimum} caractères)`);
  }));
}

for (const name of ["expressions", "repas", "proverbes"]) {
  for (const [index, item] of (data[name] || []).entries()) {
    if (/[A-Za-z]/.test(item.kana || "")) errors.push(`${name}[${index}].kana contient des lettres latines : ${item.kana}`);
  }
}

const cityIds = new Set((data.villes || []).map(({ id }) => id));
for (const place of data.lieux || []) {
  if (!cityIds.has(place.villeId)) errors.push(`${place.id} référence la ville absente ${place.villeId}`);
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) warnings.push(`${place.id} n’a pas de coordonnées cartographiques`);
  const storyLength = editorial[place.id]?.editorial?.trim().length || 0;
  if (storyLength < 700) errors.push(`${place.id} a un récit éditorial trop court (${storyLength}/700 caractères)`);
  if (place.image) try { await access(`public${place.image}`); } catch { warnings.push(`${place.id} référence une image absente : ${place.image}`); }
}

for (const [tripIndex, trip] of (data.voyages_preconcus || []).entries()) {
  const introLength = trip.intro?.trim().length || 0;
  if (introLength < 190) errors.push(`voyages_preconcus[${tripIndex}].intro est trop court (${introLength}/190 caractères)`);
  (trip.jours || []).forEach((day, dayIndex) => {
    const recitLength = day.recit?.trim().length || 0;
    const tipLength = day.conseilDuJour?.trim().length || 0;
    if (recitLength < 100) errors.push(`${trip.id}.jours[${dayIndex}].recit est trop court (${recitLength}/100 caractères)`);
    if (tipLength < 80) errors.push(`${trip.id}.jours[${dayIndex}].conseilDuJour est trop court (${tipLength}/80 caractères)`);
    if ((day.etapes || []).length < 2) errors.push(`${trip.id}.jours[${dayIndex}] contient moins de 2 étapes`);
  });
}

const identity = { expressions: "expression", repas: "nom_jp", proverbes: "jp", lieux: "id" };
for (const [name, key] of Object.entries(identity)) {
  const seen = new Set();
  for (const item of data[name] || []) {
    if (seen.has(item[key])) errors.push(`${name} contient un doublon : ${item[key]}`);
    seen.add(item[key]);
  }
}

console.log("Audit éditorial Isekaid");
console.log(Object.entries(stats).map(([name, count]) => `- ${name}: ${count}`).join("\n"));
console.log(`- récits de lieux: ${Object.keys(editorial).length}/${data.lieux?.length || 0}`);
if (warnings.length) {
  console.log(`\n${warnings.length} avertissement(s) non bloquant(s)`);
  warnings.slice(0, 15).forEach((warning) => console.log(`  · ${warning}`));
  if (warnings.length > 15) console.log(`  · … et ${warnings.length - 15} autre(s)`);
}
if (errors.length) {
  console.error(`\n${errors.length} erreur(s) bloquante(s)`);
  errors.forEach((error) => console.error(`  · ${error}`));
  process.exitCode = 1;
} else console.log("\nQualité structurelle validée.");
