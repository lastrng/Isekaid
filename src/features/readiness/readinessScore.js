// Score transparent : chaque point renvoie à une donnée observable.
const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const percent = value => Math.round(clamp(value) * 100);

function masteredKana(progress) {
  return Object.values(progress || {}).filter(card => (card?.level || 0) >= 3).length;
}

export function calculateReadinessScore({ trip, kanaProgress, scenarioProgress, pathProgress } = {}) {
  const days = trip?.jours || [];
  const activities = days.flatMap(day => day.activites || []);
  const checklist = trip?.checklist || [];
  const completedChecklist = checklist.filter(item => item.fait).length;
  const transportItems = checklist.filter(item => /jr pass|suica|pasmo|transport|train|avion|billet/i.test(item.texte || ""));
  const completedTransport = transportItems.filter(item => item.fait).length;
  const completedScenarios = new Set(scenarioProgress?.done || []).size;
  const completedPath = new Set(pathProgress?.completed || []).size;

  const categories = {
    voyage: percent((Number(Boolean(trip)) + Number(Boolean(trip?.dateDebut)) + Number((trip?.villes?.length || 0) > 0) + clamp(activities.length / Math.max(1, days.length * 2))) / 4),
    japonais: percent((clamp(masteredKana(kanaProgress) / 20) * 0.7) + (clamp(completedScenarios / 4) * 0.3)),
    codesSociaux: percent(clamp(completedScenarios / 4)),
    transports: percent(transportItems.length ? completedTransport / transportItems.length : (trip?.dateDebut ? 0.25 : 0)),
    preparatifs: percent(checklist.length ? completedChecklist / checklist.length : 0),
  };
  // Même poids par domaine : aucun domaine ne peut masquer un angle mort.
  const global = Math.round(Object.values(categories).reduce((sum, value) => sum + value, 0) / Object.keys(categories).length);
  return {
    global,
    categories,
    evidence: { days:days.length, activities:activities.length, checklist:checklist.length, completedChecklist, transportItems:transportItems.length, completedTransport, masteredKana:masteredKana(kanaProgress), completedScenarios, completedPath },
  };
}
