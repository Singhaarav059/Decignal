"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, startTransition, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { easing } from "maath";
import { CHAPTERS, CH, EXIT_DRIFT, blendAt, onSelect, setSceneReady, smoothstep, store, subscribe } from "@/lib/story";
import { IND_BESIDE_MIN, ISO_DIR, ISO_R, ISO_U, bgAt, indLayout, makeShot, shotAt, type Shot } from "@/lib/scene";
import { Cards, ChartCrates, Islands, SignalCrate, Transfer } from "./Actors";
import { IndustriesRoad } from "./actors/industries";
import { ChartMarks, SignalPing, Threads } from "./Marks";
import { COLORS } from "./palette";
import { KeyLight, Studio } from "./Studio";
import { SystemNetwork } from "./SystemNetwork";
import { canvasQuality, mediaWidth, portraitWide, tallTouch } from "@/lib/device";
import { markSceneReady } from "@/lib/chrome";
import { onJumpCut } from "@/lib/jump";
import { isTouch } from "@/lib/pace";
import { Pacer } from "./Pacer";
import { SceneBoundary } from "./SceneBoundary";
import { FinalMark } from "./actors/mark";
import { ShadowFloor, ShadowGate } from "./Shadows";
import { FrameGate, lastDraw } from "./FrameGate";
import { Governor, useGovernedDpr } from "./Governor";
import { Sliced, drained, yieldTask } from "./slices";

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

/** What the page measured: the nav's bottom edge, the giant headlines (hero and final), the blocks
 *  around them the world keeps clear of one by one ([data-frame]: the hero's corners), and the
 *  Industries callout, whose right edge starts that chapter's stage. */
const page = { navB: 72, head: [] as (Box | null)[], frames: [] as Box[][], at: 0, callout: null as Box | null };
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
type Framed = { x: number; y: number; z: number; d: number };
const framed = (): Framed => ({ x: 0, y: 0, z: 0, d: 10 });

/** Target and distance that put shot s, as large as it can be up to its own distance, in the free stage. */
function frameShot(s: Shot, c: number, vw: number, vh: number, panel: boolean, out: Framed) {
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
    const portrait = portraitWide(vw, vh);
    tall = tallTouch(vw, vh);
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
    // A tall tablet reads the problem chart's labels in a legend too (Marks ChartMarks).
    const a = shotAt(i, local, portrait || (tall && i === CH.problem), shots[0]);
    frameShot(a, i, vw, vh, false, fr[0]);
    let A = fr[0];
    if (lean.current > 0.001) {
      // An opened system docks a panel: the world slides into the space between card and panel.
      frameShot(a, i, vw, vh, true, fr[2]);
      A = mix(fr[0], fr[2], lean.current, fr[0]);
    }
    let F = A;
    if (k > 0 && j !== i) {
      const b = shotAt(j, 0, portrait || (tall && j === CH.problem), shots[1]);
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

/** The story's actors, mounted one per commit after the threads and network, in the order the story
 *  meets them (the hero's islands first). Rendered at once they were one 1-2 s task on a phone (every building, person and merged
 *  part built in a single synchronous pass); each is now its own low-priority render, which React
 *  splits into short slices, and its own commit. Nothing draws until all are in and warm. */
const ACTORS = [Islands, SignalCrate, ChartCrates, Transfer, Cards, IndustriesRoad, FinalMark, ChartMarks];

function World() {
  const [n, setN] = useState(0);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    // Each actor's programs are requested as soon as it is in, so the browser links them while the
    // next one builds.
    if (n > 0) void requestPrograms(gl, scene, camera);
    if (n > ACTORS.length + 1) return;
    // A transition: React renders it in its own short tasks, so the page gets its turn between them.
    startTransition(() => setN(n + 1));
  }, [n, gl, scene, camera]);
  return (
    <Sliced value={true}>
      <Hold />
      <Studio />
      <Atmosphere />
      <KeyLight />
      <Suspense fallback={null}>
        {ACTORS.slice(0, Math.max(0, n - 1)).map((Actor, k) => (
          <Actor key={k} />
        ))}
        {n > ACTORS.length + 1 && <Warmup />}
      </Suspense>
      {n > 0 && (
        <>
          <Threads />
          <SystemNetwork />
          <SignalPing />
        </>
      )}
      <ShadowFloor color={COLORS.shadow} opacity={0.16} />
      <Rig />
      <ShadowGate />
      <FrameGate />
      <Pause />
    </Sliced>
  );
}

/** Nothing draws while the actors mount and warm (each early frame linked programs on the spot);
 *  Warmup starts the loop. Touch screens stay on "never": their Pacer holds while warming. */
function Hold() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useLayoutEffect(() => {
    if (loop.warming) setFrameloop("never");
  }, [setFrameloop]);
  return null;
}

