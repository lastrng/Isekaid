import { getTripTiming } from "../../entities/user/japanJourneyState.js";
import { withTripDeletions } from "../../services/sync/tripSyncState.js";
// Modèle pur et persistance locale du domaine Voyage.
// Ce module ne dépend pas de React et peut être testé indépendamment des écrans.
import { readJson, writeJson } from "../../lib/storage.js";

const TRIPS_KEY = "isekaid_trips_v1";
const FREE_TRIP_LIMIT = 1;
function loadTrips(){
  const trips = readJson(TRIPS_KEY, []);
  return Array.isArray(trips) ? withTripDeletions(trips).filter(trip=>!trip.deletedAt).map(normalizeTrip) : [];
}
function saveTrips(trips){ return writeJson(TRIPS_KEY, trips); }
function makeTripId(){ return "trip_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function makeStepId(){ return "s_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }
function makeEtapeId(){ return "e_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }

function ensureDayEditorial(day){
  const cityName = day.villeId || "la ville";
  const recit = day.recit?.trim().length >= 100 ? day.recit : `Cette journée à ${cityName} est conçue pour avancer sans précipitation et garder du temps pour observer les quartiers traversés. L’ordre des visites forme un parcours simple, avec des pauses possibles entre les étapes. Les découvertes imprévues, les petites rues et l’ambiance locale comptent autant que les lieux inscrits au programme.`;
  const conseilDuJour = day.conseilDuJour?.trim().length >= 80 ? day.conseilDuJour : `Vérifie les horaires avant de partir, garde une marge pour les transports et adapte le nombre de visites à ton énergie. Un programme légèrement allégé permet souvent de mieux profiter de ${cityName}.`;
  if(recit===day.recit && conseilDuJour===day.conseilDuJour) return day;
  return {...day, recit, conseilDuJour};
}

// Regroupe des jours contigus partageant le même villeId en étapes-villes
// (même principe que carnet.js:groupJoursIntoEtapes, mais produit la forme
// persistée : ids stables + FK etapeId posée sur chaque jour, plutôt qu'un
// simple regroupement en mémoire pour la pagination du PDF).
function deriveEtapesFromJours(jours){
  const etapes = [];
  const outJours = (jours||[]).map(j=>{
    const last = etapes[etapes.length-1];
    const etape = (last && last.villeId===j.villeId) ? last
      : (etapes.push({ id: makeEtapeId(), villeId: j.villeId, nuits: 0, nonPlanifie: [] }), etapes[etapes.length-1]);
    etape.nuits += 1;
    return { ...j, etapeId: etape.id };
  });
  return { etapes, jours: outJours };
}

// Migration douce du modèle de voyage vers la v2 ("voyage à étapes") : posée
// à la LECTURE (loadTrips, sync cloud), jamais forcée en masse — un voyage
// déjà en v2 ressort inchangé (idempotent), un voyage v1 est normalisé et ne
// sera réécrit qu'à la prochaine sauvegarde naturelle (persist()).
function normalizeTrip(trip){
  if(!trip) return trip;
  if(trip.modelVersion===2){
    const jours = (trip.jours||[]).map(ensureDayEditorial);
    return jours.every((day,i)=>day===trip.jours[i]) ? trip : {...trip, jours};
  }
  const jours = (trip.jours||[]).map(j=>({
    ...j, activites: j.activites || j.etapes || [], etapes: undefined,
  })).map(ensureDayEditorial);
  const { etapes, jours: joursWithEtapeId } = trip.etapes
    ? { etapes: trip.etapes, jours }
    : deriveEtapesFromJours(jours);
  return {
    ...trip,
    modelVersion: 2,
    customLieux: trip.customLieux || [],
    checklist: trip.checklist || [],
    etapes,
    jours: joursWithEtapeId,
  };
}

// Check-list de préparatifs par défaut (inspirée d'un vrai voyage)
const DEFAULT_CHECKLIST = [
  "Passeport valide (6 mois)","Billets d'avion","Réservations d'hôtels/ryokan",
  "JR Pass (à commander avant le départ)","Carte IC (Suica/Pasmo)","Pocket WiFi ou eSIM",
  "Adaptateur de prise (type A)","Yens en espèces","Assurance voyage",
];

// Construit un voyage perso à partir d'un itinéraire préconçu
function tripFromPreconcu(p){
  const rawJours = p.jours.map(j=>({
    num: j.num, date:"", villeId: j.villeId, titre: j.titre||"",
    recit: j.recit||"", conseilDuJour: j.conseilDuJour||"",
    activites: (j.etapes||[]).map(e=>({ id: makeStepId(), lieuId: e.lieuId, note:"" }))
  }));
  const { etapes, jours } = deriveEtapesFromJours(rawJours);
  return {
    id: makeTripId(),
    titre: p.titre,
    mode_dates: "jours",
    dateDebut: "",
    modelVersion: 2,
    villes: [...p.villes],
    source: p.id,
    etapes, jours,
    checklist: DEFAULT_CHECKLIST.map((t,i)=>({ id:"c"+i, texte:t, fait:false })),
  };
}

// Construit un voyage perso à partir de la réponse de l'Edge Function
// itinerary-generate (Phase 4.4) : { villes, jours:[{villeId,titre,lieuIds}] }.
// Les ids (trip/étapes) restent générés côté client comme partout ailleurs —
// l'IA ne fait qu'ordonnancer/regrouper, jamais de logique d'identifiants.
function tripFromGenerated(generated, titre, preferences = {}){
  const rawJours = (generated.jours||[]).map((j,i)=>({
    num: i+1, date:"", villeId: j.villeId, titre: j.titre||"",
    recit: j.recit||"", conseilDuJour: j.conseilDuJour||"",
    activites: (j.lieuIds||[]).map(lieuId=>({ id: makeStepId(), lieuId, note:"" })),
  }));
  const { etapes, jours } = deriveEtapesFromJours(rawJours);
  return {
    id: makeTripId(),
    titre,
    mode_dates: "jours",
    dateDebut: "",
    modelVersion: 2,
    generation: { mode:"single_api_call", ...preferences },
    villes: [...(generated.villes||[])],
    etapes, jours,
    checklist: DEFAULT_CHECKLIST.map((t,i)=>({ id:"c"+i, texte:t, fait:false })),
  };
}

// Frontière de confiance entre une réponse réseau et le modèle local.
// Ne conserve que des IDs issus du catalogue envoyé, vérifie l'appartenance
// lieu↔ville, supprime les doublons et complète les oublis sans rien inventer.
function validateGeneratedItinerary(generated, { lieux = [], villes = [], days = 1 } = {}){
  const safeDays = Math.max(1, Math.min(30, Number.parseInt(days, 10) || 1));
  const placeById = new Map(lieux.filter(l=>l?.id && l?.villeId).map(l=>[l.id,l]));
  const cityIds = new Set(villes.map(v=>typeof v==="string"?v:v?.id).filter(Boolean));
  const allowedCities = [...new Set(lieux.map(l=>l?.villeId).filter(id=>cityIds.size===0 || cityIds.has(id)))];
  const issues = [];
  const seen = new Set();
  const sourceDays = Array.isArray(generated?.jours) ? generated.jours : [];
  const normalized = [];

  for(const source of sourceDays.slice(0, safeDays)){
    const cityId = typeof source?.villeId==="string" && allowedCities.includes(source.villeId) ? source.villeId : null;
    if(!cityId){ issues.push("unknown_city"); continue; }
    const lieuIds = [];
    for(const id of Array.isArray(source.lieuIds)?source.lieuIds:[]){
      const place = placeById.get(id);
      if(!place){ issues.push("unknown_place"); continue; }
      if(place.villeId!==cityId){ issues.push("place_city_mismatch"); continue; }
      if(seen.has(id)){ issues.push("duplicate_place"); continue; }
      seen.add(id); lieuIds.push(id);
    }
    normalized.push({ villeId:cityId, titre:"", recit:"", conseilDuJour:"", lieuIds });
  }

  const route = normalized.map(j=>j.villeId);
  for(let i=normalized.length;i<safeDays;i++){
    const villeId = allowedCities[i % Math.max(1,allowedCities.length)];
    if(villeId) normalized.push({ villeId, titre:"", recit:"", conseilDuJour:"", lieuIds:[] });
  }
  for(const place of placeById.values()){
    if(seen.has(place.id) || !allowedCities.includes(place.villeId)) continue;
    let candidates = normalized.map((j,i)=>({j,i})).filter(({j})=>j.villeId===place.villeId);
    if(!candidates.length){
      const replace = normalized.findIndex(j=>j.lieuIds.length===0);
      if(replace>=0){ normalized[replace].villeId=place.villeId; candidates=[{j:normalized[replace],i:replace}]; }
    }
    if(!candidates.length){ issues.push("unplaceable_place"); continue; }
    candidates.sort((a,b)=>a.j.lieuIds.length-b.j.lieuIds.length || a.i-b.i)[0].j.lieuIds.push(place.id);
    seen.add(place.id); issues.push("missing_place_recovered");
  }
  // Le texte est construit uniquement depuis le catalogue local validé. Il
  // reste donc fiable même si la réponse réseau contient du texte libre ou
  // trop court, tout en donnant à chaque journée un vrai contexte éditorial.
  normalized.forEach((day,i)=>{
    const places = day.lieuIds.map(id=>placeById.get(id)).filter(Boolean);
    const names = places.map(place=>place.nom).filter(Boolean);
    const categories = [...new Set(places.map(place=>place.categorie).filter(Boolean))];
    const city = (villes||[]).find(v=>typeof v==="object" && v?.id===day.villeId);
    const cityName = city?.nom || day.villeId;
    const selection = names.length
      ? names.length===1 ? names[0] : `${names.slice(0,-1).join(", ")} et ${names.at(-1)}`
      : `les quartiers et les bonnes adresses de ${cityName}`;
    const theme = categories.length ? categories.slice(0,3).join(", ").toLowerCase() : "découverte locale";
    day.titre = `Jour ${i+1} · Découverte de ${cityName}`;
    day.recit = `Cette journée à ${cityName} est pensée comme une progression agréable autour de ${selection}. Le parcours mêle ${theme} et temps d’observation, avec un ordre cohérent qui évite les détours inutiles. Prends le temps de profiter de chaque étape : l’ambiance des rues et les découvertes entre deux lieux font pleinement partie du voyage.`;
    day.conseilDuJour = `Vérifie les horaires le matin, garde une marge entre les visites et adapte le programme à ton énergie. Les temps de trajet restent indicatifs : mieux vaut retirer une étape que traverser ${cityName} dans la précipitation.`;
  });
  if(normalized.length!==safeDays || normalized.some(day=>!day.villeId)) issues.push("invalid_day_count");
  return { itinerary:{ villes:[...new Set(normalized.map(j=>j.villeId))], jours:normalized }, issues:[...new Set(issues)], valid:normalized.length===safeDays && normalized.every(j=>j.villeId) };
}

// ─── Assistant de création (Phase 1 — parcours de questions) ─────────────────
// Ordre de villes par défaut, curaté à la main (périmètre fermé de 9 villes) —
// sert de base à "Laisse-moi choisir pour toi" ; suit à peu près l'itinéraire
// "essentiel-7j" des voyages préconçus (Tokyo → Hakone → Kyoto/Uji/Nara →
// Osaka), puis les extensions plus lointaines.
const DEFAULT_VILLE_ROUTE = ["tokyo","hakone","kyoto","uji","nara","osaka","hiroshima","kanazawa","takayama"];

function minJoursConseilles(ville){
  const m = String(ville?.jours_conseilles||"").match(/\d+/);
  return m ? parseInt(m[0],10) : 1;
}

// Sélectionne un sous-ensemble cohérent de villes pour une durée donnée en
// suivant l'ordre géographique par défaut, en s'arrêtant dès que le budget de
// jours est atteint (+1 jour de tolérance pour ne pas s'arrêter trop tôt sur
// des fourchettes larges comme "3-4").
function autoPickVilles(villes, days){
  const byId = Object.fromEntries((villes||[]).map(v=>[v.id,v]));
  const picked = []; let total = 0;
  for(const id of DEFAULT_VILLE_ROUTE){
    const v = byId[id]; if(!v) continue;
    const cost = minJoursConseilles(v);
    if(picked.length===0){ picked.push(id); total+=cost; continue; }
    if(total + cost <= days + 1){ picked.push(id); total += cost; }
    else break;
  }
  return picked;
}

// Regroupe les lieux du catalogue correspondant aux critères choisis (villes,
// centres d'intérêt, rythme, saison) pour nourrir itinerary-generate. C'est
// TOUJOURS ce pool, jamais l'IA, qui choisit les lieux candidats — l'IA ne
// fait qu'ordonnancer/répartir sur les jours (même garde-fou que Phase 4.4).
function pickCandidateLieux({ lieux, villes, villeIds, interets, rythme, saison, days }){
  const inVilles = (lieux||[]).filter(l=>villeIds.includes(l.villeId));
  const byInteret = interets?.length
    ? inVilles.filter(l=>(l.interets||[]).some(i=>interets.includes(i)))
    : inVilles;
  const pool = byInteret.length>0 ? byInteret : inVilles; // ne jamais vider le pool si le filtre est trop strict

  const perDay = rythme==="dense" ? 4 : rythme==="tranquille" ? 2 : 3;
  const target = Math.max(villeIds.length, Math.min(60, Math.round(days*perDay)));

  // Priorise les lieux de la saison choisie sans jamais exclure ceux dont la
  // saison n'est pas renseignée (la grande majorité du catalogue).
  const scored = [...pool].sort((a,b)=>{
    if(!saison) return 0;
    const sa = a.saison_ideale===saison ? 0 : 1;
    const sb = b.saison_ideale===saison ? 0 : 1;
    return sa - sb;
  });

  // Répartition proportionnelle au poids (jours_conseilles) de chaque ville,
  // pour ne pas noyer une petite ville sous les lieux d'une grande.
  const villeById = Object.fromEntries((villes||[]).map(v=>[v.id,v]));
  const weights = villeIds.map(id=>Math.max(1, minJoursConseilles(villeById[id])));
  const totalWeight = weights.reduce((a,b)=>a+b,0) || 1;
  const quota = Object.fromEntries(villeIds.map((id,i)=>[id, Math.max(1, Math.round(target*weights[i]/totalWeight))]));

  const result = [];
  villeIds.forEach(id=>{ result.push(...scored.filter(l=>l.villeId===id).slice(0, quota[id])); });
  return result.slice(0, 60);
}

// Titre par défaut du voyage généré, à partir des villes choisies.
function tripTitleFromWizard(villeById, villeIds, days){
  const noms = villeIds.map(id=>villeById[id]?.nom).filter(Boolean);
  const villesLabel = noms.length===0 ? "Japon" : noms.length<=2 ? noms.join(" & ") : `${noms[0]} & ${noms.length-1} autres villes`;
  return `${villesLabel} · ${days} jour${days>1?"s":""}`;
}

function tripTiming(trip, now = new Date()) {
  const timing = getTripTiming(trip, now);
  if (!timing) return null;
  if (timing.status === "upcoming") return { status: "upcoming", daysUntil: timing.daysUntil };
  if (timing.status === "active") return { status: "active", dayNumber: timing.dayNumber, duration: timing.duration };
  return { status: "past", daysSince: timing.daysSince };
}

// Tags d'intérêt tels qu'ils existent réellement sur les lieux du catalogue
// (japan-data.json, champ `interets`) — recoupe le `why` de l'onboarding
// (anime/culture/lifestyle/gastro), sauf "nature", propre au voyage.
const TRIP_INTERET_OPTIONS = [
  {id:"culture",   label:"Culture & temples",     emoji:"⛩️"},
  {id:"gastro",    label:"Gastronomie",            emoji:"🍣"},
  {id:"anime",     label:"Pop-culture & anime",    emoji:"🎮"},
  {id:"lifestyle", label:"Shopping & lifestyle",   emoji:"🍵"},
  {id:"nature",    label:"Nature & onsen",         emoji:"🌿"},
];
const TRIP_RYTHME_OPTIONS = [
  {id:"tranquille", label:"Tranquille", sub:"Prendre son temps, moins de lieux par jour", emoji:"🍵"},
  {id:"equilibre",   label:"Équilibré",  sub:"Un bon rythme de croisière",                 emoji:"🚶"},
  {id:"dense",       label:"Dense",      sub:"Voir un maximum, journées bien remplies",     emoji:"⚡"},
];
const TRIP_SAISON_OPTIONS = [
  {id:"",          label:"Peu importe", emoji:"🤷"},
  {id:"printemps", label:"Printemps",   emoji:"🌸"},
  {id:"été",       label:"Été",         emoji:"☀️"},
  {id:"automne",   label:"Automne",     emoji:"🍁"},
  {id:"hiver",     label:"Hiver",       emoji:"❄️"},
];
const TRIP_DAYS_QUICK = [3,5,7,10];

export {
  DEFAULT_CHECKLIST,
  FREE_TRIP_LIMIT,
  TRIP_DAYS_QUICK,
  TRIP_INTERET_OPTIONS,
  TRIP_RYTHME_OPTIONS,
  TRIP_SAISON_OPTIONS,
  autoPickVilles,
  deriveEtapesFromJours,
  loadTrips,
  makeEtapeId,
  makeStepId,
  makeTripId,
  normalizeTrip,
  pickCandidateLieux,
  saveTrips,
  tripFromGenerated,
  tripFromPreconcu,
  tripTitleFromWizard,
  tripTiming,
  validateGeneratedItinerary,
};
