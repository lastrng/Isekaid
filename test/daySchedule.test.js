import test from "node:test";
import assert from "node:assert/strict";
import { activityFixedTime, estimateTransfer, formatTime, haversineKm, officialPlaceUrl, parseDurationMinutes, placeOpeningHours, reservationForActivity, tripDayDate, tripDayMetrics } from "../src/features/travel/daySchedule.js";
import { applyDayPlanning, createDayPlanningDraft } from "../src/features/travel/dayPlanningForm.js";
import { normalizeTrip } from "../src/features/travel/tripModel.js";
import { getTodayTravelContext } from "../src/features/home/todayTravelModel.js";
import { getTravelContext } from "../src/features/travel/travelDashboardModel.js";

const places={
  a:{id:"a",nom:"Première visite",villeId:"tokyo",lat:35,lng:139,duree:"30 min",horaires:"9h00–18h00"},
  b:{id:"b",nom:"Musée",villeId:"tokyo",lat:35,lng:139.001,duree:"30 min",horaires:"9h00–18h00"},
  far:{id:"far",nom:"Kyoto",villeId:"kyoto",lat:35,lng:135.77,duree:"1 h",horaires:"24h/24"},
};
const day={num:1,activites:[{id:"first",lieuId:"a"},{id:"second",lieuId:"b"}]};
const schedule=(value=day,catalog=places,options={}) => tripDayMetrics(value,catalog,options);
const codes=model => model.warnings.map(warning => warning.code);

test("les durées du catalogue gèrent les intervalles et les unités mixtes",()=>{
  for(const [text,minutes] of [["1-2h",90],["30min-1h",45],["1h30–2h",105],["1 h 30",90],["~8 min",8],["45min",45],["Demi-journée",240],["Journée complète",480],["—",null],["variable",null]]) assert.equal(parseDurationMinutes(text),minutes,text);
  assert.equal(formatTime(1470),"00:30 (+1 j)");
});

test("deux lieux proches produisent un vrai temps de marche et une marge distincte",()=>{
  const result=schedule();
  assert.equal(result.stops[1].leg.mode,"walk");
  assert.equal(result.stops[1].leg.minutes,5);
  assert.equal(result.totalMinutes,75);
  assert.equal(result.bufferMinutes,10);
  assert.equal(result.stops[1].time,"09:45");
  assert.match(result.stops[1].leg.mapsUrl,/travelmode=walking/);
});

test("les longs déplacements interurbains ne valent plus forfaitairement 25 minutes",()=>{
  const result=schedule({...day,activites:[day.activites[0],{id:"second",lieuId:"far"}]});
  assert.equal(result.stops[1].leg.mode,"train");
  assert.ok(result.transferMinutes>100);
  assert.equal(result.stops[1].leg.source,"estimate");
});

test("une durée vérifiée concerne uniquement les deux étapes auxquelles elle était liée",()=>{
  const draft=createDayPlanningDraft(day,places);
  draft.activities.second.transferMinutes="17";
  draft.activities.second.transferMode="transit";
  const updated=applyDayPlanning(day,draft);
  assert.equal(schedule(updated).stops[1].leg.minutes,17);
  assert.equal(schedule(updated).stops[1].leg.source,"manual");
  const replaced={...updated,activites:[{id:"other",lieuId:"far"},updated.activites[1]]};
  assert.equal(schedule(replaced).stops[1].leg.source,"estimate");
  assert.notEqual(schedule(replaced).stops[1].leg.minutes,17);
  assert.equal(createDayPlanningDraft(replaced,places).activities.second.transferMinutes,"");
  const replacement={...updated,activites:[{...updated.activites[0],lieuId:"far"},updated.activites[1]]};
  assert.equal(schedule(replacement).stops[1].leg.source,"estimate");
});

test("les coordonnées absentes ou invalides sont signalées, jamais assimilées à zéro trajet",()=>{
  assert.equal(haversineKm({lat:NaN,lng:0},places.a),null);
  assert.equal(haversineKm({lat:100,lng:0},places.a),null);
  const result=schedule(day,{a:places.a,b:{...places.b,lat:undefined}});
  assert.equal(result.unknownTransfers,1);
  assert.equal(result.transferMinutes,30);
  assert.ok(codes(result).includes("unknown_transfer"));
});

