// World layout for the 3D story. Every actor has a pose per chapter; chapters it is absent
// from return null, and the actor scales in or out of the scene during the transition.
import { CH, blendAt, clamp01, smootherstep } from "./story";
import { industryF, PLINTH_H } from "./layouts";

export { industryF, PLINTH_H };

export type Vec3 = [number, number, number];
export type Pose = { p: Vec3; rx?: number; ry?: number; s?: number };

/* ---------------- Sizes ---------------- */

export const ISLAND_TOP = 0.155; // models stand on this height
export const CRATE = { w: 0.6, h: 0.3, d: 0.42 };
export const CARD = { w: 1.6, t: 0.05, h: 1.0 }; // face is w x h, t thick

/* ---------------- 01 Fragmented: six systems, six islands ---------------- */

export const ISLANDS: [number, number, number][] = [
  // x, z, rotation y
  [-4.3, -0.6, 0.25],
  [-1.5, 1.5, -0.3],
  [1.3, -2.2, 0.1],
  [4.1, 0.8, -0.25],
  [-2.9, -4.6, 0.4],
  [3.5, -4.9, -0.45],
];
export const WMS = 3;

/** Context ring around the signal. */
export const RING = (s: number) => {
  const a = (s / 6) * Math.PI * 2 + Math.PI / 6;
  return [Math.sin(a) * 3.1, Math.cos(a) * 2.35, a] as const;
};
export const HUB_Y = 1.45;

export function islandPose(s: number, c: number): Pose | null {
  const [x, z, ry] = ISLANDS[s];
  switch (c) {
    case CH.fragments:
      return { p: [x, 0, z], ry, s: 1.1 };
    case CH.context: {
      const [rx, rz] = RING(s);
      return { p: [rx, 0, rz], ry: Math.atan2(-rx, -rz) * 0.25, s: 0.88 };
    }
    default:
      return null;
  }
}

/* ---------------- The signal crate: one tote of bearings ---------------- */

// Where it sits on the warehouse island, relative to the island centre.
export const CRATE_ON_ISLAND: Vec3 = [0.5, ISLAND_TOP + CRATE.h * 1.5, 0.38];

/* ---------------- 03 Problem: crates become the inventory chart ---------------- */

export const DAYS = [6, 5, 5, 4, 4, 4, 2];
export const STEP_Y = CRATE.h + 0.035;
export const DAY_X = (d: number) => (d - 3) * 1.0;
export const SAFETY_Y = 2.5 * STEP_Y;
export const CHART_CRATES = DAYS.reduce((s, n) => s + n, 0) - 1; // the last one is the signal

/** Chart slot k (0..CHART_CRATES): day column and level. The final slot is the signal. */
export const chartSlot = (k: number): { d: number; l: number } => {
  let rest = k;
  for (let d = 0; d < DAYS.length; d++) {
    if (rest < DAYS[d]) return { d, l: rest };
    rest -= DAYS[d];
  }
  return { d: DAYS.length - 1, l: DAYS[DAYS.length - 1] - 1 };
};
export const chartPos = (k: number): Vec3 => {
  const { d, l } = chartSlot(k);
  return [DAY_X(d), CRATE.h / 2 + l * STEP_Y, 0];
};

export function signalCratePose(c: number, t: number): Pose | null {
  const [x, z, ry] = ISLANDS[WMS];
  const [ox, oy, oz] = CRATE_ON_ISLAND;
  switch (c) {
    case CH.fragments: {
      const cs = Math.cos(ry);
      const sn = Math.sin(ry);
      const k = 1.1; // island scale
      return { p: [x + (ox * cs + oz * sn) * k, oy * k, z + (-ox * sn + oz * cs) * k], ry, s: k };
    }
    case CH.signal:
      return { p: [0.55, 0.9, 1.6], rx: 0.12, ry: -0.55 + t * 0.5, s: 1.7 };
    case CH.problem:
      return { p: chartPos(CHART_CRATES), s: 1 };
    case CH.context:
      return { p: [0, HUB_Y, 0], ry: 0.4 + t * 0.6, s: 1.7 };
    default:
      return null;
  }
}

/* ---------------- 05 Decision: two plants, one truck, one card ---------------- */

export const PLANT_02: Vec3 = [-2.7, 0, -1.9];
export const PLANT_01: Vec3 = [2.7, 0, -1.9];
export const ROAD_Z = -0.95;

