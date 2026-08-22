#!/usr/bin/env node
/**
 * generate-preconcu-content.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * Phase 2/3 — Génère le CONTENU ÉDITORIAL RICHE d'un itinéraire préconçu
 * (intro, conseils du jour, notes de parcours par lieu, transitions,
 * hébergement) via Claude Haiku, en s'appuyant sur les faits déjà fiables
 * du catalogue de lieux (conseil/duree/budget/acces) plutôt que de les
 * réinventer.
 *
 * Garde-fous :
 *   - Les lieux et leur ordre sont FIXES (fournis en entrée) : le modèle ne
 *     peut ni en ajouter, ni en retirer, ni en inventer. Vérifié après coup
 *     (pas seulement demandé dans le prompt).
 *   - Sortie forcée par tool-use (JSON strict), même patron que les Edge
 *     Functions tutor-chat / itinerary-generate.
 *   - AUCUNE écriture dans japan-data.json : le résultat est un BROUILLON
 *     écrit à part (voyages-preconcus-draft/<id>.json + .md lisible),
 *     verified:false, à relire avant toute fusion manuelle.
 *
 * USAGE :
 *   ANTHROPIC_API_KEY=... node generate-preconcu-content.mjs essentiel-7j
 * ─────────────────────────────────────────────────────────────────────────
 */
import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("❌ Variable ANTHROPIC_API_KEY manquante.");
  process.exit(1);
}
const MODEL = process.env.PRECONCU_MODEL || "claude-haiku-4-5-20251001";
const TARGET_ID = process.argv[2];
if (!TARGET_ID) {
  console.error("Usage: node generate-preconcu-content.mjs <id-itineraire>");
  process.exit(1);
}

const ROOT = path.resolve(".");
const DATA_PATH = path.join(ROOT, "src", "japan-data.json");
const OUT_DIR = path.join(ROOT, "voyages-preconcus-draft");

const db = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const lieuById = Object.fromEntries(db.lieux.map((l) => [l.id, l]));
const villeById = Object.fromEntries(db.villes.map((v) => [v.id, v]));
const preconcu = (db.voyages_preconcus || []).find((p) => p.id === TARGET_ID);
if (!preconcu) {
  console.error(`❌ Itinéraire "${TARGET_ID}" introuvable dans voyages_preconcus.`);
  process.exit(1);
}

// ── Contexte factuel envoyé au modèle : uniquement les lieux/villes déjà
// présents dans l'itinéraire, avec leurs champs catalogue fiables. Le
// modèle s'appuie dessus pour écrire du contexte plausible SANS inventer
// de faits (horaires/prix/accès réels déjà là, pas à réinventer).
const villesUsed = [...new Set(preconcu.jours.map((j) => j.villeId))];
const villesContext = villesUsed.map((id) => {
  const v = villeById[id];
  return { id, nom: v?.nom, region: v?.region, tagline: v?.tagline };
});
const joursContext = preconcu.jours.map((j) => ({
  num: j.num,
  villeId: j.villeId,
  titre: j.titre,
  etapes: (j.etapes || []).map((e) => {
    const l = lieuById[e.lieuId];
    return {
      lieuId: e.lieuId,
      heure: e.heure,
      nom: l?.nom,
      type: l?.type,
      categorie: l?.categorie,
      quartier: l?.quartier,
      duree: l?.duree,
      budget: l?.budget,
      acces: l?.acces,
      conseil: l?.conseil,
    };
  }),
}));
// Lieux "dormir" déjà catalogués pour les villes du parcours — le modèle
// PEUT les référencer par lieuId dans `hebergement`, jamais en inventer/
// nommer un autre établissement précis.
const dormirDispo = db.lieux
  .filter((l) => l.type === "dormir" && villesUsed.includes(l.villeId))
  .map((l) => ({ lieuId: l.id, villeId: l.villeId, nom: l.nom, budget: l.budget }));

