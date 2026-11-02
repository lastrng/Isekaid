import { getTripTiming } from "../../entities/user/japanJourneyState.js";
import { isContentRead } from "../explore/contentReading.js";

const DAY_MS = 86_400_000;
const list = value => Array.isArray(value) ? value : [];

const PRACTICE_CONTEXTS = [
  { pattern:/restaurant|ramen|sushi|repas|gastronom/i, scenarioId:"restaurant", title:"Commander au restaurant", daysBefore:21 },
  { pattern:/izakaya/i, scenarioId:"izakaya", title:"Commander dans un izakaya", daysBefore:18 },
  { pattern:/café|coffee|kissaten|salon de thé/i, scenarioId:"cafe", title:"Faire une pause au café", daysBefore:18 },
  { pattern:/hôtel|hotel|ryokan|hébergement/i, scenarioId:"hotel", title:"Préparer mon arrivée à l’hôtel", daysBefore:14 },
  { pattern:/shopping|boutique|marché|magasin/i, scenarioId:"shopping", title:"Faire mes achats en japonais", daysBefore:12 },
  { pattern:/konbini|supérette/i, scenarioId:"konbini-scenario", title:"Passer au konbini", daysBefore:12 },
  { pattern:/musée|musee|museum|exposition/i, scenarioId:"musee", title:"Demander une entrée au musée", daysBefore:10 },
];

function itineraryEntries(trip, db) {
  const places = new Map([...list(db.lieux), ...list(trip.customLieux)].filter(Boolean).map(place => [String(place.id), place]));
  const cities = new Map(list(db.villes).filter(Boolean).map(city => [String(city.id), city]));
  return list(trip.jours).flatMap((day, index) => list(day?.activites).filter(Boolean).map(activity => {
    const place = places.get(String(activity.lieuId));
    const city = cities.get(String(place?.villeId || day.villeId));
    return {
      activity,
      text:[place?.nom, place?.categorie, place?.type, activity.titre, activity.nom].filter(Boolean).join(" "),
      reason:`Au programme : ${place?.nom || activity.titre || activity.nom || day.titre || "une étape"}${city?.nom ? ` à ${city.nom}` : ""} · jour ${day.num || index + 1}.`,
    };
  }));
}

function checklistDaysBefore(text) {
  if (/passeport|visa|avion|hôtel|hotel|ryokan|réservation|reservation/i.test(text)) return 30;
  if (/assurance|train|jr pass|suica|pasmo|transport/i.test(text)) return 14;
  if (/adaptateur|prise/i.test(text)) return 5;
  if (/yen|espèces|especes|change|argent/i.test(text)) return 3;
  return 7;
}

function phaseFor(daysBefore) {
  if (daysBefore > 21) return "Poser les bases";
  if (daysBefore > 7) return "Pratiquer pour mon séjour";
  return "Les derniers préparatifs";
}

/**
 * Programme dérivé du voyage et des progrès existants : aucun état parallèle,
 * aucune validation implicite lors de l'ouverture d'un contenu. Les dates sont
 * des jours calendaires au Japon, comme le reste du domaine Voyage.
 */
