#!/usr/bin/env node
/**
 * merge-place-images.mjs
 * ----------------------
 * Fusionne src/place-images.json (produit par fetch-place-images.mjs)
 * dans les lieux de src/japan-data.json.
 *
 * Ajoute `photo`, `photo_author`, `photo_licence`, `source` aux lieux trouvés.
 * Le placeholder `image` existant est CONSERVÉ (fallback). L'app affiche
 * `photo` en priorité, sinon `image`.
 *
 * USAGE (après fetch-place-images.mjs) :
 *   node merge-place-images.mjs
 */
import fs from "node:fs";

const DATA_PATH="src/japan-data.json";
const META_PATH="src/place-images.json";

if(!fs.existsSync(META_PATH)){
  console.error(`✗ ${META_PATH} introuvable. Lance d'abord : node fetch-place-images.mjs`);
  process.exit(1);
}
const db=JSON.parse(fs.readFileSync(DATA_PATH,"utf8"));
const meta=JSON.parse(fs.readFileSync(META_PATH,"utf8"));

let merged=0;
for(const l of db.lieux||[]){
  const id=l.id || l.nom.replace(/[^a-z0-9]/gi,"-").toLowerCase();
  const m=meta[id];
  if(m && m.photo){
    l.photo=m.photo;
    l.photo_author=m.photo_author||"";
    l.photo_licence=m.photo_licence||"";
    l.source=m.source||"";
    merged++;
  }
}
fs.writeFileSync(DATA_PATH, JSON.stringify(db,null,2));
console.log(`✓ ${merged} lieux enrichis d'une vraie photo`);
console.log(`  (${(db.lieux||[]).length-merged} gardent leur placeholder estampe)`);