const SYSTEM = `Tu écris le contenu éditorial d'un itinéraire de voyage au Japon pour l'app Isekai'd, dans la voix d'un ami francophone qui connaît bien le pays — jamais le ton plat d'un guide touristique générique. Chaleureux, concret, phrases courtes.

RÈGLES STRICTES :
1. Les lieux et leur ORDRE sont FIXES, fournis ci-dessous avec leurs faits catalogue (déjà vérifiés). Tu n'ajoutes, ne retires, ni ne réordonnes AUCUN lieu. Tu écris uniquement le commentaire éditorial autour.
2. INTERDIT D'INVENTER TOUT FAIT VÉRIFIABLE NON FOURNI — c'est la règle la plus importante, applique-la de façon large : dates historiques précises, statistiques (nombre de personnes, longueur en mètres, nombre d'échoppes/étages, année de fondation/reconstruction...), noms de produits ou pass touristiques précis ("JR Kyoto Bus Pass", etc.), noms de services de train précis autres que génériques, records, tout chiffre qui sonne factuel. Si tu ne connais pas un fait avec certitude à partir des données fournies ci-dessous, NE L'INVENTE PAS — reste qualitatif : "un marché animé apprécié des habitants" plutôt que "100 échoppes sur 560 mètres depuis 1820" ; "le carrefour piéton emblématique du quartier" plutôt que "3 000 personnes le traversent à chaque signal".
   Cette règle s'applique aussi aux nombres ÉCRITS EN LETTRES ("mille ans", "six siècles", "des dizaines de") : mêmes précautions que pour les chiffres.
   Exemples À NE PAS FAIRE (erreurs réelles vues précédemment) : "construit en 1583, reconstruit en béton en 1995" (dates inventées) ; "100 petits restaurants sur 560 mètres" (statistiques inventées) ; "JR Kyoto Bus Pass" (nom de produit non vérifié) ; "Shinpai Express" (nom de train inventé) ; "mille ans de traditions culinaires" pour un marché (durée historique exagérée/inventée) ; "brûlé en 1950" (date historique précise non fournie, même si elle te semble connue).
   Les SEULS chiffres autorisés dans les champs textuels : (a) une durée de trajet approximative au format "~X min"/"~X h" dans "arrivee"/"arriveeVille" (jamais à la minute près) ; (b) une valeur qui apparaît déjà mot pour mot dans les faits catalogue fournis (duree/budget/acces/nom) — tu peux la citer telle quelle mais pas la recalculer/préciser davantage.
2bis. INTERDIT de nommer une ligne de métro/train précise (numéro, couleur, nom de ligne — ex. "Ginza Line", "Chiyoda Line") dans "arrivee"/"arriveeVille" SAUF si cette ligne apparaît mot pour mot dans le champ "acces" du lieu d'ARRIVÉE fourni ci-dessous. Sinon reste générique : "métro", "train", "à pied", "bus" — sans préciser laquelle. Ne cite jamais une app tierce précise (Hyperdia, Google Maps, Navitime, etc.) — dis "ton appli de transport habituelle" si besoin.
3. noteParcours (par étape) : pourquoi CE lieu à CE moment du parcours, quoi ne pas rater — 1 à 2 phrases. Ne redis JAMAIS la description déjà affichée ailleurs dans l'app ; apporte un angle narratif/pratique nouveau — un ANGLE (ambiance, ressenti, conseil de timing/comportement), pas un fait chiffré supplémentaire.
4. conseilDuJour : un seul conseil pratique et actionnable pour la journée entière (pas d'horaire/prix exact, pas de nom d'appli/produit tiers précis).
5. arrivee (entre deux étapes du même jour) : TOUJOURS les deux champs "mode" ET "duree" ensemble (jamais l'un sans l'autre), + note courte optionnelle. Omets tout le champ "arrivee" pour la 1re étape du jour — mais si tu le mets, "duree" est obligatoire.
6. arriveeVille (au niveau du jour) : uniquement si la ville change par rapport au jour précédent — décrit le trajet inter-villes (ex. Shinkansen, sans numéro de train précis). Même règle : "mode" ET "duree" toujours ensemble.
7. hebergement : une entrée par ville visitée, type + gamme génériques (ex. "ryokan traditionnel", "¥¥"). Si un lieuId de type "dormir" est fourni ci-dessous pour cette ville (hebergement_catalogue_disponible), RÉFÉRENCE-LE systématiquement par lieuId (n'omets ce lien que si tu as une vraie raison éditoriale de rester générique). Jamais nommer un autre établissement précis hors catalogue.
8. Longueurs : intro voyage 2-3 phrases ; sousTitre court (5-8 mots) mais ÉVOCATEUR — jamais une simple liste de villes (mauvais exemple : "Tokyo, Hakone, Kyoto, Osaka" ; bon exemple : "Du néon de Tokyo au silence des temples") ; intro jour 1 phrase ; conseilDuJour 1 phrase ; noteParcours 1-2 phrases ; note d'arrivée 1 phrase max.
9. Français, pas d'emoji dans le texte (l'UI les gère séparément).`;

