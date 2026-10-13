// World layout for the 3D story. Every actor has a pose per chapter; chapters it is absent
// from return null, and the actor scales in or out of the scene during the transition.
// A pose with s: 0 is a point the actor folds into (or grows out of), so a hand-off reads as cause
// and effect: the islands fold into the tote, the tote leaves for Plant 01 (see actors/core).
import { BEATS, CH, FINAL_EXIT, blendAt, clamp01, finalExit, smoothstep, smootherstep, industryF, scaleF, PLINTH_H } from "./story";

export { industryF, PLINTH_H, BEATS };

export type Vec3 = [number, number, number];
export type Pose = { p: Vec3; rx?: number; ry?: number; s?: number };

/* ---------------- One camera angle ---------------- */

/** The story's one isometric angle: 30° down, 24° to the right of straight on. Every chapter shares it. */
export const ISO = { el: 0.52, az: 0.42 };
const CA = Math.cos(ISO.az);
const SA = Math.sin(ISO.az);
const CE = Math.cos(ISO.el);
const SE = Math.sin(ISO.el);
/** Unit vector from the look target to the camera. */
export const ISO_DIR: Vec3 = [SA * CE, SE, CA * CE];
/** The screen's right and up axes in the world. */
export const ISO_R: Vec3 = [CA, 0, -SA];
export const ISO_U: Vec3 = [-SA * SE, CE, -CA * SE];

/** A layout drawn square to the viewer (x right, z toward the viewer), placed in the world about (cx, cz). */
export const isoXZ = (x: number, z: number, cx = 0, cz = 0): [number, number] => [cx + x * CA + z * SA, cz - x * SA + z * CA];

/* ---------------- Sizes ---------------- */

export const ISLAND_TOP = 0.036; // models stand on this height (kit PAD_TOP)
export const CRATE = { w: 0.6, h: 0.3, d: 0.42 };
export const CARD = { w: 1.6, t: 0.05, h: 1.0 }; // face is w x h, t thick

/* ---------------- 01 Systems: six systems, six islands ---------------- */

/** The hub the six systems feed: the middle of the hero layout, where SystemNetwork's threads meet. */
export const HUB: [number, number] = [0, -1.2];

// x, z, rotation y, drawn square to the viewer about the hub, then turned to the camera's angle.
// A level hexagon around the hub: three near, three far, nothing hidden. Close-set and deeper than it
// is wide, so it fills the stage beside the card at a larger size; the ending's board stands at the
// hub with the near pair clear of its face and the outer pair clear of its edges.
const HERO_LAYOUT: [number, number, number][] = [
  [-3.2, -1.9, 0.3],
  [-1.7, 0.4, 0.12],
  [3.2, -1.9, -0.3],
  [1.7, 0.4, -0.12],
  [-1.7, -4.2, 0.2],
  [1.7, -4.2, -0.2],
];
const PORTRAIT_LAYOUT: [number, number, number][] = [
  [-1.5, -4.5, 0.25], [1.5, -4.5, -0.3], [-1.5, -1.2, 0.1],
  [1.5, -1.2, -0.25], [-1.5, 2.1, 0.4], [1.5, 2.1, -0.45],
];
const aboutHub = (l: [number, number, number][]) =>
  l.map(([x, z, ry]) => [...isoXZ(x - HUB[0], z - HUB[1], HUB[0], HUB[1]), ry] as [number, number, number]);
export const ISLANDS = aboutHub(HERO_LAYOUT);
const PORTRAIT_ISLANDS = aboutHub(PORTRAIT_LAYOUT);
export const WMS = 3;

/** Context ring around the signal, square to the viewer. Returns world x, z and the ring angle. */
export const RING = (s: number) => {
  const a = (s / 6) * Math.PI * 2 + Math.PI / 6;
  const [x, z] = isoXZ(Math.sin(a) * 3.1, Math.cos(a) * 2.35);
  return [x, z, a] as const;
};
/** Centre height of the signal tote in Context: on the ground at the ring's centre. */
export const CONTEXT_CRATE_S = 1.7;
export const HUB_Y = (CRATE.h * CONTEXT_CRATE_S) / 2;

