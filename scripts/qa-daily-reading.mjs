import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const origin=process.env.QA_ORIGIN||"http://127.0.0.1:5173";
const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_EXECUTABLE,args:["--no-sandbox"]});
const errors=[];
const db=JSON.parse(await readFile(new URL("../src/japan-data.json",import.meta.url),"utf8"));
try {
  for(const width of (process.env.QA_WIDTHS||"360,390,412,430").split(",").map(Number)) {
    const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
    page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    await page.goto(origin,{waitUntil:"domcontentloaded"});
    await page.getByRole("button",{name:"Découvrir sans compte"}).click();
    await page.getByRole("button",{name:"Passer",exact:true}).click();
    const nav=page.getByRole("navigation",{name:"Navigation principale"});
    await nav.waitFor();
    await page.locator(".context-guide button").click();
    const session=page.locator(".today-session");
    const selectQuiz=()=>session.getByRole("button",{name:/^Comprendre, /}).click();
    await selectQuiz();
    let quiz=await page.evaluate(()=>JSON.parse(localStorage.getItem("isekaid_daily_ritual_v1")).activities.find(item=>item.kind==="understand"));
    await expect(session.locator("[data-romaji]")).toBeVisible();
    const chosen=width===360?quiz.question.choices.find(choice=>choice!==quiz.question.answer):quiz.question.answer;
    await session.getByRole("button",{name:chosen,exact:true}).click();
    await expect(session.getByText(width===360?"La bonne réponse":"Bonne réponse !",{exact:true})).toBeVisible();
    await expect(session.getByText(width===360?"La bonne réponse":"Bonne réponse !",{exact:true})).toBeInViewport();
    await expect(session.getByText(quiz.question.explanation,{exact:true})).toBeVisible();
    await page.clock.install();
    await page.clock.fastForward(7500);
    await expect(session.getByText(quiz.question.explanation,{exact:true})).toBeVisible();
    await session.getByRole("button",{name:"Continuer",exact:true}).click();
    await selectQuiz();
    await expect(session.getByText(quiz.question.explanation,{exact:true})).toBeVisible();
    await page.reload({waitUntil:"domcontentloaded"});
    await nav.waitFor();
    await selectQuiz();
    await expect(session.getByText(quiz.question.explanation,{exact:true})).toBeVisible();
    await nav.getByRole("button",{name:/^Mon Japon —/}).click();
    await page.locator(".context-guide button").click();
    await page.getByRole("button",{name:"Ouvrir Profil et réglages"}).click();
    const toggle=page.getByRole("switch",{name:"Afficher le romaji",exact:true});
    await expect(toggle).toHaveAttribute("aria-checked","true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked","false");
    await nav.getByRole("button",{name:/^Aujourd’hui —/}).click();
    await selectQuiz();
    await expect(session.locator("[data-romaji]")).toHaveCount(0);
    await session.getByRole("button",{name:/^Apprendre, /}).click();
    await expect(session.locator("[data-romaji]")).toHaveCount(0);
    await page.reload({waitUntil:"domcontentloaded"});
    await nav.waitFor();
    assert.equal(await page.evaluate(()=>localStorage.getItem("isekaid_show_romaji_v1")),"false");
    await selectQuiz();
    await expect(session.locator("[data-romaji]")).toHaveCount(0);
    // A quiz answered last must still show its correction before the summary.
    await page.evaluate(()=>{
      const ritual=JSON.parse(localStorage.getItem("isekaid_daily_ritual_v1"));
      for(const item of ritual.activities){item.done=item.kind!=="understand";if(item.kind==="understand"){delete item.selectedAnswer;delete item.answerCorrect;delete item.answeredAt;}}
      ritual.completedAt=null;
      localStorage.setItem("isekaid_daily_ritual_v1",JSON.stringify(ritual));
      localStorage.setItem("isekaid_show_romaji_v1","true");
    });
    await page.reload({waitUntil:"domcontentloaded"});
    await nav.waitFor();
    await selectQuiz();
    await session.getByRole("button",{name:quiz.question.answer,exact:true}).click();
    await expect(session.getByText("Bonne réponse !",{exact:true})).toBeVisible();
    await session.getByRole("button",{name:"Continuer",exact:true}).click();
    await expect(session.getByText("Ta session du jour est terminée",{exact:true})).toBeVisible();
    await session.getByRole("button",{name:"Revoir la réponse du quiz"}).click();
    await expect(session.getByText(quiz.question.explanation,{exact:true})).toBeVisible();
    if(width===390){
      await nav.getByRole("button",{name:/^Apprendre —/}).click();
      await page.locator(".context-guide button").click();
      await page.getByText("Écrite",{exact:true}).click();
      const reading=db.comprehension_ecrite.find(item=>item.niveau==="Débutant");
      await expect(page.locator("[data-romaji]").filter({hasText:reading.texte_romaji})).toBeVisible();
      console.log("PASS reading comprehension: romaji visible by default");
      await nav.getByRole("button",{name:/^Aujourd’hui —/}).click();
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),"No horizontal overflow");
    console.log(`PASS ${width}px: quiz feedback, review, reload, romaji default/toggle, last-answer summary`);
    await page.close();
  }
  assert.deepEqual(errors,[]);
  console.log("PASS: zero browser errors");
} finally {await browser.close();}
