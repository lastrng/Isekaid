import test from "node:test";
import assert from "node:assert/strict";
import {
  answerDailyQuestion,
  buildDailyRitual,
  completeDailyActivity,
  dailyActivityDetailResult,
  dailyActivityTarget,
  dailyDateKey,
  dailyProgress,
  dailySessionMinutes,
  getCurrentDailyStep,
  isDailyOfflineReady,
  loadDailyRitual,
  syncDailyMissionProgress,
} from "../src/features/daily/dailyModel.js";

const db = {
  culture: [{ id: "k", titre: "Kintsugi", contenu: "Réparer" }],
  expressions: [
    { id: "ita", expression: "いただきます", kana: "いただきます", romaji: "Itadakimasu", traduction: "Je reçois", contexte: "Avant le repas" },
    { id: "sum", expression: "すみません", kana: "すみません", romaji: "Sumimasen", traduction: "Excusez-moi" },
    { id: "ari", expression: "ありがとう", kana: "ありがとう", romaji: "Arigatō", traduction: "Merci" },
  ],
  repas: [{ id: "ramen", romaji: "Ramen", description: "Bouillon" }],
};

test("le Daily est déterministe pour une date", () => {
  const first = buildDailyRitual({ db, date: "2026-09-06" });
  const second = buildDailyRitual({ db, date: "2026-09-06" });
  assert.deepEqual(first.activities.map(item => item.id), second.activities.map(item => item.id));
  assert.equal(first.date, "2026-09-06");
});

test("la session quotidienne contient les quatre temps en 3 à 8 minutes",()=>{
  const ritual = buildDailyRitual({
    db,
    date:"2026-09-06",
    mission:{id:"like_card",trigger:"fav",label:"Sauvegarder un lieu",hint:"Découvrir",targetTab:"explore"},
  });
  assert.equal(ritual.version,2);
  assert.deepEqual(ritual.activities.map(item=>item.kind),["discover","learn","understand","mission"]);
  assert.equal(dailySessionMinutes(ritual)>=3,true);
  assert.equal(dailySessionMinutes(ritual)<=8,true);
  assert.equal(ritual.offlineReady,true);
});

test("la progression et la complétion du rituel sont calculées sur les activités", () => {
  const ritual = buildDailyRitual({ db, date: "2026-09-06" });
  const first = completeDailyActivity(ritual, ritual.activities[0].id);
  assert.equal(dailyProgress(first).done, 1);
  const complete = first.activities.slice(1).reduce((current, item) => completeDailyActivity(current, item.id), first);
  assert.equal(dailyProgress(complete).complete, true);
  assert.ok(complete.completedAt);
});

test("l'étape courante avance de 0/4 à la réussite sans perdre les étapes terminées", () => {
  const ritual = buildDailyRitual({ db, date:"2026-09-06", mission:{id:"mission",label:"Sauvegarder un lieu",targetTab:"explore"} });
  assert.equal(getCurrentDailyStep(ritual).index, 0);
  const one = completeDailyActivity(ritual, ritual.activities[0].id);
  assert.equal(getCurrentDailyStep(one).index, 1);
  const three = one.activities.slice(1, 3).reduce((state, item) => completeDailyActivity(state, item.id), one);
  assert.equal(getCurrentDailyStep(three).index, 3);
  const four = completeDailyActivity(three, three.activities[3].id);
  assert.equal(getCurrentDailyStep(four).complete, true);
  assert.equal(getCurrentDailyStep(four).activity, null);
});

test("un catalogue absent au premier rendu ne fige pas un Daily vide", () => {
  const empty = buildDailyRitual({ db: {}, date: "2026-09-06" });
  const ready = buildDailyRitual({ db, date: "2026-09-06" });
  assert.equal(empty.activities.length, 0);
  assert.ok(ready.activities.length > 0);
});

test("le Daily privilégie un lieu du voyage puis la saison", () => {
  const travel = buildDailyRitual({ db, date: "2026-09-06", travelContext: { relatedPlaces: [{ id: "fushimi", nom: "Fushimi Inari", description: "Torii" }] } });
  assert.equal(travel.activities[0].type, "place");
  assert.equal(travel.activities[0].title, "Fushimi Inari");
  const seasonal = buildDailyRitual({ db, date: "2026-09-06", travelContext: { seasonalPlaces: [{ id: "nara", nom: "Nara", description: "Parc" }] } });
  assert.equal(seasonal.activities[0].label, "Saison japonaise");
});

test("les traditions saisonnières du catalogue alimentent le Daily", () => {
  const seasonal = buildDailyRitual({ db: { ...db, traditions: [{ id: "momiji", nom: "Momijigari", saison: "automne", tagline: "Feuilles rouges" }] }, date: "2026-09-06", travelContext: { seasonKey: "automne" } });
  assert.equal(seasonal.activities[0].type, "tradition");
  assert.equal(seasonal.activities[0].label, "Saison japonaise");
});

test("la clé Daily respecte le fuseau horaire et le cache est offline-ready", () => {
  const instant = new Date("2026-09-06T00:30:00Z");
  assert.equal(dailyDateKey(instant, "Asia/Tokyo"), "2026-09-06");
  assert.equal(dailyDateKey(instant, "America/Los_Angeles"), "2026-09-05");
  assert.equal(isDailyOfflineReady(buildDailyRitual({ db, date: "2026-09-06" })), true);
});