export function islandPose(s: number, c: number, portrait = false): Pose | null {
  const [x, z, ry] = (portrait ? PORTRAIT_ISLANDS : ISLANDS)[s];
  switch (c) {
    case CH.final:
      // The story ends where it began: the same six systems, now connected. A portrait ending frames
      // the audit board on its own (its face carries the six systems' dots), so they stay away.
      if (portrait) return null;
      return { p: [x, 0, z], ry, s: 1.1 };
    case CH.fragments:
      return { p: [x, 0, z], ry, s: 1.1 };
    case CH.context: {
      const [rx, rz] = RING(s);
      return { p: [rx, 0, rz], ry: Math.atan2(-rx, -rz) * 0.25, s: 0.88 };
    }
    case CH.decision:
      // The evidence folds into the tote it explains; the tote then leaves for Plant 01.
      return { p: [0, HUB_Y, 0], s: 0 };
    default:
      return null;
  }
}

/* ---------------- The signal crate: one tote of bearings ---------------- */

// Where it sits on the warehouse island, relative to the island centre: stacked on the warehouse's own tote.
// Totes on the island are shown at half size, in proportion to the warehouse beside them.
export const ISLAND_TOTE = 0.5;
export const CRATE_ON_ISLAND: Vec3 = [0.48, ISLAND_TOP + CRATE.h * ISLAND_TOTE * 1.5, 0.42];
/** Signal: the tote stands on the ground in front of the hub, where the six systems fold into it. */
export const SIGNAL_AT: [number, number] = [0.1, 0.55];
export const SIGNAL_S = 1.5;

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

/* ---------------- 05 Decision: two plants, one truck, one forklift ---------------- */

/** Vehicles and buildings are modelled in metres; this is their scale in the scene. */
export const M = 0.135;
export const PLANT_02: Vec3 = [-2.55, 0, -1.6];
export const PLANT_01: Vec3 = [2.55, 0, -1.6];
/** Front face of both plants. */
export const PLANT_FRONT = PLANT_02[2] + 5 * M;
/** The road runs along x in front of the plants; the truck drives on its centre line. */
export const ROAD_Z = 0.35;
/** Long enough to run off both sides of the frame in every Decision shot. */
export const ROAD_LENGTH = 30;
export const TRUCK_X0 = -2.75; // parked at Plant 02, trailer alongside the yard
export const TRUCK_X1 = 2.3; // pulled up at Plant 01
/** How far the Decision shot follows the truck either way (0.15 of its drive, about its midpoint). */
const FOLLOW = 0.15 * ((TRUCK_X1 - TRUCK_X0) / 2);

export function transferredUnits(t: number) {
  const trips = clamp01((t - BEATS.load[0]) / (BEATS.load[1] - BEATS.load[0])) * 3;
  return Math.min(3, Math.floor(trips) + (trips % 1 >= 0.6 ? 1 : 0)) * 80;
}

/** Truck x as the decision chapter plays, plus how far it has driven on along the road during the exit. */
export const truckX = (t: number, exit = 0) =>
  TRUCK_X0 + smootherstep(BEATS.drive[0], BEATS.drive[1], t) * (TRUCK_X1 - TRUCK_X0) + exit * exit * 9;

export function signalCratePose(c: number, t: number, portrait = false): Pose | null {
  if (c === CH.final && portrait) return null; // it stands on the warehouse island, absent there
  switch (c) {
    case CH.fragments:
    case CH.final: {
      const [x, z, ry] = (portrait ? PORTRAIT_ISLANDS : ISLANDS)[WMS];
      const [ox, oy, oz] = CRATE_ON_ISLAND;
      const cs = Math.cos(ry);
      const sn = Math.sin(ry);
      const k = 1.1; // island scale
      return { p: [x + (ox * cs + oz * sn) * k, oy * k, z + (-ox * sn + oz * cs) * k], ry, s: k * ISLAND_TOTE };
    }
    case CH.signal:
      // On its pad on the ground (Marks SignalPing), turning slowly as the reader looks at it.
      return { p: [SIGNAL_AT[0], ISLAND_TOP + (CRATE.h * SIGNAL_S) / 2, SIGNAL_AT[1]], ry: -0.55 + t * 0.4, s: SIGNAL_S };
    case CH.problem:
      return { p: chartPos(CHART_CRATES), s: 1 };
    case CH.context:
      return { p: [0, HUB_Y, 0], ry: 0.4 + t * 0.6, s: CONTEXT_CRATE_S };
    case CH.decision:
      // The shortage is at Plant 01: the tote folds into it as the yard builds up.
      return { p: [PLANT_01[0], 0.25, PLANT_01[2] + 0.9], s: 0 };
    default:
      return null;
  }
}

