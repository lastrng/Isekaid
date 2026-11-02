import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPreparationProgram } from "../src/features/travel/preparationProgram.js";
import { markContentRead } from "../src/features/explore/contentReading.js";

const db = JSON.parse(readFileSync(new URL("../src/japan-data.json", import.meta.url), "utf8"));
const currentDate = new Date("2026-11-02T10:00:00Z");
const trip = {
  id:"preparation-test", titre:"Mon séjour à Kyoto", dateDebut:"2026-11-22",
  villes:["kyoto"],
  customLieux:[{id:"my-restaurant",nom:"Mon restaurant",categorie:"Restaurant",villeId:"kyoto"}],
  jours:[{num:1,villeId:"kyoto",activites:[{id:"a",lieuId:"my-restaurant"}]}],
  checklist:[{id:"passport",texte:"Vérifier mon passeport",fait:false}],
};
const build = overrides => buildPreparationProgram({trip,db,currentDate,...overrides});

test("un restaurant personnalisé à Kyoto produit un exercice daté et un lien vers le bon scénario", () => {
  const model = build();
  assert.equal(model.daysUntil, 20);
  const task = model.tasks.find(item => item.id === "scenario:restaurant");
  assert.match(task.reason, /Mon restaurant à Kyoto · jour 1/);
  assert.equal(task.date, "2026-11-01");
  assert.equal(task.action.scenarioId, "restaurant");
  assert.equal(model.next.id, task.id);
  assert.equal(task.done, false);
});

test("un changement d’itinéraire ajoute les apprentissages pertinents et enlève les anciens", () => {
  const changed = {...trip,customLieux:[{id:"bath",nom:"Mon onsen",categorie:"Onsen",villeId:"kyoto"}],jours:[{num:1,activites:[{lieuId:"bath"}]}]};
  const model = build({trip:changed});
  assert.equal(model.tasks.some(task => task.id === "scenario:restaurant"), false);
  assert.equal(model.tasks.some(task => task.id === "code:onsen-lavage"), true);
});

test("répéter un type de lieu dans le voyage ne répète pas le même exercice", () => {
  const model = build({trip:{...trip,jours:[...trip.jours,...trip.jours]}});
  assert.equal(model.tasks.filter(task => task.id === "scenario:restaurant").length, 1);
  assert.equal(new Set(model.tasks.map(task => task.id)).size, model.tasks.length);
});

test("le programme reprend les progrès existants sans confondre exercice ouvert et terminé", () => {
  const initial = build();
  const updated = build({scenarioProgress:{done:["restaurant"]}});
  assert.equal(updated.completed, initial.completed + 1);
  assert.equal(updated.tasks.find(task => task.id === "scenario:restaurant").done, true);
  assert.notEqual(updated.next?.id, "scenario:restaurant");
  assert.equal(build({scenarioProgress:{opened:["restaurant"]}}).completed, initial.completed);
});

test("lectures, checklist et documents changent la progression depuis leurs sources réelles", () => {
  const guide = db.vie_quotidienne.find(item => item.id === "sim-wifi");
  const readingProgress = markContentRead(null,"vie",guide,currentDate);
  const model = build({readingProgress,trip:{...trip,documents:[{id:"reservation"}],checklist:[{...trip.checklist[0],fait:true}]}});
  assert.equal(model.completed, build().completed + 3);
  assert.equal(model.tasks.find(task => task.id === "vie:sim-wifi").done, true);
  const alias = build({readingProgress:markContentRead(null,"daily_life",guide,currentDate)});
  assert.equal(alias.tasks.find(task => task.id === "vie:sim-wifi").done, true);
});

test("les derniers jours donnent la priorité aux actions proches du départ et conservent les autres", () => {
  const model = build({currentDate:new Date("2026-11-21T10:00:00Z")});
  assert.equal(model.daysUntil,1);
  assert.equal(model.next.id,"scenario:urgence");
  assert.equal(model.tasks.some(task => task.id === "checklist:passport" && !task.done),true);
  assert.equal(model.tasks.every(task => task.due),true);
});

test("avant la première échéance, on peut prendre de l’avance sans action en retard", () => {
  const model = build({trip:{...trip,dateDebut:"2027-02-01"}});
  assert.equal(model.nextLabel,"Pour prendre de l’avance");
  assert.equal(model.tasks.every(task => !task.due),true);
});

test("modifier le départ recalcule le calendrier en conservant les validations", () => {
  const scenarioProgress = {done:["restaurant"]};
  const first = build({scenarioProgress});
  const moved = build({scenarioProgress,trip:{...trip,dateDebut:"2026-12-22"}});
  assert.equal(moved.completed,first.completed);
  assert.equal(moved.tasks.find(task => task.id === "scenario:restaurant").date,"2026-12-01");
});

test("le jour du Japon contrôle les échéances même autour d’un changement d’heure", () => {
  const input = {trip:{...trip,dateDebut:"2026-11-23"},db};
  const before = buildPreparationProgram({...input,currentDate:new Date("2026-11-01T14:59:00Z")});
  const after = buildPreparationProgram({...input,currentDate:new Date("2026-11-01T15:00:00Z")});
  assert.equal(before.daysUntil,22);
  assert.equal(after.daysUntil,21);
  assert.equal(before.tasks.find(task => task.id === "scenario:restaurant").due,false);
  assert.equal(after.tasks.find(task => task.id === "scenario:restaurant").due,true);
});

test("sans dates, le programme propose l’écran de résumé pour les ajouter", () => {
  const model = build({trip:{...trip,dateDebut:""}});
  assert.equal(model.state,"undated");
  assert.deepEqual(model.action,{kind:"trip",tripId:trip.id,sub:"summary",label:"Ajouter mes dates"});
  assert.equal(build({trip:{...trip,dateDebut:"2026-02-30"}}).state,"undated");
});

test("le programme disparaît au départ, après le retour ou pour un voyage annulé", () => {
  assert.equal(build({trip:null}),null);
  for (const status of ["cancelled","completed"]) assert.equal(build({trip:{...trip,status}}),null);
  for (const dateDebut of ["2026-11-02","2026-10-01"]) assert.equal(build({trip:{...trip,dateDebut}}),null);
});

test("les tâches ne proposent que des contenus qui existent et n’altèrent pas les données", () => {
  const before = JSON.stringify({trip,db});
  const minimal = build({db:{}});
  assert.equal(minimal.tasks.some(task => ["learning","reading"].includes(task.action.kind)),false);
  for (const task of build().tasks) {
    if (task.action.kind === "learning") assert.ok(db.scenarios.some(scenario => scenario.id === task.action.scenarioId));
    if (task.action.kind === "reading") {
      const collection = task.action.type === "vie" ? db.vie_quotidienne : db.codes_sociaux;
      assert.ok(collection.some(content => content.id === task.action.contentId));
    }
  }
  assert.equal(JSON.stringify({trip,db}),before);
});

test("toutes les preuves réunies terminent le programme, sans inventer de validations", () => {
  let readingProgress = null;
  for (const item of db.vie_quotidienne) readingProgress = markContentRead(readingProgress,"vie",item,currentDate);
  const model = build({scenarioProgress:{done:db.scenarios.map(item => item.id)},readingProgress,trip:{...trip,checklist:[{...trip.checklist[0],fait:true}],documents:[{id:"reservation"}]}});
  assert.equal(model.state,"complete");
  assert.equal(model.percent,100);
  assert.equal(model.next,null);
  assert.equal(model.completed,model.total);
  assert.equal(build().state,"planning");
});
