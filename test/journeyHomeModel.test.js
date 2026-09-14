import test from "node:test";
import assert from "node:assert/strict";
import { buildJourneyHome } from "../src/features/home/journeyHomeModel.js";

const currentDate = new Date(2026,8,5);
test("le prochain départ prime sur les voyages passés",()=>{
  const model=buildJourneyHome({currentDate,user:{japanRelationship:"returned"},trips:[{id:"past",status:"completed",dateDebut:"2026-08-01",jours:[]},{id:"next",dateDebut:"2026-09-15",jours:[{}]}]});
  assert.equal(model.mode,"planning"); assert.equal(model.trip.id,"next"); assert.equal(model.daysUntil,10);
});
test("la préparation sans date ne fabrique pas de compte à rebours",()=>{
  const model=buildJourneyHome({currentDate,user:{japanRelationship:"planning"},trips:[{id:"draft",jours:[]}]});
  assert.equal(model.mode,"planning"); assert.equal(model.daysUntil,null); assert.equal(model.trip.id,"draft");
});
test("le retour conserve les souvenirs et demande confirmation pour les voyages non prouvés",()=>{
  const model=buildJourneyHome({currentDate,trips:[{id:"past",dateDebut:"2026-08-01",jours:[{num:1,activites:[]}]}]});
  assert.equal(model.mode,"returned"); assert.equal(model.summary.awaitingConfirmation.length,1); assert.equal(model.summary.completedTrips,0);
});
test("le carnet proposé vient du voyage terminé le plus récent",()=>{
  const model=buildJourneyHome({currentDate,trips:[{id:"past",titre:"Kyoto",dateDebut:"2026-08-01",jours:[{num:1,activites:[{id:"a",lieuId:"p",fait:true,note:"Un beau matin"}]}]}]});
  assert.equal(model.mode,"returned"); assert.equal(model.memory.note,"Un beau matin");
});
test("le Mode Japon et les voyages annulés ne sont pas remplacés par ces accueils",()=>{
  assert.equal(buildJourneyHome({currentDate,trips:[{dateDebut:"2026-09-05",jours:[{}]}]}),null);
  assert.equal(buildJourneyHome({currentDate,trips:[{status:"cancelled",dateDebut:"2026-08-01",jours:[{}]}]}),null);
});

test("affiche le compte à rebours de l'onboarding sans fabriquer un voyage", () => {
  const model = buildJourneyHome({ currentDate, user: { plannedDeparture: "2026-09-20" } });
  assert.equal(model.mode, "planning");
  assert.equal(model.daysUntil, 15);
  assert.equal(model.title, "J-15 avant le Japon");
  assert.equal(model.trip, undefined);
});

test("prépare le prochain lieu, une recommandation et du japonais utile", () => {
  const model = buildJourneyHome({
    currentDate,
    trips:[{id:"next",titre:"Tokyo",dateDebut:"2026-09-15",checklist:[{texte:"Vérifier le passeport",fait:false}],jours:[{num:1,titre:"Arrivée",activites:[{id:"a",lieuId:"station"}]}]}],
    db:{lieux:[{id:"station",nom:"Gare de Tokyo",categorie:"transport"}],situations:[{id:"train",titre:"Prendre le train",phrases:[{jp:"駅はどこですか",romaji:"Eki wa doko desu ka",fr:"Où est la gare ?"}]}]},
  });
  assert.equal(model.nextStep.place.nom, "Gare de Tokyo");
  assert.equal(model.preparationRecommendation, "Vérifier le passeport");
  assert.equal(model.usefulJapanese.jp, "駅はどこですか");
});

test("le retour propose les quatre gestes de mémoire attendus", () => {
  const model = buildJourneyHome({currentDate,trips:[{id:"past",status:"completed",dateDebut:"2026-08-01",jours:[]}]});
  assert.deepEqual(model.returnActions.map(action=>action.id), ["journal","visited_places","stamps","memories"]);
});
