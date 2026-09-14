import test from "node:test";
import assert from "node:assert/strict";
import { itineraryCityIds, itineraryPlaceIds, relatedGuides } from "../src/features/travel/tripPracticalModel.js";

test("les infos pratiques suivent les lieux et villes de l’itinéraire", () => {
  const trip={villes:["tokyo"],jours:[{villeId:"tokyo",activites:[{lieuId:"gare"}]},{villeId:"kyoto",etapes:[{lieuId:"ryokan"},{lieuId:"gare"}]}]};
  const places=[{id:"gare",villeId:"tokyo"},{id:"ryokan",villeId:"kyoto"}];
  assert.deepEqual(itineraryPlaceIds(trip),["gare","ryokan"]);
  assert.deepEqual(itineraryCityIds(trip,places),["tokyo","kyoto"]);
});

test("les repères contextuels privilégient le contenu lié au séjour", () => {
  const db={vie_quotidienne:[
    {id:"train",titre:"Prendre le train",categorie:"Transports"},
    {id:"ryokan",titre:"Arriver au ryokan",categorie:"Logement"},
    {id:"konbini",titre:"Le konbini",categorie:"Commerces"},
  ]};
  const guides=relatedGuides(db,[{nom:"Ryokan traditionnel",categorie:"Hébergement"},{nom:"Gare de Kyoto",categorie:"Transport"}]);
  assert.deepEqual(guides.slice(0,2).map(item=>item.id),["train","ryokan"]);
});
