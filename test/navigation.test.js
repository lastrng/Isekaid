import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  isPrimaryDestination,
  PRIMARY_DESTINATIONS,
  PRIMARY_NAV_ITEMS,
  primaryDestination,
  resolveDestination,
  retainVisitedRoutes,
} from "../src/app/navigation/destinations.js";
import { popHistory, pushHistory } from "../src/app/navigation/history.js";

test("la navigation principale expose les cinq espaces produit cibles",()=>{
  assert.deepEqual(PRIMARY_DESTINATIONS,["home","voyage","learn","explore","profile"]);
  assert.deepEqual(PRIMARY_NAV_ITEMS.map(item=>item.label),["Aujourd’hui","Voyage","Apprendre","Découvrir","Mon Japon"]);
  assert.equal(PRIMARY_NAV_ITEMS.every(item=>item.promise.length>20),true);
});

test("conserve les destinations historiques comme routes internes",()=>{
  assert.equal(resolveDestination("learn"),"learn");
  assert.equal(resolveDestination("scenarios"),"scenarios");
  assert.equal(resolveDestination("mon_japon"),"profile");
  assert.equal(isPrimaryDestination("learn"),true);
});

test("normalise les alias entrants sans casser les destinations internes",()=>{
  assert.equal(resolveDestination(" Voyager "),"voyage");
  assert.equal(resolveDestination("MON_JAPON"),"profile");
  assert.equal(resolveDestination("route-inconnue"),"home");
});

test("les écrans internes restent rattachés à leur espace produit", () => {
  for (const route of ["learn", "scenarios", "tutor"]) assert.equal(primaryDestination(route), "learn");
  assert.equal(primaryDestination("daily"), "home");
  assert.equal(primaryDestination("voyage"), "voyage");
  assert.equal(primaryDestination("mon_japon"), "profile");
});

test("le shell conserve chaque route après sa première visite",()=>{
  let visited = retainVisitedRoutes([],"home");
  visited = retainVisitedRoutes(visited,"voyage");
  visited = retainVisitedRoutes(visited,"learn");
  visited = retainVisitedRoutes(visited,"voyage");
  assert.deepEqual(visited,["home","voyage","learn"]);
});

test("les routes internes sont conservées séparément de leur espace parent",()=>{
  const visited = retainVisitedRoutes(["home","learn"],"scenarios");
  assert.deepEqual(visited,["home","learn","scenarios"]);
  assert.equal(primaryDestination(visited.at(-1)),"learn");
});

test("le deep link OAuth Android reste un schéma personnalisé valide",()=>{
  const manifest=readFileSync(new URL("../android/app/src/main/AndroidManifest.xml",import.meta.url),"utf8");
  const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
  const auth=readFileSync(new URL("../src/supabase.js",import.meta.url),"utf8");
  assert.match(manifest,/android:scheme="app\.isekaid" android:host="login-callback"/);
  assert.doesNotMatch(manifest,/intent-filter android:autoVerify="true"/);
  assert.match(app,/CapApp\.getLaunchUrl\(\)/);
  assert.match(auth,/detectSessionInUrl:\s*true/);
});

test("l'historique restitue chaque écran précédent dans l'ordre inverse",()=>{
  let history=[];
  history=pushHistory(history,"home","trip");
  history=pushHistory(history,"trip","checklist");
  history=pushHistory(history,"checklist","detail");

  let popped=popHistory(history,"home");
  assert.equal(popped.destination,"checklist");
  popped=popHistory(popped.history,"home");
  assert.equal(popped.destination,"trip");
  popped=popHistory(popped.history,"home");
  assert.equal(popped.destination,"home");
  assert.deepEqual(popped.history,[]);
});

test("l'historique ignore une navigation vers l'écran courant et garde un repli",()=>{
  assert.deepEqual(pushHistory(["home"],"trip","trip"),["home"]);
  assert.deepEqual(popHistory([],"home"),{history:[],destination:"home"});
});
