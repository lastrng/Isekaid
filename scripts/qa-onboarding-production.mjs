import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const origin=process.env.QA_ORIGIN||"http://127.0.0.1:4173";
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_EXECUTABLE,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"});
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
await page.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
try {
  await page.goto(origin,{waitUntil:"domcontentloaded"});
  await page.getByRole("button",{name:"Découvrir sans compte"}).click();
  await page.getByRole("button",{name:"Passer",exact:true}).click();
  const nav=page.getByRole("navigation",{name:"Navigation principale"});
  await nav.waitFor();
  for(const [label,title]of [["Aujourd’hui","Ton rendez-vous quotidien"],["Voyage","Prépare ton premier voyage"],["Apprendre","Apprends ce qui te sera utile"],["Découvrir","Explore le Japon à ton rythme"],["Mon Japon","Voici ton Japon"]]){
    await nav.getByRole("button",{name:new RegExp("^"+label+" —")}).click();
    await page.getByRole("heading",{name:title,exact:true}).waitFor();
    assert.equal(await page.locator(".context-guide").count(),1);
    await page.locator(".context-guide button").click();
  }
  await page.getByRole("button",{name:"Ouvrir Profil et réglages"}).click();
  await page.getByRole("button",{name:/Rejouer l’onboarding/}).click();
  await page.getByRole("heading",{name:"Ton Japon commence ici"}).waitFor();
  assert.equal(await page.evaluate(()=>typeof window.__isekaidOnboarding),"undefined");
  await page.getByRole("button",{name:"Commencer",exact:true}).click();
  for(let i=0;i<3;i++)await page.getByRole("button",{name:"Continuer",exact:true}).click();
  await page.getByRole("button",{name:"Commencer mon Japon"}).click();
  await nav.waitFor();
  assert.equal(await page.locator(".context-guide").count(),0);
  assert.deepEqual(errors,[]);
  console.log("PASS production: five guides on first mount, complete replay, no debug API, no JavaScript errors");
} catch(error){
  console.error((await page.locator("body").innerText()).slice(0,2000),errors);
  throw error;
} finally {await browser.close();}
