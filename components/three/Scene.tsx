"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { easing } from "maath";
import { CHAPTERS, CH, EXIT_DRIFT, blendAt, onSelect, setSceneReady, smoothstep, store, subscribe } from "@/lib/story";
import { ISLAND_TOP, ISO_DIR, ISO_R, ISO_U, bgAt, makeShot, shotAt, type Shot } from "@/lib/scene";
import { Cards, ChartCrates, Islands, SignalCrate, Transfer } from "./Actors";
import { IndustriesRoad } from "./actors/industries";
import { ChartMarks, SignalPing, Threads } from "./Marks";
import { COLORS } from "./palette";
import { KeyLight, Studio } from "./Studio";
import { SystemNetwork } from "./SystemNetwork";
import { canvasQuality, isPhone } from "@/lib/device";
import { markSceneReady } from "@/lib/chrome";
import { onJumpCut } from "@/lib/jump";
import { prewarm } from "./Warm";
import { SceneBoundary } from "./SceneBoundary";
import { FinalMark } from "./actors/mark";

/* ------------------------------------------------------------------ */
/* Stage framing: fit each chapter's subject into the screen area the  */
/* copy leaves free, in pixels, at the one ISO angle.                   */
/* ------------------------------------------------------------------ */

type Box = { x0: number; y0: number; x1: number; y1: number };
const box = (): Box => ({ x0: 0, y0: 0, x1: 0, y1: 0 });
const FOV = 26;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const [DX, DY, DZ] = ISO_DIR;
const [RX, , RZ] = ISO_R;
const [UX, UY, UZ] = ISO_U;
const FX = Math.sin(Math.atan2(DX, DZ));
const FZ = Math.cos(Math.atan2(DX, DZ));

/** What the page measured: the nav's bottom edge, the giant headlines (hero and final), and the blocks
 *  around them the world keeps clear of one by one ([data-frame]: the hero's corners). */
const page = { navB: 72, head: [] as (Box | null)[], frames: [] as Box[][], at: 0 };
/** The card's rect as last seen while each chapter held (the card's content changes height per chapter). */
const cardSeen: (Box | null)[] = CHAPTERS.map(() => null);