/** Whether rendering is held: by the warm-up, or because the story is out of sight. */
const loop = { warming: true, hidden: false };
/** The story draws nothing while it warms up or is out of sight (the phone Pacer's hold). */
const storyPaused = () => loop.hidden || loop.warming || store.after > 0.02 || store.g >= CHAPTERS.length - 0.01;

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
    // Touch screens stay on "never" throughout: their Pacer draws, and holds while warming or hidden.
    const paced = isTouch();
    const run = (on: boolean) => {
      const t = clock.elapsedTime;
      setFrameloop(on && !paced ? "always" : "never");
      clock.elapsedTime = t;
    };
    run(false);
    const done = () => {
      loop.warming = false;
      frames.current = 0;
      run(!loop.hidden);
      // Out of sight (a restored scroll below the story): nothing will draw, so it is ready now.
      if (loop.hidden) ready();
    };
    const warm = async () => {
      // Bake merges and far bodies first: they are part of what gets uploaded.
      await drained();
      // Programs for anything not requested yet, then wait for the links (capped, as before).
      await requestPrograms(gl, scene, camera);
      if (!live) return;
      await Promise.race([Promise.all(linking), new Promise((r) => window.setTimeout(r, 2500))]).catch(() => {});
      if (!live) return;
      const roots = pieces(scene.children);
      // Uploads, and the shadow programs compile() does not build: piece by piece, one task each.
      try {
        await upload(gl, scene, camera, roots, () => live);
      } catch {
        // A lost context: the frames below redraw what they can.
      }
      if (live) done();
    };
    void warm();
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

/** A subtree never drawn on this screen (userData.noWarm, the Scale glass on a phone) stays hidden, as
 *  Warm.tsx leaves it: compiling it would link programs for nothing. */
const noWarm = (o: THREE.Object3D | null) => {
  for (let x = o; x; x = x.parent) if (x.userData.noWarm) return true;
  return false;
};
/** Top-level branches whose programs have been requested, and the links under way. */
const asked = new WeakSet<THREE.Object3D>();
const linking: Promise<unknown>[] = [];
let requesting: Promise<void> = Promise.resolve();

/**
 * Requests the programs of every top-level branch not asked for yet, a few pieces per task. The
 * browser compiles and links them off the main thread where it can (KHR_parallel_shader_compile); in
 * one call, building every program's source took a single long task.
 */
function requestPrograms(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  requesting = requesting.then(async () => {
    const fresh = scene.children.filter((c) => !asked.has(c));
    fresh.forEach((c) => asked.add(c));
    const roots = pieces(fresh);
    for (let k = 0; k < roots.length; ) {
      await yieldTask();
      const end = performance.now() + 8;
      do {
        const r = roots[k++];
        const hidden: THREE.Object3D[] = [];
        r.traverse((o) => {
          if (!o.visible && !noWarm(o)) {
            hidden.push(o);
            o.visible = true;
          }
        });
        try {
          linking.push(gl.compileAsync(r, camera, scene).catch(() => {}));
        } catch {
          // compileAsync is missing or failed: the uploads compile synchronously instead.
        } finally {
          // Programs are built from this synchronous pass: hidden objects go back before any frame draws.
          for (const o of hidden) o.visible = false;
        }
      } while (k < roots.length && performance.now() < end);
    }
  });
  return requesting;
}

/** Meshes per piece of warm-up work: small enough that one piece's programs or uploads fit a short task. */
const PIECE = 24;
const drawable = (o: THREE.Object3D) => {
  const d = o as THREE.Mesh & { isPoints?: boolean; isLine?: boolean; isSprite?: boolean };
  return !!(d.isMesh || d.isPoints || d.isLine || d.isSprite);
};

/** Branches cut into subtrees of at most PIECE drawables (a drawable with children stays whole). */
function pieces(branches: THREE.Object3D[]) {
  const count = new Map<THREE.Object3D, number>();
  const tally = (o: THREE.Object3D): number => {
    let n = drawable(o) ? 1 : 0;
    for (const c of o.children) n += tally(c);
    count.set(o, n);
    return n;
  };
  branches.forEach(tally);
  const out: THREE.Object3D[] = [];
  const split = (o: THREE.Object3D) => {
    const n = count.get(o) ?? 0;
    if (n === 0) return;
    if (n <= PIECE || drawable(o)) out.push(o);
    else o.children.forEach(split);
  };
  branches.forEach(split);
  return out;
}

const SOLO = 31;
const NOOP = () => {};
const SCISSOR = new THREE.Vector4();

/**
 * What prewarm (Warm.tsx) does in one go, a piece per task: each piece, hidden and off-camera parts
 * included, is drawn alone (a spare layer) by the scene's lights into one pixel of the canvas, which
 * uploads its geometry and textures and builds its shadow programs. Nothing has been drawn yet, so the
 * canvas shows nothing either way. Then one whole frame.
 */
