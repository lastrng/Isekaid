import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const origin = process.env.QA_ORIGIN || "http://127.0.0.1:5180";
const output = process.env.QA_OUTPUT || "/tmp/isekaid-preparation-qa";
const db = JSON.parse(await readFile(new URL("../src/japan-data.json", import.meta.url), "utf8"));
const fixture = {
  id:"qa-preparation", titre:"Mon séjour à Kyoto", dateDebut:"2026-11-22", villes:["kyoto"],
  customLieux:[{id:"my-restaurant",nom:"Mon restaurant",categorie:"Restaurant",villeId:"kyoto"}],
  jours:[{num:1,villeId:"kyoto",activites:[{id:"a",lieuId:"my-restaurant"}]}],
  checklist:[{id:"passport",texte:"Vérifier mon passeport",fait:false}],
};
await mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_EXECUTABLE,args:["--no-sandbox"]});
const errors = [];
try {
  for (const width of (process.env.QA_WIDTHS || "360,390").split(",").map(Number)) {
    const context = await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce",timezoneId:"Europe/Paris"});
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.setFixedTime(new Date("2026-11-02T10:00:00Z"));
    await page.addInitScript(trip => {
      if (sessionStorage.getItem("qa_preparation_seeded")) return;
      sessionStorage.setItem("qa_preparation_seeded", "1");
      const values = {
        isekaid_device_owner_v1:"local",
        isekaid_guest_mode_v1:JSON.stringify(true),
        isekaid_profile_v1:JSON.stringify({name:"Voyageur QA",why:["culture"],level:"débutant",goal:"travel",japanRelationship:"planning"}),
        isekaid_onboarding_state_v2_local:JSON.stringify({version:2,completed:true,seenGuides:{today:true,travel:true,learn:true,discover:true,myJapan:true}}),
        isekaid_intro_seen_v1:"1",
        isekaid_trips_v1:JSON.stringify([trip]),
        isekaid_scenarios_v1:JSON.stringify({done:["presentation","train"],xp:0}),
        isekaid_streak_v1:JSON.stringify({count:1,best:1,last:"2026-11-02",keys:0}),
        isekaid_last_greeting_date:"2026-11-02",
        isekaid_scenarios_learn_tip_dismissed_v1:"1",
      };
      for (const [key,value] of Object.entries(values)) localStorage.setItem(key,value);
    }, fixture);
    const nav = () => page.getByRole("navigation",{name:"Navigation principale"});
    const goHome = () => nav().getByRole("button",{name:/^Aujourd’hui —/}).click();
    const homeProgram = () => page.locator("#isekaid-route-home .preparation-program");
    const task = (program,title) => program.locator(".preparation-program__task").filter({hasText:title});
    const openCalendar = async program => {
      if (await program.locator("details").getAttribute("open") === null) {
        await program.locator("summary").click();
      }
    };

    await page.goto(origin,{waitUntil:"domcontentloaded"});
    await nav().waitFor({timeout:30_000});
    await expect(homeProgram().getByRole("heading",{name:"Commander au restaurant",exact:true})).toBeVisible();
    await expect(homeProgram().getByText("Au programme : Mon restaurant à Kyoto · jour 1.",{exact:true})).toBeVisible();
    await expect(homeProgram().locator(".preparation-program__progress-label")).toHaveText(/^3 sur/);
    await homeProgram().scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/today-${width}.png`});
    await homeProgram().getByRole("button",{name:"M’entraîner",exact:true}).click();
    await page.getByRole("button",{name:"‹ Quitter",exact:true}).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("isekaid_scenarios_v1")).done.includes("restaurant")),false);
    const scenario = db.scenarios.find(item => item.id === "restaurant");
    for (const [index,step] of scenario.etapes.entries()) {
      const answer = step.choix.find(choice => choice.correct);
      await page.locator("#isekaid-route-scenarios").getByText(answer.kana || answer.jp,{exact:true}).first().click();
      await page.getByRole("button",{name:index === scenario.etapes.length - 1 ? "Voir le résultat" : "Continuer →",exact:true}).click();
    }
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("isekaid_scenarios_v1")).done.includes("restaurant"))).toBe(true);
    await page.reload({waitUntil:"domcontentloaded"});
    await nav().waitFor();
    await expect(homeProgram().locator(".preparation-program__progress-label")).toHaveText(/^4 sur/);
    await openCalendar(homeProgram());
    await expect(task(homeProgram(),"Commander au restaurant")).toContainText("Accompli");

    await task(homeProgram(),"Vérifier mon passeport").click();
    const passport = page.getByText("Vérifier mon passeport",{exact:true}).locator("..");
    await passport.getByRole("button").first().click();
    await page.getByRole("button",{name:"‹ Retour",exact:true}).click();
    await goHome();
    await expect(homeProgram().locator(".preparation-program__progress-label")).toHaveText(/^5 sur/);
    await openCalendar(homeProgram());

    await task(homeProgram(),"Forfait mobile et wifi").click();
    await page.getByRole("button",{name:"Marquer comme lu",exact:true}).click();
    await page.getByRole("button",{name:"‹ Vie quotidienne",exact:true}).click();
    await expect(task(homeProgram(),"Forfait mobile et wifi")).toContainText("Accompli");
    await expect(homeProgram().locator(".preparation-program__progress-label")).toHaveText(/^6 sur/);

    await task(homeProgram(),"Garder une réservation à portée de main").click();
    await page.getByRole("heading",{name:"Documents et réservations",exact:true}).waitFor();
    await page.getByRole("button",{name:"+ Ajouter une référence",exact:true}).click();
    await page.getByLabel("Titre",{exact:true}).fill("Réservation QA Kyoto");
    await page.getByRole("button",{name:"Enregistrer",exact:true}).click();
    await page.getByRole("button",{name:"‹ Retour au voyage",exact:true}).click();
    const voyageProgram = page.locator("#isekaid-route-voyage .preparation-program");
    await expect(voyageProgram.locator(".preparation-program__progress-label")).toHaveText(/^7 sur/);
    await voyageProgram.scrollIntoViewIfNeeded();
    await page.screenshot({path:`${output}/travel-${width}.png`});
    await goHome();
    await expect(homeProgram().locator(".preparation-program__progress-label")).toHaveText(/^7 sur/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),"No page overflow");
    const bounds = await homeProgram().boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1,"Program fits mobile width");

    // A draft opens the date control; changing the date rebuilds the calendar.
    await page.evaluate(() => {
      const trips = JSON.parse(localStorage.getItem("isekaid_trips_v1"));
      trips[0].dateDebut = "";
      localStorage.setItem("isekaid_trips_v1",JSON.stringify(trips));
    });
    await page.reload({waitUntil:"domcontentloaded"});
    await homeProgram().getByRole("button",{name:"Ajouter mes dates",exact:true}).click();
    await page.getByLabel("Date de départ du voyage",{exact:true}).fill("2026-12-12");
    await goHome();
    await expect(homeProgram().getByText("J-40",{exact:true})).toBeVisible();
    await openCalendar(homeProgram());
    await expect(task(homeProgram(),"Commander au restaurant")).toContainText("Accompli");
    await expect(task(homeProgram(),"Savoir demander de l’aide")).toContainText("10 déc.");

    // A loaded application keeps its program and deep links without a network.
    await context.setOffline(true);
    await task(homeProgram(),"Forfait mobile et wifi").click();
    await expect(page.getByRole("button",{name:"Contenu marqué comme lu",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"‹ Vie quotidienne",exact:true}).click();
    await page.clock.setFixedTime(new Date("2026-12-11T10:00:00Z"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(homeProgram().getByText("J-1",{exact:true})).toBeVisible();
    await expect(homeProgram().getByRole("heading",{name:"Savoir demander de l’aide",exact:true})).toBeVisible();
    await page.clock.setFixedTime(new Date("2026-12-11T15:00:00Z"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(homeProgram()).toHaveCount(0);
    await expect(page.locator("#isekaid-route-home").getByRole("button",{name:"Voir ma journée",exact:true})).toBeVisible();
    console.log(`PASS ${width}px: scénario réel, checklist, lecture, document, deux écrans, dates, rechargement, hors ligne et jour du départ au Japon`);
    await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log("PASS: aucune erreur navigateur");
} finally {
  await browser.close();
}
