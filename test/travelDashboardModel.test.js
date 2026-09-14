import test from "node:test";
import assert from "node:assert/strict";

import {
  getTravelContext,
  getTravelNextAction,
  getTripCityIds,
  TRAVEL_DASHBOARD_STATE,
} from "../src/features/travel/travelDashboardModel.js";

const currentDate = new Date("2026-09-11T03:00:00Z");
const db = {
  villes:[
    {id:"tokyo",nom:"Tokyo",prefectureId:"tokyo"},
    {id:"hiroshima",nom:"Hiroshima",prefectureId:"hiroshima"},
  ],
  lieux:[
    {id:"sensoji",villeId:"tokyo",nom:"Sensō-ji",categorie:"temple"},
    {id:"station",villeId:"hiroshima",nom:"Gare de Hiroshima",categorie:"transport"},
  ],
};

function trip(overrides={}) {
  return {
    id:"trip-1",titre:"Tokyo & Hiroshima",dateDebut:"2026-10-01",villes:["tokyo"],
    etapes:[{id:"e1",villeId:"tokyo",nuits:1},{id:"e2",villeId:"hiroshima",nuits:1}],
    jours:[
      {num:1,villeId:"tokyo",activites:[{id:"a1",lieuId:"sensoji",heure:"09:30"}]},
      {num:2,villeId:"hiroshima",activites:[{id:"a2",lieuId:"station"}]},
    ],
    checklist:[{id:"c1",texte:"Passeport",fait:false}],
    ...overrides,
  };
}

test("sans voyage, le dashboard reste dans l'état vide",()=>{
  const model=getTravelContext({trips:[],db,currentDate});
  assert.equal(model.state,TRAVEL_DASHBOARD_STATE.NO_TRIP);
  assert.equal(model.trip,null);
});

test("le voyage en cours prime sur un brouillon et un futur",()=>{
  const active=trip({id:"active",dateDebut:"2026-09-10",dateFin:"2026-09-12"});
  const model=getTravelContext({trips:[trip({id:"draft",dateDebut:""}),trip({id:"future"}),active],db,currentDate});
  assert.equal(model.state,TRAVEL_DASHBOARD_STATE.ACTIVE_TRIP);
  assert.equal(model.trip.id,"active");
});

test("le prochain voyage daté prime sur les brouillons sans date",()=>{
  const model=getTravelContext({trips:[trip({id:"draft",dateDebut:""}),trip({id:"later",dateDebut:"2026-12-01"}),trip({id:"soon",dateDebut:"2026-09-20"})],db,currentDate});
  assert.equal(model.state,TRAVEL_DASHBOARD_STATE.PRE_TRIP);
  assert.equal(model.trip.id,"soon");
  assert.equal(model.timing.daysUntil,9);
});

test("les villes sont consolidées depuis villes, étapes, journées et lieux",()=>{
  const inconsistent=trip({villes:["tokyo"],etapes:[{id:"e1",villeId:"tokyo"}],jours:[{num:1,villeId:"tokyo",activites:[]},{num:2,villeId:"hiroshima",activites:[{id:"a",lieuId:"station"}]}]});
  assert.deepEqual(getTripCityIds(inconsistent,db).sort(),["hiroshima","tokyo"]);
  assert.equal(getTravelContext({trips:[inconsistent],db,currentDate}).stats.cities,2);
});

test("les dates sont toujours la première action d'un brouillon",()=>{
  const action=getTravelNextAction({trip:trip({dateDebut:""}),db,favorites:[{type:"lieu",item:{id:"other"}}]});
  assert.equal(action.id,"add_dates");
  assert.equal(action.target,"summary");
});

test("un favori non placé devient la recommandation unique suivante",()=>{
  const action=getTravelNextAction({trip:trip(),db,favorites:[{type:"lieu",item:{id:"other",nom:"Odaiba"}},{type:"lieu",item:{id:"sensoji"}}]});
  assert.equal(action.id,"place_saved");
  assert.match(action.title,/1 lieu attend/);
});

