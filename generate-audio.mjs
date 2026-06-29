#!/usr/bin/env node
/**
 * generate-audio.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * Génère tous les fichiers audio japonais d'Isekai'd avec Google Cloud TTS.
 *
 * USAGE :
 *   1. Crée un projet Google Cloud + active "Cloud Text-to-Speech API"
 *   2. Crée une clé API (ou un compte de service) — voir README ci-dessous
 *   3. Mets ta clé dans la variable d'environnement GOOGLE_TTS_API_KEY
 *   4. Lance :  node generate-audio.mjs
 *
 * Les MP3 sont écrits dans  public/audio/<hash>.mp3
 * Le mapping texte→fichier est écrit dans  src/audio-manifest.json
 * ────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const API_KEY = process.env.GOOGLE_TTS_API_KEY;
if (!API_KEY) {
  console.error("❌ Variable GOOGLE_TTS_API_KEY manquante.");
  console.error("   Lance :  GOOGLE_TTS_API_KEY=ta_cle node generate-audio.mjs");
  process.exit(1);
}

// ── Config voix ──────────────────────────────────────────────────────────────
// Voix japonaises Google recommandées (Neural2 = très naturelles) :
//   ja-JP-Neural2-B (femme)  · ja-JP-Neural2-C (homme)  · ja-JP-Neural2-D (homme)
// COÛT : ~363 phrases / ~2000 caractères. Google offre 1M caractères Neural2
// gratuits par mois → cette génération est GRATUITE.
const VOICE = { languageCode: "ja-JP", name: "ja-JP-Neural2-B" };
const SPEAKING_RATE = 0.92; // léger ralenti pour l'apprentissage

// ── Chemins ──────────────────────────────────────────────────────────────────
const ROOT = path.resolve(".");
const DATA_PATH = path.join(ROOT, "src", "japan-data.json");
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const MANIFEST_PATH = path.join(ROOT, "src", "audio-manifest.json");

// ── Hash stable d'un texte → nom de fichier ──────────────────────────────────
function hashText(text) {
  return crypto.createHash("md5").update(text).digest("hex").slice(0, 12);
}

// ── Récupère toutes les phrases japonaises uniques du dataset ────────────────
function collectPhrases(db) {
  const set = new Set();
  const add = (t) => { if (t && typeof t === "string" && t.trim()) set.add(t.trim()); };

  (db.expressions || []).forEach(e => { add(e.expression); add(e.exemple_jp); });
  (db.repas || []).forEach(r => add(r.nom_jp));
  (db.wiki || []).forEach(w => add(w.jp));
  (db.situations || []).forEach(s => (s.phrases || []).forEach(p => add(p.jp)));
  (db.proverbes || []).forEach(p => add(p.jp));
  (db.scenarios || []).forEach(s => (s.etapes || []).forEach(e =>
    (e.choix || []).forEach(c => add(c.jp))
  ));
  // Contenu supplémentaire ajouté depuis la v1
  (db.villes || []).forEach(v => add(v.nom_jp));
  (db.lieux || []).forEach(l => add(l.nom_jp));
  (db.traditions || []).forEach(t => add(t.nom_jp));
  (db.codes_sociaux || []).forEach(c => add(c.nom_jp));
  (db.vie_quotidienne || []).forEach(v => add(v.nom_jp));
  // Compréhension orale et écrite (phrases complètes à vocaliser)
  (db.comprehension_orale || []).forEach(e => add(e.audio_jp));
  (db.comprehension_ecrite || []).forEach(e => add(e.texte_jp));
  return [...set];
}

// ── Appel à l'API Google TTS ─────────────────────────────────────────────────
async function synthesize(text, rate = SPEAKING_RATE) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
  const body = {
    input: { text },
    voice: VOICE,
    audioConfig: { audioEncoding: "MP3", speakingRate: rate },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  const json = await res.json();
  return Buffer.from(json.audioContent, "base64");
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const db = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const phrases = collectPhrases(db);
  console.log(`📋 ${phrases.length} phrases japonaises uniques à générer.\n`);

  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const manifest = {}; // text → "audio/<hash>.mp3"

  let done = 0, skipped = 0, failed = 0;
  for (const text of phrases) {
    const hash = hashText(text);
    const file = `${hash}.mp3`;
    const outPath = path.join(AUDIO_DIR, file);
    manifest[text] = `audio/${file}`;

    if (fs.existsSync(outPath)) { skipped++; done++; continue; } // déjà généré

    try {
      // Débit adaptatif : les longs textes (compréhension orale/écrite) sont
      // lus un peu plus lentement pour faciliter l'apprentissage à l'écoute.
      const rate = text.length > 25 ? 0.88 : SPEAKING_RATE;
      const audio = await synthesize(text, rate);
      fs.writeFileSync(outPath, audio);
      done++;
      process.stdout.write(`\r✅ ${done}/${phrases.length}  (${text.slice(0, 12)})        `);
      await new Promise(r => setTimeout(r, 120)); // throttle léger
    } catch (e) {
      failed++;
      console.error(`\n⚠️  Échec pour « ${text} » : ${e.message}`);
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\n\n🎉 Terminé : ${done} ok (${skipped} déjà présents), ${failed} échecs.`);
  console.log(`📄 Manifest écrit : src/audio-manifest.json`);
  console.log(`🔊 Fichiers audio : public/audio/`);
}

main().catch(e => { console.error(e); process.exit(1); });
