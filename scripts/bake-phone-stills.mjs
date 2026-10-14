// Bakes the phone stills (lib/stills.ts): every hold of the home story (lib/story.ts STOPS) and every
// application x stage of the home Applications explorer, rendered by the live 3D (?live3d) at phone
// framing for each screen shape below, as transparent AVIF and WebP over the page's own sky, plus
// public/stills/manifest.json with the labels, the Industries pin, the islands (their labels, tap
// areas, opened pictures and panel anchors) and the framing each picture was made for.
// components/story/PhoneStory.tsx and components/sections/ExplorerStills.tsx show them.
//
// Re-bake after ANY change to the 3D (components/three, lib/scene.ts), to the story's holds or framing
// (lib/story.ts), or to anything that moves the card, the nav, the hero/ending headlines, the
// Industries callout or the explorer's head and card on phones. A manifest whose holds no longer match
// STOPS makes phones fall back to the live 3D.
//
//   npm run build && npx next start -p 3320            (a production build; any free port)
//   npm i --no-save puppeteer-core@24                   (once; uses the system Chrome)
//   node scripts/bake-phone-stills.mjs http://localhost:3320
//   npm run build                                       (again: next start serves only the public/
//                                                        files that existed at build time)
//
// Options (env): ONLY=360x640,412x915 bakes those shapes only; PART=story or PART=apps bakes that half
// only (the manifest keeps the rest); CHROME=/path/to/chrome. Check the result at 2x zoom crops
// (banding, label alignment) and side by side with ?live3d before committing. A full bake takes about
// 25 minutes.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

let puppeteer;
try {
  puppeteer = (await import("puppeteer-core")).default;
} catch {
  console.error("puppeteer-core is missing: npm i --no-save puppeteer-core@24");
  process.exit(1);
}

const BASE = process.argv[2] ?? "http://localhost:3320";
const OUT = path.resolve("public/stills");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
/** Screen shapes (CSS px), from a short iPhone with Safari's bars to a tall Android. Each phone takes
 *  the one whose free band is closest in shape, per hold (lib/stills.ts pickBucket). */
const BUCKETS = [
  [375, 560],
  [360, 640],
  [390, 760],
  [360, 740],
  [412, 915],
];
/** Pixel density of the stills: the phone canvas's 2x, with room for a screen up to 10% wider than its
 *  bake (a 412 bake on a 430 phone) without dropping under 2x. */
const DPR = 2.2;
const AVIF = { quality: 62, effort: 7, chromaSubsampling: "4:4:4" };
const WEBP = { quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true };
/** The explorer: its chapters' lengths and where each stage holds (ApplicationExplorer CHAPTER_LENGTHS,
 *  STAGE_AT; the home page shows all eight applications in APPLICATIONS order). */
const APP_LENS = [1.35, 0.9, 1.1, 1.2, 1.1, 0.9, 0.95, 0.95];
const STAGE_AT = [0.18, 0.48, 0.84];

const ONLY = process.env.ONLY?.split(",");
const PART = process.env.PART ?? "all";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Shows only one canvas, on a transparent page, for an RGBA screenshot of its world alone. */
const canvasOnly = (sel) => `html, body { background: transparent !important; }
body * { visibility: hidden !important; transition: none !important; }
${sel} canvas { visibility: visible !important; }`;

const manifestPath = path.join(OUT, "manifest.json");
const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
const tags = [];
const tagIndex = new Map();
const tagOf = (html) => {
  if (!tagIndex.has(html)) {
    tagIndex.set(html, tags.length);
    tags.push(html);
  }
  return tagIndex.get(html);
};
/** A kept bake of one shape, with its labels' markup whole again (styles put back), or null. */
function oldBucket(id) {
  if (!old) return null;
  const file = path.join(OUT, id, "data.json");
  const b = old.shapes ? (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null) : old.buckets?.find((x) => x.id === id);
  if (!b) return null;
  const table = b.tags && old.shapes ? b.tags : old.tags;
  const whole = (html) =>
    html.replace(/data-s="([\d,]+)"/g, (_, ids) => {
      const css = old.decls ? ids.split(",").map((i) => old.decls[+i]).join("; ") : old.styles[+ids];
      return `style="${css.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`;
    });
  // Its labels, re-indexed into this bake's table.
  const keep = (t) => t && { ...t, t: tagOf(whole(table[t.t])) };
  return {
    ...b,
    holds: b.holds?.map((hd) => ({ ...hd, tags: hd.tags.map(keep), islands: hd.islands?.map((s) => ({ ...s, read: s.read.map(keep), tags: s.tags.map(keep) })) })),
    apps: b.apps?.map((a) => ({ ...a, tags: a.tags.map(keep) })),
  };
}
const tagAt = (t) => ({ x: t.x, y: t.y, o: t.o, t: tagOf(t.html) });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars", "--force-color-profile=srgb"],
});

