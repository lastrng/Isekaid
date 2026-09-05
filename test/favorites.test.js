import assert from "node:assert/strict";
import test from "node:test";
import { favId } from "../src/features/profile/favorites.js";

test("construit un identifiant de favori stable selon le type et le libellé",()=>{
  assert.equal(favId("lieu",{nom:"Fushimi Inari"}),"lieu:Fushimi Inari");
  assert.equal(favId("expression",{expression:"いただきます",nom:"ignoré"}),"expression:いただきます");
  assert.equal(favId("lieu",null),"lieu:");
});
