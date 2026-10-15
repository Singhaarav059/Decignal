// Stage framing for the 3D story, without three.js: the scene's camera (components/three/Scene.tsx Rig)
// and the hero's video stand-in (components/story/HeroVideo.tsx) frame the world with the same code, so
// the video sits exactly where the live world will be drawn.
import { CHAPTERS, CH, EXIT_DRIFT, store } from "./story";
import { IND_BESIDE_MIN, ISO_DIR, ISO_R, ISO_U, indLayout, type Shot } from "./scene";
import { mediaWidth } from "./device";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/* ------------------------------------------------------------------ */
/* Stage framing: fit each chapter's subject into the screen area the  */
/* copy leaves free, in pixels, at the one ISO angle.                   */
/* ------------------------------------------------------------------ */

export type Box = { x0: number; y0: number; x1: number; y1: number };
export const box = (): Box => ({ x0: 0, y0: 0, x1: 0, y1: 0 });
export const FOV = 26;
// As THREE.MathUtils.degToRad, to the last digit.
export const TAN = Math.tan((FOV / 2) * (Math.PI / 180));
export const [DX, DY, DZ] = ISO_DIR;
const [RX, , RZ] = ISO_R;
export const [UX, UY, UZ] = ISO_U;
const FX = Math.sin(Math.atan2(DX, DZ));
const FZ = Math.cos(Math.atan2(DX, DZ));

/** What the page measured: the nav's bottom edge, the giant headlines (hero and final), the blocks
 *  around them the world keeps clear of one by one ([data-frame]: the hero's corners), and the
 *  Industries callout, whose right edge starts that chapter's stage. */
export const page = { navB: 72, head: [] as (Box | null)[], frames: [] as Box[][], at: 0, callout: null as Box | null };
/** The card's rect as last seen while each chapter held (the card's content changes height per chapter). */
export const cardSeen: (Box | null)[] = CHAPTERS.map(() => null);

export function measurePage() {
  page.at = performance.now();
  const nav = document.querySelector(".nav-shell");
  if (nav) {
    const r = nav.getBoundingClientRect();
    if (r.height > 0 && r.bottom > 0) page.navB = Math.min(r.bottom, 120);
  }
  page.head = CHAPTERS.map(() => null);
  page.frames = CHAPTERS.map(() => []);
  const callout = document.querySelector(".ind-callout")?.getBoundingClientRect();
  page.callout = callout && callout.width > 0 ? { x0: callout.left, y0: callout.top, x1: callout.right, y1: callout.bottom } : null;
  document.querySelectorAll<HTMLElement>("[data-ch] .t-display, [data-ch] .display, [data-ch] h1, [data-ch] [data-frame], [data-ch] [data-head]").forEach((el) => {
    const c = Number(el.closest<HTMLElement>("[data-ch]")?.dataset.ch);
    // A chapter head (ChapterHeads.tsx) counts as one block: its headline and its figures together.
    const head = el.dataset.head !== undefined;
    if (!head && el.closest("[data-head]")) return;
    if (!(c === CH.fragments || c === CH.final || head)) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    if (el.dataset.frame !== undefined) {
      page.frames[c].push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
      return;
    }
    const h = page.head[c];
    if (h) {
      h.x0 = Math.min(h.x0, r.left);
      h.y0 = Math.min(h.y0, r.top);
      h.x1 = Math.max(h.x1, r.right);
      h.y1 = Math.max(h.y1, r.bottom);
    } else page.head[c] = { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom };
  });
}

/** Each chapter's card height (px), as StoryCard publishes them on the overlay; 0 until known. */
const cardH = CHAPTERS.map(() => 0);
const H_VARS = CHAPTERS.map((_, k) => `--story-card-h-${k}`);
export let heightsAt = -1e9;
/** The chapter whose card shows now, with no hand-off under way (its live rect is exact), or -1. */
let heldNow = -1;
export const setHeldNow = (c: number) => void (heldNow = c);

