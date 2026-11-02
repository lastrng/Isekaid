import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const origin = process.env.QA_ORIGIN || "http://127.0.0.1:4175";
const output = process.env.QA_OUTPUT || "play-store/assets/phone";
const executablePath = process.env.QA_CHROMIUM_EXECUTABLE;

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(20_000);
const capture = async (name) => {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: `${output}/${name}.png` });
};

try {
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Découvrir sans compte" }).click();
  await page.getByRole("heading", { name: "Ton Japon commence ici", exact: true }).waitFor();
  await capture("01-ton-japon-commence-ici");

  await page.getByRole("button", { name: "Commencer", exact: true }).click();
  await page.getByRole("heading", { name: "Un peu de Japon chaque jour", exact: true }).waitFor();
  await capture("02-un-peu-de-japon-chaque-jour");

  await page.getByRole("button", { name: "Passer", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await nav.waitFor();

  const routes = [
    ["Aujourd’hui", "Ton rendez-vous quotidien", "03-aujourdhui"],
    ["Apprendre", "Apprends ce qui te sera utile", "04-apprendre"],
    ["Voyage", "Prépare ton premier voyage", "05-voyage"],
    ["Mon Japon", "Voici ton Japon", "06-mon-japon"],
  ];

  for (const [label, title, filename] of routes) {
    await nav.getByRole("button", { name: new RegExp(`^${label} —`) }).click();
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    const guide = page.locator(".context-guide");
    if (await guide.count()) await guide.locator("button").click();
    await capture(filename);
  }

  console.log(`Captured 6 Play Store screenshots in ${output}`);
} finally {
  await context.close();
  await browser.close();
}
