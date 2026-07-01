// fix-auth-required.mjs — Rend la connexion obligatoire (retire "Continuer sans compte")
import fs from "fs";
const path = "src/App.jsx";
let s = fs.readFileSync(path, "utf8");
let changes = 0;

// 1. Retirer le bloc "Continuer sans compte"
const skipBlock = `

      <div style={{textAlign:"center"}}>
        <span onClick={onSkip} style={{fontSize:12,color:C.t3,cursor:"pointer",borderBottom:\`1px dotted \${C.t3}\`}}>Continuer sans compte</span>
      </div>`;
if (s.includes(skipBlock)) { s = s.replace(skipBlock, ""); changes++; }

// 2. Signature AuthScreen sans onSkip
if (s.includes("function AuthScreen({C, onSkip}){")) {
  s = s.replace("function AuthScreen({C, onSkip}){", "function AuthScreen({C}){"); changes++;
}

// 3. Appel AuthScreen sans onSkip
if (s.includes("<AuthScreen C={C} onSkip={skipAuthAndContinue}/>")) {
  s = s.replace("<AuthScreen C={C} onSkip={skipAuthAndContinue}/>", "<AuthScreen C={C}/>"); changes++;
}

fs.writeFileSync(path, s);
console.log(changes >= 2
  ? `✅ Connexion rendue obligatoire (${changes} changements appliqués).`
  : `⚠️ Seulement ${changes} changement(s). Le code a peut-être déjà été modifié.`);
