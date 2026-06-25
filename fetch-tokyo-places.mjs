/**
 * ════════════════════════════════════════════════════════════════════
 *  fetch-tokyo-places.mjs — Récupère les lieux les mieux notés de Tokyo
 *  via Google Places API (New), et les formate pour Isekai'd.
 * ════════════════════════════════════════════════════════════════════
 *
 *  PRÉREQUIS
 *  1. Activer "Places API (New)" dans Google Cloud Console
 *  2. Créer une clé API
 *  3. Lancer :  GOOGLE_PLACES_KEY=ta_cle node fetch-tokyo-places.mjs
 *
 *  SORTIE : tokyo-places-raw.json  (données factuelles à enrichir ensuite)
 *
 *  COÛT : l'API Places New facture par requête. La recherche "Text Search"
 *  coûte ~32$/1000 requêtes, mais Google offre 200$/mois de crédit gratuit.
 *  Ce script fait ~50 requêtes (quartiers × catégories) → ~1,6$ → GRATUIT
 *  dans le quota mensuel. Chaque requête renvoie jusqu'à 20 lieux.
 * ════════════════════════════════════════════════════════════════════
 */

import fs from "fs";

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) { console.error("❌ Définis GOOGLE_PLACES_KEY"); process.exit(1); }

// ── Quartiers de Tokyo à couvrir ─────────────────────────────────────────────
const DISTRICTS = [
  "Shibuya", "Shinjuku", "Asakusa", "Ginza", "Harajuku", "Akihabara",
  "Ueno", "Roppongi", "Ikebukuro", "Odaiba", "Nakameguro", "Shimokitazawa",
  "Yanaka", "Kagurazaka", "Marunouchi", "Tsukiji", "Toyosu", "Daikanyama",
];

// ── Catégories (mappées vers tes types Isekai'd) ─────────────────────────────
const CATEGORIES = [
  { query: "temple OR shrine",        type: "voir",    emoji: "⛩️", interets: ["culture"] },
  { query: "museum OR gallery",       type: "voir",    emoji: "🖼️", interets: ["culture"] },
  { query: "park OR garden",          type: "voir",    emoji: "🌿", interets: ["nature"] },
  { query: "tourist attraction",      type: "voir",    emoji: "📍", interets: ["lifestyle"] },
  { query: "ramen OR sushi restaurant", type: "manger", emoji: "🍜", interets: ["gastro"] },
  { query: "izakaya OR bar",          type: "faire",   emoji: "🍶", interets: ["gastro", "lifestyle"] },
  { query: "shopping OR market",      type: "acheter", emoji: "🛍️", interets: ["lifestyle"] },
  { query: "cafe OR dessert",         type: "manger",  emoji: "🍡", interets: ["gastro"] },
];

// ── Seuils de qualité (ne garde que les lieux vraiment bien notés) ───────────
const MIN_RATING = 4.5;       // note minimale /5 (élite seulement)
const MIN_REVIEWS = 200;      // nombre minimum d'avis (gage de fiabilité)

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function textSearch(query) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      // On ne demande QUE les champs utiles (réduit le coût et le poids)
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.primaryType",
        "places.googleMapsUri",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "fr",
      regionCode: "JP",
      maxResultCount: 20,
    }),
  });
  if (!res.ok) {
    console.warn(`  ⚠️ Erreur ${res.status} pour "${query}"`);
    return [];
  }
  const data = await res.json();
  return data.places || [];
}

// Slug d'ID propre à partir du nom
function slugify(name) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

async function run() {
  const seen = new Set();
  const results = [];

  for (const district of DISTRICTS) {
    for (const cat of CATEGORIES) {
      const query = `${cat.query} in ${district}, Tokyo`;
      process.stdout.write(`🔎 ${district} · ${cat.query.split(" ")[0]}… `);
      const places = await textSearch(query);

      let kept = 0;
      for (const p of places) {
        const rating = p.rating || 0;
        const reviews = p.userRatingCount || 0;
        if (rating < MIN_RATING || reviews < MIN_REVIEWS) continue;
        if (seen.has(p.id)) continue;
        seen.add(p.id);

        const name = p.displayName?.text || "";
        if (!name) continue;

        results.push({
          id: slugify(name),
          googlePlaceId: p.id,
          villeId: "tokyo",
          nom: name,
          nom_jp: "",                       // à compléter (langue ja) ou via enrichissement
          type: cat.type,
          categorie: "",                    // sera affiné à l'enrichissement
          emoji: cat.emoji,
          interets: cat.interets,
          quartier: district,
          description: "",                  // ← enrichissement IA
          conseil: "",                      // ← enrichissement IA
          duree: "",
          budget: "",
          lat: p.location?.latitude ?? null,
          lng: p.location?.longitude ?? null,
          rating, reviews,
          adresse: p.formattedAddress || "",
          site_web: "",
          googleMapsUri: p.googleMapsUri || "",
          a_proximite: [],
          image: "",
        });
        kept++;
      }
      console.log(`${kept} gardés (total ${results.length})`);
      await sleep(250); // respecte les quotas
    }
  }

  // Tri par popularité (note pondérée par nombre d'avis)
  results.sort((a, b) => (b.rating * Math.log(b.reviews)) - (a.rating * Math.log(a.reviews)));

  fs.writeFileSync("tokyo-places-raw.json", JSON.stringify(results, null, 2));
  console.log(`\n✅ ${results.length} lieux uniques enregistrés dans tokyo-places-raw.json`);
  console.log("➡️  Renvoie ce fichier à Claude pour l'enrichissement éditorial.");
}

run().catch(e => { console.error(e); process.exit(1); });
