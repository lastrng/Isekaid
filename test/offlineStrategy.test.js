import test from "node:test";
import assert from "node:assert/strict";
import { buildOfflineDatabase, buildTravelOfflineSnapshot, cacheCriticalOfflineData, getCachedOfflineTravel, getOfflineCapabilities, hasCriticalOfflineData, hasTravelOfflineData, loadCriticalOfflineData, OFFLINE_PRIORITY, selectOfflineTrip, summarizeOfflineSync } from "../src/services/sync/offlineStrategy.js";

test("décrit les capacités critiques à partir des données réellement présentes", () => {
  const result = getOfflineCapabilities({ trip: { jours:[{activites:[{lieuId:"missing"}]}], checklist: [] }, days: [{activites:[{lieuId:"missing"}]}], sos: ["lost"], essentialPhrases: [], contextualContent: [{ id: "tip" }], progress: {} });
  assert.deepEqual(OFFLINE_PRIORITY.slice(0, 4), ["activeTrip", "tripDays", "tripPlaces", "placeEssentials"]);
  assert.equal(result.activeTrip, true); assert.equal(result.tripDays, true); assert.equal(result.savedPlaces, false); assert.equal(result.checklist, true); assert.equal(result.sos, true); assert.equal(result.contextualContent, true); assert.equal(result.progress, true);
});

test("expose l'état de synchronisation sans masquer une file en attente", () => {
  assert.equal(summarizeOfflineSync({ online: false, pending: 2 }).state, "offline");
  assert.equal(summarizeOfflineSync({ online: true, pending: 1 }).state, "pending");
  assert.equal(summarizeOfflineSync({ online: true, error: true }).state, "error");
  assert.equal(summarizeOfflineSync({ online: true, lastSyncedAt: "2026-09-05T10:00:00Z" }).label, "Données synchronisées");
});

test("met en cache les ressources critiques pour une lecture hors connexion", () => {
  globalThis.localStorage = { value: null, getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
  assert.equal(cacheCriticalOfflineData({ daily: { activities: [{ id: "d" }] }, activeTrip: { id: "trip" }, tripDays: [{ num: 1 }], savedPlaces: [{ id: "place" }], checklist: [{ fait: false }], sos: [{ id: "lost" }], essentialPhrases: [{ id: "p" }], contextualContent: [{ id: "c" }] }), true);
  const cached = loadCriticalOfflineData();
  assert.equal(hasCriticalOfflineData(cached), true);
  assert.equal(cached.version,2);
  assert.equal(cached.travel.savedExpressions.length, 1);
  assert.equal(getCachedOfflineTravel(cached).trip.id, "trip");
  assert.equal(getCachedOfflineTravel(cached).places[0].id, "place");
  delete globalThis.localStorage;
});

test("prépare le voyage actif avec uniquement ses lieux, favoris japonais et contenus liés",()=>{
  const active={id:"active",titre:"Tokyo",dateDebut:"2026-09-09",dateFin:"2026-09-12",jours:[{num:1,activites:[{id:"a",lieuId:"ramen-shop"}]}],checklist:[{id:"passport",label:"Passeport",fait:true}]};
  const later={id:"later",dateDebut:"2026-10-01",jours:[{}]};
  const db={
    lieux:[{id:"ramen-shop",nom:"Ramen local",categorie:"Restaurant",description:"Une adresse locale",image:"large-image.jpg",editorial:"Très long"},{id:"museum",nom:"Musée"}],
    situations:[{id:"restaurant",titre:"Au restaurant",description:"Commander au restaurant",phrases:[{jp:"これをください",fr:"Ceci, s’il vous plaît"}]}],
  };
  assert.equal(selectOfflineTrip([later,active],new Date("2026-09-10T12:00:00Z")).id,"active");
  const snapshot=buildTravelOfflineSnapshot({trips:[later,active],db,favorites:[{type:"expr",item:{expression:"ありがとう",traduction:"Merci"}}],sos:[{id:"help"}],currentDate:new Date("2026-09-10T12:00:00Z")});
  assert.deepEqual(snapshot.places.map(place=>place.id),["ramen-shop"]);
  assert.equal(snapshot.places[0].image,undefined);
  assert.equal(snapshot.savedExpressions[0].expression,"ありがとう");
  assert.ok(snapshot.travelJapanese.some(item=>item.raw.id==="restaurant"));
  assert.equal(hasTravelOfflineData(snapshot),true);
});

test("ne déclare pas le voyage disponible si une fiche lieu essentielle manque",()=>{
  const snapshot={trip:{id:"t",jours:[{activites:[{lieuId:"missing"}]}]},days:[{activites:[{lieuId:"missing"}]}],places:[],checklist:[],sos:[{id:"help"}],savedExpressions:[],travelJapanese:[]};
  assert.equal(hasTravelOfflineData(snapshot),false);
});

test("la base de secours ne contient pas l’encyclopédie",()=>{
  const db=buildOfflineDatabase({places:[{id:"p",nom:"Lieu"}],savedExpressions:[{expression:"はい"}],travelJapanese:[{id:"s",kind:"situation",raw:{id:"train",titre:"Train",phrases:[]}}]});
  assert.equal(db.offlineOnly,true);
  assert.equal(db.lieux.length,1);
  assert.equal(db.culture.length,0);
  assert.equal(db.situations[0].id,"train");
});
