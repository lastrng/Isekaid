// ─────────────────────────────────────────────────────────────────────────────
// carnet.js — Génère le HTML complet du "carnet de voyage" (PDF paysage 16:9)
// à partir d'un trip Isekaid + du catalogue lieux/villes (japan-data.json).
//
// Source de vérité pour le CSS/palette/polices : carnet-template.html (import
// brut ci-dessous, on en extrait juste le <style>). Le HTML de chaque page est
// reconstruit ici en JS plutôt que parsé depuis le template, parce que la
// plupart des pages sont RÉPÉTÉES (une étape par ville, un jour par jour, un
// "au programme" paginé par tranche de 6 lieux) — carnet-template.html reste
// la référence visuelle exacte que ces fonctions doivent reproduire.
//
// Étape 1 du plan validé avec l'utilisateur : ce module ne fait QUE produire
// une chaîne HTML autonome (aucun appel réseau, aucune dépendance Supabase/VPS)
// — prévisualisable directement dans le mécanisme iframe déjà utilisé par
// exportPDF (VoyageTrip, App.jsx). Le rendu PDF réel (weasyprint sur le VPS)
// et le bouton dans l'UI sont des étapes suivantes, à valider séparément.
// ─────────────────────────────────────────────────────────────────────────────
import CARNET_TEMPLATE_RAW from "./carnet-template.html?raw";

// Domaine de prod : sert à résoudre les chemins de photo relatifs
// (lieu.photo / lieu.image / ville.image, ex. "/images/lieux-photos/senso-ji.jpg")
// en URLs absolues. Toujours utilisé, même en prévisualisation dans l'app
// native (où location.origin ne pointe pas vers un domaine public) — c'est
// aussi la seule URL qu'un service de rendu externe (le futur microservice
// weasyprint) pourra effectivement aller chercher.
export const CARNET_BASE_URL = "https://isekaid.vercel.app";

// Le <style> de carnet-template.html référence des polices locales
// (/tmp/fonts/*.ttf) — convention weasyprint côté VPS, inutilisable pour un
// aperçu navigateur. On les remplace ici par Google Fonts, uniquement pour
// cette prévisualisation client ; le microservice weasyprint gardera les
// @font-face d'origine avec de vraies polices locales sur le VPS.
const GOOGLE_FONTS_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Montserrat:wght@400;500;600;700&display=swap');\n`;

const CARNET_CSS = (() => {
  const m = CARNET_TEMPLATE_RAW.match(/<style>([\s\S]*?)<\/style>/);
  let css = m ? m[1] : "";
  css = css.replace(/@font-face\s*{\s*font-family:\s*'Caveat';[^}]*}/, "");
  css = css.replace(/@font-face\s*{\s*font-family:\s*'Montserrat';[^}]*}/, "");
  return GOOGLE_FONTS_IMPORT + css;
})();

/* ---------- Helpers ---------- */

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

// SI une photo est disponible (photo Wikimedia ou fallback image) → URL
// absolue utilisable en background-image. SINON → null, pour laisser le
// dégradé CSS déjà défini dans carnet-template.html faire le travail. Jamais
// les deux mélangés, jamais d'image cassée.
function resolvePhoto(relativePath, baseUrl){
  if(!relativePath) return null;
  return `${baseUrl}${relativePath}`;
}
function bgImageStyle(photoUrl){
  return photoUrl ? `background-image:url('${escapeHtml(photoUrl)}');background-size:cover;background-position:center;` : "";
}

function frenchOrdinal(n){ return n===1 ? "1ère" : `${n}ème`; }

function chunk(arr, size){
  const out = [];
  for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
  return out;
}

const JOURS_SEMAINE = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

