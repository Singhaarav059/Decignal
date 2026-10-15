// The hero's video stand-in (components/story/HeroVideo.tsx; rendered by scripts/render-hero.mjs). As
// on morphowater.com and studiomirage.io, the first screen plays a recorded film of the world the moment
// it paints, on any device; here the live 3D, warming up meanwhile (its actors and uploads at pauses in
// the scroll), takes over on the very frame the film shows: its clock set to the film's, its islands as far risen. Shared with the scene,
// so nothing here loads three.js.
import shapes from "./hero-shapes.json";
import { CH } from "./story";
import { ISO_DIR, ISO_R, ISO_U, makeShot, shotAt, type Shot } from "./scene";
import { TAN, frameShot, framed, measurePage, setHeldNow, setTall, type Framed } from "./framing";
import { isTouchPhone, portraitWide, tallTouch } from "./device";

export type HeroShape = {
  name: string;
  vw: number;
  vh: number;
  /** Filmed as a touch phone (its lighter materials and maps, lib/device.ts isTouchPhone). */
  phone: boolean;
  /** Filmed in the portrait layout (lib/device.ts portraitWide): the islands stand in another order. */
  portrait: boolean;
  /** The film's frame inside its screen, in CSS px. */
  crop: { x: number; y: number; w: number; h: number };
  /** The scene clock on the film's first frame (s). */
  t0: number;
  seconds: number;
  /** The hero framing on its screen: the camera's target and distance. */
  target: [number, number, number];
  d: number;
  /** Changes with each render, so a browser never shows a cached old film. */
  version: string;
};

const SHAPES = (shapes as unknown as { shapes: HeroShape[] }).shapes;

/** The scene's frames on the film's first frame: the islands had risen this long (s) when it was taken. */
const RISE_LEAD = 3 / 60;
/** A film is drawn at most this much larger than it was filmed (it is filmed at 2x), else it reads soft. */
const MAX_UP = 1.1;
/** With no film that close, the largest one, up to this. */
const MAX_UP_ANY = 1.35;

type State = "off" | "on" | "handoff" | "gone";
export const hero = {
  state: "off" as State,
  video: null as HTMLVideoElement | null,
  shape: null as HeroShape | null,
  /** Set at the hand-off: how long the film's islands had been rising (s); the live ones start there. */
  rise: null as number | null,
};

const shot = makeShot();
const live = framed();

/** The hero as the Rig frames it at rest (components/three/Scene.tsx): its chapter holding, the card
 *  where it is. `vw`, `vh`: the story canvas's size. */
export function heroFraming(vw: number, vh: number): { live: Framed; shot: Shot } {
  measurePage();
  setTall(tallTouch(vw, vh));
  setHeldNow(CH.fragments);
  frameShot(shotAt(CH.fragments, 0, portraitWide(vw, vh), shot), CH.fragments, vw, vh, false, live);
  return { live, shot };
}

/** How much larger than filmed a shape's film is drawn on this screen. */
const upscale = (s: HeroShape, vh: number, d: number) => vh / d / (s.vh / s.d);

type Plan = { shape: HeroShape; src: string } | null;
let plan: Plan | undefined;

/**
 * The film this screen gets, decided once: of the films taken with the same materials (phone or not)
 * and layout (portrait or not), the smallest that is drawn at most 10% larger than filmed. None with
 * reduced motion (the world is simply in place), where no film is close, or where the browser cannot
 * play one with a clear background: every WebKit browser (Safari, any browser on an iPhone) plays
 * HEVC with alpha, the rest VP9 with alpha. Chrome on a Mac plays HEVC too, but without its alpha,
 * hence the vendor and not canPlayType. `?nofilm` turns it off, to compare.
 */
