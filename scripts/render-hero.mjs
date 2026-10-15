// Renders the hero's video stand-in (components/story/HeroVideo.tsx): the 3D world as it rises in and
// lives for a few seconds, on a transparent background, at each screen shape the site keeps one for.
// The page shows it the moment it paints; the live scene starts at the first pause and takes over on
// the same frame (same clock, the islands already risen).
//
// Re-render after any change to the hero's 3D (models, colours, lights, the hero shot). Page layout
// changes need no re-render: the video is placed from the live framing (lib/framing.ts).
//
//   1. A dev server on :3000 (`npm run dev`; the dev-only hooks __three and __frame are needed).
//   2. node scripts/render-hero.mjs [shape ...]      (all shapes when none are named)
//   3. Commit public/hero/* and lib/hero-shapes.json.
//
// Needs Playwright (from the motion-render skill, ~/.claude/skills/motion-render, or PLAYWRIGHT_DIR)
// and ffmpeg with libvpx-vp9 and hevc_videotoolbox (macOS) on PATH. Time is Playwright's fake clock, so
// every frame is exact; frames go to a temp folder.
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";

const require = createRequire(join(process.env.PLAYWRIGHT_DIR ?? join(homedir(), ".claude/skills/motion-render"), "x.js"));
const { chromium } = require("playwright");

const PAGE = process.env.HERO_URL ?? "http://localhost:3000/?tier=full&nofilm";
const FPS = 30;
const SECONDS = Number(process.env.HERO_SECONDS ?? 5);
const DPR = 2;
/** Each shape is a common screen; HeroVideo picks the nearest one and maps it onto the visitor's. */
const SHAPES = [
  { name: "phone-390", w: 390, h: 844, touch: true },
  { name: "phone-412", w: 412, h: 915, touch: true },
  { name: "tablet-820", w: 820, h: 1180, touch: true },
  { name: "laptop-1280", w: 1280, h: 720 },
  { name: "desktop-1440", w: 1440, h: 900 },
  { name: "desktop-1920", w: 1920, h: 1080 },
];

const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "public/hero");
const MANIFEST = join(ROOT, "lib/hero-shapes.json");

// Only the world: every other layer hidden (its layout kept, so the framing is the page's own).
const ONLY_WORLD = `
  html, body { background: transparent !important; }
  html::before, html::after, body::before, body::after { display: none !important; }
  body * { visibility: hidden !important; }
  /* The canvas alone: the world's DOM labels (ScreenTag) stay live on top of the video. */
  .story-canvas canvas { visibility: visible !important; }
  .intro-stage { opacity: 1 !important; transform: none !important; transition: none !important; }
  nextjs-portal { display: none !important; }
`;

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });

/** The union of the frames' opaque pixels (device px): every third frame's alpha, read raw. */
function alphaBox(dir, n, w, h) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let k = 0; k < n; k += 3) {
    const a = execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", join(dir, `${String(k).padStart(4, "0")}.png`), "-vf", "alphaextract", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 28 });
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (a[row + x] < 2) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

async function render(browser, shape) {
  const ctx = await browser.newContext({
    viewport: { width: shape.w, height: shape.h },
    deviceScaleFactor: DPR,
    isMobile: !!shape.touch,
    hasTouch: !!shape.touch,
  });
  await ctx.addInitScript(() => {
    // A repeat visit: no loader curtain.
    try {
      sessionStorage.setItem("decignal:intro", "1");
    } catch {}
    window.addEventListener("scene-ready", () => (window.__ready = true));
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(`[${shape.name}] page error`, e.message));
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  // Frozen: only runFor moves time, so a slow screenshot adds nothing to the next frame.
  await page.clock.pauseAt(new Date("2026-01-01T00:00:00.100Z"));
  await page.goto(PAGE, { waitUntil: "load" });
  await page.addStyleTag({ content: ONLY_WORLD });
  const coarse = await page.evaluate(() => matchMedia("(pointer: coarse) and (hover: none)").matches);
  if (!!shape.touch !== coarse) throw new Error(`${shape.name}: touch emulation did not take (coarse ${coarse})`);

  // Until the scene has built, compiled and drawn its first frame.
  for (let i = 0; i < 600 && !(await page.evaluate(() => !!window.__ready)); i++) await page.clock.runFor(100);
  if (!(await page.evaluate(() => !!window.__ready))) throw new Error(`${shape.name}: the scene never reported ready`);

  const dir = join(tmpdir(), "decignal-hero", shape.name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // Frame 0 is the scene's first drawn frame: the islands start rising on it.
  const t0 = await page.evaluate(() => window.__three.clock.elapsedTime);
  const n = FPS * SECONDS;
  for (let k = 0; k < n; k++) {
    await page.screenshot({ path: join(dir, `${String(k).padStart(4, "0")}.png`), omitBackground: true, animations: "allow" });
    await page.clock.runFor(1000 / FPS);
  }
  const info = await page.evaluate(() => ({
    vw: document.querySelector(".story-canvas canvas")?.clientWidth ?? innerWidth,
    vh: document.querySelector(".story-canvas canvas")?.clientHeight ?? innerHeight,
    frame: window.__frame,
    gpu: (() => {
      const gl = window.__three.gl.getContext();
      const e = gl.getExtension("WEBGL_debug_renderer_info");
      return String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    })(),
  }));
  await ctx.close();
  if (!info.frame?.t) throw new Error(`${shape.name}: no framing from the scene (window.__frame.t)`);

  const box = alphaBox(dir, n, shape.w * DPR, shape.h * DPR);
  if (!box) throw new Error(`${shape.name}: no opaque pixels found`);
  // A margin round the union, in whole CSS px, on even device px (yuv420).
  const pad = 8 * DPR;
  const x = Math.max(0, box.x0 - pad) & ~1;
  const y = Math.max(0, box.y0 - pad) & ~1;
  const w = Math.min(shape.w * DPR - x, box.x1 - x + 1 + pad + 1) & ~1;
  const h = Math.min(shape.h * DPR - y, box.y1 - y + 1 + pad + 1) & ~1;
  const input = ["-framerate", String(FPS), "-i", join(dir, "%04d.png"), "-vf", `crop=${w}:${h}:${x}:${y}`];
  mkdirSync(OUT, { recursive: true });
  // Chrome, Firefox, Android: VP9 with alpha.
  ff([...input, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "28", "-row-mt", "1", "-an", join(OUT, `${shape.name}.webm`)]);
  // Safari (macOS, iOS): HEVC with alpha.
  ff([...input, "-c:v", "hevc_videotoolbox", "-alpha_quality", "0.9", "-q:v", "50", "-tag:v", "hvc1", "-pix_fmt", "bgra", "-movflags", "+faststart", "-an", join(OUT, `${shape.name}.mp4`)]);
  const size = (f) => Math.round(readFileSync(join(OUT, f)).length / 1024);
  console.log(`${shape.name}: ${w}x${h} px at ${x},${y}; webm ${size(`${shape.name}.webm`)} KB, mp4 ${size(`${shape.name}.mp4`)} KB; ${info.gpu}`);
  return {
    name: shape.name,
    vw: info.vw,
    vh: info.vh,
    // As lib/device.ts isTouchPhone and portraitWide (overlay scrollbars here: no bar to add).
    phone: !!shape.touch && info.vw < 768,
    portrait: info.vw < 768 || (info.vw < 1024 && info.vh > info.vw * 1.15),
    crop: { x: x / DPR, y: y / DPR, w: w / DPR, h: h / DPR },
    t0,
    seconds: SECONDS,
    target: info.frame.t,
    d: info.frame.d,
    version: Date.now().toString(36),
  };
}

const only = process.argv.slice(2);
const shapes = only.length ? SHAPES.filter((s) => only.includes(s.name)) : SHAPES;
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { shapes: [] };
const browser = await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const shape of shapes) {
    const entry = await render(browser, shape);
    manifest.shapes = [...manifest.shapes.filter((s) => s.name !== entry.name), entry].sort((a, b) => SHAPES.findIndex((s) => s.name === a.name) - SHAPES.findIndex((s) => s.name === b.name));
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  }
} finally {
  await browser.close();
}