function measurePage() {
  page.at = performance.now();
  const nav = document.querySelector(".nav-shell");
  if (nav) {
    const r = nav.getBoundingClientRect();
    if (r.height > 0 && r.bottom > 0) page.navB = Math.min(r.bottom, 120);
  }
  page.head = CHAPTERS.map(() => null);
  page.frames = CHAPTERS.map(() => []);
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
let heightsAt = -1e9;
/** The chapter whose card shows now, with no hand-off under way (its live rect is exact), or -1. */
let heldNow = -1;

function readCardHeights(now: number) {
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

const gutterOf = (vw: number) => THREE.MathUtils.clamp(vw * 0.05, 20, 72);
/** --edge from the tokens: the gutter, or the margin of the 71rem grid. */
const edgeOf = (vw: number) => Math.max(gutterOf(vw), (vw - 1136) / 2);

/** An open system panel (IslandPanel): 360 wide at the right edge, or a sheet along the bottom on phones. */
const panelSeen = { h: 0 };
function measurePanel() {
  const el = document.querySelector<HTMLElement>(".island-panel");
  if (el && el.offsetHeight > 0) panelSeen.h = el.offsetHeight;
}

/** The card where the tokens put it, until the StoryCard reports its own rect. */
function cardGuess(c: number, vw: number, vh: number, out: Box) {
  const phone = vw < 768;
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
  let qx = THREE.MathUtils.clamp(ix, minX, Math.max(minX, maxX));
  let qy = THREE.MathUtils.clamp(iy, minY, Math.max(minY, maxY));
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
  const phone = vw < 768;
  const m = phone ? 10 : 24;
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
  // strip beside it is too narrow to hold a subject.
  if (e.x1 - e.x0 > vw * 0.6) {
    stage.y1 = Math.min(stage.y1, e.y0);
    nEx = 0;
    cardEx = false;
  }
  // Wide screens show no card in the hero or the ending (StoryCard data-away): their corners and the
  // closing bar are frames instead.
  if ((c === CH.fragments || c === CH.final) && vw >= 1024) {
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
    if ((hEx.x0 < vw * 0.25 && hEx.x1 > vw * 0.75) || c === CH.fragments || (c === CH.final && vw >= 1024)) {
      stage.y0 = Math.max(stage.y0, hEx.y1);
      nEx--;
    }
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
type Framed = { x: number; y: number; z: number; d: number };
const framed = (): Framed => ({ x: 0, y: 0, z: 0, d: 10 });

/** Target and distance that put shot s, as large as it can be up to its own distance, in the free stage. */
function frameShot(s: Shot, c: number, vw: number, vh: number, panel: boolean, out: Framed) {
  setStage(c, vw, vh, panel);
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
  // Ideal centre: the stage's middle, drawn halfway toward the open space right of the card.
  let ix = (stage.x0 + stage.x1) / 2;
  const iy = (stage.y0 + stage.y1) / 2;
  if (nEx > 0 && cardEx && EX[0].x1 < vw * 0.6) ix = ix * 0.5 + ((EX[0].x1 + stage.x1) / 2) * 0.5;
  // The wide hero and the ending are one centre line: the world sits under the headline's middle.
  const centred = (c === CH.fragments || c === CH.final) && vw >= 1024;
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

/** Camera distance in use, for the fog. */
let camDist = 20;

function Rig() {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3());
  const goal = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);
  const ready = useRef(false);
  const lean = useRef(0);
  const reduced = useRef(false);
  const lastI = useRef(-1);
  // Frames left to place the camera exactly on its goal after the page moved at once (a veil cut).
  const snap = useRef(0);
  const shots = useMemo(() => [makeShot(), makeShot()], []);
  const fr = useMemo(() => [framed(), framed(), framed(), framed()], []);
  useEffect(() => onJumpCut(() => (snap.current = 3)), []);
  // The panel's height (phones) once its content for the opened system has rendered.
  useEffect(() => onSelect(() => window.setTimeout(measurePanel, 60)), []);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => (reduced.current = m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  // The page's headlines and nav, measured on resize and while fonts settle; never per frame.
  useEffect(() => {
    measurePage();
    const ids = [300, 1200, 2500, 4500].map((ms) => window.setTimeout(measurePage, ms));
    document.fonts?.ready.then(measurePage);
    return () => ids.forEach(clearTimeout);
  }, [size.width, size.height]);

  useFrame((_, dt) => {
    const { i, j, local, e } = blendAt(store.g);
    const vw = size.width;
    const vh = size.height;
    const portrait = vw < 768 || (vw < 1024 && vh > vw * 1.15);
    const now = performance.now();
    if (now - heightsAt > 300) readCardHeights(now);
    heldNow = e < 0.02 ? i : -1;
    // Remember where the card sits while a chapter holds.
    if (e < 0.02 && store.cardRect) {
      const r = store.cardRect;
      const seen = (cardSeen[i] ??= box());
      seen.x0 = r.x;
      seen.y0 = r.y;
      seen.x1 = r.x + r.w;
      seen.y1 = r.y + r.h;
    }
    const still = reduced.current;
    // Reduced motion: the camera cuts at the midpoint and settles.
    const k = still ? (e < 0.5 ? 0 : 1) : e;
    lean.current = THREE.MathUtils.damp(lean.current, store.selected >= 0 ? 1 : 0, 3.2, Math.min(dt, 1 / 30));
    const a = shotAt(i, local, portrait, shots[0]);
    frameShot(a, i, vw, vh, false, fr[0]);
    let A = fr[0];
    if (lean.current > 0.001) {
      // An opened system docks a panel: the world slides into the space between card and panel.
      frameShot(a, i, vw, vh, true, fr[2]);
      A = mix(fr[0], fr[2], lean.current, fr[0]);
    }
    let F = A;
    if (k > 0 && j !== i) {
      const b = shotAt(j, 0, portrait, shots[1]);
      frameShot(b, j, vw, vh, false, fr[1]);
      // Pulling back to a bigger subject, the camera leads, so the next scene assembles in its own
      // frame; pushing in on a smaller one, it holds back while the scene folds into it (partly, so
      // the push itself never rushes).
      const r = Math.log(fr[1].d / A.d);
      const w = b.steady ? 0 : Math.min(Math.abs(r) / Math.LN2, 1) * (r > 0 ? 1 : 0.6);
      const kc = still ? k : k + ((r > 0 ? smoothstep(0, 0.7, k) : smoothstep(0.3, 1, k)) - k) * w;
      F = mix(A, fr[1], kc, fr[3]);
    }
    // One angle throughout: only the target and the distance move, so every hand-off is a dolly and a pan.
    camDist = F.d;
    goal.t.set(F.x, F.y, F.z);
    goal.p.set(F.x + DX * F.d, F.y + DY * F.d, F.z + DZ * F.d);
    // A few centimetres of parallax: confirms the space is real, nothing more.
    goal.p.x += store.pointer.x * 0.16;
    goal.p.y += store.pointer.y * 0.09;

    const delta = Math.min(dt, 1 / 30);
    const side = e < 0.5 ? i : i + 1;
    const cut = still && side !== lastI.current;
    lastI.current = side;
    if (!ready.current || cut || snap.current > 0) {
      camera.position.copy(goal.p);
      look.current.copy(goal.t);
      ready.current = true;
      snap.current = Math.max(snap.current - 1, 0);
    }
    const velK = Math.min(1, Math.abs(store.velocity) / 22);
    const dampTime = still ? 0.05 : THREE.MathUtils.lerp(0.16, 0.06, velK);
    easing.damp3(camera.position, goal.p, dampTime, delta);
    easing.damp3(look.current, goal.t, dampTime, delta);
    camera.lookAt(look.current);
    store.camK = F.d / Math.max(a.dist, 0.001);
  });
  return null;
}

/** Blends two framings; the distance blends in log space so a dolly reads at an even pace. */
function mix(a: Framed, b: Framed, k: number, out: Framed) {
  out.x = a.x + (b.x - a.x) * k;
  out.y = a.y + (b.y - a.y) * k;
  out.z = a.z + (b.z - a.z) * k;
  out.d = Math.exp(Math.log(a.d) + (Math.log(b.d) - Math.log(a.d)) * k);
  return out;
}

/** Fog in the page's sky colour, so distant objects melt into the page. */
function Atmosphere() {
  const { scene } = useThree();
  const fog = useMemo(() => new THREE.Fog(COLORS.bg, 18, 42), []);
  useEffect(() => {
    scene.fog = fog;
  }, [scene, fog]);
  const sky = useRef("");
  useFrame(() => {
    // The fog travels with the camera: the subject is always clear, the far ground melts away.
    fog.near = camDist + 3;
    fog.far = camDist * 2.3 + 10;
    // ...and takes the chapter's sky colour (components/Backdrop.tsx paints the page the same).
    const [r, g, b] = bgAt(store.g);
    const key = `${r},${g},${b}`;
    if (key !== sky.current) {
      sky.current = key;
      fog.color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
    }
  });
  return null;
}

function World() {
  return (
    <>
      <Studio />
      <Atmosphere />
      <KeyLight />
      <Suspense fallback={null}>
        <Islands />
        <SignalCrate />
        <ChartCrates />
        <Transfer />
        <Cards />
        <IndustriesRoad />
        <FinalMark />
        <ChartMarks />
        <Warmup />
      </Suspense>
      <Threads />
      <SystemNetwork />
      <SignalPing />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial color={COLORS.shadow} opacity={0.16} transparent />
      </mesh>
      {/* Tight contact shadows: every object sits on the ground, none of them float. Laid at the pads'
          top (the hero draws them at 1.1), so each model is grounded on its yard; markings lie under the shade. */}
      {/* Phones: half the map for a third of the on-screen size, so the shadow is as fine per pixel as on desktop. */}
      <ContactShadows position={[0, ISLAND_TOP * 1.1 + 0.003, 0]} scale={30} resolution={isPhone() ? 512 : 1024} blur={1.1} far={0.7} opacity={0.46} color={COLORS.shadow} />
      <Rig />
      <Pause />
    </>
  );
}

/** Whether rendering is held: by the warm-up, or because the story is out of sight. */
const loop = { warming: true, hidden: false };

/**
 * Mounted last inside the Suspense, once every model exists. Compiles every shader in the story
 * (hidden chapters included) off the main thread where the browser can (KHR_parallel_shader_compile)
 * while the loader is up and nothing renders, then uploads geometry and textures, then draws a few
 * frames and tells the loader the scene is ready.
 */
function Warmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const clock = useThree((s) => s.clock);
  const frames = useRef(-1);
  useEffect(() => {
    let live = true;
    loop.warming = true;
    // Switching the loop restarts the scene clock from 0: carry the time on, as Pause does.
    const run = (on: boolean) => {
      const t = clock.elapsedTime;
      setFrameloop(on ? "always" : "never");
      clock.elapsedTime = t;
    };
    run(false);
    const done = () => {
      if (!live) return;
      try {
        // Uploads, and the shadow programs compile() does not build. Restores visibility itself.
        prewarm(gl, scene, camera);
      } catch {
        // A lost context: the frames below redraw what they can.
      }
      loop.warming = false;
      frames.current = 0;
      run(!loop.hidden);
      // Out of sight (a restored scroll below the story): nothing will draw, so it is ready now.
      if (loop.hidden) ready();
    };
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    let pending: Promise<unknown> = Promise.resolve();
    try {
      pending = gl.compileAsync(scene, camera);
    } catch {
      // compileAsync is missing or failed: prewarm compiles synchronously instead.
    } finally {
      // Programs are built from this synchronous pass: hidden objects go back before any frame draws.
      for (const o of hidden) o.visible = false;
    }
    const cap = new Promise((r) => window.setTimeout(r, 2500));
    Promise.race([pending, cap]).then(done, done);
    return () => {
      live = false;
    };
  }, [gl, scene, camera, setFrameloop, clock]);
  useFrame(() => {
    if (frames.current < 0) return;
    if (++frames.current === 3) ready();
  });
  return null;
}

let readySent = false;
function ready() {
  if (readySent) return;
  readySent = true;
  setSceneReady(true);
  markSceneReady();
}

/** Stops rendering while the story is out of sight: scrolled past its end, or the canvas faded out. */
function Pause() {
  const gl = useThree((s) => s.gl);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __frameloop: () => (loop.hidden || loop.warming ? "never" : "always") });
    // The page fades the canvas through an inline opacity on one of its wrappers.
    let wrap: HTMLElement | null = gl.domElement.parentElement;
    while (wrap && wrap !== document.body && !wrap.style.opacity) wrap = wrap.parentElement;
    const faded = () => {
      if (!wrap || wrap === document.body) {
        wrap = gl.domElement.parentElement;
        while (wrap && wrap !== document.body && !wrap.style.opacity) wrap = wrap.parentElement;
      }
      return !!wrap && wrap !== document.body && wrap.style.opacity !== "" && Number(wrap.style.opacity) < 0.01;
    };
    let elapsed = 0;
    return subscribe((g) => {
      // Resume as soon as anything shows (opacity above 0), never at the midpoint of a fade.
      const off = g > CHAPTERS.length - 0.01 || faded();
      if (off === loop.hidden) return;
      loop.hidden = off;
      if (loop.warming) return;
      if (off) elapsed = clock.elapsedTime;
      setFrameloop(off ? "never" : "always");
      // Restarting the loop resets the clock to 0, which replayed every entrance (the islands
      // vanished and rose again on the way back up). Carry the time on from where it paused.
      if (!off) clock.elapsedTime = elapsed;
    });
  }, [gl, setFrameloop, clock]);
  return null;
}