export function buildPreparationProgram({ trip, db = {}, scenarioProgress = {}, readingProgress = {}, currentDate = new Date() } = {}) {
  if (!trip?.id || ["cancelled", "completed"].includes(trip.status)) return null;
  const timing = getTripTiming(trip, currentDate);
  if (!timing) return {
    state:"undated", tripId:trip.id, tripTitle:trip.titre || "Mon voyage au Japon",
    action:{ kind:"trip", tripId:trip.id, sub:"summary", label:"Ajouter mes dates" },
  };
  if (timing.status !== "upcoming") return null;

  const tasks = [];
  const entries = itineraryEntries(trip, db);
  const doneScenarios = new Set(list(scenarioProgress?.done));
  const scenarios = new Map(list(db.scenarios).filter(Boolean).map(scenario => [scenario.id, scenario]));
  const tripAction = (sub, label) => ({ kind:"trip", tripId:trip.id, sub, label });
  const addTask = task => {
    if (tasks.some(existing => existing.id === task.id)) return;
    tasks.push({ ...task, done:task.done === true });
  };
  const addPractice = (scenarioId, title, daysBefore, reason) => {
    if (!scenarios.has(scenarioId)) return;
    addTask({
      id:`scenario:${scenarioId}`, title, daysBefore, reason, minutes:5,
      description:"Entraîne-toi dans une mise en situation en japonais.",
      done:doneScenarios.has(scenarioId),
      action:{ kind:"learning", scenarioId, label:"M’entraîner" },
    });
  };
  const addReading = (collection, type, id, daysBefore, reason) => {
    const item = list(db[collection]).find(content => content?.id === id);
    if (!item) return;
    const alias = type === "vie" ? "daily_life" : "social_code";
    addTask({
      id:`${type}:${id}`, title:item.titre || item.nom, daysBefore, reason, minutes:3,
      description:"Lis les repères utiles, puis marque cette lecture comme lue.",
      done:isContentRead(readingProgress, type, item) || isContentRead(readingProgress, alias, item),
      action:{ kind:"reading", type, contentId:id, label:"Lire les conseils" },
    });
  };

  addTask({
    id:"itinerary", title:"Choisir mes premières étapes", daysBefore:45, minutes:5,
    description:"Ajoute au moins un lieu à une journée de ton voyage.",
    reason:"Ton programme de préparation s’adaptera aux lieux que tu choisis.",
    done:entries.some(entry => Boolean(entry.activity.lieuId)),
    action:tripAction("day", "Organiser mon itinéraire"),
  });
  addPractice("presentation", "Me présenter et saluer", 40, "Quelques politesses pour les premières rencontres au Japon.");
  const station = entries.find(entry => /gare|train|transport|métro|station/i.test(entry.text));
  addPractice("train", "Prendre le train en japonais", 25, station?.reason || "Pour rejoindre tes étapes et te repérer dans les gares.");
  for (const context of PRACTICE_CONTEXTS) {
    const entry = entries.find(item => context.pattern.test(item.text));
    if (entry) addPractice(context.scenarioId, context.title, context.daysBefore, entry.reason);
  }
  addPractice("direction", "Demander mon chemin", 9, "Une question simple pour retrouver ton hôtel ou la prochaine visite.");
  const temple = entries.find(entry => /temple|sanctuaire|shrine|jinja/i.test(entry.text));
  if (temple) addReading("codes_sociaux", "code", "temple-sanctuaire-priere", 16, temple.reason);
  const bath = entries.find(entry => /onsen|sentō|sento|bain public/i.test(entry.text));
  if (bath) addReading("codes_sociaux", "code", "onsen-lavage", 11, bath.reason);
  addReading("vie_quotidienne", "vie", "sim-wifi", 10, "Prévois comment retrouver tes réservations et tes itinéraires sur place.");
  addReading("vie_quotidienne", "vie", "banque-atm", 5, "Prépare tes moyens de paiement avant les premiers achats.");
  for (const [index, item] of list(trip.checklist).entries()) {
    const title = String(item?.texte || item?.label || "").trim();
    if (!title) continue;
    addTask({
      id:`checklist:${item.id || index}`, title, daysBefore:checklistDaysBefore(title), minutes:5,
      description:"Vérifie ce préparatif, puis coche-le dans ta checklist.",
      reason:"Un préparatif de ta checklist de voyage.", done:item.fait === true,
      action:tripAction("checklist", "Vérifier ma checklist"),
    });
  }
  addTask({
    id:"documents", title:"Garder une réservation à portée de main", daysBefore:7, minutes:3,
    description:"Enregistre un premier document ou une référence dans les documents du voyage.",
    reason:"Retrouve facilement tes informations à l’arrivée.",
    done:list(trip.documents).length > 0,
    action:tripAction("documents", "Ouvrir mes documents"),
  });
  addPractice("urgence", "Savoir demander de l’aide", 2, "Prépare les mots utiles si tu rencontres un imprévu.");

  const scheduled = tasks.map(task => ({
    ...task,
    date:new Date(timing.start.valueOf() - task.daysBefore * DAY_MS).toISOString().slice(0, 10),
    due:timing.daysUntil <= task.daysBefore,
    phase:phaseFor(task.daysBefore),
  })).sort((a, b) => b.daysBefore - a.daysBefore || a.id.localeCompare(b.id));
  const remaining = scheduled.filter(task => !task.done);
  // À l'approche du départ, les préparatifs devenus utiles passent en premier.
  // Les autres actions restent accessibles et ne sont jamais perdues.
  const due = remaining.filter(task => task.due).sort((a, b) => a.daysBefore - b.daysBefore || a.id.localeCompare(b.id));
  const next = due[0] || remaining[0] || null;
  const completed = scheduled.length - remaining.length;
  return {
    state:remaining.length ? "planning" : "complete",
    tripId:trip.id, tripTitle:trip.titre || "Mon voyage au Japon", departure:trip.dateDebut,
    daysUntil:timing.daysUntil, tasks:scheduled, next, completed, total:scheduled.length,
    percent:scheduled.length ? Math.round(completed / scheduled.length * 100) : 0,
    nextLabel:next?.due ? "Ma petite action du jour" : "Pour prendre de l’avance",
  };
}