export function readCardHeights(now: number) {
  heightsAt = now;
  const el = document.querySelector<HTMLElement>(".story-overlay");
  if (!el) return;
  for (let k = 0; k < H_VARS.length; k++) {
    const v = parseFloat(el.style.getPropertyValue(H_VARS[k]));
    if (v > 0) cardH[k] = v;
  }
}

/** Chapter c's card: the live rect while c holds; otherwise c's own height on the live card's footprint
 *  (the card keeps its left, width and bottom; only its height changes between chapters). */
function cardFor(c: number, vw: number, vh: number, out: Box) {
  const live = store.cardRect;
  if (live) {
    out.x0 = live.x;
    out.x1 = live.x + live.w;
    out.y1 = live.y + live.h;
    if (heldNow === c) out.y0 = live.y;
    else if (cardH[c] > 0) out.y0 = out.y1 - cardH[c];
    else out.y0 = cardSeen[c]?.y0 ?? live.y;
    return;
  }
  const seen = cardSeen[c];
  if (seen) {
    out.x0 = seen.x0;
    out.y0 = seen.y0;
    out.x1 = seen.x1;
    out.y1 = seen.y1;
  } else cardGuess(c, vw, vh, out);
}

const gutterOf = (vw: number) => clamp(vw * 0.05, 20, 72);
/** --edge from the tokens: the gutter, or the margin of the 71rem grid. */
const edgeOf = (vw: number) => Math.max(gutterOf(vw), (vw - 1136) / 2);

/** An open system panel (IslandPanel): 360 wide at the right edge, or a sheet along the bottom on phones. */
const panelSeen = { h: 0 };
export function measurePanel() {
  const el = document.querySelector<HTMLElement>(".island-panel");
  if (el && el.offsetHeight > 0) panelSeen.h = el.offsetHeight;
}

/** The card where the tokens put it, until the StoryCard reports its own rect. */
function cardGuess(c: number, vw: number, vh: number, out: Box) {
  const phone = mediaWidth(vw) < 768;
  const gutter = gutterOf(vw);
  const edge = edgeOf(vw);
  const w = Math.min(440, vw - 2 * gutter);
  const b = phone ? 16 : 32;
  const h = c === CH.fragments ? (phone ? 170 : 150) : phone ? Math.min(330, vh * 0.4) : Math.min(320, vh * 0.36);
  out.x0 = edge;
  out.x1 = edge + w;
  out.y1 = vh - b;
  out.y0 = vh - b - h;
}

/** Screen bbox (px) of pillars [from, to) of a shot, seen from target (tx, ty, tz) at distance d. */
function project(s: Shot, from: number, to: number, tx: number, ty: number, tz: number, d: number, vw: number, vh: number, out: Box) {
  const px = tx + DX * d;
  const py = ty + DY * d;
  const pz = tz + DZ * d;
  const aspect = vw / vh;
  out.x0 = out.y0 = Infinity;
  out.x1 = out.y1 = -Infinity;
  for (let n = from; n < Math.min(to, s.n); n++) {
    const o = n * 5;
    const x = s.pil[o];
    const z = s.pil[o + 1];
    const r = s.pil[o + 2];
    for (let q = 0; q < 8; q++) {
      const y = q < 4 ? s.pil[o + 3] : s.pil[o + 4];
      const side = q & 3;
      // Extremes along the screen's right axis and along the ground toward the viewer.
      const ax = side === 0 ? r : side === 1 ? -r : 0;
      const af = side === 2 ? r : side === 3 ? -r : 0;
      const vx = x + ax * RX + af * FX - px;
      const vy = y - py;
      const vz = z + ax * RZ + af * FZ - pz;
      const depth = -(vx * DX + vy * DY + vz * DZ);
      if (depth < 0.1) continue;
      const sx = (vw / 2) * (1 + (vx * RX + vz * RZ) / (depth * TAN * aspect));
      const sy = (vh / 2) * (1 - (vx * UX + vy * UY + vz * UZ) / (depth * TAN));
      if (sx < out.x0) out.x0 = sx;
      if (sx > out.x1) out.x1 = sx;
      if (sy < out.y0) out.y0 = sy;
      if (sy > out.y1) out.y1 = sy;
    }
  }
}

