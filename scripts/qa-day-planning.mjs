import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const origin=process.env.QA_ORIGIN||"http://127.0.0.1:5180";
const output=process.env.QA_OUTPUT||"/tmp/isekaid-day-planning-qa";
const fixture={
  id:"qa-day-planning",titre:"Voyage horaires QA",dateDebut:"2026-11-03",villes:["tokyo"],
  customLieux:[
    {id:"first-place",nom:"Temple QA",villeId:"tokyo",lat:35.68,lng:139.76,duree:"1-2h",horaires:"9h00–17h00"},
    {id:"museum",nom:"Musée QA",villeId:"tokyo",lat:35.68,lng:139.761,duree:"1h",horaires:"10h00–12h00 (fermé le lundi)",conseil:"Réserve ton billet à l’avance",site_web:"example.com"},
    {id:"last-place",nom:"Parc QA",villeId:"tokyo",lat:35.70,lng:139.79,duree:"45min",horaires:"24h/24"},
  ],
  jours:[{num:1,villeId:"tokyo",activites:[{id:"first",lieuId:"first-place",note:"Note à conserver"},{id:"second",lieuId:"museum"},{id:"last",lieuId:"last-place"}]}],
};
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_EXECUTABLE,args:["--no-sandbox"]});
const errors=[];
try {
  for(const width of (process.env.QA_WIDTHS||"360,390").split(",").map(Number)) {
    const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce",timezoneId:"Europe/Paris"});
    await context.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage();
    page.on("pageerror",error=>errors.push(error.message));
    await page.clock.setFixedTime(new Date("2026-11-02T10:00:00Z"));
    await page.addInitScript(trip=>{
      if(sessionStorage.getItem("qa_day_seeded"))return;
      sessionStorage.setItem("qa_day_seeded","1");
      const values={
        isekaid_device_owner_v1:"local",isekaid_guest_mode_v1:JSON.stringify(true),isekaid_intro_seen_v1:"1",
        isekaid_profile_v1:JSON.stringify({name:"Voyageur QA",goal:"travel",level:"débutant",why:["culture"],japanRelationship:"planning"}),
        isekaid_onboarding_state_v2_local:JSON.stringify({version:2,completed:true,seenGuides:{today:true,travel:true,learn:true,discover:true,myJapan:true}}),
        isekaid_trips_v1:JSON.stringify([trip]),isekaid_last_greeting_date:"2026-11-02",isekaid_streak_v1:JSON.stringify({count:1,best:1,last:"2026-11-02",keys:0}),
      };
      for(const [key,value]of Object.entries(values))localStorage.setItem(key,value);
    },fixture);
    const home=()=>page.locator("#isekaid-route-home");
    const nav=()=>page.getByRole("navigation",{name:"Navigation principale"});
    const editor=()=>page.locator(".day-planning-screen");
    const museum=()=>editor().locator(".day-planning__stop").filter({has:page.getByText("2. Musée QA",{exact:true})});
    const openEditor=()=>page.getByRole("button",{name:"Organiser les horaires",exact:true}).click();
    const openMuseum=()=>museum().locator("summary").click();
    const save=()=>editor().getByRole("button",{name:"Enregistrer les horaires",exact:true}).click();
    await page.goto(origin,{waitUntil:"domcontentloaded"});
    await nav().waitFor({timeout:30_000});
    await home().getByRole("button",{name:"Voir mon voyage",exact:true}).click();
    await expect(page.locator(".day-planning-summary")).toBeVisible();
    await openEditor();
    await expect(editor().getByRole("heading",{name:"Horaires et trajets",exact:true})).toBeVisible();
    await openMuseum();
    await museum().getByLabel("Durée vérifiée du trajet (min)",{exact:true}).fill("19");
    await museum().getByLabel("Mode pour ce trajet",{exact:true}).selectOption("transit");
    await museum().getByLabel("Durée de visite (min)",{exact:true}).fill("35");
    await museum().getByLabel("Statut de réservation",{exact:true}).selectOption("booked");
    await museum().getByLabel("Créneau réservé (facultatif)",{exact:true}).fill("10:00");
    await museum().getByLabel("Référence (facultative)",{exact:true}).fill("QA-BILLET");
    await museum().getByLabel("Utiliser mes horaires vérifiés pour ce jour",{exact:true}).check();
    await museum().getByLabel("Ouverture",{exact:true}).fill("10:00");
    await museum().getByLabel("Fermeture",{exact:true}).fill("17:00");
    await expect(editor().getByRole("region",{name:"Aperçu de la journée"}).getByText(/après le créneau de 10:00/)).toBeVisible();
    await museum().screenshot({path:`${output}/visit-${width}.png`});
    await save();
    await expect(editor()).toHaveCount(0);
    await expect(page.locator(".day-planning-transfer").getByText(/19 min renseignées/)).toBeVisible();
    const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem("isekaid_trips_v1"))[0]);
    assert.equal(persisted.jours[0].activites[0].note,"Note à conserver");
    assert.equal(persisted.jours[0].activites[1].planning.transfer.minutes,19);
    assert.equal(persisted.jours[0].activites[1].planning.reservation.date,"2026-11-03");
    assert.equal(persisted.jours[0].activites[1].planning.reservation.reference,"QA-BILLET");
    await openEditor();
    await editor().getByLabel("Fin souhaitée",{exact:true}).fill("08:00");
    await save();
    await expect(editor().getByRole("alert")).toContainText("La fin de journée doit être après le début");
    await editor().getByRole("button",{name:"Annuler",exact:true}).click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("isekaid_trips_v1"))[0].jours[0].planning.endTime),"18:00");
    await page.reload({waitUntil:"domcontentloaded"});
    await home().getByRole("button",{name:"Voir mon voyage",exact:true}).click();
    await openEditor();
    await openMuseum();
    await expect(museum().getByLabel("Référence (facultative)",{exact:true})).toHaveValue("QA-BILLET");
    await context.setOffline(true);
    await museum().getByLabel("Créneau réservé (facultatif)",{exact:true}).fill("11:30");
    await save();
    await expect(page.locator(".day-planning-badge").getByRole("button",{name:"Modifier les horaires de Musée QA",exact:true})).toContainText("11:30");
    // Changer la date conserve le billet et demande de vérifier sa validité.
    await page.evaluate(()=>{
      const trips=JSON.parse(localStorage.getItem("isekaid_trips_v1"));
      trips[0].dateDebut="2026-11-02";
      trips[0].jours[0].activites[0].fait=true;
      localStorage.setItem("isekaid_trips_v1",JSON.stringify(trips));
      window.dispatchEvent(new Event("isekaid:trips-synced"));
    });
    await openEditor();
    await expect(editor().getByRole("region",{name:"Aperçu de la journée"})).toContainText("La réservation est datée du 2026-11-03");
    await expect(editor().getByRole("region",{name:"Aperçu de la journée"})).toContainText("indiqué fermé ce jour");
    await editor().screenshot({path:`${output}/warnings-${width}.png`});
    const metrics=await editor().evaluate(node=>({width:node.clientWidth,scroll:node.scrollWidth}));
    assert.ok(metrics.scroll<=metrics.width,`No editor overflow at ${width}px`);
    await editor().getByRole("button",{name:"Annuler",exact:true}).click();
    await nav().getByRole("button",{name:/^Aujourd’hui —/}).click();
    await expect(home().locator(".today-travel")).toContainText("11:30");
    await expect(home().getByRole("heading",{name:"Musée QA",exact:true})).toBeVisible();
    console.log(`PASS ${width}px: trajet, créneau réservé, ouverture, recalcul, validation, notes conservées, rechargement, hors ligne et date modifiée`);
    await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log("PASS: aucune erreur navigateur");
} finally {await browser.close();}
