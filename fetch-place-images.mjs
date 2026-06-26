#!/usr/bin/env node
/**
 * fetch-place-images.mjs
 * ----------------------
 * Récupère de vraies photos libres (Wikimedia Commons) pour les LIEUX
 * d'Isekai'd, en combinant plusieurs stratégies gratuites pour maximiser
 * le taux de réussite :
 *
 *   1. Recherche GÉO  : images géolocalisées près des coordonnées du lieu
 *                       (très efficace pour monuments, temples, parcs)
 *   2. Recherche par NOM JAPONAIS  (浅草寺)
 *   3. Recherche par NOM + ville    (Senso-ji Tokyo)
 *   4. Page Wikipédia du lieu -> image principale (souvent la meilleure)
 *
 * Télécharge, redimensionne (sharp si dispo), note l'attribution.
 * N'ÉCRASE PAS le placeholder existant : écrit dans `photo` / `photo_author`
 * / `photo_licence`. L'app affiche `photo` en priorité, sinon `image`.
 *
 * USAGE :
 *   npm install sharp        (optionnel, recommandé)
 *   node fetch-place-images.mjs
 *
 * SORTIES :
 *   public/images/lieux-photos/<id>.jpg
 *   src/place-images.json      (map id -> {photo, photo_author, photo_licence, source})
 *
 * GRATUIT. Aucune clé API. Respecte la politesse Wikimedia.
 */

import fs from "node:fs";
import path from "node:path";

const DATA_PATH = "src/japan-data.json";
const OUT_DIR   = "public/images/lieux-photos";
const META_PATH = "src/place-images.json";
const MAX_WIDTH = 800;
const DELAY_MS  = 300;
const GEO_RADIUS = 300; // mètres autour du lieu pour la recherche géo
// User-Agent conforme à la politique Wikimedia (https://meta.wikimedia.org/wiki/User-Agent_policy)
// IMPORTANT : personnalise CONTACT avec une vraie URL ou un vrai email, sinon 403.
const CONTACT = process.env.WIKI_CONTACT || "https://isekaid.vercel.app";
const UA = `Isekaid/1.0 (${CONTACT}) Node.js`;
// En-têtes complets pour les requêtes, y compris le téléchargement depuis upload.wikimedia.org
const HEADERS = {
  "User-Agent": UA,
  "Api-User-Agent": UA,
  "Referer": "https://commons.wikimedia.org/",
  "Accept": "image/*,*/*",
};

const OK_LICENSES = ["cc0","cc-by","cc-by-sa","public domain","pd","pdm"];
const licOk = (l)=> l && OK_LICENSES.some(ok=>l.toLowerCase().includes(ok));
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

let sharp=null;
try { sharp=(await import("sharp")).default; console.log("✓ sharp détecté (redim. "+MAX_WIDTH+"px)"); }
catch { console.log("ℹ sharp non installé (npm install sharp pour redimensionner)"); }

const villeNames = {}; // rempli depuis db.villes

function cleanAuthor(html){
  return (html||"Auteur inconnu").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim().slice(0,80);
}

// ── Stratégie commune : extrait une image exploitable d'une réponse imageinfo ──
function pickFromPages(pages){
  if(!pages) return null;
  for(const key of Object.keys(pages)){
    const p = pages[key];
    const info = p?.imageinfo?.[0];
    if(!info) continue;
    if(info.mime && !/jpeg|png|jpg/i.test(info.mime)) continue;
    const meta = info.extmetadata || {};
    const lic = meta.LicenseShortName?.value || meta.License?.value || "";
    if(!licOk(lic)) continue;
    return { url: info.thumburl||info.url, descUrl: info.descriptionurl||"", author: cleanAuthor(meta.Artist?.value), licence: lic };
  }
  return null;
}

// ── 1. Recherche géolocalisée sur Commons ──
async function searchByGeo(lat, lng){
  const api="https://commons.wikimedia.org/w/api.php";
  const params=new URLSearchParams({
    action:"query", format:"json", generator:"geosearch",
    ggscoord:`${lat}|${lng}`, ggsradius:String(GEO_RADIUS), ggslimit:"10",
    ggsnamespace:"6", prop:"imageinfo",
    iiprop:"url|extmetadata|mime", iiurlwidth:String(MAX_WIDTH),
  });
  try{
    const r=await fetch(`${api}?${params}`,{headers:HEADERS});
    if(!r.ok) return null;
    const d=await r.json();
    return pickFromPages(d?.query?.pages);
  }catch{ return null; }
}

// ── 2/3. Recherche texte sur Commons ──
async function searchByText(term){
  const api="https://commons.wikimedia.org/w/api.php";
  const params=new URLSearchParams({
    action:"query", format:"json", generator:"search",
    gsrsearch:`${term} filetype:bitmap`, gsrnamespace:"6", gsrlimit:"8",
    prop:"imageinfo", iiprop:"url|extmetadata|mime", iiurlwidth:String(MAX_WIDTH),
  });
  try{
    const r=await fetch(`${api}?${params}`,{headers:HEADERS});
    if(!r.ok) return null;
    const d=await r.json();
    return pickFromPages(d?.query?.pages);
  }catch{ return null; }
}