const EX = [box(), box(), box(), box(), box()];
let nEx = 0;
const stage = box();
/** Each pillar's screen rect relative to the subject's centre (x0, y0, x1, y1 per pillar). */
const rel = new Float64Array(4 * 16);
const spot = { x: 0, y: 0 };
/** Cost of a sideways move against a lift: a subject under a headline reads better lifted; one beside
 *  the bottom-left card reads better moved right than pushed up toward the nav. */
const SIDE = 1.5;
const SIDE_CARD = 0.8;
/** Whether EX[0] is the card (phones drop it and end the stage above the card instead). */
let cardEx = false;
/** The wide hero keeps its centre line: the subject lifts or drops to clear a corner, never slides. */
let centreLock = false;
/** An upright touch tablet at desktop width (lib/device.ts tallTouch), read once per frame by Rig. */
let tall = false;
/** The Rig sets it each frame (lib/device.ts tallTouch). */
export const setTall = (v: boolean) => void (tall = v);
/** Dev only: the last framing, for the review scripts (window.__frame). */
const debug: Record<string, unknown> | null = process.env.NODE_ENV !== "production" && typeof window !== "undefined" ? ((window as unknown as { __frame: Record<string, unknown> }).__frame = {}) : null;

/**
 * Centre (into spot) for the subject at scale f: inside the stage, nearest the ideal point, with no
 * pillar under an exclusion. The subject's empty corners may pass over the card; its objects may not.
 */
function place(n: number, f: number, hw: number, hh: number, ix: number, iy: number) {
  const minX = stage.x0 + hw * f;
  const maxX = stage.x1 - hw * f;
  const minY = stage.y0 + hh * f;
  const maxY = stage.y1 - hh * f;
  if (minX > maxX + 0.5 || minY > maxY + 0.5) return false;
  let qx = clamp(ix, minX, Math.max(minX, maxX));
  let qy = clamp(iy, minY, Math.max(minY, maxY));
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (let k = 0; k < nEx; k++) {
      const e = EX[k];
      let any = false;
      let sR = 0;
      let sL = 0;
      let sU = 0;
      let sD = 0;
      for (let p = 0; p < n; p++) {
        const x0 = qx + rel[p * 4] * f;
        const y0 = qy + rel[p * 4 + 1] * f;
        const x1 = qx + rel[p * 4 + 2] * f;
        const y1 = qy + rel[p * 4 + 3] * f;
        if (x0 >= e.x1 || x1 <= e.x0 || y0 >= e.y1 || y1 <= e.y0) continue;
        any = true;
        sR = Math.max(sR, e.x1 - x0);
        sL = Math.max(sL, x1 - e.x0);
        sU = Math.max(sU, y1 - e.y0);
        sD = Math.max(sD, e.y1 - y0);
      }
      if (!any) continue;
      // The smallest move that clears this exclusion and stays on the stage. Sideways moves cost a
      // little more: a subject centred under its headline reads better lifted than pushed aside.
      let best = Infinity;
      let bx = qx;
      let by = qy;
      const side = k === 0 && cardEx ? SIDE_CARD : SIDE;
      // Plain assignments (no array destructuring): this runs many times per frame.
      if (!centreLock && qx + sR <= maxX + 0.5 && sR * side < best) {
        best = sR * side;
        bx = qx + sR;
        by = qy;
      }
      if (!centreLock && qx - sL >= minX - 0.5 && sL * side < best) {
        best = sL * side;
        bx = qx - sL;
        by = qy;
      }
      if (qy - sU >= minY - 0.5 && sU < best) {
        best = sU;
        bx = qx;
        by = qy - sU;
      }
      if (qy + sD <= maxY + 0.5 && sD < best) {
        best = sD;
        bx = qx;
        by = qy + sD;
      }
      if (best === Infinity) return false;
      qx = bx;
      qy = by;
      moved = true;
    }
    if (!moved) {
      spot.x = qx;
      spot.y = qy;
      return true;
    }
  }
  return false;
}