async function upload(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, roots: THREE.Object3D[], live: () => boolean) {
  const lights: THREE.Object3D[] = [];
  scene.traverse((o) => (o as THREE.Light).isLight && lights.push(o));
  const mask = camera.layers.mask;
  const previous = gl.getRenderTarget();
  // Nothing moves while the world warms: one matrix walk serves every piece's draw.
  scene.updateMatrixWorld();
  const auto = scene.matrixWorldAutoUpdate;
  // ShadowGate's per-render check walks the whole scene; each piece asks for its shadow map itself.
  const before = scene.onBeforeRender;
  const top = (o: THREE.Object3D) => {
    let t = o;
    while (t.parent && t.parent !== scene) t = t.parent;
    return t;
  };
  for (let k = 0; k < roots.length; ) {
    await yieldTask();
    if (!live()) return;
    const end = performance.now() + 8;
    const scissorTest = gl.getScissorTest();
    gl.getScissor(SCISSOR);
    lights.forEach((l) => l.layers.enable(SOLO));
    camera.layers.set(SOLO);
    scene.matrixWorldAutoUpdate = false;
    scene.onBeforeRender = NOOP;
    // The other branches are left out of the walk altogether (lights stay in).
    const asleep: THREE.Object3D[] = [];
    const branch = top(roots[k]);
    for (const c of scene.children) {
      if (c !== branch && c.visible && !lights.includes(c)) {
        asleep.push(c);
        c.visible = false;
      }
    }
    try {
      do {
        const r = roots[k++];
        let off = false;
        const shown: THREE.Object3D[] = [];
        // Its ancestors as well: a chapter's hidden group would keep it from drawing.
        for (let p: THREE.Object3D | null = r; p; p = p.parent) if (p.userData.noWarm) off = true;
        if (off) continue;
        for (let p = r.parent; p; p = p.parent) {
          if (!p.visible) {
            shown.push(p);
            p.visible = true;
          }
        }
        const culled: THREE.Object3D[] = [];
        const solo: THREE.Object3D[] = [];
        const visit = (o: THREE.Object3D) => {
          // Never drawn on this screen (userData.noWarm), or merged away by a Bake: left as it is.
          if (o.userData.noWarm) return;
          if (!o.visible && !o.userData.bakedAway) {
            shown.push(o);
            o.visible = true;
          }
          if (o.frustumCulled) {
            culled.push(o);
            o.frustumCulled = false;
          }
          o.layers.enable(SOLO);
          solo.push(o);
          for (const c of o.children) visit(c);
        };
        visit(r);
        gl.setRenderTarget(null);
        gl.setScissorTest(true);
        gl.setScissor(0, 0, 1, 1);
        gl.shadowMap.needsUpdate = true;
        gl.render(scene, camera);
        solo.forEach((o) => o.layers.disable(SOLO));
        shown.forEach((o) => (o.visible = false));
        culled.forEach((o) => (o.frustumCulled = true));
      } while (k < roots.length && top(roots[k]) === branch && performance.now() < end);
    } finally {
      asleep.forEach((c) => (c.visible = true));
      scene.matrixWorldAutoUpdate = auto;
      scene.onBeforeRender = before;
      camera.layers.mask = mask;
      lights.forEach((l) => l.layers.disable(SOLO));
      gl.setScissor(SCISSOR);
      gl.setScissorTest(scissorTest);
    }
  }
  await yieldTask();
  if (!live()) return;
  // The shadow map as the view sees it, and one whole frame.
  gl.shadowMap.needsUpdate = true;
  gl.render(scene, camera);
  gl.setRenderTarget(previous);
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
    const paced = isTouch();
    return subscribe((g) => {
      // Resume as soon as anything shows (opacity above 0), never at the midpoint of a fade.
      const off = g >= CHAPTERS.length - 0.01 || store.after > 0.02 || faded();
      if (off === loop.hidden) return;
      loop.hidden = off;
      if (loop.warming) return;
      if (off) elapsed = clock.elapsedTime;
      setFrameloop(off ? "never" : (paced ? "never" : "always"));
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
  // Touch screens draw on the phone budget (Pacer, lib/pace.ts).
  const paced = useMemo(() => isTouch(), []);
  // A weak device's density follows its frame time (Governor); a capable one keeps q.dpr.
  const { dpr, govern } = useGovernedDpr(q.dpr);
  // Held, so a density change re-renders the canvas and not the whole world inside it.
  const world = useMemo(() => <World />, []);
  return (
    <Canvas
      frameloop={paced ? "never" : "always"}
      shadows="percentage"
      // Up to 2x with MSAA on every screen (lib/device.ts): smooth edges at a density a phone's GPU
      // can hold at full frame rate.
      dpr={dpr}
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
      {world}
      {paced && <Pacer paused={storyPaused} drawnAt={lastDraw} />}
      {govern && <Governor at={dpr} set={govern} />}
    </Canvas>
  );
}
