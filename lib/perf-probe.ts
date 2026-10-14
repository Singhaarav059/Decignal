// On-phone performance probe, for a phone that cannot be tethered to DevTools. Opened with ?perf
// (components/PerfProbe.tsx loads it; no other visitor downloads it). A small panel shows the live
// frame rate, and "Run test" plays the same places of the page several ways (as is, without the CSS
// effects, without the grain alone, with CSS animations held, without the 3D, without all of them),
// measuring the frame rate the phone itself reaches and how much of each second went to script and
// to style and layout on the main thread. It also says whether the 3D runs at all, and why not: the
// errors and lost contexts since the page loaded. The result is text to copy or screenshot.
import { probe } from "./pace";
import { canvasQuality } from "./device";
import type { ProbeLog } from "@/components/PerfProbe";

type Config = { name: string; css?: string; off3d?: boolean };

const HIDE_3D = ".story-canvas canvas, .application-world canvas { visibility: hidden !important; }";
const NO_EFFECTS =
  "*, *::before, *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-image: none !important; box-shadow: none !important; filter: none !important; }";
const NO_GRAIN = ":root, :root * { --lg-grain: none !important; --lg-grain-strong: none !important; --bg-grain-dark: none !important; }";
const NO_ANIMATION = "*, *::before, *::after { animation-play-state: paused !important; transition: none !important; }";

