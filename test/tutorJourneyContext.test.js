import test from "node:test";
import assert from "node:assert/strict";
import { buildTutorJourneyContext } from "../src/features/companion/journeyContext.js";
import { sanitizeJourneyContext, journeyContextPrompt } from "../supabase/functions/tutor-chat/journey-context.js";

test("le tuteur reçoit le contexte utile et aucun souvenir privé",()=>{
  const context=buildTutorJourneyContext({currentDate:new Date(2026,8,5),user:{name:"SECRET",level:"débutant",why:["culture"]},recentExpressions:["いただきます"],trips:[{dateDebut:"2026-09-05",titre:"Kyoto essentiel",jours:[{villeId:"kyoto",activites:[{lieuId:"shrine",note:"SECRET",memoryPhoto:"SECRET"}]}]}],db:{lieux:[{id:"shrine",nom:"Sanctuaire",categorie:"Shinto"}],villes:[{id:"kyoto",nom:"Kyoto"}]}});
  assert.equal(context.state,"in_japan");
  assert.equal(context.city,"Kyoto");
  assert.equal(context.activity,"Sanctuaire");
  assert.equal(context.level,"débutant");
  assert.equal(context.tripTitle,"Kyoto essentiel");
  assert.deepEqual(context.recentExpressions,["いただきます"]);
  assert.ok(!JSON.stringify(context).includes("SECRET"));
});

test("le serveur borne et filtre le contexte indépendamment du client",()=>{
  const context=sanitizeJourneyContext({city:"x".repeat(10000),activity:"y".repeat(10000),category:"z".repeat(10000),tripTitle:"t".repeat(10000),recentExpressions:["ok"],interests:["secret","culture","gastro"],notes:"secret",premium:true,state:"invalid"});
  assert.equal(context.city.length,80);
  assert.deepEqual(context.interests,["culture","gastro"]);
  assert.equal(context.level,undefined);
  assert.equal(context.tripTitle.length,80);
  assert.deepEqual(context.recentExpressions,["ok"]);
  assert.equal(context.state,undefined);
  assert.equal(context.premium,undefined);
  assert.ok(JSON.stringify(context).length<500);
  assert.equal(journeyContextPrompt(null),"");
  assert.equal(sanitizeJourneyContext([]),null);
});
