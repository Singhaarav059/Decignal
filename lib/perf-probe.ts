// On-phone performance probe, for a phone that cannot be tethered to DevTools. Opened with ?perf
// (components/PerfProbe.tsx loads it; no other visitor downloads it). A small panel shows the live
// frame rate while the page is used, and "Run test" plays the same places of the page five ways
// (as is, the 3D live or as stills, without the 3D, the 3D at 1x, without the CSS effects, without both) and measures the frame
// rate the phone itself reaches, so the part that costs it shows on the real GPU. The result is
// text to copy or screenshot.
import { probe } from "./pace";
import { canvasQuality } from "./device";

type Config = { name: string; css?: string; off3d?: boolean; dpr?: number; still?: boolean };

const HIDE_3D = ".story-canvas canvas, .application-world canvas { visibility: hidden !important; }";
const NO_EFFECTS =
  "*, *::before, *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; background-image: none !important; box-shadow: none !important; filter: none !important; }";

const CONFIGS: Config[] = [
  { name: "Normal" },
  // The story drawn live through every move, or only at its holds (the phone still mode).
  { name: "Live 3D", still: false },
  { name: "Still 3D", still: true },
  { name: "3D off", off3d: true, css: HIDE_3D },
  { name: "3D at 1x", dpr: 1 },
  { name: "Effects off", css: NO_EFFECTS },
  { name: "All off", off3d: true, css: HIDE_3D + NO_EFFECTS },
];

/** The phone still mode's switch, where the build has one (lib/pace.ts). */
const flags = probe as typeof probe & { still?: boolean };
const configs = () => CONFIGS.filter((c) => c.still === undefined || "still" in flags);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Frame times (ms) over `ms`; while `move`, the page sways around y as a thumb would scroll it. */
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
const p95 = (d: number[]) => {
  const s = [...d].sort((a, b) => a - b);
  return s.length ? Math.round(s[Math.floor(s.length * 0.95)]) : 0;
};

function device() {
  let gpu = "?";
  try {
    const c = document.createElement("canvas").getContext("webgl2");
    const e = c?.getExtension("WEBGL_debug_renderer_info");
    if (c && e) gpu = String(c.getParameter(e.UNMASKED_RENDERER_WEBGL));
    c?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // No WebGL: the result says so.
  }
  const cv = document.querySelector<HTMLCanvasElement>(".story-canvas canvas");
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ua = navigator.userAgent.match(/Android [\d.]+|iPhone OS [\d_]+|Chrome\/\d+|Version\/[\d.]+ Mobile/g)?.join(" ") ?? "";
  return `${gpu} | ${ua} | DPR ${window.devicePixelRatio} | ${window.innerWidth}x${window.innerHeight} | cores ${navigator.hardwareConcurrency} | mem ${nav.deviceMemory ?? "?"} | 3D ${cv ? `${cv.width}x${cv.height}` : "none"}`;
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
    ["context", at(3.3)],
    ["decision", at(4.415)],
  ];
  if (apps) list.push(["apps", apps.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.6]);
  return list;
}

export function startProbe() {
  const html = document.documentElement;
  const box = document.createElement("div");
  box.setAttribute("style", "position:fixed;left:8px;right:8px;top:72px;z-index:2147483647;font:12px/1.4 ui-monospace,Menlo,monospace;color:#fff;background:rgb(0 0 0/.82);border-radius:12px;padding:10px;pointer-events:auto;max-height:70vh;overflow:auto;white-space:pre-wrap");
  const meterEl = document.createElement("div");
  const line = document.createElement("div");
  line.textContent = "Run test: about 3 minutes, keep the phone still and the screen on";
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

  let about = device();
  let text = "";
  const show = (s: string) => {
    text = s;
    out.textContent = s;
  };
  show(about);

  run.onclick = async () => {
    if (testing) return;
    testing = true;
    run.disabled = true;
    about = device();
    const style = document.createElement("style");
    document.head.appendChild(style);
    // Snapping and the chapter guard step aside, as for a jump.
    html.dataset.jump = "probe";
    const quality = canvasQuality();
    const stillDefault = flags.still;
    const list = configs();
    const idle = fps(await frames(1000));
    const rows: string[] = [];
    try {
      for (let c = 0; c < list.length; c++) {
        const cfg = list[c];
        style.textContent = cfg.css ?? "";
        probe.off3d = !!cfg.off3d;
        if ("still" in flags) flags.still = cfg.still ?? stillDefault;
        probe.dprSetters.forEach((set) => set(cfg.dpr ?? quality.dpr));
        const cells: string[] = [];
        const moves: number[] = [];
        for (const [name, y] of places()) {
          line.textContent = `testing ${c + 1}/${list.length} ${cfg.name}: ${name}… keep the phone still`;
          window.scrollTo({ top: y, behavior: "instant" });
          await wait(1800);
          const rest = await frames(1500);
          const move = await frames(2000, y);
          moves.push(...move);
          cells.push(`${name} ${fps(rest)}/${fps(move)}`);
        }
        rows.push(`${cfg.name.padEnd(11)} ${cells.join(" · ")} | move p95 ${p95(moves)}ms`);
        show(`${about}\nscreen ~${idle} fps when idle\nrest/move fps per place:\n${rows.join("\n")}`);
      }
    } finally {
      style.remove();
      probe.off3d = false;
      if ("still" in flags) flags.still = stillDefault;
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
