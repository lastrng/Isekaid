#!/usr/bin/env node
/**
 * merge-preconcu-draft.mjs
 * Fusionne un brouillon voyages-preconcus-draft/<id>.json (contenu éditorial
 * généré par generate-preconcu-content.mjs) dans src/japan-data.json.
 *
 * N'écrase JAMAIS les champs source de vérité (lieuId, heure, villeId,
 * titre, ordre des jours/étapes) — n'ajoute que les champs éditoriaux
 * (sousTitre, intro, conseilDuJour, noteParcours, arrivee, hebergement...).
 *
 * USAGE : node merge-preconcu-draft.mjs <id-itineraire> [--verified]
 */
import fs from "node:fs";
import path from "node:path";

const TARGET_ID = process.argv[2];
const MARK_VERIFIED = process.argv.includes("--verified");
if (!TARGET_ID) {
  console.error("Usage: node merge-preconcu-draft.mjs <id-itineraire> [--verified]");
  process.exit(1);
}

const ROOT = path.resolve(".");
const DATA_PATH = path.join(ROOT, "src", "japan-data.json");
const DRAFT_PATH = path.join(ROOT, "voyages-preconcus-draft", `${TARGET_ID}.json`);

const db = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const draft = JSON.parse(fs.readFileSync(DRAFT_PATH, "utf8"));

const preconcu = (db.voyages_preconcus || []).find((p) => p.id === TARGET_ID);
if (!preconcu) {
  console.error(`❌ Itinéraire "${TARGET_ID}" introuvable dans voyages_preconcus.`);
  process.exit(1);
}

preconcu.sousTitre = draft.sousTitre;
preconcu.intro = draft.intro;
preconcu.rythme = draft.rythme;
preconcu.budgetIndicatif = draft.budgetIndicatif;
preconcu.hebergement = draft.hebergement;
preconcu.contenuGenere = { ...draft.contenuGenere, verified: MARK_VERIFIED };

const draftDayByNum = Object.fromEntries((draft.jours || []).map((j) => [j.num, j]));
for (const jour of preconcu.jours) {
  const dj = draftDayByNum[jour.num];
  if (!dj) { console.warn(`⚠️  Jour ${jour.num} absent du brouillon, laissé tel quel.`); continue; }
  jour.recit = dj.intro;
  jour.conseilDuJour = dj.conseilDuJour;
  if (dj.arriveeVille) jour.arriveeVille = dj.arriveeVille;

  const draftEtapeByLieuId = Object.fromEntries((dj.etapes || []).map((e) => [e.lieuId, e]));
  for (const etape of jour.etapes) {
    const de = draftEtapeByLieuId[etape.lieuId];
    if (!de) { console.warn(`⚠️  Étape "${etape.lieuId}" (jour ${jour.num}) absente du brouillon.`); continue; }
    etape.noteParcours = de.noteParcours;
    if (de.arrivee) etape.arrivee = de.arrivee;
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2) + "\n", "utf8");
console.log(`✅ Fusionné "${TARGET_ID}" dans src/japan-data.json (verified: ${MARK_VERIFIED}).`);
