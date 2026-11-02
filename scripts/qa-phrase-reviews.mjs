import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const origin=process.env.QA_ORIGIN||"http://127.0.0.1:5180";
const output=process.env.QA_OUTPUT||"/tmp/isekaid-phrase-reviews-qa";
const key="isekaid_phrase_reviews_v1";
const db=JSON.parse(await readFile(new URL("../src/japan-data.json",import.meta.url),"utf8"));
const trip={id:"qa-phrases",titre:"Kyoto",dateDebut:"2026-11-22",villes:["kyoto"],customLieux:[{id:"qa-restaurant",nom:"Mon restaurant à Kyoto",categorie:"Restaurant",villeId:"kyoto"}],jours:[{num:1,villeId:"kyoto",activites:[{id:"qa-activity",lieuId:"qa-restaurant"}]}]};
const profile={name:"Voyageur QA",why:["culture"],level:"beginner",goal:"travel",japanRelationship:"planning"};
const onboarding={version:2,completed:true,seenGuides:{today:true,travel:true,learn:true,discover:true,myJapan:true}};
const userId="00000000-0000-4000-8000-000000000033";
const correction="Utilise は pour le thème : 私は学生です。";
const errors=[];
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_EXECUTABLE,args:["--no-sandbox"]});
const cards=page=>page.evaluate(key=>Object.values(JSON.parse(localStorage.getItem(key)||'{"cards":{}}').cards).filter(card=>!card.removedAt),key);
const nav=page=>page.getByRole("navigation",{name:"Navigation principale"});
const go=(page,label)=>nav(page).getByRole("button",{name:new RegExp(`^${label} —`)}).click();
const screen=page=>page.locator(".phrase-review-screen");
const openReviews=async page=>{
  await go(page,"Apprendre");
  if(await screen(page).isVisible())return;
  await page.locator("#isekaid-route-learn .phrase-review-entry button").click();
  await expect(screen(page).getByRole("heading",{name:"Mes phrases utiles",exact:true})).toBeVisible();
};
async function context(width,auth=null,row=null){
  const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce",timezoneId:"Europe/Paris"});
  await ctx.route("**/*",async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin===origin)return route.continue();
    if(!auth||!url.hostname.endsWith(".supabase.co"))return route.abort();
    if(url.pathname.endsWith("/progress")){
      if(request.method()==="PATCH"){
        Object.assign(row,request.postDataJSON());
        return route.fulfill({json:[{user_id:userId,updated_at:row.updated_at}]});
      }
      return route.fulfill({json:row});
    }
    if(url.pathname.endsWith("/tutor-chat"))return route.fulfill({json:{conversationId:"qa-conversation",reply_jp:"そうですか。",reply_fr:"Vraiment ?",correction,suggestions:[],usedToday:1,dailyLimit:5}});
    if(url.pathname.endsWith("/tutor_messages"))return route.fulfill({json:[{id:"user",role:"user",content_jp:"私を学生です"},{id:"assistant",role:"assistant",content_jp:"そうですか。",content_fr:"Vraiment ?",correction}]});
    if(url.pathname.endsWith("/user"))return route.fulfill({json:auth.user});
    if(url.pathname.endsWith("/user_backups"))return route.fulfill({json:null});
    return route.fulfill({json:[]});
  });
  const page=await ctx.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror",error=>errors.push(error.stack||error.message));
  await page.clock.setFixedTime(new Date("2026-11-02T10:00:00Z"));
  await page.addInitScript(({trip,profile,onboarding,auth,userId})=>{
    if(sessionStorage.getItem("qa_phrases_seeded"))return;
    sessionStorage.setItem("qa_phrases_seeded","1");
    const owner=auth?userId:"local";
    const values={isekaid_device_owner_v1:owner,isekaid_guest_mode_v1:JSON.stringify(!auth),isekaid_profile_v1:JSON.stringify(profile),
      [`isekaid_onboarding_state_v2_${owner}`]:JSON.stringify(onboarding),isekaid_intro_seen_v1:"1",isekaid_trips_v1:JSON.stringify([trip]),
      isekaid_streak_v1:JSON.stringify({count:1,best:1,last:"2026-11-02",keys:0}),isekaid_last_greeting_date:"2026-11-02",isekaid_scenarios_learn_tip_dismissed_v1:"1"};
    if(auth)values["sb-rocttuyhzkhjdkxvtvon-auth-token"]=JSON.stringify(auth);
    for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);
  },{trip,profile,onboarding,auth,userId});
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await nav(page).waitFor({timeout:30000});
  return {ctx,page};
}

