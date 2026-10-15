// Bakes the posters an upright phone shows in each 3D window before the live world has drawn there:
// public/flow/<chapter>.webp for the story (components/story/PhoneFlow.tsx) and public/flow/app-<i>.webp
// for the applications (components/sections/ApplicationFlow.tsx, by FEATURED index). Each is the live
// world's own picture (transparent, over the page's sky), at the moment a reader first sees the whole
// window, on a 390x844 phone at 2x.
//
// Re-bake after a change to the 3D (components/three, lib/scene.ts, lib/framing.ts) or to the windows'
// heights (app/styles/flow.css). Runs against the dev server (it reads the dev-only __flow and __appSnap):
//
//   npm i --no-save puppeteer-core@24      (once; uses the system Chrome)
//   node scripts/bake-flow-posters.mjs http://localhost:3000
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

let puppeteer;
try {
  // PUPPETEER: a path to puppeteer-core installed elsewhere (a scratch folder), instead of this project.
  puppeteer = (await import(process.env.PUPPETEER ?? "puppeteer-core")).default;
} catch {
  console.error("puppeteer-core is missing: npm i --no-save puppeteer-core@24");
  process.exit(1);
}

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = path.resolve("public/flow");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
/** The story's 3D windows (Control and Scale show decks). */
const STORY = [0, 1, 2, 3, 4, 7, 8];
const APPS = 6;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle2", timeout: 120000 });
await page.waitForFunction(() => document.documentElement.classList.contains("scene-live"), { timeout: 120000 });

/** Scrolls so window `sel` sits whole at the foot of the screen (a reader's first full view of it). */
async function frameWindow(sel) {
  await page.evaluate((s) => {
    const w = document.querySelector(s);
    const r = w.getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY - (window.innerHeight - r.height - 24));
  }, sel);
  // A small wheel step so every scroll reader updates, then time for the world to settle.
  await page.mouse.wheel({ deltaY: 1 });
  await sleep(3500);
}

async function save(name, dataUrl) {
  if (!dataUrl) throw new Error(`no picture for ${name}`);
  const buf = Buffer.from(dataUrl.split(",")[1], "base64");
  await sharp(buf).webp({ quality: 82, alphaQuality: 88, effort: 6 }).toFile(path.join(OUT, `${name}.webp`));
  console.log(name, fs.statSync(path.join(OUT, `${name}.webp`)).size, "bytes");
}

for (const ch of STORY) {
  await frameWindow(`[data-win="${ch}"]`);
  await save(String(ch), await page.evaluate(() => window.__flow?.snap?.()?.toDataURL("image/png")));
}

// The applications build as their section nears.
await frameWindow('[data-awin="0"]');
await page.waitForFunction(() => !!window.__appSnap?.(), { timeout: 60000 });
for (let n = 0; n < APPS; n++) {
  await frameWindow(`[data-awin="${n}"]`);
  await save(`app-${n}`, await page.evaluate(() => window.__appSnap?.()?.toDataURL("image/png")));
}

await browser.close();
