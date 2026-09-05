import { JAPAN_RELATIONSHIP } from "../../entities/user/profileModel.js";

const action = (id, title, text, tab, priority, extra = {}) => ({ id, title, text, tab, priority, ...extra });

/** Recommandations locales et déterministes : aucune décision par IA. */
export function getHomeRecommendations({ context, readiness = null, hasInspiration = false, hasRelated = false } = {}) {
  const state = context?.state;
  const actions = [];
  if (state === JAPAN_RELATIONSHIP.IN_JAPAN) {
    actions.push(action("today", "Voir ma journée", "Programme, progression et prochaine activité", "voyage", 100));
    actions.push(action("sos", "Ouvrir SOS Japon", "Une phrase claire à montrer rapidement", "sos", 95));
    actions.push(action("phrases", "Phrases utiles", "Restaurant, train, hôtel et situations réelles", "phrases", 90));
    if (context.nextActivity) actions.push(action("next_activity", "Continuer mon itinéraire", "Retrouver le lieu de la prochaine activité", "voyage", 85));
  } else if (context?.nextTrip || state === JAPAN_RELATIONSHIP.PLANNING || state === JAPAN_RELATIONSHIP.SOON) {
    actions.push(action("itinerary", "Ouvrir mon itinéraire", context.nextTrip ? `J-${context.nextTrip.timing.daysUntil} · préparer le départ` : "Construire les prochaines étapes", "voyage", 100));
    actions.push(action("readiness", "Voir ma préparation", readiness ? `${readiness}% prêt pour le Japon` : "Checklist et préparation", "voyage", 90));
    actions.push(action("learn", "Apprendre ce qui sera utile", "Expressions et scénarios pour le séjour", "learn", 80));
    actions.push(action("documents", "Vérifier mes documents", "Réservations et références du voyage", "voyage", 70));
  } else if (state === JAPAN_RELATIONSHIP.RETURNED || state === JAPAN_RELATIONSHIP.JAPAN_LOVER) {
    actions.push(action("journal", "Retrouver mon carnet", "Voyages, notes et souvenirs", "profile", 100));
    if (hasRelated) actions.push(action("related", "Prolonger une découverte", "Un contenu lié aux lieux visités", "explore", 85));
    actions.push(action("learn", "Garder mon japonais vivant", "Quelques minutes d’apprentissage", "learn", 75));
    actions.push(action("new_trip", "Préparer un nouveau départ", "Donner forme à une prochaine envie", "voyage", 60));
  } else {
    if (hasInspiration) actions.push(action("inspiration", "Découvrir une inspiration", "Un lieu choisi selon tes envies", "explore", 100));
    actions.push(action("culture", "Explorer la culture japonaise", "Traditions, régions et vie quotidienne", "explore", 90));
    actions.push(action("learn", "Commencer le japonais", "Kana et expressions à ton rythme", "learn", 80));
    actions.push(action("new_trip", "Commencer un voyage", "Même sans date de départ", "voyage", 70));
  }
  const seen = new Set();
  return actions.sort((a, b) => b.priority - a.priority).filter(item => !seen.has(item.id) && seen.add(item.id)).slice(0, 5);
}