try{
  for(const width of (process.env.QA_WIDTHS??"360,390").split(",").filter(Boolean).map(Number)){
    const {ctx,page}=await context(width);
    assert.equal((await cards(page)).length,0,"No automatic enrollment");
    await page.locator(".today-session").getByRole("button",{name:/^Apprendre, /}).click();
    await page.locator(".today-session").getByRole("button",{name:"Ajouter aux révisions",exact:true}).click();
    await expect(page.locator(".today-session").getByRole("button",{name:"Dans mes révisions"})).toBeDisabled();
    assert.equal((await cards(page)).length,1);
    await page.locator("#isekaid-route-home .phrase-review-entry button").click();
    await expect(screen(page).getByRole("heading",{name:"Mes phrases utiles",exact:true})).toBeVisible();
    await expect(screen(page).getByRole("region",{name:"Phrases pour mon voyage"})).toContainText("Mon restaurant à Kyoto · jour 1");
    const first=(await cards(page))[0];
    await screen(page).getByRole("button",{name:"Réviser 1 carte",exact:true}).click();
    await expect(screen(page).getByRole("button",{name:/Je connais/})).toHaveCount(0);
    await expect(screen(page).getByText(first.japanese,{exact:true})).toHaveCount(0);
    await screen(page).getByRole("button",{name:"Révéler la réponse"}).click();
    const displayed=first.kana||first.japanese;
    await expect(screen(page).getByText(displayed,{exact:true})).toBeVisible();
    // A quota error must preserve the question, its counters and the current position.
    await page.evaluate(key=>{
      window.qaOriginalSetItem=Storage.prototype.setItem;
      Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException("QA quota","QuotaExceededError");return window.qaOriginalSetItem.call(this,name,value);};
    },key);
    await screen(page).getByRole("button",{name:/Je connais/}).click();
    await expect(screen(page).getByRole("alert")).toContainText("ta réponse n’a pas été validée");
    assert.equal((await cards(page))[0].seen,0);
    await page.evaluate(()=>{Storage.prototype.setItem=window.qaOriginalSetItem;delete window.qaOriginalSetItem;});
    await screen(page).getByRole("button",{name:/À revoir/}).click();
    await expect(screen(page).getByRole("heading",{name:"Séance terminée"})).toBeVisible();
    assert.equal((await cards(page))[0].due-Date.parse("2026-11-02T10:00:00Z"),600000);
    await screen(page).getByRole("button",{name:"Retour au carnet"}).click();
    await expect(screen(page).getByRole("button",{name:/^Réviser /})).toHaveCount(0);
    await page.reload({waitUntil:"domcontentloaded"});
    await nav(page).waitFor();
    await openReviews(page);
    assert.equal((await cards(page))[0].seen,1);
    await page.clock.setFixedTime(new Date("2026-11-02T10:11:00Z"));
    await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
    await screen(page).getByRole("button",{name:"Réviser 1 carte",exact:true}).click();
    await screen(page).getByRole("button",{name:"Révéler la réponse"}).click();
    await screen(page).getByRole("button",{name:/Je connais/}).click();
    assert.equal((await cards(page))[0].box,1);
    await screen(page).getByRole("button",{name:"Retour au carnet"}).click();
    const reviewed=(await cards(page))[0];
    await screen(page).locator("summary").click();
    await screen(page).getByLabel("Phrase japonaise",{exact:true}).fill(reviewed.japanese);
    await screen(page).getByLabel("Traduction française",{exact:true}).fill(reviewed.answer);
    await screen(page).getByRole("button",{name:"Ajouter ma phrase",exact:true}).click();
    assert.deepEqual((await cards(page))[0],reviewed,"A manual duplicate preserves the schedule");
    await screen(page).getByRole("button",{name:/^Retirer la phrase/}).click();
    assert.equal((await cards(page)).length,0);
    await screen(page).getByRole("button",{name:"Annuler le retrait"}).click();
    assert.equal((await cards(page))[0].due,reviewed.due);
    await screen(page).getByRole("region",{name:"Phrases pour mon voyage"}).getByRole("button",{name:"Ajouter aux révisions",exact:true}).first().click();
    assert.equal((await cards(page)).length,2);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await screen(page).scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/carnet-${width}.png`});
    console.log(`PASS ${width}px: daily capture, Today access, itinerary suggestions, recall/reveal, quota failure, grading, due dates, reload, duplicates, removal/undo, no overflow`);
    await ctx.close();
  }

  // Auth, progress and the tutor are entirely mocked; no live writes or AI calls.
  const exp=Math.floor(Date.now()/1000)+86400;
  const user={id:userId,aud:"authenticated",role:"authenticated",email:"qa@example.invalid",user_metadata:{full_name:profile.name},created_at:new Date().toISOString()};
  const token=[{alg:"HS256",typ:"JWT"},{sub:userId,exp,role:"authenticated"}].map(value=>Buffer.from(JSON.stringify(value)).toString("base64url")).join(".")+".test";
  const auth={access_token:token,refresh_token:"qa-only",expires_in:86400,expires_at:exp,token_type:"bearer",user};
  const row={user_id:userId,profile,settings:{onboarding},favorites:[],scenarios:{done:[],xp:0},updated_at:"2026-11-02T10:00:00Z"};
  const {ctx,page}=await context(390,auth,row);
  const program=page.locator("#isekaid-route-home .preparation-program");
  await program.getByRole("button",{name:"M’entraîner",exact:true}).click();
  const scenario=db.scenarios.find(item=>item.id==="restaurant");
  for(const [index,step]of scenario.etapes.entries()){
    const answer=step.choix.find(choice=>choice.correct);
    await page.locator("#isekaid-route-scenarios").getByText(answer.kana||answer.jp,{exact:true}).first().click();
    await page.getByRole("button",{name:index===scenario.etapes.length-1?"Voir le résultat":"Continuer →",exact:true}).click();
  }
  const badge=page.getByRole("button",{name:"Super ! 🎉",exact:true});
  if(await badge.isVisible())await badge.click();
  await page.getByRole("button",{name:/Rejoue cette scène avec ton tuteur/}).click();
  await page.getByPlaceholder("Écris en japonais ou en français…").fill("私を学生です");
  await page.getByRole("button",{name:"➤",exact:true}).click();
  await page.getByRole("button",{name:"Revoir cette correction",exact:true}).click();
  assert.equal((await cards(page))[0].japanese,"私を学生です");
  assert.equal((await cards(page))[0].answer,correction);
  await expect.poll(()=>row.settings.phraseReviews?.cards&&Object.keys(row.settings.phraseReviews.cards).length,{timeout:20000}).toBe(1);
  // Remote hydration and a genuine progress settings round-trip through the mock API.
  await page.evaluate(key=>localStorage.removeItem(key),key);
  await page.reload({waitUntil:"domcontentloaded"});
  await nav(page).waitFor();
  await expect.poll(async()=>(await cards(page)).length).toBe(1);
  await openReviews(page);
  await screen(page).getByRole("button",{name:"Réviser 1 carte",exact:true}).click();
  await expect(screen(page).getByText("私を学生です",{exact:true})).toBeVisible();
  await expect(screen(page).getByText(correction,{exact:true})).toHaveCount(0);
  await screen(page).getByRole("button",{name:"Révéler la réponse"}).click();
  await expect(screen(page).getByText(correction,{exact:true})).toBeVisible();
  await expect(screen(page).locator(".phrase-review__answer .speak-button")).toHaveCount(0);
  await screen(page).getByRole("button",{name:/Je connais/}).click();
  await expect.poll(()=>Object.values(row.settings.phraseReviews?.cards||{})[0]?.seen,{timeout:20000}).toBe(1);
  console.log("PASS mocked account: tutor correction capture, exact learner/correction pairing, cloud save/restore and grading sync");
  await ctx.close();
  assert.deepEqual(errors,[]);
  console.log("PASS: zero browser errors; all external traffic blocked or mocked");
}finally{await browser.close();}
