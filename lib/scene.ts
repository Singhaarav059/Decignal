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
  // x, z, rotation y. A level hexagon around the hub: three near, three far, nothing hidden.
  [-4.4, -1.5, 0.3],
  [-2.2, 0.75, 0.12],
  [4.4, -1.5, -0.3],
  [2.2, 0.75, -0.12],
  [-2.2, -3.75, 0.2],
  [2.2, -3.75, -0.2],
];
export const WMS = 3;

/** Context ring around the signal. */
export const RING = (s: number) => {
  const a = (s / 6) * Math.PI * 2 + Math.PI / 6;
  return [Math.sin(a) * 3.1, Math.cos(a) * 2.35, a] as const;
};
export const HUB_Y = 1.45;

const PORTRAIT_ISLANDS: [number, number, number][] = [
  [-1.5, -4.8, 0.25], [1.5, -4.8, -0.3], [-1.5, -1.2, 0.1],
  [1.5, -1.2, -0.25], [-1.5, 2.4, 0.4], [1.5, 2.4, -0.45],
];

export function islandPose(s: number, c: number, portrait = false): Pose | null {
  const [x, z, ry] = (portrait ? PORTRAIT_ISLANDS : ISLANDS)[s];
  switch (c) {
    case CH.fragments:
    case CH.final: // The story ends where it began: the same six systems, now connected.
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
// Totes on the island are shown at half size, in proportion to the warehouse beside them.
export const ISLAND_TOTE = 0.5;
export const CRATE_ON_ISLAND: Vec3 = [0.48, ISLAND_TOP + CRATE.h * ISLAND_TOTE * 1.5, 0.42];

/* ---------------- 03 Problem: crates become the inventory chart ---------------- */

export const DAYS = [6, 6, 5, 4, 4, 3, 2];
export const STEP_Y = CRATE.h + 0.035;
export const DAY_X = (d: number) => (d - 3) * 1.0;
export const SAFETY_Y = 2.5 * STEP_Y;
/** Stock behind the chart: each tote holds about 70 units; today's count is exact. */
export const UNITS_PER_CRATE = 70;
export const SAFETY_UNITS = 175;
export const dayUnits = (d: number) => 410 - d * 45;
export const crateFill = (d: number, level: number) => Math.min(1, Math.max(0, dayUnits(d) / UNITS_PER_CRATE - level));
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
  return [DAY_X(d), CRATE.h * crateFill(d, l) / 2 + l * STEP_Y, 0];
};

export function signalCratePose(c: number, t: number, portrait = false): Pose | null {
  const [x, z, ry] = (portrait ? PORTRAIT_ISLANDS : ISLANDS)[WMS];
  const [ox, oy, oz] = CRATE_ON_ISLAND;
  switch (c) {
    case CH.fragments:
    case CH.final: {
      const cs = Math.cos(ry);
      const sn = Math.sin(ry);
      const k = 1.1; // island scale
      return { p: [x + (ox * cs + oz * sn) * k, oy * k, z + (-ox * sn + oz * cs) * k], ry, s: k * ISLAND_TOTE };
    }
    case CH.signal:
      if (portrait) return { p: [0, -0.1, 1.1], rx: 0.15, ry: -0.42 + t * 0.3, s: 1.2 };
      return { p: [0.65, 0.42, 1.35], rx: 0.14, ry: -0.52 + t * 0.45, s: 1.20 };
    case CH.problem:
      return { p: chartPos(CHART_CRATES), s: 1 };
    case CH.context:
      return { p: [0, HUB_Y, 0], ry: 0.4 + t * 0.6, s: 1.7 };
    default:
      return null;
  }
}

/* ---------------- 05 Decision: two plants, one truck, one forklift ---------------- */

/** Vehicles and buildings are modelled in metres; this is their scale in the scene. */
export const M = 0.135;
export const PLANT_02: Vec3 = [-2.55, 0, -1.6];
export const PLANT_01: Vec3 = [2.55, 0, -1.6];
/** Front face of both plants. */
export const PLANT_FRONT = PLANT_02[2] + 5 * M;
/** The road runs along x in front of the plants; the truck drives on its centre line. */
export const ROAD_Z = 0.35;
export const TRUCK_X0 = -2.75; // parked at Plant 02, trailer alongside the yard
export const TRUCK_X1 = 2.3; // pulled up at Plant 01

/** Decision chapter beats, as local progress through the chapter. */
export const BEATS = {
  load: [0.06, 0.5] as const, // three forklift trips
  drive: [0.53, 0.78] as const,
};

export function transferredUnits(t: number) {
  const trips = clamp01((t - BEATS.load[0]) / (BEATS.load[1] - BEATS.load[0])) * 3;
  return Math.min(3, Math.floor(trips) + (trips % 1 >= 0.6 ? 1 : 0)) * 80;
}

/** Truck x as the decision chapter plays, plus how far it has driven out during the exit. */
export const truckX = (t: number, exit = 0) =>
  TRUCK_X0 + smootherstep(BEATS.drive[0], BEATS.drive[1], t) * (TRUCK_X1 - TRUCK_X0) + exit * exit * 6;

/* ---------------- Cards: the decision and its layers ---------------- */

export const CARDS = 5; // signal, evidence, context, policy, decision
export const DECISION_CARD = 4;
const UP = Math.PI / 2; // stood up, front face to camera
const FLIP = -Math.PI / 2; // stood up, back face to camera

export function cardPose(k: number, c: number, t: number, portrait = false, phone = false): Pose | null {
  // Phones read the layers and functions as a flat deck at full width (components/story/PhoneDeck.tsx);
  // in 3D they could only be shown a third of that size, so the cards step out for those two chapters.
  // The decision card only leads into those chapters, so on a phone it waits for Industries.
  if (phone && (c === CH.decision || c === CH.control || c === CH.scale)) return null;
  switch (c) {
    case CH.decision:
      // Only the decision is shown; the layers wait behind it.
      // Lifted clear of the road, so the truck stays in view as it makes the delivery.
      // Stands in the yard between the two plants, above the road: the truck passes in front of it.
      // Tablet portrait frames are narrow: set a little further along the yard, so the card is not left cut
      // in half at the screen's edge while the forklift loads; it passes through as the camera follows the truck.
      return { p: [portrait ? 0.6 : 0, 0.86, -1.25 - (4 - k) * 0.012], rx: UP, ry: 0, s: k === 4 ? 0.85 : 0.81 };
    case CH.control:
      // The decision opens into the layers it was built from.
      // Fanned wide enough that each layer's headline number stays in view.
      return { p: [1.25 + k * 0.78, (CARD.h / 2) * 1.2 + 0.03, -1.7 + k * 0.62], rx: UP, ry: -0.4 - t * 0.04, s: 1.2 };
    case CH.scale:
      // Flip: the back of each card is a different business function.
      // A shallow arc, every card turned a little toward the viewer.
      if (portrait) {
        // Portrait: two rows (three, then two) so each card gets a readable share of the width.
        const row = k < 3 ? 0 : 1;
        const col = row === 0 ? k - 1 : k - 3.5;
        return { p: [col * 1.78, (CARD.h / 2) * 1.12 + 0.03 + (row === 0 ? 1.25 : 0), row === 0 ? -0.9 : 0.4], rx: FLIP, ry: -col * 0.1, s: 1.05 };
      }
      return { p: [(k - 2) * 1.82, (CARD.h / 2) * 1.12 + 0.03, -Math.pow(Math.abs(k - 2), 1.5) * 0.42], rx: FLIP, ry: -(k - 2) * 0.13, s: 1.12 };
    case CH.industries:
      return k === DECISION_CARD
        ? { p: [0, PLINTH_H + CARD.h / 2 * 1.3 + 0.03, 0], rx: UP, ry: 0.15 + industryF(t) * Math.PI, s: 1.3 }
        : null;
    case CH.final:
      // Keeps the last industry's half turn (5π) and simply lies down; its face is drawn rotated to match.
      // It settles at the hub the six systems feed, as the decision they resolved into.
      // Tilted up toward the camera (not flat) so its line reads at the hero angle.
      if (k !== DECISION_CARD) return null;
      // Portrait stacks the islands in two columns, so the card stands in front of the stack instead.
      if (portrait) return { p: [0, 0.9, 4.5], rx: -1.05, ry: Math.PI * 5, s: 1.7 };
      return { p: [0, 0.62, -1.2], rx: -0.75, ry: Math.PI * 5, s: 1.2 };
    default:
      return null;
  }
}

/* ---------------- Camera ---------------- */

export type Cam = { p: Vec3; t: Vec3 };

export function cameraPose(c: number, t: number, portrait = false): Cam {
  switch (c) {
    case CH.fragments:
      if (portrait) return { p: [0, 14, 14], t: [0, 0.8, -1.2] };
      return { p: [0, 8.4 - t * 0.5, 16.6 - t * 0.8], t: [0, 1.4, -1.6] };
    case CH.signal:
      if (portrait) return { p: [1.7 - t * 0.2, 2.3, 9.6 - t * 0.4], t: [0, 0.25, 0.5] };
      // Low, close three-quarter on the crate: the camera has swung off-axis to the right.
      return { p: [1.85 - t * 0.25, 1.7, 8.1 - t * 0.4], t: [-0.3, 0.68, 0.9] };
    case CH.problem:
      // The chart sits to the right of the copy and its figures: the whole week reads at once.
      return { p: [-1.5, 3.8, 16.0 - t * 0.4], t: [-1.5, 1.95, 0] };
    case CH.context:
      // A higher oblique overview from the left: the orbit rises and swings round to reveal the ring.
      return { p: [-2.6 + t * 0.3, 11.2 - t * 0.5, 13.9 - t * 0.4], t: [-1.55, 0.55, -0.3] };
    case CH.decision: {
      // A tracking shot on a long lens: it watches the loading at Plant 02, then travels with the truck.
      const cx = truckX(t) + 0.55;
      return { p: [cx, 2.5, 8.7], t: [cx, 0.58, -0.5] };
    }
    case CH.control:
      return { p: [2.45, 2.35, 11.2], t: [1.88, 0.72, 0.1] };
    case CH.scale:
      return { p: [0, 2.6, 13.8 - t * 0.4], t: [0, 1.15, -0.4] };
    case CH.industries:
      return { p: [0, 2.75, 11.4], t: [0, 0.7, 0] };
    default:
      // Decide: back to the opening angle, stepped out so the resolved network sits between headline and actions.
      if (portrait) return { p: [0, 15.5, 15.5], t: [0, 0.3, -1.2] };
      return { p: [0, 10.4 - t * 0.3, 20.4 - t * 0.5], t: [0, 0.72, -1.4] };
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