/* ---------------- Cards: the decision, its layers, functions and industries ---------------- */

export const CARDS = 5; // signal, evidence, context, policy, decision
export const DECISION_CARD = 4;
const UP = Math.PI / 2; // stood up, front face to camera
const FLIP = -Math.PI / 2; // stood up, back face to camera
/** Stood cards lean back a little toward the elevated camera, like boards on a stand. */
const LEAN = 0.2;
/** Centre height of a card of scale s standing on its bottom edge, leaned back by `lean`. */
const standY = (s: number, lean: number) => (CARD.h / 2) * s * Math.cos(lean) + 0.03;
/** Control's fan of layers stands beside Plant 01, where the transfer arrived. */
const FAN: [number, number] = [2.8, -0.45];
/** Size of the fanned layers: large enough that a layer's caption reads at 1440. */
const FAN_S = 1.65;
/** The audit board's size on portrait screens, where it is framed on its own: the Industries board's. */
const FINAL_SP = 1.6;
/** Scale's arc of functions; its front card becomes the Industries board at the origin. */
const SCALE_AT: [number, number] = [0, 0.2];
/** The arc: the neighbours of the front card step out by n; the rest stack straight behind them by f,
 *  so only their top edges show and the front card keeps the room to read (400px wide at 1440). */
const ARC = { nx: 1.25, nz: 1.1, fx: 0, fz: 0.32 };

export function cardPose(k: number, c: number, t: number, portrait = false, phone = false): Pose | null {
  // Phones read the layers and functions as a flat deck at full width (components/story/PhoneDeck.tsx);
  // in 3D they could only be shown a third of that size, so the cards step out for those two chapters.
  if (phone && (c === CH.control || c === CH.scale)) return null;
  switch (c) {
    case CH.control: {
      // The decision opens into the layers it was built from: a fan, square to the viewer.
      const s = FAN_S;
      const [x, z] = isoXZ((k - 2) * 0.78, (k - 2) * 0.62, FAN[0], FAN[1]);
      return { p: [x, standY(s, LEAN), z], rx: UP - LEAN, ry: -0.4 - t * 0.04 + ISO.az, s };
    }
    case CH.scale: {
      // Flip: the back of each card is a different business function. A shallow arc that turns with
      // the scroll, one function at a time at the front, square to the viewer; the rest step back.
      const s = portrait ? 1.1 : 1.25;
      const d = k - scaleF(t);
      const ad = Math.abs(d);
      const near = Math.min(ad, 1);
      const far = Math.max(ad - 1, 0);
      // The step aside leads the step back: halfway through a turn the two cards trading places are
      // already clear of each other, so the card coming in never passes over the one being read.
      const side = smoothstep(0, 0.62, near);
      const [x, z] = isoXZ(Math.sign(d) * (side * ARC.nx + far * ARC.fx) * (s / 1.25), -near * ARC.nz - far * ARC.fz, SCALE_AT[0], SCALE_AT[1]);
      return { p: [x, standY(s, LEAN), z], rx: FLIP - LEAN, ry: -Math.sign(d) * near * 0.85 + ISO.az, s };
    }
    case CH.industries: {
      // The board stands on the road's near verge in front of each industry's place and travels with
      // the camera, turning a half turn per industry as it goes (S69-02).
      if (k !== DECISION_CARD) return null;
      const s = portrait ? IND.boardSP : IND.boardS;
      const [bx, bz] = portrait ? IND.boardP : IND.board;
      return { p: [indX(industryTrack(t)) + bx, standY(s, LEAN) + IND.lift, bz], rx: UP - LEAN, ry: industryF(t) * Math.PI + ISO.az, s };
    }
    case CH.final: {
      // Keeps the last industry's half turn (5π) and tips over its top edge to show the other face:
      // the free AI audit, standing at the hub the six systems feed. Its face is drawn rotated to match.
      // Wide screens end on the Decignal mark at the hub instead (actors/mark.tsx); the board leaves.
      if (k !== DECISION_CARD || !portrait) return null;
      const lean = 0.5;
      const s = portrait ? FINAL_SP : 2.1;
      return { p: [HUB[0], standY(s, lean), HUB[1]], rx: -UP + lean, ry: Math.PI * 5 + ISO.az, s };
    }
    default:
      return null;
  }
}