const userContent = JSON.stringify({
  titre: preconcu.titre,
  description_actuelle: preconcu.description,
  niveau: preconcu.niveau,
  duree: preconcu.duree,
  villes: villesContext,
  hebergement_catalogue_disponible: dormirDispo,
  jours: joursContext,
}, null, 2);

const RESPONSE_TOOL = {
  name: "emit_contenu_riche",
  description: "Renvoie le contenu éditorial riche de l'itinéraire, structuré par jour et par étape.",
  input_schema: {
    type: "object",
    properties: {
      sousTitre: { type: "string" },
      intro: { type: "string" },
      rythme: { type: "string", enum: ["dense", "équilibré", "tranquille"] },
      budgetIndicatif: { type: "string", enum: ["¥", "¥¥", "¥¥¥"] },
      hebergement: {
        type: "array",
        items: {
          type: "object",
          properties: {
            villeId: { type: "string" },
            type: { type: "string" },
            gamme: { type: "string", enum: ["¥", "¥¥", "¥¥¥"] },
            note: { type: "string" },
            lieuId: { type: "string", description: "Optionnel — un lieuId de type dormir fourni en entrée, sinon omettre le champ." },
          },
          required: ["villeId", "type", "gamme", "note"],
        },
      },
      jours: {
        type: "array",
        items: {
          type: "object",
          properties: {
            num: { type: "integer" },
            intro: { type: "string" },
            conseilDuJour: { type: "string" },
            arriveeVille: {
              type: "object",
              description: "Uniquement si la ville change vs le jour précédent, sinon omettre.",
              properties: { mode: { type: "string" }, duree: { type: "string" }, note: { type: "string" } },
              required: ["mode", "duree"],
            },
            etapes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  lieuId: { type: "string" },
                  noteParcours: { type: "string" },
                  arrivee: {
                    type: "object",
                    description: "Omettre pour la 1re étape du jour.",
                    properties: { mode: { type: "string" }, duree: { type: "string" }, note: { type: "string" } },
                    required: ["mode", "duree"],
                  },
                },
                required: ["lieuId", "noteParcours"],
              },
            },
          },
          required: ["num", "intro", "conseilDuJour", "etapes"],
        },
      },
    },
    required: ["sousTitre", "intro", "rythme", "budgetIndicatif", "hebergement", "jours"],
  },
};