/** Fills the stage and exclusions for chapter c: the card and the giant headline; an open panel shrinks the stage. */
function setStage(c: number, vw: number, vh: number, panel: boolean) {
  const phone = mediaWidth(vw) < 768;
  // Phones keep the page's gutter at the sides, so the world lines up with the copy: at 10px its
  // buildings and rings ran right up to the screen edge.
  const m = phone ? gutterOf(vw) : 24;
  stage.x0 = m;
  stage.x1 = vw - m;
  // Room under the nav for a pin's label above the subject.
  stage.y0 = page.navB + (phone ? 8 : 16);
  stage.y1 = vh - m;
  nEx = 0;
  const gap = phone ? 10 : 24;
  const e = EX[nEx++];
  cardFor(c, vw, vh, e);
  e.x0 -= gap;
  e.y0 -= gap;
  e.x1 += gap;
  e.y1 += gap;
  cardEx = true;
  // A card across most of the width (phones, tablets upright): the stage simply ends above it; the
  // strip beside it is too narrow to hold a subject. A tall tablet's card is half the width, but the
  // band above it is far larger than the strip beside it.
  if (e.x1 - e.x0 > vw * 0.6 || (tall && c !== CH.fragments && c !== CH.final)) {
    stage.y1 = Math.min(stage.y1, e.y0);
    nEx = 0;
    cardEx = false;
  }
  // Wide screens show no card in the hero or the ending (StoryCard data-away): their corners and the
  // closing bar are frames instead.
  if ((c === CH.fragments || c === CH.final) && mediaWidth(vw) >= 1024) {
    nEx = 0;
    cardEx = false;
  }
  const head = page.head[c];
  if (head) {
    const hEx = EX[nEx++];
    hEx.x0 = head.x0 - 16;
    hEx.y0 = 0;
    hEx.x1 = head.x1 + 16;
    hEx.y1 = head.y1 + (phone ? 12 : 20);
    // A centred headline across the screen, or the hero's centred head: the stage starts under it.
    if ((hEx.x0 < vw * 0.25 && hEx.x1 > vw * 0.75) || c === CH.fragments || (c === CH.final && mediaWidth(vw) >= 1024)) {
      stage.y0 = Math.max(stage.y0, hEx.y1);
      nEx--;
    }
  }
  // Industries: the callout stands beside the card on wide screens, so the stage starts at its right
  // edge; on narrow ones it stands under the nav, so the stage starts below it. As an exclusion inside
  // the stage it left two ways round it (move right, or shrink and lift), and the framing swapped
  // between them from one scroll step to the next: the place pumped in and out.
  if (c === CH.industries && page.callout) {
    indLayout.under = false;
    // A tall tablet: the callout stands beside the card, and the place in the band above both.
    if (tall) stage.y1 = Math.min(stage.y1, page.callout.y0 - gap);
    else if (mediaWidth(vw) >= IND_BESIDE_MIN) {
      // Below 1440px the slot beside the callout narrows to a sliver (125px at 1024): the place shrank
      // into it. There the stage is the space right of the card and under the callout instead, when a
      // place (about 1.25 wide to 1 tall) comes out larger in it. Chosen by the layout alone, so it
      // holds through the chapter; wide screens keep the slot beside.
      const right = vw - m;
      const sBeside = Math.min((right - page.callout.x1 - gap) / 1.25, stage.y1 - stage.y0);
      const sUnder = Math.min((right - e.x1) / 1.25, stage.y1 - page.callout.y1 - gap);
      indLayout.under = cardEx && mediaWidth(vw) < 1440 && sUnder > sBeside * 1.1;
      if (indLayout.under) {
        stage.x0 = Math.max(stage.x0, e.x1);
        stage.y0 = Math.max(stage.y0, page.callout.y1 + gap);
      } else {
        stage.x0 = Math.max(stage.x0, page.callout.x1 + gap);
        // In that narrower slot the place fills the width, and the factory's silo (just past its
        // measured reach) touched the screen's edge: a little more room on the right.
        if (mediaWidth(vw) < 1440) stage.x1 = Math.min(stage.x1, right - 20);
      }
    }
    else stage.y0 = Math.max(stage.y0, page.callout.y1 + gap);
  }
  for (const f of page.frames[c] ?? []) {
    if (nEx >= EX.length) break;
    const fEx = EX[nEx++];
    fEx.x0 = f.x0 - 16;
    fEx.y0 = f.y0 - gap;
    fEx.x1 = f.x1 + 16;
    fEx.y1 = f.y1 + gap;
  }
  if (panel) {
    // An open system panel (app/styles/story.css .island-panel): 360 wide at the right edge, or a
    // sheet along the bottom on phones.
    if (!phone) stage.x1 = Math.min(stage.x1, vw - edgeOf(vw) - 360 - gap);
    else stage.y1 = Math.min(stage.y1, vh - 16 - (panelSeen.h || Math.min(340, vh * 0.45)) - gap);
  }
}