/* ---------------- 08 Industries: one service road past six places ---------------- */

import { industrySettle } from "./story";

/** The road runs along x; one stop per industry, centred on the origin, the board on the near verge. */
export const IND = {
  step: 4.2,
  roadZ: -0.2,
  roadW: 1.0,
  /** Each industry's place stands behind the road, its models at this scale (island units). */
  siteZ: -2.3,
  siteS: 2.3,
  siteR: 1.6,
  /** Tall enough for the pylon, the chimney's smoke and the globe's satellite. */
  siteH: 3.0,
  /** The board's offset from the stop and its scale; portrait screens stand it in front, larger.
   *  Wide screens stand it on the near verge, left of the place's yard (which reaches about 1.6 to
   *  the left of the stop), so the place is never behind it. */
  board: [-2.1, 1.1] as [number, number],
  boardP: [-0.2, 0.75] as [number, number],
  boardS: 1.7,
  boardSP: 1.6,
  /** Raised on its stand so the board reads at eye level beside the place, not down at the road. */
  lift: 0.6,
  dist: 9.5,
  distP: 7.5,
};
export const indX = (f: number) => (f - 2.5) * IND.step;
/** The road's x range: past the frame's edges at the first and last stops. */
export const IND_ROAD = { x0: indX(0) - 9, x1: indX(5) + 9 };
/** The camera glides between stops over a wider span than the board's half turn (industryF), centred
 *  on the same moment, so each move reads as one travel with the turn inside it. Integer at the holds. */
const GLIDE = 0.8;
export function industryTrack(t: number) {
  let x = 0;
  for (let k = 0; k < 5; k++) {
    const a = industrySettle(k);
    const b = industrySettle(k + 1);
    const m = (a + b) / 2;
    const w = ((b - a) / 2) * GLIDE;
    x += smootherstep(m - w, m + w, t);
  }
  return x;
}

/* ---------------- Camera: what each chapter frames ---------------- */

/**
 * A shot: the subject as vertical pillars [x, z, radius, y0, y1] (world units) that must stay in
 * the free stage, the distance that frames it at full size on a large screen, and a pan applied
 * after framing (the truck follow). Scene.tsx fits the pillars into the screen area the copy leaves
 * free, at the one ISO angle, so only the distance and target ever change between chapters.
 */
export type Shot = { n: number; pil: Float32Array; dist: number; pan: Vec3; exit: number; steady: boolean };
export const makeShot = (): Shot => ({ n: 0, pil: new Float32Array(5 * 12), dist: 10, pan: [0, 0, 0], exit: 0, steady: false });

function pillar(o: Shot, x: number, z: number, r: number, y0: number, y1: number) {
  const i = o.n * 5;
  o.pil[i] = x;
  o.pil[i + 1] = z;
  o.pil[i + 2] = r;
  o.pil[i + 3] = y0;
  o.pil[i + 4] = y1;
  o.n++;
}

/** The six systems as pillars; r 1.42 covers a pad's corners (1.9 x 1.6 drawn at 1.1, turned). */
function islandPillars(o: Shot, portrait: boolean, r: number, h: number) {
  const list = portrait ? PORTRAIT_ISLANDS : ISLANDS;
  for (let s = 0; s < list.length; s++) pillar(o, list[s][0], list[s][1], r, 0, h);
}

