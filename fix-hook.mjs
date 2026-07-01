import fs from "fs";
const path = "src/App.jsx";
let lines = fs.readFileSync(path, "utf8").split("\n");

// Trouve la ligne du useEffect mal placé (celui avec screen!=="loading")
let effectStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('if(screen!=="loading" || !authChecked) return')) {
    // remonte pour trouver le "useEffect(()=>{" juste au-dessus
    for (let j = i-1; j >= i-3; j--) {
      if (lines[j].includes("useEffect(()=>{")) { effectStart = j; break; }
    }
    break;
  }
}

if (effectStart === -1) { console.log("❌ useEffect loading non trouvé"); process.exit(1); }

// Trouve la fin de ce useEffect (ligne avec "},[authChecked, screen, session]);")
let effectEnd = -1;
for (let i = effectStart; i < effectStart+8; i++) {
  if (lines[i].includes("},[authChecked, screen, session])")) { effectEnd = i; break; }
}
if (effectEnd === -1) { console.log("❌ fin useEffect non trouvée"); process.exit(1); }

// La ligne juste après effectEnd doit être le "};" de afterSplash — on le déplace avant le useEffect
let closeLine = -1;
for (let i = effectEnd+1; i < effectEnd+3; i++) {
  if (lines[i].trim() === "};") { closeLine = i; break; }
}
if (closeLine === -1) { console.log("❌ Le }; de afterSplash est déjà bien placé ou introuvable"); process.exit(1); }

// Extraire le bloc useEffect (effectStart..effectEnd)
const effectBlock = lines.slice(effectStart, effectEnd+1);
// Supprimer le }; mal placé et le bloc useEffect de leur position
const newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (i >= effectStart && i <= effectEnd) continue; // skip effect (on le remet plus bas)
  if (i === closeLine) {
    // Ici on met d'abord le }; de fermeture de afterSplash, PUIS le useEffect
    newLines.push("  };");
    newLines.push(...effectBlock);
    continue;
  }
  newLines.push(lines[i]);
}

fs.writeFileSync(path, newLines.join("\n"));
console.log("✅ Correction appliquée : Hook déplacé hors de afterSplash. Erreur #321 corrigée.");