const CONFIGS: Config[] = [
  { name: "Normal" },
  { name: "Effects off", css: NO_EFFECTS },
  { name: "Grain off", css: NO_GRAIN },
  { name: "Anim off", css: NO_ANIMATION },
  { name: "3D off", off3d: true, css: HIDE_3D },
  { name: "All off", off3d: true, css: HIDE_3D + NO_EFFECTS + NO_ANIMATION },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Frame times (ms) over `ms`; with `y`, the page sways around it as a thumb would scroll it. */
function frames(ms: number, y?: number) {
  return new Promise<number[]>((done) => {
    const d: number[] = [];
    let last = performance.now();
    const t0 = last;
    const amp = window.innerHeight * 0.25;
    const f = (t: number) => {
      d.push(t - last);
      last = t;
      if (y !== undefined) window.scrollTo({ top: Math.max(0, y + amp * Math.sin(((t - t0) / 1200) * Math.PI * 2)), behavior: "instant" });
      if (t - t0 < ms) requestAnimationFrame(f);
      else done(d.slice(1));
    };
    requestAnimationFrame(f);
  });
}

const fps = (d: number[]) => (d.length ? Math.round(1000 / (d.reduce((a, b) => a + b, 0) / d.length)) : 0);

type Loaf = PerformanceEntry & {
  styleAndLayoutStart: number;
  scripts?: { duration: number; sourceURL: string; sourceFunctionName: string; invoker: string }[];
};

/** Main-thread work in long frames between a and b: script and style+layout, in ms per second. */
function work(log: ProbeLog, a: number, b: number) {
  let script = 0;
  let layout = 0;
  for (const e of log.loaf as Loaf[]) {
    if (e.startTime < a || e.startTime > b) continue;
    for (const s of e.scripts ?? []) script += s.duration;
    if (e.styleAndLayoutStart) layout += e.startTime + e.duration - e.styleAndLayoutStart;
  }
  const s = Math.max((b - a) / 1000, 0.001);
  return `js ${Math.round(script / s)} lay ${Math.round(layout / s)}`;
}

/** The scripts that held the main thread longest since load, by source. */
function topScripts(log: ProbeLog) {
  const by = new Map<string, number>();
  for (const e of log.loaf as Loaf[])
    for (const s of e.scripts ?? []) {
      const k = `${(s.sourceURL || s.invoker || "?").split("/").pop()}:${s.sourceFunctionName || s.invoker || ""}`.slice(0, 60);
      by.set(k, (by.get(k) ?? 0) + s.duration);
    }
  return [...by.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 4)
    .map(([k, v]) => `${Math.round(v)}ms ${k}`)
    .join(" | ");
}

function device(log: ProbeLog) {
  let gpu = "?";
  try {
    const c = document.createElement("canvas").getContext("webgl2");
    const e = c?.getExtension("WEBGL_debug_renderer_info");
    if (c && e) gpu = String(c.getParameter(e.UNMASKED_RENDERER_WEBGL));
    c?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // No WebGL: the 3D line says so.
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ua = navigator.userAgent.match(/Android [\d.]+|iPhone OS [\d_]+|Chrome\/\d+|Version\/[\d.]+ Mobile/g)?.join(" ") ?? "";
  const canvases = [...document.querySelectorAll("canvas")].filter((c) => c.width * c.height > 200000).map((c) => `${c.width}x${c.height}`);
  const fallback = !!document.querySelector(".scene-fallback");
  const webgl = document.documentElement.dataset.webgl === "off" ? "no WebGL" : "WebGL ok";
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return [
    `${gpu} | ${ua} | DPR ${window.devicePixelRatio} | ${window.innerWidth}x${window.innerHeight} | cores ${navigator.hardwareConcurrency} | mem ${nav.deviceMemory ?? "?"}${mem ? ` | heap ${Math.round(mem.usedJSHeapSize / 1048576)}MB` : ""}`,
    `3D: ${webgl}, ${fallback ? "FALLBACK drawing shown" : "canvas running"}, canvases ${canvases.join(" ") || "none"}, lost ${log.lost} restored ${log.restored}`,
    `errors: ${log.errors.length ? log.errors.join(" || ") : "none"}`,
    `long frames since load: ${log.loaf.length}${log.loaf.length ? `; top: ${topScripts(log)}` : ""}`,
  ].join("\n");
}

function places() {
  const story = document.getElementById("story");
  const top = story ? story.getBoundingClientRect().top + window.scrollY : 0;
  const stops = [...document.querySelectorAll<HTMLElement>(".story-stop")];
  const at = (g: number) => {
    if (!stops.length) return 0;
    const s = stops.reduce((b, e) => (Math.abs(Number(e.dataset.g) - g) < Math.abs(Number(b.dataset.g) - g) ? e : b));
    return top + s.offsetTop;
  };
  const apps = document.querySelector(".application-journey");
  const list: [string, number][] = [
    ["hero", 0],
    ["decision", at(4.415)],
  ];
  if (apps) list.push(["apps", apps.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.6]);
  return list;
}

export function startProbe(log: ProbeLog) {
  const html = document.documentElement;
  const box = document.createElement("div");
  box.setAttribute("style", "position:fixed;left:8px;right:8px;top:72px;z-index:2147483647;font:11px/1.35 ui-monospace,Menlo,monospace;color:#fff;background:rgb(0 0 0/.85);border-radius:12px;padding:10px;pointer-events:auto;max-height:72vh;overflow:auto;white-space:pre-wrap;word-break:break-word");
  const meterEl = document.createElement("div");
  const line = document.createElement("div");
  line.textContent = "Wait for the page to settle, then Run test: about 1 minute, keep the phone still and the screen on";
  const out = document.createElement("div");
  const bar = document.createElement("div");
  bar.setAttribute("style", "display:flex;gap:8px;margin-top:8px");
  const btn = (label: string) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.setAttribute("style", "flex:1;padding:8px;border-radius:8px;background:#fff;color:#000;font:inherit");
    bar.appendChild(b);
    return b;
  };
  const run = btn("Run test");
  const copy = btn("Copy");
  const hide = btn("Hide");
  box.append(meterEl, line, out, bar);
  document.body.appendChild(box);

  // Live meter: frame rate and the slowest frame of the last two seconds.
  let testing = false;
  let raf = 0;
  const recent: [number, number][] = [];
  let prev = performance.now();
  const meter = (t: number) => {
    recent.push([t, t - prev]);
    prev = t;
    while (recent.length && t - recent[0][0] > 2000) recent.shift();
    if (recent.length > 2) {
      const d = recent.map((r) => r[1]);
      meterEl.textContent = `live ${fps(d)} fps, slowest ${Math.round(Math.max(...d))} ms`;
    }
    raf = requestAnimationFrame(meter);
  };
  raf = requestAnimationFrame(meter);

  let text = "";
  const show = (s: string) => {
    text = s;
    out.textContent = s;
  };
  show(device(log));

  run.onclick = async () => {
    if (testing) return;
    testing = true;
    run.disabled = true;
    const style = document.createElement("style");
    document.head.appendChild(style);
    // Snapping and the chapter guard step aside, as for a jump.
    html.dataset.jump = "probe";
    const quality = canvasQuality();
    window.scrollTo({ top: 0, behavior: "instant" });
    await wait(1200);
    const i0 = performance.now();
    const idle = fps(await frames(1500));
    const head = `${device(log)}\nidle at top ${idle} fps (${work(log, i0, performance.now())} ms/s)\nper place rest/move fps, then main-thread ms per second:`;
    const rows: string[] = [];
    try {
      for (let c = 0; c < CONFIGS.length; c++) {
        const cfg = CONFIGS[c];
        style.textContent = cfg.css ?? "";
        probe.off3d = !!cfg.off3d;
        const cells: string[] = [];
        const a = performance.now();
        for (const [name, y] of places()) {
          line.textContent = `testing ${c + 1}/${CONFIGS.length} ${cfg.name}: ${name}… keep the phone still`;
          window.scrollTo({ top: y, behavior: "instant" });
          await wait(1200);
          const rest = await frames(1200);
          const move = await frames(1500, y);
          cells.push(`${name} ${fps(rest)}/${fps(move)}`);
        }
        // Long-frame entries arrive a little after their frame.
        await wait(150);
        rows.push(`${cfg.name.padEnd(11)} ${cells.join(" · ")} | ${work(log, a, performance.now())}`);
        show(`${head}\n${rows.join("\n")}`);
      }
    } finally {
      style.remove();
      probe.off3d = false;
      probe.dprSetters.forEach((set) => set(quality.dpr));
      delete html.dataset.jump;
      window.scrollTo({ top: 0, behavior: "instant" });
      testing = false;
      run.disabled = false;
      line.textContent = "done: tap Copy and paste it, or take a screenshot";
    }
  };
  copy.onclick = () => {
    void navigator.clipboard?.writeText(text).then(
      () => (copy.textContent = "Copied"),
      () => (copy.textContent = "Copy failed"),
    );
  };
  hide.onclick = () => {
    box.style.display = "none";
  };

  return () => {
    cancelAnimationFrame(raf);
    box.remove();
  };
}