/** The shot for chapter c at local progress t. Writes into `o` (no allocation per frame). */
export function shotAt(c: number, t: number, portrait: boolean, o: Shot): Shot {
  o.n = 0;
  o.pan[0] = o.pan[1] = o.pan[2] = 0;
  o.exit = 0;
  o.steady = false;
  // A slow dolly through every hold: the world is alive, never parked.
  const drift = 1 - 0.035 * t;
  switch (c) {
    case CH.fragments:
      islandPillars(o, portrait, 1.42, 1.75);
      o.dist = 20 * drift;
      break;
    case CH.signal:
      // The tote and the six-day ring drawn round it on the ground.
      pillar(o, SIGNAL_AT[0], SIGNAL_AT[1], 0.62, 0, CRATE.h * SIGNAL_S + 0.35);
      // The six-day ring (SignalPing: radius 1.035 at the crate's scale over 1.2) stays whole in frame.
      pillar(o, SIGNAL_AT[0], SIGNAL_AT[1], 1.06 * (SIGNAL_S / 1.2), 0, 0.02);
      o.dist = 6.2 * drift;
      break;
    case CH.problem:
      for (let d = 0; d < DAYS.length; d++) pillar(o, DAY_X(d), 0.05, 0.42, -0.25, DAYS[d] * STEP_Y + 0.3);
      // The safety label left of the chart and the demand line's end on the right (narrow screens
      // carry them in a legend under the axis instead).
      if (!portrait) {
        pillar(o, DAY_X(0) - 1.25, 0, 0.2, SAFETY_Y - 0.1, SAFETY_Y + 0.1);
        pillar(o, DAY_X(6) + 0.6, 0.2, 0.2, 2.2, 2.6);
      }
      o.dist = 17 * drift;
      break;
    case CH.context: {
      for (let s = 0; s < 6; s++) {
        const [x, z] = RING(s);
        pillar(o, x, z, 0.86, 0, 1.6);
      }
      pillar(o, 0, 0, 0.6, 0, CRATE.h * CONTEXT_CRATE_S);
      o.dist = 20 * drift;
      break;
    }
    case CH.decision:
      // Both plants, the yard and the road between them; the road itself runs off both sides. The
      // follow below slides the yard up to FOLLOW either way as the truck crosses: room for it all round.
      pillar(o, PLANT_02[0], PLANT_02[2] + 0.2, 1.5 + FOLLOW, 0, 1.25);
      pillar(o, PLANT_01[0], PLANT_01[2] + 0.2, 1.5 + FOLLOW, 0, 1.25);
      pillar(o, PLANT_02[0] - 0.4, ROAD_Z, 0.5 + FOLLOW, 0, 0.55);
      pillar(o, PLANT_01[0] + 0.4, ROAD_Z, 0.5 + FOLLOW, 0, 0.55);
      o.dist = 16 * drift;
      // A gentle follow as the truck crosses the yard: no whip pan.
      o.pan[0] = 0.15 * (truckX(t) - (TRUCK_X0 + TRUCK_X1) / 2);
      break;
    case CH.control:
      for (let k = 0; k < CARDS; k++) {
        // Each layer is turned 0.4 from square: about 0.92 of its half width either side on screen.
        // The outer layers also budget the step aside a read neighbour gives them (cards.tsx).
        const [x, z] = isoXZ((k - 2) * 0.78, (k - 2) * 0.62, FAN[0], FAN[1]);
        const edge = k === 0 || k === CARDS - 1 ? 0.3 : 0;
        pillar(o, x, z, (CARD.w / 2) * FAN_S * 0.92 + edge, 0, CARD.h * FAN_S + 0.1);
      }
      o.dist = 13.3 * drift;
      break;
    case CH.scale: {
      // Framed on the arc as a whole, both sides at their widest (the neighbours and the last card of
      // the stack), so the front card holds still while the arc turns.
      const k = portrait ? 1.1 / 1.25 : 1;
      pillar(o, SCALE_AT[0], SCALE_AT[1], 1.02 * k, 0, 1.3 * k);
      for (const side of [-1, 1]) {
        for (const far of [0, CARDS - 2]) {
          const [x, z] = isoXZ(side * (ARC.nx + far * ARC.fx) * k, -ARC.nz - far * ARC.fz, SCALE_AT[0], SCALE_AT[1]);
          // A turned neighbour, leaned back and nearer at its outer edge, reads about 0.9 wide on screen.
          pillar(o, x, z, 0.9 * k, 0, 1.3 * k);
        }
      }
      o.dist = 9.6 * drift;
      break;
    }
    case CH.industries: {
      // A tracking shot along the road: the board and the place behind it, the same shape at every
      // stop so the distance holds while the camera glides from one industry to the next.
      const x = indX(industryTrack(t));
      const s = portrait ? IND.boardSP : IND.boardS;
      const [bx, bz] = portrait ? IND.boardP : IND.board;
      const top = standY(s, LEAN) + IND.lift + (CARD.h / 2) * s;
      // The board is a thin plane square to the viewer: framed by its two side edges, not a round
      // footprint, which would read about a third wider than it is.
      const ry = ISO.az - 0.12;
      const hw = (CARD.w / 2) * s;
      for (const e of [-1, 1]) pillar(o, x + bx + e * hw * Math.cos(ry), bz - e * hw * Math.sin(ry), 0.08, 0, top);
      if (!portrait) pillar(o, x, IND.siteZ, IND.siteR, 0, IND.siteH);
      o.dist = (portrait ? IND.distP : IND.dist) * (1 - 0.02 * t);
      break;
    }
    default: {
      // Decide: back to the opening angle, the network resolved round the audit board at its hub.
      if (portrait) {
        // Portrait frames the audit board itself, as wide as the stage allows, so its face reads (300px
        // or more on a phone): framed by its two side edges, square to the viewer, and its top.
        const hw = (CARD.w / 2) * FINAL_SP;
        const top = CARD.h * FINAL_SP * Math.cos(0.5) + 0.05;
        for (const e of [-1, 1]) pillar(o, HUB[0] + e * hw * ISO_R[0], HUB[1] + e * hw * ISO_R[2], 0.14, 0, top);
        // The stand's foot rails reach out toward the viewer: keep them clear of the card below.
        pillar(o, HUB[0] + 0.45 * SA, HUB[1] + 0.45 * CA, 0.05, 0, 0.02);
        o.dist = 12; // phones are framed by the stage; a portrait tablet stops at about 450px
      } else {
        islandPillars(o, portrait, 1.42, 1.75);
        pillar(o, HUB[0], HUB[1], 1.3, 0, 1.6);
        o.dist = 23 * (1 - 0.03 * t);
      }
      // The board carries on into the hub while the systems rise round it: the camera keeps an even
      // pace with them instead of pulling back ahead of the world it reveals.
      o.steady = true;
      // The exit: the world sinks and steps back as the page below arrives (S69-07).
      o.exit = smootherstep(FINAL_EXIT, 1, t);
    }
  }
  return o;
}

