/**
 * ════════════════════════════════════════════════════════════════════
 *  fetch-explore-images.mjs — Récupère des photos libres (Wikimedia
 *  Commons) pour les sections Explorer : traditions, culture,
 *  codes_sociaux, vie_quotidienne, situations.
 * ════════════════════════════════════════════════════════════════════
 *
 *  PRÉREQUIS
 *    npm install sharp            (redimensionnement d'images, optionnel)
 *
 *  LANCEMENT  (depuis la racine du projet, là où il y a src/ et public/)
 *    node fetch-explore-images.mjs
 *
 *  SORTIES
 *    public/images/explore/<section>-<id>.jpg   ← les images téléchargées
 *    src/explore-images.json                     ← map section:id → {image, attribution, licence}
 *
 *  COÛT : GRATUIT. L'API Wikimedia Commons est libre et sans clé.
 * ════════════════════════════════════════════════════════════════════
 */

import fs from "fs";

let sharp = null;
try { sharp = (await import("sharp")).default; }
catch { console.warn("⚠️  'sharp' non installé → images NON redimensionnées (npm install sharp pour activer)."); }

const DATA_PATH = "src/japan-data.json";
const OUT_DIR = "public/images/explore";
const MAP_PATH = "src/explore-images.json";
const CONTACT = process.env.WIKI_CONTACT || "https://isekaid.vercel.app";
const UA = `Isekaid/1.0 (${CONTACT}) Node.js`;
const HEADERS = { "User-Agent": UA, "Api-User-Agent": UA, "Referer": "https://commons.wikimedia.org/", "Accept": "image/*,*/*" };

const TARGET_WIDTH = 700;
const OK_LICENSES = ["cc0", "cc-by", "cc by", "public domain", "pd-", "attribution"];

// Pour chaque section, quels champs utiliser comme requêtes de recherche
// (dans l'ordre de préférence). Les requêtes restent SIMPLES et COURTES :
// Wikimedia Commons indexe par titre/description littéral, pas par recherche
// sémantique — un suffixe trop long ou trop précis fait chuter le taux de
// réussite au lieu de l'améliorer. On tente plusieurs variantes par item.
const SECTIONS = {
  traditions:       { fields: ["nom_jp","nom"], extra: (it)=>[it.nom, `${it.nom} Japan`] },
  culture:          { fields: ["titre"],        extra: (it)=>[shortTitle(it.titre), `${shortTitle(it.titre)} Japan`] },
  codes_sociaux:    { fields: ["nom_jp","titre"], extra: (it)=>[it.titre, `${it.titre} Japan`] },
  vie_quotidienne:  { fields: ["nom_jp","titre"], extra: (it)=>[it.titre, `${it.titre} Japan`] },
  situations:       { fields: ["nom_jp","titre"], extra: (it)=>[it.titre, `${it.titre} Japan`] },
};

// Les titres "culture" sont souvent des phrases longues du type
// "Kintsugi : réparer avec de l'or" — on ne garde que la partie avant le ":"
// (le vrai nom du concept), plus recherchable sur Commons.
function shortTitle(titre){
  if(!titre) return "";
  return titre.split(/[:：]/)[0].trim();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function searchCommons(query, debug=false) {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
    action: "query", format: "json", generator: "search",
    gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "10",
    prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: String(TARGET_WIDTH),
  });
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) { if(debug) console.log(`    [debug] HTTP ${res.status} pour "${query}"`); return null; }
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) { if(debug) console.log(`    [debug] Aucun résultat pour "${query}"`); return null; }

  const candidates = Object.values(pages)
    .map(p => p.imageinfo?.[0])
    .filter(Boolean)
    .filter(ii => (ii.width || 0) >= 300);

  if(debug) console.log(`    [debug] "${query}" → ${candidates.length} candidats (taille OK)`);

  for (const ii of candidates) {
    const meta = ii.extmetadata || {};
    const licenseShort = (meta.LicenseShortName?.value || "").toLowerCase();
    const license = (meta.License?.value || "").toLowerCase();
    const isOk = OK_LICENSES.some(l => licenseShort.includes(l) || license.includes(l));
    if(debug) console.log(`    [debug]   licence="${licenseShort||license}" → ${isOk?"OK":"rejetée"}`);
    if (!isOk) continue;
    const author = (meta.Artist?.value || "Auteur inconnu")
      .replace(/<[^>]+>/g, "").trim().slice(0, 80);
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
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const map = {};
  let found = 0, missing = 0;
  const missingList = [];

  for (const [sectionKey, cfg] of Object.entries(SECTIONS)) {
    const items = db[sectionKey] || [];
    console.log(`\n── ${sectionKey} (${items.length} items) ──`);

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const itemId = item.id || `${sectionKey}-${idx}`;
      const label = item.nom || item.titre || itemId;
      const fileId = String(itemId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const filename = `${sectionKey}-${fileId}.jpg`;

      // Construit les requêtes : d'abord les champs configurés tels quels,
      // puis les variantes courtes générées par extra() (nom seul, nom+Japan).
      const fieldQueries = cfg.fields.map(f => item[f]).filter(Boolean);
      const extraQueries = cfg.extra ? cfg.extra(item).filter(Boolean) : [];
      const queries = [...new Set([...fieldQueries, ...extraQueries])];

      let hit = null;
      const isDebugItem = idx < 3; // trace détaillée sur les 3 premiers de chaque section
      for (const q of queries) {
        if(isDebugItem) console.log(`  [recherche] "${q}"`);
        hit = await searchCommons(q, isDebugItem);
        if (hit) break;
        await sleep(150); // politesse envers l'API
      }

      if (!hit) {
        console.log(`  ✗ ${label}`);
        missing++;
        missingList.push(`${sectionKey}: ${label}`);
        continue;
      }

      try {
        const buf = await download(hit.thumbUrl);
        const outPath = `${OUT_DIR}/${filename}`;
        if (sharp) {
          await sharp(buf).resize({ width: TARGET_WIDTH, withoutEnlargement: true })
            .jpeg({ quality: 82 }).toFile(outPath);
        } else {
          fs.writeFileSync(outPath, buf);
        }
        map[`${sectionKey}:${itemId}`] = {
          image: `/images/explore/${filename}`,
          attribution: hit.author,
          licence: hit.licence,
          source: hit.descUrl,
        };
        console.log(`  ✓ ${label} → ${filename}`);
        found++;
      } catch (e) {
        console.log(`  ✗ ${label} (échec téléchargement: ${e.message})`);
        missing++;
        missingList.push(`${sectionKey}: ${label}`);
      }
      await sleep(200);
    }
  }

  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2), "utf8");
  console.log(`\n════════════════════════════════════`);
  console.log(`✅ Trouvées : ${found}`);
  console.log(`⚠️  Manquantes : ${missing}`);
  if (missingList.length) {
    console.log(`\nListe des manquantes :`);
    missingList.forEach(m => console.log(`  - ${m}`));
  }
  console.log(`\nMap sauvegardée dans ${MAP_PATH}`);
  console.log(`Images sauvegardées dans ${OUT_DIR}/`);
}

run().catch(e => { console.error("Erreur fatale:", e); process.exit(1); });