test("une visite flexible attend l’ouverture et tient compte de l’attente",()=>{
  const result=schedule({activites:[{id:"first",lieuId:"a"}]},{a:{...places.a,horaires:"10h00–18h00"}});
  assert.equal(result.stops[0].time,"10:00");
  assert.equal(result.waitingMinutes,60);
  assert.equal(result.totalMinutes,90);
});

test("une fermeture hebdomadaire est vérifiée sur la vraie date de la journée",()=>{
  const result=schedule(day,{...places,a:{...places.a,horaires:"9h00–18h00 (fermé le lundi)"}},{date:"2026-11-02"});
  assert.ok(codes(result).includes("closed_day"));
  assert.equal(placeOpeningHours({horaires:"9h00–18h00 (fermé certains lundis)"},"2026-11-02").closed,false);
  assert.equal(tripDayDate({dateDebut:"2026-10-31"},{date:"2000-01-01"},2),"2026-11-02");
});

test("les horaires saisonniers et les équipements multiples restent explicitement inconnus",()=>{
  for(const horaires of ["8h00–17h00 (16h30 nov-mars)","Parc : 24h/24, Palais : 9h00–17h00","Variable selon établissement"]) assert.equal(placeOpeningHours({horaires},"2026-11-02").windows,null,horaires);
  assert.ok(codes(schedule(day,{...places,a:{...places.a,horaires:"Variable"}})).includes("unknown_hours"));
});

test("les plages séparées évitent la fermeture de milieu de journée",()=>{
  const result=schedule({planning:{startTime:"14:30",breakMinutes:0},activites:[{id:"a",lieuId:"a"}]},{a:{...places.a,horaires:"11h00–14h00 / 18h00–22h00"}});
  assert.equal(result.stops[0].time,"18:00");
  assert.equal(result.waitingMinutes,210);
});

test("les horaires de nuit et la dernière entrée sont pris en compte",()=>{
  const night=schedule({planning:{startTime:"01:00",breakMinutes:0},activites:[{id:"a",lieuId:"a",heure:"01:00"}]},{a:{...places.a,horaires:"18h00–02h00"}});
  assert.equal(codes(night).includes("outside_hours"),false);
  const last=schedule({planning:{startTime:"21:00",endTime:"23:00",breakMinutes:0},activites:[{id:"a",lieuId:"a"}]},{a:{...places.a,horaires:"9h00–22h00 (dernière entrée 20h30)"}});
  assert.ok(codes(last).includes("last_entry"));
});

test("une visite trop tardive et un créneau impossible sont signalés sans modifier le billet",()=>{
  const reserved={...day.activites[1],planning:{reservation:{status:"booked",time:"10:00",reference:"QA-123"}}};
  const result=schedule({...day,activites:[day.activites[0],reserved]},{...places,a:{...places.a,duree:"3h"},b:{...places.b,horaires:"9h00–11h00"}});
  assert.ok(codes(result).includes("late_arrival"));
  assert.ok(codes(result).includes("outside_hours"));
  assert.equal(reserved.planning.reservation.time,"10:00");
});

test("la pause ne fait pas artificiellement manquer un créneau qui reste atteignable",()=>{
  const reserved={...day.activites[1],planning:{reservation:{status:"booked",time:"12:15"},transfer:{fromActivityId:"first",fromPlaceId:"a",toPlaceId:"b",mode:"walk",minutes:0}}};
  const result=schedule({...day,activites:[day.activites[0],reserved]},{...places,a:{...places.a,duree:"3h"},b:{...places.b,duree:"1h"}});
  assert.equal(codes(result).includes("late_arrival"),false);
  assert.equal(result.stops[1].time,"12:15");
  assert.equal(result.pauseMinutes,45);
});

test("une mention de réservation est un signal à vérifier, pas une réservation réelle",()=>{
  assert.equal(reservationForActivity({}, {conseil:"Réserve les billets à l’avance"}).status,"to_book");
  assert.equal(reservationForActivity({}, {conseil:"Sans réservation"}).status,"not_needed");
  assert.equal(reservationForActivity({}, {conseil:"Découvre les ruelles préservées"}).status,"not_needed");
  const result=schedule(day,{...places,b:{...places.b,conseil:"Réservation indispensable"}});
  assert.ok(codes(result).includes("reservation"));
});

