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