/** No WebGL, or a canvas that fails to start: the chapter's flat drawing (ChapterArt, live) stands in,
 *  and the loader is told at once instead of waiting for its cap. A boundary the page puts round
 *  <Scene /> as well passes through, so there is only ever one. */
export default function Scene() {
  return (
    <SceneBoundary story label="Six business systems feeding one decision">
      <World3D />
    </SceneBoundary>
  );
}

function World3D() {
  const q = useMemo(() => canvasQuality(), []);
  return (
    <Canvas
      shadows="percentage"
      // Always the screen's full pixel density (2x on desktop, up to 3x on a phone): the scene never
      // trades sharpness for speed.
      dpr={q.dpr}
      // Layout size, not the on-screen rect: the intro scales the stage (1.04) while the canvas mounts,
      // and a measured rect would keep that size after the intro (the framing then ran 4% off).
      resize={{ offsetSize: true }}
      camera={{ fov: FOV, near: 0.1, far: 120, position: [0, 7, 15] }}
      // The world reads the pointer from the window (store.pointer, manual raycasts), so the canvas
      // never takes a hit: the hero's tag and buttons behind it stay clickable (R3F defaults to auto).
      style={{ pointerEvents: "none" }}
      gl={{ antialias: q.antialias, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene, camera }) => {
        if (process.env.NODE_ENV !== "production") Object.assign(window, { __three: { gl, scene, camera }, __story: store });
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <World />
    </Canvas>
  );
}