export function filmPlan(): Plan {
  if (plan !== undefined) return plan;
  if (typeof window === "undefined") return null;
  plan = null;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || new URLSearchParams(location.search).has("nofilm")) return plan;
  const host = document.querySelector<HTMLElement>(".story-canvas");
  const vw = host?.clientWidth || innerWidth;
  const vh = host?.clientHeight || innerHeight;
  const phone = isTouchPhone();
  const portrait = portraitWide(vw, vh);
  const fits = SHAPES.filter((s) => s.phone === phone && s.portrait === portrait);
  if (!fits.length) return plan;
  const { d } = heroFraming(vw, vh).live;
  const up = (s: HeroShape) => upscale(s, vh, d);
  const close = fits.filter((s) => up(s) <= MAX_UP).sort((a, b) => up(b) - up(a));
  const shape = close[0] ?? fits.sort((a, b) => up(a) - up(b)).find((s) => up(s) <= MAX_UP_ANY);
  if (!shape) return plan;
  const apple = navigator.vendor === "Apple Computer, Inc.";
  const probe = document.createElement("video");
  if (!probe.canPlayType(apple ? 'video/mp4; codecs="hvc1"' : 'video/webm; codecs="vp9"')) return plan;
  plan = { shape, src: `/hero/${shape.name}.${apple ? "mp4" : "webm"}?v=${shape.version}` };
  return plan;
}

/** A world point on a screen framed at (t, d), in CSS px (as lib/framing.ts project). */
function onScreen(x: number, y: number, z: number, t: readonly number[], d: number, vw: number, vh: number) {
  const vx = x - (t[0] + ISO_DIR[0] * d);
  const vy = y - (t[1] + ISO_DIR[1] * d);
  const vz = z - (t[2] + ISO_DIR[2] * d);
  const depth = -(vx * ISO_DIR[0] + vy * ISO_DIR[1] + vz * ISO_DIR[2]);
  return [
    (vw / 2) * (1 + (vx * ISO_R[0] + vy * ISO_R[1] + vz * ISO_R[2]) / (depth * TAN * (vw / vh))),
    (vh / 2) * (1 - (vx * ISO_U[0] + vy * ISO_U[1] + vz * ISO_U[2]) / (depth * TAN)),
  ];
}

/** The 3x3 map (h33 = 1) taking each `from` point to its `to` point: four pairs, solved directly. */
function homography(from: number[][], to: number[][]) {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i];
    const [u, v] = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  // Gauss-Jordan with partial pivoting on the 8x9 system.
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const k = A[r][c] / A[c][c];
      for (let j = c; j < 9; j++) A[r][j] -= k * A[c][j];
    }
  }
  return A.map((row, i) => row[8] / A[i][i]);
}

/**
 * The CSS transform that lays the film's frame onto this screen so the world's ground, where every
 * island stands, lands exactly where this screen's camera draws it. The film was taken from another
 * distance, so a plain scale left the far islands a few pixels high and the near ones low; the ground
 * mapped from one view to the other (a perspective transform) puts every pad in place, and only the
 * tops of the buildings keep a trace of the other perspective.
 */
export function filmTransform(s: HeroShape, f: Framed, sh: Shot, vw: number, vh: number) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  let g = Infinity;
  for (let n = 0; n < sh.n; n++) {
    const o = n * 5;
    x0 = Math.min(x0, sh.pil[o] - sh.pil[o + 2]);
    x1 = Math.max(x1, sh.pil[o] + sh.pil[o + 2]);
    z0 = Math.min(z0, sh.pil[o + 1] - sh.pil[o + 2]);
    z1 = Math.max(z1, sh.pil[o + 1] + sh.pil[o + 2]);
    g = Math.min(g, sh.pil[o + 3]);
  }
  const ground = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  const t = [f.x, f.y, f.z];
  const from = ground.map(([x, z]) => {
    const [px, py] = onScreen(x, g, z, s.target, s.d, s.vw, s.vh);
    return [px - s.crop.x, py - s.crop.y];
  });
  const to = ground.map(([x, z]) => onScreen(x, g, z, t, f.d, vw, vh));
  const [a, b, c, d, e, h, p, q] = homography(from, to);
  return `matrix3d(${a},${d},0,${p},${b},${e},0,${q},0,0,1,0,${c},${h},0,1)`;
}

/**
 * The live scene has warmed up while the film shows the hero (Scene Warmup): from here it fades in
 * over the film. Returns the scene clock that matches the film's frame (s), or null when the film is
 * not showing (no film, or the reader already scrolled on), and the scene starts as it always did.
 */
export function heroHandoff() {
  const v = hero.video;
  if (hero.state !== "on" || !v || !hero.shape) return null;
  hero.state = "handoff";
  hero.rise = v.currentTime + RISE_LEAD;
  return hero.shape.t0 + v.currentTime;
}