async function callAnthropic() {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
      tools: [RESPONSE_TOOL],
      tool_choice: { type: "tool", name: "emit_contenu_riche" },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`anthropic_http_${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  if (data.stop_reason === "max_tokens") {
    throw new Error("réponse tronquée (max_tokens atteint) — JSON incomplet, augmente max_tokens.");
  }
  const toolUse = (data.content || []).find((b) => b.type === "tool_use" && b.name === "emit_contenu_riche");
  if (!toolUse) throw new Error("no_tool_use_block");
  if (!Array.isArray(toolUse.input?.jours)) {
    throw new Error(`champ "jours" invalide (type ${typeof toolUse.input?.jours}) — sortie du modèle malformée.`);
  }
  return toolUse.input;
}

// ── Garde-fou post-génération : vérifie qu'aucun lieuId hors catalogue/hors
// liste fournie n'a été introduit, et que l'ordre/ensemble des étapes par
// jour correspond exactement à l'entrée. Rejette (ne fusionne rien) sinon.
function validate(generated) {
  const errors = [];
  const expectedByDay = new Map(preconcu.jours.map((j) => [j.num, (j.etapes || []).map((e) => e.lieuId)]));
  const gotDays = new Set();
  for (const j of generated.jours || []) {
    gotDays.add(j.num);
    const expected = expectedByDay.get(j.num);
    if (!expected) { errors.push(`Jour ${j.num} inattendu (absent de l'itinéraire source).`); continue; }
    const got = (j.etapes || []).map((e) => e.lieuId);
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      errors.push(`Jour ${j.num} : lieux/ordre modifiés.\n   attendu: ${JSON.stringify(expected)}\n   reçu:    ${JSON.stringify(got)}`);
    }
  }
  for (const num of expectedByDay.keys()) {
    if (!gotDays.has(num)) errors.push(`Jour ${num} manquant dans la génération.`);
  }
  for (const h of generated.hebergement || []) {
    if (h.lieuId && !dormirDispo.some((d) => d.lieuId === h.lieuId)) {
      errors.push(`hebergement: lieuId "${h.lieuId}" ne fait pas partie des lieux "dormir" fournis.`);
    }
  }
  // Le tool-use de l'API n'impose pas toujours strictement les "required"
  // d'un objet imbriqué (vu en pratique : "arrivee" sans "duree") — on le
  // vérifie nous-mêmes plutôt que de laisser un "undefined" fuiter dans le
  // rendu final.
  for (const j of generated.jours || []) {
    if (j.arriveeVille && (!j.arriveeVille.mode || !j.arriveeVille.duree)) {
      errors.push(`Jour ${j.num} : arriveeVille incomplet (mode/duree manquant) — ${JSON.stringify(j.arriveeVille)}`);
    }
    for (const e of j.etapes || []) {
      if (e.arrivee && (!e.arrivee.mode || !e.arrivee.duree)) {
        errors.push(`Jour ${j.num}, "${lieuById[e.lieuId]?.nom || e.lieuId}" : arrivee incomplet (mode/duree manquant) — ${JSON.stringify(e.arrivee)}`);
      }
    }
  }
  return errors;
}

// ── Détection heuristique (non bloquante — à vérifier à l'œil) d'une ligne
// de train/métro nommée dans "arrivee"/"arriveeVille" sans être présente
// dans le champ "acces" du lieu d'arrivée : signe probable d'invention
// (règle 2bis du prompt). Liste non exhaustive, juste un filet de sécurité.
const KNOWN_LINES = [
  "Ginza", "Marunouchi", "Hibiya", "Tozai", "Chiyoda", "Yurakucho", "Hanzomon",
  "Namboku", "Fukutoshin", "Asakusa Line", "Mita", "Shinjuku Line", "Oedo",
  "Yamanote", "Keihan", "Hankyu", "Hanshin", "Midosuji", "Tokaido", "Sanyo",
  "Yurikamome", "Odakyu", "Tobu", "Keio", "Randen", "Chuo Line", "Sobu",
];
function findInventedLines(generated) {
  const warnings = [];
  const checkOne = (arrivee, contextLabel, accesArrivee) => {
    if (!arrivee) return;
    const text = `${arrivee.mode || ""} ${arrivee.note || ""}`;
    for (const line of KNOWN_LINES) {
      if (text.includes(line) && !(accesArrivee || "").includes(line)) {
        warnings.push(`${contextLabel} : ligne "${line}" citée mais absente du champ acces du lieu d'arrivée ("${accesArrivee || "—"}").`);
      }
    }
  };
  for (const j of generated.jours || []) {
    const sourceDay = preconcu.jours.find((pj) => pj.num === j.num);
    (j.etapes || []).forEach((e, i) => {
      const l = lieuById[e.lieuId];
      checkOne(e.arrivee, `Jour ${j.num}, arrivée à "${l?.nom || e.lieuId}"`, l?.acces);
    });
    if (j.arriveeVille) {
      const firstLieu = lieuById[sourceDay?.etapes?.[0]?.lieuId];
      checkOne(j.arriveeVille, `Jour ${j.num}, arrivée dans la ville`, firstLieu?.acces);
    }
  }
  return warnings;
}