/** Re-exported for the exit of the last chapter, which blendAt does not blend. */
export { finalExit };

export { clamp01 };

/* ---------------- Background: one pale solid per chapter, no gradients ---------------- */

// Each chapter's sky is a pale solid of its colour (components/story/chapters.ts TONE); scrolling
// eases from one solid to the next, and the fog takes the same colour so the far ground still melts
// into the page. Warm chapters lean pink, never peach or cream (shadows on peach read brown).
const SKY = {
  cobalt: [233, 238, 255],
  signal: [255, 236, 241],
  violet: [240, 236, 255],
  emerald: [229, 246, 239],
  rose: [252, 237, 248],
  sky: [236, 242, 250],
} as const satisfies Record<string, readonly [number, number, number]>;
const BG: (readonly [number, number, number])[] = [
  SKY.cobalt, // systems
  SKY.signal, // signal
  SKY.signal, // problem
  SKY.violet, // context
  SKY.emerald, // decision
  SKY.emerald, // control
  SKY.rose, // scale
  SKY.sky, // industries: each industry brings its own colour on its board and place
  SKY.cobalt, // final
];

/** Background colour at story position g, as [r, g, b]. */
export function bgAt(g: number): [number, number, number] {
  const { i, j, e } = blendAt(g);
  return BG[i].map((v, n) => Math.round(v + (BG[j][n] - v) * e)) as [number, number, number];
}
