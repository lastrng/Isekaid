/**
 * ════════════════════════════════════════════════════════════════════
 *  fetch-wiki-images.mjs — Récupère des photos libres (Wikimedia Commons)
 *  pour chaque entrée du wiki d'Isekai'd, les télécharge, les redimensionne,
 *  et note l'attribution (auteur + licence) obligatoire.
 * ════════════════════════════════════════════════════════════════════
 *
 *  PRÉREQUIS
 *    npm install sharp            (redimensionnement d'images)
 *
 *  LANCEMENT  (depuis la racine du projet, là où il y a src/ et public/)
 *    node fetch-wiki-images.mjs
 *
 *  SORTIES
 *    public/images/wiki/<mot>.jpg        ← les images téléchargées
 *    src/wiki-images.json                ← map mot → {image, attribution, licence}
 *
 *  COÛT : GRATUIT. L'API Wikimedia Commons est libre et sans clé.
 *  On respecte leur politesse : un User-Agent explicite + un petit délai.
 * ════════════════════════════════════════════════════════════════════
 */

import fs from "fs";
import path from "path";

let sharp = null;
try { sharp = (await import("sharp")).default; }
catch { console.warn("⚠️  'sharp' non installé → images NON redimensionnées (npm install sharp pour activer)."); }

const DATA_PATH = "src/japan-data.json";
const OUT_DIR = "public/images/wiki";
const MAP_PATH = "src/wiki-images.json";
const CONTACT = process.env.WIKI_CONTACT || "https://isekaid.vercel.app";
const UA = `Isekaid/1.0 (${CONTACT}) Node.js`;
const HEADERS = { "User-Agent": UA, "Api-User-Agent": UA, "Referer": "https://commons.wikimedia.org/", "Accept": "image/*,*/*" };

// Largeur cible (px) pour alléger les images
const TARGET_WIDTH = 700;
// Licences acceptées (libres, réutilisables avec attribution)
const OK_LICENSES = ["cc0", "cc-by", "cc-by-sa", "public domain", "pd"];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Cherche un fichier image sur Commons pour une requête donnée
async function searchCommons(query) {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
    action: "query", format: "json", generator: "search",
    gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "5",
    prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: String(TARGET_WIDTH),
  });
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  // Choisit le meilleur candidat : licence OK + dimensions correctes
  const candidates = Object.values(pages)
    .map(p => p.imageinfo?.[0])
    .filter(Boolean)
    .filter(ii => (ii.width || 0) >= 300); // évite les vignettes minuscules

  for (const ii of candidates) {
    const meta = ii.extmetadata || {};
    const licenseShort = (meta.LicenseShortName?.value || "").toLowerCase();
    const license = (meta.License?.value || "").toLowerCase();
    const isOk = OK_LICENSES.some(l => licenseShort.includes(l) || license.includes(l));
    if (!isOk) continue;
    const author = (meta.Artist?.value || "Auteur inconnu")
      .replace(/<[^>]+>/g, "").trim().slice(0, 80); // strip HTML
    return {
      thumbUrl: ii.thumburl || ii.url,
      author,
      licence: meta.LicenseShortName?.value || "CC",
      descUrl: ii.descriptionurl || "",
    };
  }
  return null;
}

async function download(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function run() {
  const db = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const wiki = db.wiki || [];
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const map = {};
  let found = 0, missing = 0;

  for (const w of wiki) {
    const id = w.mot.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    // Essaie d'abord le terme japonais, puis l'anglais/romaji
    const queries = [w.jp, w.mot, w.romaji].filter(Boolean);
    let hit = null;
    for (const q of queries) {
      process.stdout.write(`🔎 ${w.mot} (${q})… `);
      try { hit = await searchCommons(q); } catch { hit = null; }
      await sleep(200);
      if (hit) break;
    }

    if (!hit) { console.log("aucune image libre"); missing++; map[w.mot] = null; continue; }

    try {
      let buf = await download(hit.thumbUrl);
      const outPath = path.join(OUT_DIR, `${id}.jpg`);
      if (sharp) {
        buf = await sharp(buf).resize({ width: TARGET_WIDTH, withoutEnlargement: true })
          .jpeg({ quality: 82 }).toBuffer();
      }
      fs.writeFileSync(outPath, buf);
      map[w.mot] = {
        image: `/images/wiki/${id}.jpg`,
        author: hit.author,
        licence: hit.licence,
        source: hit.descUrl,
      };
      console.log(`✓ (${hit.licence})`);
      found++;
    } catch (e) {
      console.log(`échec téléchargement: ${e.message}`);
      missing++; map[w.mot] = null;
    }
    await sleep(150);
  }

  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
  console.log(`\n✅ Terminé : ${found} images récupérées, ${missing} sans image.`);
  console.log(`   Images → ${OUT_DIR}/`);
  console.log(`   Map    → ${MAP_PATH}`);
  console.log(`➡️  Renvoie wiki-images.json à Claude pour l'intégration dans l'app.`);
}

run().catch(e => { console.error(e); process.exit(1); });
