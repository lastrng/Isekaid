import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const origin=process.env.QA_ORIGIN||"http://127.0.0.1:5173";
const output=process.env.QA_OUTPUT||"/tmp/isekaid-onboarding-qa";
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_EXECUTABLE,args:["--no-sandbox"]});
const accounts={A:"00000000-0000-4000-8000-000000000001",B:"00000000-0000-4000-8000-000000000002",legacy:"00000000-0000-4000-8000-000000000003"};
const tokenKey="sb-rocttuyhzkhjdkxvtvon-auth-token";
const rows=new Map();
const row=id=>rows.get(id)||{user_id:id,profile:null,settings:{},trips:[],favorites:[],updated_at:"2026-09-14T00:00:00Z"};
function session(id) {
  const exp=Math.floor(Date.now()/1000)+86400;
  const user={id,aud:"authenticated",role:"authenticated",email:"qa@example.invalid",user_metadata:{full_name:"Compte neuf Google"},created_at:new Date().toISOString()};
  const token=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url")+"."+Buffer.from(JSON.stringify({sub:id,exp,role:"authenticated"})).toString("base64url")+".test";
  return {access_token:token,refresh_token:"qa-only",expires_in:86400,expires_at:exp,token_type:"bearer",user};
}
const errors=[];
async function makeContext(id) {
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"});
  await ctx.route("**/*",async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin===origin)return route.continue();
    if(!url.hostname.endsWith(".supabase.co"))return route.abort();
    if(url.pathname.endsWith("/progress")){
      const owner=url.searchParams.get("user_id")?.replace("eq.","")||accounts.A;
      if(request.method()==="PATCH"){rows.set(owner,{...row(owner),...request.postDataJSON()});return route.fulfill({json:[{user_id:owner}]});}
      return route.fulfill({json:row(owner)});
    }
    if(url.pathname.endsWith("/token"))return route.fulfill({json:session(accounts.B)});
    if(url.pathname.endsWith("/user_backups"))return route.fulfill({json:null});
    if(url.pathname.endsWith("/logout"))return route.fulfill({json:{}});
    return route.fulfill({json:[]});
  });
  const page=await ctx.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror",error=>{errors.push(error.message);console.error(error.stack);});
  if(id)await page.addInitScript(({tokenKey,auth})=>{
    if(localStorage.getItem("qa_initialized"))return;
    localStorage.setItem("qa_initialized","1");
    localStorage.setItem(tokenKey,JSON.stringify(auth));
  },{tokenKey,auth:session(id)});
  return {ctx,page};
}
const {ctx,page}=await makeContext(accounts.A);
const heading=name=>page.getByRole("heading",{name,exact:true});
const nav=()=>page.getByRole("navigation",{name:"Navigation principale"});
const go=label=>nav().getByRole("button",{name:new RegExp("^"+label+" —")}).click();
const state=()=>page.evaluate(()=>window.__isekaidOnboarding.state());
const assertFits=async(label)=>{
  const metrics=await page.evaluate(()=>{
    const footer=document.querySelector(".onboarding-footer")?.getBoundingClientRect();
    const guide=document.querySelector(".context-guide")?.getBoundingClientRect();
    return {overflow:document.documentElement.scrollWidth>innerWidth,footer:footer&&{top:footer.top,bottom:footer.bottom},guide:guide&&{left:guide.left,right:guide.right,bottom:guide.bottom},width:innerWidth,height:innerHeight};
  });
  assert.equal(metrics.overflow,false,label+": horizontal overflow");
  if(metrics.footer){assert(metrics.footer.top>=0,label+JSON.stringify(metrics));assert(metrics.footer.bottom<=metrics.height+1,label+JSON.stringify(metrics));}
  if(metrics.guide){assert(metrics.guide.left>=0,label);assert(metrics.guide.right<=metrics.width+1,label);}
};
async function dimensions(label) {
  for(const [width,height]of [[360,640],[390,844],[412,915],[430,932],[844,390]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await assertFits(label+" "+width);
    await page.screenshot({path:output+"/"+label+"-"+width+".png"});
  }
  await page.setViewportSize({width:390,height:844});
}
try {
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await heading("Ton Japon commence ici").waitFor({timeout:30000});
  assert.equal(await page.locator(".onboarding-shell input").count(),0);
  await dimensions("01-promise");
  await page.getByRole("button",{name:"Commencer",exact:true}).click();
  await heading("Un peu de Japon chaque jour").waitFor();
  await page.reload({waitUntil:"domcontentloaded"});
  await heading("Un peu de Japon chaque jour").waitFor({timeout:30000});
  assert.equal(await page.evaluate(()=>document.activeElement?.id),"onboarding-title");
  await dimensions("02-today");
  await page.evaluate(()=>window.dispatchEvent(new Event("isekaid:presentation-back")));
  await heading("Ton Japon commence ici").waitFor();
  await page.getByRole("button",{name:"Commencer",exact:true}).click();
  for(const [label,title]of [["03-learn","Le japonais utile, au bon moment"],["04-travel","Avant, pendant et après ton voyage"],["05-discover","Explore, puis garde ce qui compte"]]){
    await page.getByRole("button",{name:"Continuer",exact:true}).click();
    await heading(title).waitFor();
    await dimensions(label);
  }
  await page.evaluate(()=>{
    window.__qaSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key.startsWith("isekaid_onboarding_state_")&&JSON.parse(value).completed)throw new DOMException("Test quota","QuotaExceededError");
      return window.__qaSetItem.call(this,key,value);
    };
  });
  await page.getByRole("button",{name:"Commencer mon Japon"}).click();
  await page.getByRole("alert").waitFor();
  assert.equal(await nav().count(),0);
  await page.evaluate(()=>{Storage.prototype.setItem=window.__qaSetItem;delete window.__qaSetItem;});
  await page.getByRole("button",{name:"Commencer mon Japon"}).click();
  await nav().waitFor();
  await heading("Ton rendez-vous quotidien").waitFor();
  assert.equal(await page.getByText("Ta session se prépare",{exact:true}).count(),0);
  assert.equal(await page.getByText("BADGE DÉBLOQUÉ",{exact:true}).count(),0);
  await dimensions("guide-today");
  assert.equal(await page.locator(".context-guide").count(),1);
  // Leave without acknowledging: hidden routes must not keep Escape listeners.
  await go("Voyage");
  await heading("Prépare ton premier voyage").waitFor();
  await dimensions("guide-travel-empty");
  await page.keyboard.press("Escape");
  assert.equal((await state()).seenGuides.travel,true);
  assert.equal((await state()).seenGuides.today,false);
  await go("Aujourd’hui");
  await heading("Ton rendez-vous quotidien").waitFor();
  await page.locator(".context-guide").getByRole("button",{name:"Compris"}).click();
  for(const [label,title,cta]of [["Apprendre","Apprends ce qui te sera utile","Compris"],["Découvrir","Explore le Japon à ton rythme","Explorer"],["Mon Japon","Voici ton Japon","Compris"]]){
    await go(label);await heading(title).waitFor();await dimensions("guide-"+label);
    await page.locator(".context-guide").getByRole("button",{name:cta,exact:true}).click();
  }
  assert(Object.values((await state()).seenGuides).every(Boolean));
  const preserved=await page.evaluate(()=>localStorage.getItem("isekaid_profile_v1"));
  await page.getByRole("button",{name:"Ouvrir Profil et réglages"}).click();
  await page.getByRole("button",{name:/Rejouer l’onboarding/}).click();
  await heading("Ton Japon commence ici").waitFor();
  await page.getByRole("button",{name:"Commencer",exact:true}).click();
  await page.reload({waitUntil:"domcontentloaded"});
  await heading("Un peu de Japon chaque jour").waitFor({timeout:30000});
  await page.getByRole("button",{name:"Quitter",exact:true}).click();
  await nav().waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem("isekaid_profile_v1")),preserved);
  assert(Object.values((await state()).seenGuides).every(Boolean));
  // Separate optional preferences: preserve dates, progress and onboarding.
  await go("Mon Japon");await page.getByRole("button",{name:"Ouvrir Profil et réglages"}).click();
  await page.getByRole("button",{name:/Personnaliser mon expérience/}).click();
  await page.getByLabel("Ton prénom").fill("Léa");
  await page.getByRole("button",{name:"Gastronomie",exact:true}).click();
  await page.getByLabel("Ton niveau de japonais").selectOption("intermediate");
  await page.setViewportSize({width:360,height:420});
  await page.getByRole("button",{name:"Enregistrer mes préférences"}).click();
  await page.setViewportSize({width:390,height:844});
  assert.equal((await state()).completed,true);
  const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem("isekaid_profile_v1")));
  assert.equal(profile.name,"Léa");assert(profile.why.includes("gastro"));assert.equal(profile.level,"intermediate");
  // Real UI logout and sign-in, with a fake Auth endpoint; no live writes.
  page.on("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Se déconnecter",exact:true}).click();
  await page.getByPlaceholder("Adresse email").waitFor({timeout:30000});
  await page.getByPlaceholder("Adresse email").fill("b@example.invalid");
  await page.getByPlaceholder("Mot de passe").fill("not-a-real-password");
  await page.getByRole("button",{name:"Se connecter",exact:true}).click();
  await heading("Ton Japon commence ici").waitFor({timeout:30000});
  assert.equal((await state()).completed,false);
  await page.getByRole("button",{name:"Passer",exact:true}).click();
  await nav().waitFor();
  assert.equal((await state()).skipped,true);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("isekaid_profile_v1")).name),"Compte neuf Google");
  console.log("PASS: complete/skip, Google new account, reload/back, five guides, replay, preferences, logout A → new B, 5 viewports");
  // Four actual dashboard contexts, in the isolated browser's local state.
  for(const [status,dateDebut,title]of [["planned","2099-01-01","Ton voyage prend forme"],["active",new Date().toISOString().slice(0,10),"Bienvenue en Mode Japon"],["completed","2020-01-01","Ton voyage reste avec toi"]]){
    await page.evaluate(({status,dateDebut})=>{
      localStorage.setItem("isekaid_trips_v1",JSON.stringify([{id:"qa-trip",titre:"Voyage de test isolé",status,dateDebut,jours:[{id:"day-1",activites:[]}],villes:[],etapes:[]}]));
      window.dispatchEvent(new Event("isekaid:trips-synced"));
      window.__isekaidOnboarding.resetGuides();
    },{status,dateDebut});
    await go("Voyage");
    await heading(title).waitFor();
    await assertFits(status);await page.screenshot({path:output+"/travel-"+status+".png"});
    await page.locator(".context-guide button").click();
    await go("Aujourd’hui");
  }
  console.log("PASS: future, active and completed trip guide contexts");
  // Legacy cloud profile on a new device gets only three update screens.
  rows.set(accounts.legacy,{...row(accounts.legacy),profile:{name:"Ancien compte",level:"advanced",why:["culture"]},settings:{introSeen:true}});
  const legacy=await makeContext(accounts.legacy);
  await legacy.page.goto(origin,{waitUntil:"domcontentloaded"});
  await legacy.page.getByRole("heading",{name:"Ton rendez-vous quotidien",exact:true}).waitFor({timeout:30000});
  assert.equal(await legacy.page.getByRole("progressbar").getAttribute("aria-valuemax"),"3");
  await legacy.page.getByRole("button",{name:"Passer",exact:true}).click();
  await legacy.page.getByRole("navigation",{name:"Navigation principale"}).waitFor();
  assert.equal(await legacy.page.evaluate(()=>window.__isekaidOnboarding.state().migration),"legacy-v1");
  assert.equal(await legacy.page.evaluate(()=>window.__isekaidOnboarding.state().skipped),true);
  await legacy.page.reload({waitUntil:"domcontentloaded"});
  await legacy.page.getByRole("navigation",{name:"Navigation principale"}).waitFor({timeout:30000});
  assert.equal(await legacy.page.locator(".onboarding-shell").count(),0);
  await legacy.ctx.close();
  const second=await makeContext(accounts.A);
  await second.page.goto(origin,{waitUntil:"domcontentloaded"});
  await second.page.getByRole("navigation",{name:"Navigation principale"}).waitFor({timeout:30000});
  assert.equal(await second.page.locator(".onboarding-shell").count(),0);
  await second.ctx.close();
  console.log("PASS: legacy migration, no repetition, new device restores completed account");
  // Offline presentation on a guest installation after local assets load.
  const guest=await makeContext();
  await guest.page.goto(origin,{waitUntil:"domcontentloaded"});
  await guest.page.getByRole("button",{name:"Découvrir sans compte"}).waitFor({timeout:30000});
  await guest.page.getByRole("button",{name:"Découvrir sans compte"}).click();
  await guest.page.getByRole("heading",{name:"Ton Japon commence ici"}).waitFor();
  await guest.page.getByRole("button",{name:"Commencer",exact:true}).click();
  await guest.page.reload({waitUntil:"domcontentloaded"});
  await guest.page.getByRole("heading",{name:"Un peu de Japon chaque jour"}).waitFor({timeout:30000});
  await guest.ctx.setOffline(true);
  await guest.page.getByRole("button",{name:"Passer",exact:true}).click();
  await guest.page.getByRole("navigation",{name:"Navigation principale"}).waitFor();
  assert.equal(await guest.page.getByText("Ta session se prépare",{exact:true}).count(),0);
  await guest.ctx.close();
  assert.deepEqual(errors,[]);
  console.log("PASS: guest reload, offline skip and ready session; zero uncaught browser errors");
} catch(error) {
  console.error("UI:",(await page.locator("body").innerText()).slice(0,3000),"JS:",errors);
  await page.screenshot({path:output+"/failure.png",timeout:5000}).catch(()=>{});
  throw error;
} finally {await ctx.close();await browser.close();}
