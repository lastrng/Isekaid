import test from "node:test";
import assert from "node:assert/strict";
import { dedupeTodayTravelRecommendation, getTodayTravelContext, usefulLearning } from "../src/features/home/todayTravelModel.js";

const currentDate = new Date(2026, 8, 5, 12);
const db = {
  villes:[{id:"tokyo",nom:"Tokyo"}],
  lieux:[
    {id:"senso",nom:"Sensō-ji",categorie:"temple"},
    {id:"station",nom:"Gare de Tokyo",categorie:"transport"},
    {id:"ramen",nom:"Ramen-ya",categorie:"restaurant"},
  ],
};

test("Aujourd'hui propose une création légère quand aucun voyage n'existe", () => {
  const model = getTodayTravelContext({currentDate,db});
  assert.equal(model.state,"none");
  assert.equal(model.primary.kind,"create");
});

test("un voyage sans dates conserve sa durée, sa prochaine étape et une seule recommandation", () => {
  const model = getTodayTravelContext({currentDate,db,trips:[{id:"draft",titre:"Tokyo & Kyoto",jours:[{num:1,villeId:"tokyo",activites:[{id:"a",lieuId:"station"}]},{num:2,activites:[]}]}]});
  assert.equal(model.state,"draft");
  assert.equal(model.meta,"2 jours");
  assert.equal(model.next.title,"Gare de Tokyo");
  assert.equal(model.recommendation.label,"Demander son quai");
});

test("un voyage futur affiche le compte à rebours exact", () => {
  const model = getTodayTravelContext({currentDate,db,trips:[{id:"future",titre:"Tokyo",dateDebut:"2026-09-15",jours:[{num:1,villeId:"tokyo",activites:[{id:"a",lieuId:"senso"}]}]}]});
  assert.equal(model.state,"upcoming");
  assert.equal(model.title,"J-10 avant Tokyo");
  assert.equal(model.next.title,"Sensō-ji");
});

test("un voyage en cours devient contextuel à la journée et à l'activité suivante", () => {
  const model = getTodayTravelContext({currentDate,db,trips:[{id:"active",titre:"Tokyo",dateDebut:"2026-09-04",jours:[{num:1,activites:[]},{num:2,villeId:"tokyo",activites:[{id:"done",lieuId:"senso",fait:true},{id:"next",lieuId:"station",arrivee:"09:30"},{id:"after",lieuId:"ramen",arrivee:"12:00"}]}]}]});
  assert.equal(model.state,"active");
  assert.equal(model.title,"Gare de Tokyo");
  assert.match(model.meta,/09:30/);
  assert.match(model.following,/Ramen-ya/);
  assert.equal(model.primary.label,"Voir ma journée");
});

test("un voyage passé ou terminé invite à compléter le carnet", () => {
  const model = getTodayTravelContext({currentDate,db,trips:[{id:"past",titre:"Kyoto",status:"completed",dateDebut:"2026-08-01",jours:[{}]}]});
  assert.equal(model.state,"completed");
  assert.equal(model.primary.kind,"profile");
});

test("le japonais contextuel évite les doublons et choisit le besoin principal", () => {
  assert.equal(usefulLearning({place:db.lieux[1]}),"Demander son quai");
  assert.equal(usefulLearning({place:db.lieux[2]}),"Commander au restaurant");
  const model = getTodayTravelContext({currentDate,db,trips:[{id:"draft",titre:"Tokyo",jours:[{num:1,activites:[{id:"a",lieuId:"station"}]}]}]});
  const deduped = dedupeTodayTravelRecommendation(model,{kind:"scenario",title:"Train",target:{scenarioId:"train"}});
  assert.equal(deduped.recommendation,null);
});
