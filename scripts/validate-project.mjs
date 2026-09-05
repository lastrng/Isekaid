import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "src/main.jsx",
  "src/App.jsx",
  "src/japan-data.json",
  "capacitor.config.json",
];

const errors = [];

for (const file of requiredFiles) {
  try {
    await access(file);
  } catch {
    errors.push(`Fichier requis absent : ${file}`);
  }
}

let data;
try {
  data = JSON.parse(await readFile("src/japan-data.json", "utf8"));
} catch (error) {
  errors.push(`src/japan-data.json invalide : ${error.message}`);
}

if (data) {
  const requiredCollections = [
    "traditions",
    "codes_sociaux",
    "vie_quotidienne",
    "regions",
    "wiki",
    "situations",
    "scenarios",
    "villes",
    "lieux",
    "voyages_preconcus",
    "comprehension_ecrite",
    "comprehension_orale",
  ];

  for (const name of requiredCollections) {
    if (!Array.isArray(data[name]) || data[name].length === 0) {
      errors.push(`Collection absente ou vide : ${name}`);
    }
  }

  for (const name of requiredCollections.filter((key) => Array.isArray(data[key]))) {
    const ids = data[name].map((item) => item?.id).filter(Boolean);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    if (duplicates.length) {
      errors.push(`Identifiants dupliqués dans ${name} : ${duplicates.join(", ")}`);
    }
  }

  const cityIds = new Set((data.villes || []).map((city) => city.id));
  const placeById = new Map((data.lieux || []).map((place) => [place.id, place]));
  for (const place of data.lieux || []) {
    if (!place.id || !place.nom) errors.push("Un lieu n'a pas d'identifiant ou de nom.");
    if (!cityIds.has(place.villeId)) {
      errors.push(`Le lieu ${place.id || "inconnu"} référence une ville absente : ${place.villeId}`);
    }
  }

  for (const trip of data.voyages_preconcus || []) {
    const seenPlaces = new Set();
    if (trip.jours?.length !== trip.duree) errors.push(`Le voyage ${trip.id} annonce ${trip.duree} jours mais en contient ${trip.jours?.length || 0}.`);
    for (const day of trip.jours || []) {
      if (!cityIds.has(day.villeId)) errors.push(`Le voyage ${trip.id} référence une ville absente : ${day.villeId}`);
      for (const step of day.etapes || []) {
        const place = placeById.get(step.lieuId);
        if (!place) errors.push(`Le voyage ${trip.id} référence un lieu absent : ${step.lieuId}`);
        else if (place.villeId !== day.villeId) errors.push(`Le voyage ${trip.id} place ${step.lieuId} dans la mauvaise ville (${day.villeId}).`);
        if (seenPlaces.has(step.lieuId)) errors.push(`Le voyage ${trip.id} répète le lieu ${step.lieuId}.`);
        seenPlaces.add(step.lieuId);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Validation du projet réussie.");
}
