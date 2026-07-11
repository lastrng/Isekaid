// fix-image-paths.mjs — Corrige les chemins d'images pointant vers le bon dossier
// Usage : node fix-image-paths.mjs
import fs from "fs";

const path = "src/japan-data.json";
const d = JSON.parse(fs.readFileSync(path, "utf8"));
const have = new Set(fs.readdirSync("public/images/lieux-photos"));

let fixed = 0, stillMissing = [];
for (const l of d.lieux) {
  const img = l.image || "";
  const filename = img.split("/").pop();
  if (have.has(filename)) {
    l.image = `/images/lieux-photos/${filename}`;
    fixed++;
  } else {
    stillMissing.push({ nom: l.nom, filename });
  }
}

fs.writeFileSync(path, JSON.stringify(d, null, 2), "utf8");
console.log(`✅ ${fixed} chemins corrigés vers /images/lieux-photos/`);
console.log(`⚠️  ${stillMissing.length} lieux restent sans photo trouvée :`);
stillMissing.forEach(m => console.log(`   - ${m.nom} (cherché: ${m.filename})`));
