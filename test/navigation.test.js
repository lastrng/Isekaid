import assert from "node:assert/strict";
import test from "node:test";
import { isPrimaryDestination, PRIMARY_DESTINATIONS, resolveDestination } from "../src/app/navigation/destinations.js";

test("la navigation principale expose exactement les quatre espaces produit",()=>{
  assert.deepEqual(PRIMARY_DESTINATIONS,["home","voyage","explore","profile"]);
});

test("conserve les destinations historiques comme routes internes",()=>{
  assert.equal(resolveDestination("learn"),"learn");
  assert.equal(resolveDestination("scenarios"),"scenarios");
  assert.equal(resolveDestination("mon_japon"),"profile");
  assert.equal(isPrimaryDestination("learn"),false);
});

import { primaryDestination } from "../src/app/navigation/destinations.js";
test("les écrans d'apprentissage restent rattachés à Découvrir", () => {
  for (const route of ["learn", "scenarios", "tutor", "daily"]) assert.equal(primaryDestination(route), "explore");
  assert.equal(primaryDestination("voyage"), "voyage");
  assert.equal(primaryDestination("mon_japon"), "profile");
});