/** The visible labels on a canvas's tag layer (ScreenTag), in px from the layer's corner. */
const readTags = (page, sel) =>
  page.evaluate((sel) => {
    const layer = document.querySelector(`${sel} [data-stag-layer]`);
    if (!layer) return [];
    const box = layer.getBoundingClientRect();
    return (
      [...layer.querySelectorAll(":scope > [data-stag]")]
        .filter((el) => el.style.visibility !== "hidden")
        .map((el) => {
          const m = /translate3d\(([-\d.]+)px, ([-\d.]+)px/.exec(el.style.transform);
          const op = (e) => (e ? parseFloat(e.style.opacity || "1") : 0);
          const [, dot, card] = el.children;
          return { x: m ? +m[1] : 0, y: m ? +m[2] : 0, o: +op(el).toFixed(3), html: el.innerHTML, open: op(card), seen: op(el) * Math.max(op(dot), op(card)) };
        })
        // Shown at all, and on screen: a closed tag with no dot, or a place off the screen, draws nothing.
        .filter((t) => t.seen > 0.02 && t.x > -40 && t.x < box.width + 40 && t.y > -40 && t.y < box.height + 40)
    );
  }, sel);

/** One canvas's world alone, as an RGBA PNG (cropped to `clip` in CSS px); null when it drew nothing. */
async function grab(page, sel, clip) {
  await page.addStyleTag({ content: canvasOnly(sel) }).then((h) => h.evaluate((el) => el.setAttribute("data-bake", "")));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  let png = await page.screenshot({ omitBackground: true, type: "png" });
  await page.evaluate(() => document.querySelectorAll("style[data-bake]").forEach((s) => s.remove()));
  if (clip) {
    const meta = await sharp(png).metadata();
    const left = Math.max(0, Math.round(clip.x * DPR));
    const top = Math.max(0, Math.round(clip.y * DPR));
    png = await sharp(png)
      .extract({ left, top, width: Math.min(meta.width - left, Math.round(clip.w * DPR)), height: Math.min(meta.height - top, Math.round(clip.h * DPR)) })
      .png()
      .toBuffer();
  }
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let any = false;
  for (let i = 3; i < data.length; i += 4 * 7) {
    if (data[i] > 2) {
      any = true;
      break;
    }
  }
  return any ? png : null;
}

async function write(dir, name, png) {
  fs.mkdirSync(dir, { recursive: true });
  await sharp(png).avif(AVIF).toFile(path.join(dir, `${name}.avif`));
  await sharp(png).webp(WEBP).toFile(path.join(dir, `${name}.webp`));
}

/** Waits until the story has eased onto g, then for the world to settle. */
async function settle(page, g, extra) {
  for (let t = 0; t < 100; t++) {
    const done = await page.evaluate((g) => !window.__live3d.pacing() && Math.abs(window.__live3d.store.g - g) < 1e-3, g);
    if (done) break;
    await sleep(100);
  }
  await sleep(extra);
}

/** Scrolls to y and stays: the touch snap guard (lib/snap.ts) holds a far jump at the next chapter until
 *  it re-arms, so the scroll is repeated (a chapter at a time) until it lands. */
async function scrollTo(page, y) {
  for (let i = 0; i < 40; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await sleep(400);
    if (Math.abs((await page.evaluate(() => scrollY)) - y) < 2) return;
  }
}

/** Every hold of the story: its picture, labels and framing band; the islands' reads and opened states. */
async function bakeStory(page, id, w, h, dir) {
  const { stops, ch } = await page.evaluate(() => ({
    stops: [...document.querySelectorAll(".story-stop")].map((e) => ({ g: +e.dataset.g, y: Math.round(e.getBoundingClientRect().top + scrollY) })),
    ch: window.__live3d.CH,
  }));
  const holds = [];
  for (let k = 0; k < stops.length; k++) {
    const { g, y } = stops[k];
    const c = Math.min(Math.floor(g + 1e-6), 8);
    await scrollTo(page, y);
    await settle(page, g, 2600);
    const band = await page.evaluate((c) => window.__live3d.bandOf(c).map((v) => +v.toFixed(1)), c);
    const seen = await readTags(page, ".story-canvas");
    const shot = await grab(page, ".story-canvas");
    const name = `h${String(k).padStart(2, "0")}`;
    if (shot) await write(dir, name, shot);
    const hold = { g, c, img: shot ? name : null, band, tags: seen.map(tagAt) };
    if (c === ch.industries) {
      const pin = await page.evaluate(() => {
        const s = document.querySelector(".ind-callout-stage");
        const v = (n) => parseFloat(s?.style.getPropertyValue(n) ?? "");
        return v("--lead-o") > 0.5 ? [+v("--pin-x").toFixed(1), +v("--pin-y").toFixed(1)] : null;
      });
      if (pin) hold.pin = pin;
    }
    if (c === ch.fragments || c === ch.context) {
      hold.islands = [];
      for (let i = 0; i < 6; i++) {
        // Read: the island's own label open, as a first tap opens it.
        await page.evaluate((i) => window.__live3d.setPinHint(`island:${i}`), i);
        await sleep(900);
        const read = await readTags(page, ".story-canvas");
        const own = read.reduce((a, b) => (b.open > (a?.open ?? -1) ? b : a), null);
        await page.evaluate(() => window.__live3d.setPinHint(null));
        // Opened: lifted, the others stepped back, the world leaning clear of the panel.
        await page.evaluate((i) => window.__live3d.select(i), i);
        await sleep(2200);
        const anchor = await page.evaluate(() => [+window.__live3d.store.anchor.x.toFixed(1), +window.__live3d.store.anchor.y.toFixed(1)]);
        const openTags = await readTags(page, ".story-canvas");
        const opened = await grab(page, ".story-canvas");
        const oname = `${name}-i${i}`;
        if (opened) await write(dir, oname, opened);
        void own;
        hold.islands.push({
          read: read.map(tagAt),
          // The tap area is set at write time, from the island's pin (hitsOf).
          hit: [0, 0, 0, 0],
          img: opened ? oname : null,
          anchor,
          tags: openTags.map(tagAt),
        });
        await page.evaluate(() => window.__live3d.select(-1));
        await sleep(1600);
      }
    }
    holds.push(hold);
    console.log(id, k, g.toFixed(3), hold.img ?? "-", `${hold.tags.length} labels`, hold.islands ? "islands" : "");
  }
  return holds;
}

/** Every application x stage of the explorer: its picture, labels and the free area it was framed into. */
async function bakeApps(page, id, dir) {
  const total = APP_LENS.reduce((a, b) => a + b, 0);
  const apps = [];
  let stage = null;
  let first = true;
  for (let a = 0; a < APP_LENS.length; a++) {
    for (let s = 0; s < STAGE_AT.length; s++) {
      const f = (APP_LENS.slice(0, a).reduce((x, y) => x + y, 0) + APP_LENS[a] * STAGE_AT[s]) / total;
      const y = await page.evaluate((f) => {
        const el = document.querySelector(".application-journey");
        return Math.round(el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * f);
      }, f);
      await scrollTo(page, y);
      if (first) {
        // The world builds at the first pause in the scroll, then each application at later ones.
        await page.waitForSelector(".application-world canvas[data-ready]", { timeout: 60000 });
        first = false;
      }
      await sleep(3200);
      const frame = await page.evaluate(() => {
        const st = document.querySelector(".application-stage").getBoundingClientRect();
        const hd = document.querySelector(".application-head").getBoundingClientRect();
        const cd = document.querySelector(".application-card").getBoundingClientRect();
        // ApplicationExplorer's frame on narrow screens: between the head and the card.
        return { x: st.left, y: st.top, w: st.width, h: st.height, box: [12, hd.bottom - st.top + 16, 12, st.bottom - cd.top + 16].map((v) => +v.toFixed(1)) };
      });
      stage = [Math.round(frame.w), Math.round(frame.h)];
      const seen = await readTags(page, ".application-world");
      const shot = await grab(page, ".application-world", frame);
      const name = `a${a}-${s}`;
      if (shot) await write(dir, name, shot);
      apps.push({ img: shot ? name : null, box: frame.box, tags: seen.map(tagAt) });
      console.log(id, "app", a, s, shot ? name : "-", `${seen.length} labels`);
    }
  }
  return { stage, apps };
}

const buckets = [];
for (const [w, h] of BUCKETS) {
  const id = `${w}x${h}`;
  const kept = oldBucket(id);
  if (ONLY && !ONLY.includes(id)) {
    if (kept) buckets.push(kept);
    continue;
  }
  const dir = path.join(OUT, id);
  if (PART === "all") fs.rmSync(dir, { recursive: true, force: true });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Linux; Android 13; RMX3771) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36");
  await page.setViewport({ width: w, height: h, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/?live3d`, { waitUntil: "load" });
  await page.waitForSelector("html.intro-seen", { timeout: 60000 });
  await page.waitForFunction(() => !!window.__live3d);
  await page.evaluate((d) => window.__live3d.dpr(d), DPR);
  // The hero's islands rise after the loader.
  await sleep(4000);
  const holds = PART === "apps" ? kept?.holds : await bakeStory(page, id, w, h, dir);
  const explorer = PART === "story" ? { stage: kept?.stage, apps: kept?.apps } : await bakeApps(page, id, dir);
  buckets.push({ id, w, h, holds, ...explorer });
  await page.close();
}
await browser.close();

buckets.sort((a, b) => BUCKETS.findIndex(([w, h]) => `${w}x${h}` === a.id) - BUCKETS.findIndex(([w, h]) => `${w}x${h}` === b.id));
// A label's markup is mostly its inline styles, built from the same few declarations for every label:
// each declaration is kept once (decls) and the markup lists the ones it uses (data-s="3,7,12"), which
// lib/stills.ts labelsOf puts back.
const decls = [];
const declIndex = new Map();
const compact = (html) =>
  html.replace(/style="([^"]*)"/g, (_, css) => {
    const ids = css
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .split(/;\s*(?![^(]*\))/)
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        if (!declIndex.has(d)) {
          declIndex.set(d, decls.length);
          decls.push(d);
        }
        return declIndex.get(d);
      });
    return `data-s="${ids.join(",")}"`;
  });
// The islands in SYSTEMS order (components/ui/systems.tsx), as their labels title them.
const NAMES = [...fs.readFileSync(path.resolve("components/ui/systems.tsx"), "utf8").matchAll(/\{ id: "[a-z]+", name: "([^"]+)"/g)].map((x) => x[1]);
const titleOf = (html) => /<i[^>]*><\/i><span>([^<]*)<\/span>/.exec(html)?.[1];
/** Each island's tap area: round the island under its pin (its label's pin in the hold's own labels). */
function setHits(b) {
  for (const hd of b.holds ?? []) {
    hd.islands?.forEach((s, i) => {
      const pin = hd.tags.find((t) => titleOf(tags[t.t]) === NAMES[i]);
      const [px, py] = pin ? [pin.x, pin.y] : s.anchor;
      s.hit = [px - 0.13 * b.w, py - 0.02 * b.h, px + 0.13 * b.w, py + 0.1 * b.h].map((v) => +v.toFixed(1));
    });
  }
}

// Each shape's data (its holds, explorer stills and own labels) goes in its own file, which a phone
// fetches once it needs that shape; the manifest keeps what choosing a shape takes.
const shapes = [];
for (const b of buckets) {
  setHits(b);
  const local = [];
  const map = new Map();
  const own = (t) => {
    if (!map.has(t.t)) {
      map.set(t.t, local.length);
      local.push(compact(tags[t.t]));
    }
    return { ...t, t: map.get(t.t) };
  };
  const holds = b.holds?.map((hd) => ({ ...hd, tags: hd.tags.map(own), islands: hd.islands?.map((s) => ({ ...s, read: s.read.map(own), tags: s.tags.map(own) })) }));
  const apps = b.apps?.map((a) => ({ ...a, tags: a.tags.map(own) }));
  fs.mkdirSync(path.join(OUT, b.id), { recursive: true });
  fs.writeFileSync(path.join(OUT, b.id, "data.json"), JSON.stringify({ id: b.id, w: b.w, h: b.h, holds, stage: b.stage, apps, tags: local }));
  shapes.push({ id: b.id, w: b.w, h: b.h, g: holds.map((hd) => hd.g), bands: holds.map((hd) => hd.band), stage: b.stage, boxes: apps?.map((a) => a.box) });
}
fs.writeFileSync(manifestPath, JSON.stringify({ v: 3, dpr: DPR, formats: ["avif", "webp"], decls, shapes }));
let bytes = 0;
for (const f of fs.readdirSync(OUT, { recursive: true })) {
  const p = path.join(OUT, f);
  if (fs.statSync(p).isFile()) bytes += fs.statSync(p).size;
}
console.log(`wrote ${manifestPath}: ${buckets.length} shapes, ${tags.length} labels, ${(bytes / 1048576).toFixed(1)} MB in all`);