// ── Rendu markdown lisible pour relecture humaine ──
function toMarkdown(generated) {
  let md = `# ${preconcu.titre} — brouillon (verified: false)\n\n`;
  md += `**Sous-titre :** ${generated.sousTitre}\n\n`;
  md += `**Intro :** ${generated.intro}\n\n`;
  md += `**Rythme :** ${generated.rythme} · **Budget indicatif :** ${generated.budgetIndicatif}\n\n`;
  md += `## Hébergement\n`;
  for (const h of generated.hebergement || []) {
    const vName = villeById[h.villeId]?.nom || h.villeId;
    md += `- **${vName}** — ${h.type} (${h.gamme})${h.lieuId ? ` → catalogue: ${lieuById[h.lieuId]?.nom || h.lieuId}` : ""}\n  ${h.note}\n`;
  }
  md += `\n`;
  for (const j of generated.jours || []) {
    const v = villeById[preconcu.jours.find((pj) => pj.num === j.num)?.villeId];
    md += `## Jour ${j.num} — ${v?.nom || ""}\n`;
    if (j.arriveeVille) md += `> 🚄 Arrivée depuis la ville précédente : ${j.arriveeVille.mode}, ${j.arriveeVille.duree}${j.arriveeVille.note ? ` — ${j.arriveeVille.note}` : ""}\n\n`;
    md += `*${j.intro}*\n\n`;
    md += `💡 **Conseil du jour :** ${j.conseilDuJour}\n\n`;
    for (const e of j.etapes || []) {
      const l = lieuById[e.lieuId];
      if (e.arrivee) md += `  🚶 ${e.arrivee.mode}, ${e.arrivee.duree}${e.arrivee.note ? ` — ${e.arrivee.note}` : ""}\n\n`;
      md += `**${l?.nom || e.lieuId}**\n${e.noteParcours}\n\n`;
    }
  }
  return md;
}