test("un itinéraire vide mène vers l'organisation des journées",()=>{
  const action=getTravelNextAction({trip:trip({jours:[{num:1,villeId:"tokyo",activites:[]}]}),db});
  assert.equal(action.id,"organize_days");
  assert.equal(action.target,"day");
});

test("la checklist devient prioritaire quand l'itinéraire est organisé",()=>{
  const action=getTravelNextAction({trip:trip(),db});
  assert.equal(action.id,"checklist");
  assert.equal(action.target,"checklist");
});

test("le japonais contextuel n'est proposé qu'après les préparatifs",()=>{
  const action=getTravelNextAction({trip:trip({checklist:[{id:"c",texte:"Passeport",fait:true}]}),db,offlineReady:true});
  assert.equal(action.id,"travel_japanese");
  assert.match(action.title,/quai/);
});

test("le mode Japon expose le jour, la prochaine étape et la suite",()=>{
  const activeTrip=trip({dateDebut:"2026-09-11",dateFin:"2026-09-12",jours:[
    {num:1,villeId:"tokyo",activites:[{id:"done",lieuId:"sensoji",fait:true},{id:"next",lieuId:"sensoji",heure:"09:30"},{id:"after",lieuId:"station",heure:"11:00"}]},
    {num:2,villeId:"hiroshima",activites:[]},
  ]});
  const model=getTravelContext({trips:[activeTrip],db,currentDate:new Date("2026-09-11T00:00:00Z")});
  assert.equal(model.state,TRAVEL_DASHBOARD_STATE.ACTIVE_TRIP);
  assert.equal(model.active.day.num,1);
  assert.equal(model.active.next.id,"next");
  assert.equal(model.active.next.title,"Sensō-ji");
  assert.deepEqual(model.active.following.map(item=>item.id),["after"]);
  assert.equal(model.active.progress.completed,1);
});

test("un ancien voyage préconçu retrouve l'heure depuis son modèle",()=>{
  const legacy=trip({source:"classic",dateDebut:"2026-09-11",dateFin:"2026-09-12",jours:[{num:1,villeId:"tokyo",activites:[{id:"next",lieuId:"sensoji"}]},{num:2,villeId:"hiroshima",activites:[]}]});
  const model=getTravelContext({trips:[legacy],db:{...db,voyages_preconcus:[{id:"classic",jours:[{num:1,etapes:[{lieuId:"sensoji",heure:"9:00"}]}]}]},currentDate});
  assert.equal(model.active.next.time,"9:00");
});

test("un voyage passé devient une expérience de clôture",()=>{
  const completed=trip({status:"completed",dateDebut:"2026-08-01",dateFin:"2026-08-02",jours:[{num:1,villeId:"tokyo",activites:[{id:"a",lieuId:"sensoji",fait:true}]}]});
  const model=getTravelContext({trips:[completed],db,currentDate});
  assert.equal(model.state,TRAVEL_DASHBOARD_STATE.POST_TRIP);
  assert.equal(model.stats.visitedPlaces,1);
  assert.equal(model.stats.visitedPrefectures,1);
});

test("le voyage principal n'est jamais répété parmi les autres voyages",()=>{
  const model=getTravelContext({trips:[trip({id:"main"}),trip({id:"other",dateDebut:"2026-12-01"})],db,currentDate});
  assert.equal(model.trip.id,"main");
  assert.deepEqual(model.otherTrips.map(item=>item.id),["other"]);
});

test("l'état offline n'est validé que pour le voyage affiché",()=>{
  const selected=trip();
  assert.equal(getTravelContext({trips:[selected],db,currentDate,offlineSnapshot:{ready:true,trip:{id:"trip-1"}}}).offlineReady,true);
  assert.equal(getTravelContext({trips:[selected],db,currentDate,offlineSnapshot:{ready:true,trip:{id:"other"}}}).offlineReady,false);
});