test("la réponse au mini-quiz et la mission sont persistées dans la progression",()=>{
  const ritual = buildDailyRitual({db,date:"2026-09-06",mission:{id:"do_review",label:"Faire une révision",targetTab:"learn"}});
  const quiz = ritual.activities.find(item=>item.kind==="understand");
  const answered = answerDailyQuestion(ritual,quiz.id,quiz.question.answer);
  const savedQuiz = answered.activities.find(item=>item.id===quiz.id);
  assert.equal(savedQuiz.done,true);
  assert.equal(savedQuiz.answerCorrect,true);
  assert.equal(savedQuiz.selectedAnswer,quiz.question.answer);
  const missionDone = syncDailyMissionProgress(answered,["do_review"]);
  assert.equal(missionDone.activities.find(item=>item.kind==="mission").done,true);
});

test("une session sauvegardée ne change pas si le contexte évolue dans la journée",()=>{
  const values = new Map();
  globalThis.localStorage = {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),
  };
  try {
    const first = loadDailyRitual({db,date:"2026-09-06",personalization:{interests:["gastro"]},mission:{id:"like_card",label:"Ajouter un favori",targetTab:"explore"}});
    const reopened = loadDailyRitual({db:{...db,culture:[{id:"new",titre:"Nouveau contenu"}]},date:"2026-09-06",personalization:{interests:["culture"]},mission:{id:"do_review",label:"Faire une révision",targetTab:"learn"}});
    assert.deepEqual(reopened.activities.map(item=>item.id),first.activities.map(item=>item.id));
    assert.equal(reopened.activities.find(item=>item.kind==="mission").raw.missionId,"like_card");
  } finally {
    delete globalThis.localStorage;
  }
});

test("une mission disponible après la préparation du cache est ajoutée sans remplacer la session",()=>{
  const values = new Map();
  globalThis.localStorage = {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),
  };
  try {
    const cached = loadDailyRitual({db,date:"2026-09-06"});
    assert.equal(cached.activities.some(item=>item.kind==="mission"),false);
    const completed = loadDailyRitual({db,date:"2026-09-06",mission:{id:"path_step",label:"Avancer dans le parcours",targetTab:"learn"}});
    assert.deepEqual(completed.activities.slice(0,cached.activities.length).map(item=>item.id),cached.activities.map(item=>item.id));
    assert.equal(completed.activities.at(-1).kind,"mission");
  } finally {
    delete globalThis.localStorage;
  }
});

test("la personnalisation privilégie les contenus correspondant aux intérêts", () => {
  const personalized = buildDailyRitual({ db: { ...db, culture: [{ id: "plain", titre: "Histoire ancienne", tag: "Histoire", contenu: "Chronique" }], repas: [{ id: "ramen", romaji: "Ramen", description: "Gastronomie japonaise" }] }, date: "2026-09-06", personalization: { interests: ["gastro"] } });
  assert.equal(personalized.activities[0].type, "gastronomie");
});

test("chaque activité du rituel conserve le contenu exact à ouvrir", () => {
  const culture = { titre: "Le kintsugi", contenu: "Une histoire", insight: "À retenir", emoji: "🏺" };
  const cultureResult = dailyActivityDetailResult({ type: "culture", label: "Traditions", title: culture.titre, summary: culture.contenu, raw: culture });
  assert.equal(cultureResult.kind, "culture");
  assert.equal(cultureResult.title, "Le kintsugi");
  assert.equal(cultureResult.raw, culture);

  const food = { nom_jp: "おにぎり", romaji: "Onigiri", description: "Boule de riz", emoji: "🍙" };
  const foodResult = dailyActivityDetailResult({ type: "gastronomie", label: "Gastronomie", title: food.romaji, summary: food.description, raw: food });
  assert.equal(foodResult.kind, "repas");
  assert.equal(foodResult.raw, food);

  const expression = { expression: "いただきます", traduction: "Je reçois", contexte: "Avant de manger" };
  const expressionResult = dailyActivityDetailResult({ type: "expression", label: "Japonais", title: expression.expression, summary: expression.traduction, raw: expression });
  assert.equal(expressionResult.kind, "expr");
  assert.equal(expressionResult.raw, expression);
  assert.equal(dailyActivityDetailResult({ type: "place", raw: {} }), null);

  const situation = { id: "restaurant", titre: "Au restaurant", phrases: [] };
  assert.deepEqual(dailyActivityTarget({ type: "situation", raw: situation }), { kind: "situation", item: situation });
  assert.deepEqual(dailyActivityTarget({ type: "tradition", raw: culture }), { kind: "tradition", item: culture });
  assert.equal(dailyActivityTarget({ type: "expression", raw: expression }).kind, "article");
  assert.deepEqual(dailyActivityTarget({ kind:"mission",raw:{targetTab:"learn"} }),{kind:"tab",tab:"learn"});
  assert.deepEqual(dailyActivityTarget({ type:"region",raw:{id:"kanto"} }),{kind:"detail",type:"region",item:{id:"kanto"}});
});