// ── Détection heuristique (non bloquante) de chiffres suspects dans les
// champs narratifs — dates, statistiques, etc. non fournis en entrée. Les
// durées de trajet approximatives ("~X min"/"~X h") sont explicitement
// autorisées (règle 2) et donc exclues ; un chiffre qui apparaît déjà mot
// pour mot dans les faits catalogue fournis (villesContext/joursContext)
// est considéré légitime (probablement repris tel quel).
const CATALOG_FACTS_TEXT = JSON.stringify({ villesContext, joursContext, dormirDispo });
// Recherche par frontière de chiffre (pas un simple `includes`) : un match
// à 1-2 chiffres comme "5" apparaît quasi toujours par hasard comme sous-
// chaîne du blob catalogue (dans "15 min", "2-3h", une heure, un id...),
// ce qui rendait `.includes()` aveugle aux inventions courtes (vu en
// pratique : "étages 5 et 6" jamais signalé alors qu'absent du catalogue).
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function appearsInCatalog(m) {
  return new RegExp(`(?<!\\d)${escapeRegex(m)}(?!\\d)`).test(CATALOG_FACTS_TEXT);
}
function extractSuspiciousNumbers(text, label, warnings) {
  if (!text) return;
  const withoutApproxDurations = text.replace(/~\s*\d+[\s-]*(?:min|h|heures?)\b/gi, "");
  const matches = withoutApproxDurations.match(/\d[\d\s,.]*\d|\d/g) || [];
  for (const m of matches) {
    if (!appearsInCatalog(m.trim())) {
      warnings.push(`${label} : chiffre "${m.trim()}" suspect (absent des faits catalogue fournis) — "${text.slice(0, 90)}${text.length > 90 ? "…" : ""}"`);
    }
  }
}
function findSuspiciousNumbers(generated) {
  const warnings = [];
  extractSuspiciousNumbers(generated.intro, "Intro voyage", warnings);
  extractSuspiciousNumbers(generated.sousTitre, "Sous-titre", warnings);
  for (const h of generated.hebergement || []) extractSuspiciousNumbers(h.note, `Hébergement ${h.villeId}`, warnings);
  for (const j of generated.jours || []) {
    extractSuspiciousNumbers(j.intro, `Jour ${j.num} intro`, warnings);
    extractSuspiciousNumbers(j.conseilDuJour, `Jour ${j.num} conseil`, warnings);
    extractSuspiciousNumbers(j.arriveeVille?.note, `Jour ${j.num} arriveeVille.note`, warnings);
    for (const e of j.etapes || []) {
      extractSuspiciousNumbers(e.noteParcours, `Jour ${j.num} "${lieuById[e.lieuId]?.nom || e.lieuId}" noteParcours`, warnings);
      extractSuspiciousNumbers(e.arrivee?.note, `Jour ${j.num} "${lieuById[e.lieuId]?.nom || e.lieuId}" arrivee.note`, warnings);
    }
  }
  return warnings;
}

async function main() {
  console.log(`📋 Génération du contenu riche pour "${preconcu.titre}" (${preconcu.jours.length} jours, modèle ${MODEL})…`);
  const generated = await callAnthropic();

  const errors = validate(generated);
  const lineWarnings = findInventedLines(generated);
  const numberWarnings = findSuspiciousNumbers(generated);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, `${TARGET_ID}.json`);
  const mdPath = path.join(OUT_DIR, `${TARGET_ID}.md`);

  const draft = {
    id: TARGET_ID,
    contenuGenere: { verified: false, genereLe: new Date().toISOString(), model: MODEL, garde_fous_errors: errors, line_warnings: lineWarnings, number_warnings: numberWarnings },
    ...generated,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(draft, null, 2), "utf8");

  if (errors.length) {
    console.error(`\n❌ ${errors.length} garde-fou(s) violé(s) — RIEN à fusionner tel quel, brouillon quand même écrit pour inspection :`);
    errors.forEach((e) => console.error(" -", e));
    process.exitCode = 1;
  } else {
    fs.writeFileSync(mdPath, toMarkdown(generated), "utf8");
    console.log(`\n✅ Garde-fous structurels OK (lieux/ordre intacts).`);
    if (lineWarnings.length) {
      console.warn(`\n⚠️  ${lineWarnings.length} ligne(s) de transport potentiellement inventée(s) — à vérifier à l'œil :`);
      lineWarnings.forEach((w) => console.warn(" -", w));
    } else {
      console.log(`✅ Aucune ligne de transport suspecte détectée.`);
    }
    if (numberWarnings.length) {
      console.warn(`\n⚠️  ${numberWarnings.length} chiffre(s) suspect(s) (date/statistique non fournie ?) — à vérifier à l'œil :`);
      numberWarnings.forEach((w) => console.warn(" -", w));
    } else {
      console.log(`✅ Aucun chiffre suspect détecté.`);
    }
    console.log(`📄 Brouillon JSON : ${path.relative(ROOT, jsonPath)}`);
    console.log(`📄 Relecture MD  : ${path.relative(ROOT, mdPath)}`);
    console.log(`\n⚠️  verified:false — rien n'est fusionné dans japan-data.json. À relire avant publication.`);
  }
}

main().catch((e) => { console.error("💥", e.message); process.exit(1); });