// trip.mode_dates vaut "jours" (juste un numéro, pas de date réelle choisie)
// ou "calendrier" (trip.dateDebut renseigné) — voir VoyageCreate, App.jsx.
function addDays(iso, n){
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d;
}
function formatDateJour(trip, jour){
  if(trip.mode_dates==="calendrier" && trip.dateDebut){
    const d = addDays(trip.dateDebut, jour.num - 1);
    return `${JOURS_SEMAINE[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
  }
  return `Jour ${jour.num}`;
}
function formatDureeEtDates(trip){
  const n = trip.jours?.length || 0;
  const dureeTxt = `${n} jour${n>1?"s":""}`;
  if(trip.mode_dates==="calendrier" && trip.dateDebut && n>0){
    const start = new Date(trip.dateDebut);
    const end = addDays(trip.dateDebut, n-1);
    const fmt = (d)=>`${d.getDate()} ${MOIS[d.getMonth()]}`;
    return `${dureeTxt} — du ${fmt(start)} au ${fmt(end)}`;
  }
  return `${dureeTxt} de voyage`;
}

// Regroupe les jours en "étapes" : suites contiguës de jours partageant la
// même ville (page séparateur "1ère étape — Tokyo" du template).
function groupJoursIntoEtapes(jours, villeById){
  const etapes = [];
  (jours||[]).forEach(j => {
    const last = etapes[etapes.length-1];
    if(last && last.villeId===j.villeId){ last.jours.push(j); }
    else { etapes.push({ villeId:j.villeId, nom:villeById[j.villeId]?.nom || j.villeId, jours:[j] }); }
  });
  return etapes;
}

/* ---------- Pages ---------- */

function buildCoverPage(trip, villeById, baseUrl){
  const firstVille = villeById[trip.villes?.[0]];
  const photo = resolvePhoto(firstVille?.image, baseUrl);
  const villesNoms = (trip.villes||[]).map(id=>villeById[id]?.nom||id).join(" · ");
  const n = trip.jours?.length || 0;
  const duree = `${n} jour${n>1?"s":""}`;
  return `<div class="page cover">
  <div class="bg" style="${bgImageStyle(photo)}"></div>
  <div class="title">
    <div class="script">${escapeHtml(trip.titre || "Mon voyage")}</div>
    <div class="pill">${escapeHtml(villesNoms)} — ${duree}</div>
  </div>
</div>`;
}

function buildIntroPage(trip, villeById){
  const villesNoms = (trip.villes||[]).map(id=>villeById[id]?.nom||id).join(", ");
  const nbLieux = (trip.jours||[]).reduce((a,j)=>a+(j.etapes?.length||0), 0);
  const n = trip.jours?.length || 0;
  const duree = `${n} jour${n>1?"s":""}`;
  return `<div class="page intro">
  <h1>Bienvenue dans votre carnet de voyage</h1>
  <p>Ce carnet retrace votre séjour de ${duree} au Japon, à travers ${escapeHtml(villesNoms)}.</p>
  <p>${nbLieux>0 ? `Au total, ${nbLieux} lieu${nbLieux>1?"x":""} et expérience${nbLieux>1?"s":""} sont prévus au programme, entre temples, quartiers et spécialités locales.` : "Votre itinéraire est encore à compléter, jour après jour."}</p>
  <p>Bon voyage, et bonne découverte du Japon !</p>
</div>`;
}

function buildVillesPage(trip, villeById){
  const cards = (trip.villes||[]).map(id =>
    `<div class="ville-card"><span>${escapeHtml(villeById[id]?.nom || id)}</span></div>`
  ).join("\n    ");
  return `<div class="page">
  <div class="h-script">Au programme</div>
  <div class="grid-villes">
    ${cards}
  </div>
</div>`;
}

function buildInfosPage(trip, villeById){
  const n = trip.jours?.length || 0;
  const nbLieux = (trip.jours||[]).reduce((a,j)=>a+(j.etapes?.length||0), 0);
  const villesNoms = (trip.villes||[]).map(id=>villeById[id]?.nom||id).join(", ");
  return `<div class="page infos">
  <div class="h-script" style="text-align:left;padding-top:20px;">Informations essentielles</div>
  <div class="lead">${escapeHtml(formatDureeEtDates(trip))}</div>
  <ul>
    <li>🗾 ${trip.villes?.length||0} ville${(trip.villes?.length||0)>1?"s":""} visitée${(trip.villes?.length||0)>1?"s":""} : ${escapeHtml(villesNoms)}</li>
    <li>📍 ${nbLieux} lieu${nbLieux>1?"x":""} et expérience${nbLieux>1?"s":""} au programme</li>
    <li>🎒 Pensez à vérifier les horaires d'ouverture avant chaque visite</li>
    <li>💳 Une carte IC (Suica/Pasmo) facilite grandement les transports</li>
  </ul>
  <div class="note">Carnet généré automatiquement par Isekai'd — informations pratiques (horaires, prix) à vérifier avant le départ.</div>
</div>`;
}

function buildEtapePage(numero, nomVille){
  return `<div class="page etape">
  <div class="bg"></div>
  <div class="step-num">${frenchOrdinal(numero)} étape</div>
  <div class="step-name">${escapeHtml(nomVille)}</div>
</div>`;
}

// .total-pill retirée : pas de donnée de budget numérique fiable côté
// Isekaid (lieu.budget est du texte libre "Gratuit"/"¥¥", pas sommable) —
// décision validée avec l'utilisateur plutôt que d'afficher un total vide.
function buildJourPage(trip, jour, villeById, lieuById){
  const ville = villeById[jour.villeId];
  const lieuxNoms = (jour.etapes||[]).map(e=>lieuById[e.lieuId]?.nom).filter(Boolean);
  const notes = (jour.etapes||[]).map(e=>e.note).filter(Boolean);
  const desc1 = lieuxNoms.length
    ? `Au programme aujourd'hui : ${escapeHtml(lieuxNoms.join(", "))}.`
    : "Journée libre.";
  const desc2 = notes.length ? `<p>📝 ${escapeHtml(notes.join(" · "))}</p>` : "";
  return `<div class="page jour">
  <div class="jour-head">
    <span class="day">Day ${jour.num}</span>
    <span class="date">${escapeHtml(formatDateJour(trip, jour))}</span>
  </div>
  <h2>${escapeHtml(jour.titre || ville?.nom || "")}</h2>
  <p>${desc1}</p>
  ${desc2}
</div>`;
}

// Paginé par tranches de 6 (grille fixe du template) ; .total-center retirée
// pour la même raison que .total-pill ci-dessus. Aucune page générée si le
// jour n'a aucune étape prévue.
function buildProgPages(jour, lieuById, baseUrl){
  const etapes = jour.etapes || [];
  if(!etapes.length) return [];
  return chunk(etapes, 6).map(pageEtapes => {
    const acts = pageEtapes.map(e => {
      const l = lieuById[e.lieuId];
      const photo = resolvePhoto(l?.photo || l?.image, baseUrl);
      return `<div class="act"><div class="thumb" style="${bgImageStyle(photo)}"></div><div class="label">${escapeHtml(l?.nom || "Lieu")}</div></div>`;
    }).join("\n    ");
    return `<div class="page prog">
  <div class="h-script">Au programme</div>
  <div class="prog-grid">
    ${acts}
  </div>
</div>`;
  });
}

function buildNotesPage(){
  return `<div class="page notes">
  <div class="h-script" style="text-align:left;padding-top:20px;">Notes & rappels</div>
  <div class="lines">
    <div></div><div></div><div></div><div></div><div></div><div></div><div></div>
  </div>
</div>`;
}

/* ---------- Point d'entrée ---------- */

// trip : objet localStorage "isekaid_trips_v1" (voir TRIPS_KEY, App.jsx)
// villeById / lieuById : index déjà construits dans VoyageTrip (App.jsx)
// baseUrl : override pour les tests, sinon CARNET_BASE_URL
//
// Page "Compagnies aériennes" du template volontairement omise : aucune
// donnée de vol dans le modèle de voyage Isekaid — décision validée avec
// l'utilisateur plutôt que d'inventer un contenu.
export function buildCarnetHTML(trip, villeById, lieuById, baseUrl = CARNET_BASE_URL){
  const pages = [];
  pages.push(buildCoverPage(trip, villeById, baseUrl));
  pages.push(buildIntroPage(trip, villeById));
  pages.push(buildVillesPage(trip, villeById));
  pages.push(buildInfosPage(trip, villeById));

  const etapes = groupJoursIntoEtapes(trip.jours, villeById);
  etapes.forEach((etape, i) => {
    pages.push(buildEtapePage(i+1, etape.nom));
    etape.jours.forEach(jour => {
      pages.push(buildJourPage(trip, jour, villeById, lieuById));
      pages.push(...buildProgPages(jour, lieuById, baseUrl));
    });
  });

  pages.push(buildNotesPage());

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${escapeHtml(trip.titre || "Carnet de voyage")}</title>
<style>${CARNET_CSS}</style>
</head><body>
${pages.join("\n\n")}
</body></html>`;
}
