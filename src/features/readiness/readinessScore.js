// Score transparent : chaque point renvoie à une donnée observable.
export const READINESS_TARGETS = Object.freeze({ kana: 20, scenarios: 4, vocabulary: 20 });
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const percent = value => Math.round(clamp(value) * 100);

function masteredKana(progress) {
  return Object.values(progress || {}).filter(card => (card?.level || 0) >= 3).length;
}

function completedVocabulary(progress) {
  if (Array.isArray(progress)) return progress.filter(Boolean).length;
  return Object.values(progress || {}).filter(item => item === true || item?.learned === true || (item?.level || 0) >= 3).length;
}
function observedRatio(values) {
  const known = values.filter(item => item.known);
  return known.length ? known.filter(item => item.done).length / known.length : 0;
}

export function calculateReadinessScore({ trip, kanaProgress, vocabularyProgress, scenarioProgress, pathProgress, contentProgress } = {}) {
  const days = trip?.jours || [];
  const activities = days.flatMap(day => day.activites || []);
  const checklist = trip?.checklist || [];
  const completedChecklist = checklist.filter(item => item.fait).length;
  const transportItems = checklist.filter(item => /jr pass|suica|pasmo|transport|train|avion|billet/i.test(item.texte || ""));
  const completedTransport = transportItems.filter(item => item.fait).length;
  const socialItems = checklist.filter(item => item.category==="codesSociaux" || /codes sociaux|étiquette|etiquette|savoir.vivre|politesse|coutumes/i.test(item.texte || ""));
  const completedSocial = socialItems.filter(item=>item.fait).length;
  const completedScenarios = new Set(scenarioProgress?.done || []).size;
  const completedPath = new Set(pathProgress?.completed || []).size;
  const contentViewed = Array.isArray(contentProgress) ? contentProgress.filter(Boolean).length : new Set(Object.entries(contentProgress || {}).filter(([, value]) => value === true || value?.viewed === true).map(([key]) => key)).size;
  const emergencyItems = checklist.filter(item => /urgence|médic|medic|pharmacie|assurance|112|119/i.test(item.texte || ""));
  const contentSignals = contentViewed > 0 ? [{ known: true, done: contentViewed > 0 }] : [];
  const preparationSignals = checklist.length ? [{ known: true, done: completedChecklist === checklist.length }, ...contentSignals] : contentSignals;

  const lodgingKnown = trip && (Array.isArray(trip.hebergements) ? trip.hebergements.length > 0 : Boolean(trip.hebergement || trip.hotel));
  const travelSignals = [
    { known: Boolean(trip), done: Boolean(trip) },
    { known: Boolean(trip?.dateDebut), done: Boolean(trip?.dateDebut) },
    { known: Boolean(trip?.villes?.length), done: Boolean(trip?.villes?.length) },
    { known: days.length > 0, done: activities.length > 0 },
    { known: lodgingKnown, done: lodgingKnown },
  ];
  const learnedVocabulary = completedVocabulary(vocabularyProgress);
  const categories = {
    voyage: percent(observedRatio(travelSignals)),
    japonais: percent((clamp(masteredKana(kanaProgress) / READINESS_TARGETS.kana) + clamp(completedScenarios / READINESS_TARGETS.scenarios) + clamp(learnedVocabulary / READINESS_TARGETS.vocabulary)) / 3),
    codesSociaux: percent(socialItems.length ? completedSocial / socialItems.length : 0),
    transports: percent(transportItems.length ? completedTransport / transportItems.length : 0),
    preparatifs: percent(checklist.length ? (completedChecklist / checklist.length) : observedRatio(preparationSignals)),
  };
  // Même poids par domaine : aucun domaine ne peut masquer un angle mort.
  const global = Math.round(Object.values(categories).reduce((sum, value) => sum + value, 0) / Object.keys(categories).length);
  return {
    global,
    categories,
    evidence: { days:days.length, activities:activities.length, checklist:checklist.length, completedChecklist, transportItems:transportItems.length, completedTransport, socialItems:socialItems.length, completedSocial, emergencyItems:emergencyItems.length, masteredKana:masteredKana(kanaProgress), learnedVocabulary, completedScenarios, completedPath, contentViewed, lodgingKnown: Boolean(lodgingKnown), knownTravelSignals: travelSignals.filter(item => item.known).length },
  };
}
