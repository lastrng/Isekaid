// ─────────────────────────────────────────────────────────────────────────────
// scenarioTutorBridge.js — Pont Scénarios scriptés → Tuteur IA
//
// À la fin d'un scénario scripté réussi (App.jsx / japan-data.json), on
// propose de "rejouer" la même situation librement avec le tuteur IA
// (Tutor.jsx). Ce fichier ne fait que mapper l'id du scénario scripté vers
// le scénario tuteur le plus proche thématiquement, et construire le
// contexte à injecter — il ne touche à aucune logique existante des deux
// systèmes (pont, pas fusion).
// ─────────────────────────────────────────────────────────────────────────────

// scriptedScenarioId -> tutorScenarioId | null (null = pas d'équivalent direct,
// on retombe sur la conversation libre du tuteur avec un contexte injecté).
export const SCENARIO_TUTOR_BRIDGE = {
  presentation: "se_presenter",
  presentation2: "se_presenter",
  "konbini-scenario": "courses",
  konbini2: "courses",
  shopping: "courses",
  restaurant: "restaurant",
  cafe: "restaurant",
  izakaya: "restaurant",
  hotel: "hotel",
  direction: "chemin",
  taxi: "chemin",
  train: null,
  urgence: null,
  musee: null,
  remercier: null,
  sexcuser: null,
  "adv-medecin": null,
  "adv-coiffeur": null,
  "adv-voisin": null,
  "adv-poste": null,
};

export function scenarioTutorTarget(scriptedScenario){
  return SCENARIO_TUTOR_BRIDGE[scriptedScenario?.id] || "libre";
}

// Contexte injecté dans le tuteur : reconstruit à partir des données réelles
// du scénario scripté (titre, contexte, vocabulaire correct déjà vu) plutôt
// que codé en dur, pour rester synchro si le contenu des scénarios change.
export function buildBridgeContext(scriptedScenario, niveauLabel){
  if(!scriptedScenario) return "";
  const vocab = Array.from(new Set(
    (scriptedScenario.etapes || []).flatMap(e =>
      (e.choix || []).filter(c => c.correct && c.jp).map(c => c.jp)
    )
  )).slice(0, 6);
  return [
    `Pont depuis un scénario scripté que l'utilisateur vient de réussir : "${scriptedScenario.titre}"${scriptedScenario.contexte ? ` — ${scriptedScenario.contexte}` : ""}.`,
    vocab.length ? `Expressions déjà pratiquées dans ce scénario : ${vocab.join(" / ")}.` : null,
    "Rejoue une variante libre et naturelle de cette même situation (pas les mêmes répliques mot pour mot), en réutilisant ce vocabulaire quand c'est pertinent, pour que l'utilisateur pratique au-delà des rails du scénario scripté.",
    niveauLabel ? `Niveau estimé de l'utilisateur : ${niveauLabel}.` : null,
  ].filter(Boolean).join(" ");
}