test("déplacer une visite sur une autre date invalide les horaires et signale le billet daté",()=>{
  const activity={...day.activites[0],planning:{openingHours:{open:"10:00",close:"12:00",date:"2026-11-02"},reservation:{status:"booked",time:"10:00",date:"2026-11-02"}}};
  const result=schedule({activites:[activity]},places,{date:"2026-11-03"});
  assert.ok(codes(result).includes("reservation_date"));
  assert.ok(codes(result).includes("hours_date"));
  assert.equal(result.stops[0].opening.source,"catalogue");
});

test("une vraie durée courte ne devient pas une journée chargée seulement par le nombre de lieux",()=>{
  const activites=Array.from({length:5},(_,index)=>({id:String(index),lieuId:"a",planning:{visitMinutes:10}}));
  assert.equal(schedule({activites}).overloaded,false);
  assert.ok(codes(schedule({planning:{endTime:"09:30"},activites:day.activites})).includes("day_end"));
});

test("le trajet d’arrivée dans une ville est compté avant la première visite",()=>{
  const result=schedule({arriveeVille:{mode:"train",duree:"2h30"},activites:[day.activites[0]]});
  assert.equal(result.incomingMinutes,150);
  assert.equal(result.stops[0].time,"11:30");
});

test("le formulaire valide les valeurs et conserve notes, photos et métadonnées du voyage",()=>{
  const original={...day,activites:day.activites.map(activity=>({...activity,note:"À conserver",photoRefs:["photo"]}))};
  const before=JSON.stringify(original), draft=createDayPlanningDraft(original,places,{date:"2026-11-02"});
  draft.activities.second.reservationStatus="booked";
  draft.activities.second.reservationTime="11:00";
  draft.activities.second.overrideHours=true;
  draft.activities.second.open="10:00";draft.activities.second.close="17:00";
  const updated=applyDayPlanning(original,draft);
  assert.equal(JSON.stringify(original),before);
  assert.equal(updated.activites[1].note,"À conserver");
  assert.deepEqual(updated.activites[1].photoRefs,["photo"]);
  assert.equal(updated.activites[1].planning.reservation.date,"2026-11-02");
  assert.equal(normalizeTrip({id:"trip",jours:[updated]}).jours[0].activites[1].planning.reservation.time,"11:00");
  draft.activities.second.visitMinutes="-5";
  assert.throws(()=>applyDayPlanning(original,draft),/Durée de visite/);
  draft.activities.second.visitMinutes="";draft.endTime="08:00";
  assert.throws(()=>applyDayPlanning(original,draft),/fin de journée/);
});

test("les cartes Aujourd’hui et Voyage utilisent le créneau réservé plutôt qu’une ancienne heure",()=>{
  const reserved={...day.activites[0],heure:"09:00",planning:{reservation:{status:"booked",time:"11:00"}}};
  const trip={id:"trip",dateDebut:"2026-11-02",jours:[{num:1,villeId:"tokyo",activites:[reserved]}]};
  const db={lieux:Object.values(places),villes:[{id:"tokyo",nom:"Tokyo"}]}, currentDate=new Date("2026-11-02T00:00:00Z");
  assert.match(getTodayTravelContext({trips:[trip],db,currentDate}).meta,/11:00/);
  assert.equal(getTravelContext({trips:[trip],db,currentDate}).active.next.time,"11:00");
  assert.equal(activityFixedTime({arrivee:{mode:"train",duree:"20min"}}),"");
});

test("les liens officiels n’acceptent pas de protocole actif ou d’identifiants",()=>{
  assert.equal(officialPlaceUrl({site_web:"example.com/path"}),"https://example.com/path");
  assert.equal(officialPlaceUrl({site_web:"javascript:alert(1)"}),null);
  assert.equal(officialPlaceUrl({site_web:"https://user:password@example.com"}),null);
  assert.equal(estimateTransfer(null,{},null,null),null);
});