const bb = box();
export type Framed = { x: number; y: number; z: number; d: number };
export const framed = (): Framed => ({ x: 0, y: 0, z: 0, d: 10 });

/** Target and distance that put shot s, as large as it can be up to its own distance, in the free stage. */
export function frameShot(s: Shot, c: number, vw: number, vh: number, panel: boolean, out: Framed) {
  setStage(c, vw, vh, panel);
  // A shot that lives right of the card (open 1: Scale's hand) gets the stage from the card's edge
  // rather than the card as an exclusion in it: with the card inside the stage there were two ways
  // round it (shift right, or lift), and the framing swapped between them from step to step.
  if (s.open >= 1 && nEx > 0 && cardEx && EX[0].x1 < vw * 0.6) {
    stage.x0 = Math.max(stage.x0, EX[0].x1);
    const first = EX[0];
    for (let k = 1; k < nEx; k++) EX[k - 1] = EX[k];
    EX[nEx - 1] = first;
    nEx--;
    cardEx = false;
  }
  // Subject centre.
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let n = 0; n < s.n; n++) {
    const o = n * 5;
    x0 = Math.min(x0, s.pil[o] - s.pil[o + 2]);
    x1 = Math.max(x1, s.pil[o] + s.pil[o + 2]);
    z0 = Math.min(z0, s.pil[o + 1] - s.pil[o + 2]);
    z1 = Math.max(z1, s.pil[o + 1] + s.pil[o + 2]);
    y0 = Math.min(y0, s.pil[o + 3]);
    y1 = Math.max(y1, s.pil[o + 4]);
  }
  let tx = (x0 + x1) / 2;
  let ty = (y0 + y1) / 2;
  let tz = (z0 + z1) / 2;
  const d0 = s.dist;
  // Each pillar's rect, then the whole subject's.
  bb.x0 = bb.y0 = Infinity;
  bb.x1 = bb.y1 = -Infinity;
  const n = Math.min(s.n, 16);
  for (let p = 0; p < n; p++) {
    project(s, p, p + 1, tx, ty, tz, d0, vw, vh, pr);
    rel[p * 4] = pr.x0;
    rel[p * 4 + 1] = pr.y0;
    rel[p * 4 + 2] = pr.x1;
    rel[p * 4 + 3] = pr.y1;
    bb.x0 = Math.min(bb.x0, pr.x0);
    bb.y0 = Math.min(bb.y0, pr.y0);
    bb.x1 = Math.max(bb.x1, pr.x1);
    bb.y1 = Math.max(bb.y1, pr.y1);
  }
  const bcx = (bb.x0 + bb.x1) / 2;
  const bcy = (bb.y0 + bb.y1) / 2;
  for (let p = 0; p < n; p++) {
    rel[p * 4] -= bcx;
    rel[p * 4 + 1] -= bcy;
    rel[p * 4 + 2] -= bcx;
    rel[p * 4 + 3] -= bcy;
  }
  const hw = (bb.x1 - bb.x0) / 2;
  const hh = (bb.y1 - bb.y0) / 2;
  // Ideal centre: the stage's middle, drawn toward the open space right of the card (halfway, unless
  // the shot asks for more).
  let ix = (stage.x0 + stage.x1) / 2;
  const iy = (stage.y0 + stage.y1) / 2;
  if (nEx > 0 && cardEx && EX[0].x1 < vw * 0.6) ix += ((EX[0].x1 + stage.x1) / 2 - ix) * s.open;
  // The wide hero and the ending are one centre line: the world sits under the headline's middle.
  const centred = (c === CH.fragments || c === CH.final) && mediaWidth(vw) >= 1024;
  if (centred) ix = vw / 2;
  centreLock = centred;
  // As large as fits, never larger than the shot's own size.
  let f = 1;
  if (!place(n, 1, hw, hh, ix, iy)) {
    let lo = 0.1;
    let hi = 1;
    for (let it = 0; it < 11; it++) {
      const mid = (lo + hi) / 2;
      if (place(n, mid, hw, hh, ix, iy)) lo = mid;
      else hi = mid;
    }
    f = lo;
    if (!place(n, f, hw, hh, ix, iy)) {
      spot.x = ix;
      spot.y = iy;
    }
  }
  const qx = spot.x;
  const qy = spot.y;
  const d = d0 / f;
  const aspect = vw / vh;
  // Dolly back, then slide along the screen's axes until the subject's centre lands on its spot.
  let ex = qx - (vw / 2 + (bcx - vw / 2) * f);
  let ey = qy - (vh / 2 + (bcy - vh / 2) * f);
  for (let it = 0; it < 3; it++) {
    const wx = (ex * 2 * d * TAN * aspect) / vw;
    const wy = (ey * 2 * d * TAN) / vh;
    tx -= RX * wx - UX * wy;
    ty -= -UY * wy;
    tz -= RZ * wx - UZ * wy;
    project(s, 0, n, tx, ty, tz, d, vw, vh, bb);
    ex = qx - (bb.x0 + bb.x1) / 2;
    ey = qy - (bb.y0 + bb.y1) / 2;
  }
  out.x = tx + s.pan[0];
  out.y = ty + s.pan[1];
  out.z = tz + s.pan[2];
  out.d = d;
  if (debug) {
    debug.f = f;
    debug.d = d;
    debug.stage = [stage.x0, stage.y0, stage.x1, stage.y1].map(Math.round);
    debug.ex = EX.slice(0, nEx).map((e) => [e.x0, e.y0, e.x1, e.y1].map(Math.round));
    debug.spot = [Math.round(qx), Math.round(qy)];
    debug.t = [out.x, out.y, out.z];
  }
  if (s.exit > 0) {
    // The last chapter's exit: the world rises with the page as the sheet slides over it, slower than
    // the sheet (EXIT_DRIFT of a screen to the sheet's one), and steps back a little. The closing copy
    // drifts by the same amount (Story.tsx), so the scene and its words leave as one layer.
    const k = s.exit;
    out.d = d * (1 + 0.1 * k);
    const drop = EXIT_DRIFT * 2 * out.d * TAN * k;
    out.x -= UX * drop;
    out.y -= UY * drop;
    out.z -= UZ * drop;
  }
}
const pr = box();