// ── 4. Image principale d'une page Wikipédia (JP puis EN) ──
async function searchByWikipediaPage(title, lang){
  const api=`https://${lang}.wikipedia.org/w/api.php`;
  const params=new URLSearchParams({
    action:"query", format:"json", titles:title, prop:"pageimages",
    piprop:"original|thumbnail", pithumbsize:String(MAX_WIDTH), redirects:"1",
  });
  try{
    const r=await fetch(`${api}?${params}`,{headers:HEADERS});
    if(!r.ok) return null;
    const d=await r.json();
    const pages=d?.query?.pages; if(!pages) return null;
    for(const k of Object.keys(pages)){
      const p=pages[k];
      const src=p?.thumbnail?.source || p?.original?.source;
      if(src) return { url:src, descUrl:`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`, author:"Wikipedia", licence:"voir source" };
    }
  }catch{}
  return null;
}

async function downloadImage(url, destPath){
  const r=await fetch(url,{headers:HEADERS});
  if(!r.ok) throw new Error("HTTP "+r.status);
  const buf=Buffer.from(await r.arrayBuffer());
  if(sharp) await sharp(buf).resize({width:MAX_WIDTH,withoutEnlargement:true}).jpeg({quality:82}).toFile(destPath);
  else fs.writeFileSync(destPath, buf);
}

// ── Programme principal ──
const db=JSON.parse(fs.readFileSync(DATA_PATH,"utf8"));

// Auto-test : vérifie l'accès à upload.wikimedia.org AVANT de lancer 151 lieux
console.log("→ Test d'accès à Wikimedia...");
try {
  const testR = await fetch("https://commons.wikimedia.org/w/api.php?action=query&format=json&meta=siteinfo", { headers: HEADERS });
  if (testR.status === 403) {
    console.error("\n✗ 403 sur l'API Wikimedia. Causes possibles :");
    console.error("  1. User-Agent refusé → définis un vrai contact :");
    console.error("     WIKI_CONTACT='https://ton-site.com' node fetch-place-images.mjs");
    console.error("  2. Ton IP/réseau est temporairement limité par Wikimedia (réessaie plus tard).\n");
    process.exit(1);
  }
  console.log(`✓ API accessible (${testR.status})\n`);
} catch (e) {
  console.error("✗ Réseau inaccessible vers Wikimedia :", e.message);
  process.exit(1);
}

(db.villes||[]).forEach(v=>{ villeNames[v.id]=v.nom; });
const lieux=db.lieux||[];
fs.mkdirSync(OUT_DIR,{recursive:true});

let meta={};
if(fs.existsSync(META_PATH)){ try{ meta=JSON.parse(fs.readFileSync(META_PATH,"utf8")); }catch{} }

let found=0, skipped=0, failed=0;
const failures=[];

for(let i=0;i<lieux.length;i++){
  const l=lieux[i];
  const id=l.id || l.nom.replace(/[^a-z0-9]/gi,"-").toLowerCase();
  const destPath=path.join(OUT_DIR,`${id}.jpg`);
  const tag=`[${i+1}/${lieux.length}]`;

  if(meta[id]?.photo && fs.existsSync(destPath)){ console.log(`${tag} ✓ déjà : ${l.nom}`); skipped++; continue; }

  const ville=villeNames[l.villeId]||"";
  let hit=null, via="";

  // Stratégie 1 : géo (si coordonnées) — la plus pertinente pour les monuments
  if(typeof l.lat==="number" && typeof l.lng==="number"){
    hit=await searchByGeo(l.lat,l.lng); await sleep(DELAY_MS);
    if(hit) via="géo";
  }
  // Stratégie 4 : page Wikipédia JP (nom_jp) puis EN (nom)
  if(!hit && l.nom_jp){ hit=await searchByWikipediaPage(l.nom_jp,"ja"); await sleep(DELAY_MS); if(hit) via="wiki-ja"; }
  if(!hit && l.nom){ hit=await searchByWikipediaPage(l.nom,"en"); await sleep(DELAY_MS); if(hit) via="wiki-en"; }
  // Stratégie 2 : Commons par nom japonais
  if(!hit && l.nom_jp){ hit=await searchByText(l.nom_jp); await sleep(DELAY_MS); if(hit) via="jp"; }
  // Stratégie 3 : Commons par nom + ville
  if(!hit && l.nom){ hit=await searchByText(`${l.nom} ${ville}`); await sleep(DELAY_MS); if(hit) via="nom+ville"; }

  if(!hit){ console.log(`${tag} ✗ rien : ${l.nom}`); failed++; failures.push(l.nom); continue; }

  try{
    await downloadImage(hit.url, destPath);
    meta[id]={ photo:`/images/lieux-photos/${id}.jpg`, photo_author:hit.author, photo_licence:hit.licence, source:hit.descUrl };
    console.log(`${tag} ✓ ${l.nom}  (${via} · ${hit.licence})`);
    found++;
    fs.writeFileSync(META_PATH, JSON.stringify(meta,null,2)); // sauvegarde incrémentale
  }catch(e){ console.log(`${tag} ✗ téléchargement : ${l.nom} (${e.message})`); failed++; failures.push(l.nom); }
  await sleep(DELAY_MS);
}

fs.writeFileSync(META_PATH, JSON.stringify(meta,null,2));
console.log("\n─────────────────────────────");
console.log(`✓ Photos trouvées : ${found}`);
console.log(`• Déjà présentes  : ${skipped}`);
console.log(`✗ Sans photo      : ${failed}`);
if(failures.length){ console.log("\nLieux sans photo (placeholder conservé) :"); console.log("  "+failures.join(", ")); }
console.log(`\nMétadonnées : ${META_PATH}`);
console.log("Ensuite : node merge-place-images.mjs");