/** Truck x along the road as the decision chapter plays: Plant 02 to Plant 01. */
export const truckX = (t: number) => -2.0 + smootherstep(0.08, 0.85, t) * 4.0;

/* ---------------- Cards: the decision and its layers ---------------- */

export const CARDS = 5; // signal, evidence, context, policy, decision
export const DECISION_CARD = 4;
const UP = Math.PI / 2; // stood up, front face to camera
const FLIP = -Math.PI / 2; // stood up, back face to camera

export function cardPose(k: number, c: number, t: number): Pose | null {
  switch (c) {
    case CH.decision:
      // Only the decision is shown; the layers wait behind it.
      // Lifted clear of the road, so the truck stays in view as it makes the delivery.
      return { p: [0, CARD.h / 2 + 0.66, 0.9 - (4 - k) * 0.012], rx: UP, ry: 0.22 - t * 0.22, s: k === 4 ? 1.0 : 0.96 };
    case CH.control:
      // The decision opens into the layers it was built from.
      // Fanned wide enough that each layer's headline number stays in view.
      return { p: [1.25 + k * 0.78, (CARD.h / 2) * 1.2 + 0.03, -1.7 + k * 0.62], rx: UP, ry: -0.4 - t * 0.04, s: 1.2 };
    case CH.scale:
      // Flip: the back of each card is a different business function.
      // A shallow arc, every card turned a little toward the viewer.
      return { p: [(k - 2) * 1.82, (CARD.h / 2) * 1.12 + 0.03, -Math.pow(Math.abs(k - 2), 1.5) * 0.42], rx: FLIP, ry: -(k - 2) * 0.13, s: 1.12 };
    case CH.industries:
      return k === DECISION_CARD
        ? { p: [0, PLINTH_H + CARD.h / 2 * 1.3 + 0.03, 0], rx: UP, ry: 0.15 + industryF(t) * Math.PI, s: 1.3 }
        : null;
    case CH.final:
      // Keeps the last industry's half turn (5π) and simply lies down; its face is drawn rotated to match.
      return k === DECISION_CARD ? { p: [0, (CARD.t / 2) * 1.6, 0.2], rx: 0, ry: 0.18 + Math.PI * 5, s: 1.6 } : null;
    default:
      return null;
  }
}

/* ---------------- Camera ---------------- */

export type Cam = { p: Vec3; t: Vec3 };

export function cameraPose(c: number, t: number): Cam {
  switch (c) {
    case CH.fragments:
      return { p: [0, 8.4 - t * 0.5, 16.2 - t * 0.8], t: [0, 1.55, -1.6] };
    case CH.signal:
      return { p: [0.3, 2.4, 7.6 - t * 0.4], t: [-0.55, 1.0, 1.2] };
    case CH.problem:
      // The chart sits under the copy, never beside it: the whole week reads at once.
      return { p: [-0.35, 3.9, 14.3 - t * 0.4], t: [-0.35, 2.05, 0] };
    case CH.context:
      return { p: [-0.95, 10.6 - t * 0.5, 13.2 - t * 0.4], t: [-1.55, 1.0, -0.3] };
    case CH.decision:
      return { p: [0, 2.3, 8.8 - t * 0.4], t: [0, 1.25, 0] };
    case CH.control:
      return { p: [2.75, 2.3, 9.9], t: [2.3, 0.72, 0.1] };
    case CH.scale:
      return { p: [0, 2.6, 13.0 - t * 0.4], t: [0, 1.25, -0.4] };
    case CH.industries:
      return { p: [0, 2.45, 8.6], t: [0, 0.85, 0] };
    default:
      return { p: [0, 4.2, 7.0], t: [0, 0.15, -0.1] };
  }
}

export { clamp01 };

/* ---------------- Background: one flat tint per chapter, no gradients ---------------- */

const BG: [number, number, number][] = [
  [251, 248, 243], // fragmented: warm white
  [253, 242, 239], // signal: a breath of red
  [242, 245, 255], // problem: cool blue
  [245, 242, 255], // context: violet
  [255, 248, 235], // decision: saffron
  [239, 248, 243], // control: emerald
  [255, 243, 236], // scale: tangerine
  [253, 241, 246], // industries: pink
  [251, 248, 243], // decide
];

/** Background colour at story position g, as [r, g, b]. */
export function bgAt(g: number): [number, number, number] {
  const { i, j, e } = blendAt(g);
  return BG[i].map((v, n) => Math.round(v + (BG[j][n] - v) * e)) as [number, number, number];
}
