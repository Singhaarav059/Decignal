// World layout for the 3D story. Every actor has a pose per chapter; chapters it is absent
// from return null, and the actor scales in or out of the scene during the transition.
// A pose with s: 0 is a point the actor folds into (or grows out of), so a hand-off reads as cause
// and effect: the islands fold into the tote, the tote leaves for Plant 01 (see actors/core).
import { BEATS, CH, blendAt, clamp01, finalExit, smootherstep, scaleDeal, SCALE_DEAL } from "./story";

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
const isoXZ = (x: number, z: number, cx = 0, cz = 0): [number, number] => [cx + x * CA + z * SA, cz - x * SA + z * CA];

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
// Portrait (phones, upright tablets): a tidy two by three grid, every pad square to the viewer and the
// columns close, so the six fill a phone's tall stage larger. Each turned its own way, the six read as
// scattered on a phone, and their wide footprint kept them small.
const PORTRAIT_LAYOUT: [number, number, number][] = [
  [-1.25, -4.9, ISO.az], [1.25, -4.9, ISO.az], [-1.25, -1.2, ISO.az],
  [1.25, -1.2, ISO.az], [-1.25, 2.5, ISO.az], [1.25, 2.5, ISO.az],
];
const aboutHub = (l: [number, number, number][]) =>
  l.map(([x, z, ry]) => [...isoXZ(x - HUB[0], z - HUB[1], HUB[0], HUB[1]), ry] as [number, number, number]);
const ISLANDS = aboutHub(HERO_LAYOUT);
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
const HUB_Y = (CRATE.h * CONTEXT_CRATE_S) / 2;

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
const CRATE_ON_ISLAND: Vec3 = [0.48, ISLAND_TOP + CRATE.h * ISLAND_TOTE * 1.5, 0.42];
/** Signal: the tote stands on the ground in front of the hub, where the six systems fold into it. */
const SIGNAL_AT: [number, number] = [0.1, 0.55];
const SIGNAL_S = 1.5;

/* ---------------- 03 Problem: crates become the inventory chart ---------------- */

export const DAYS = [6, 6, 5, 4, 4, 3, 2];
export const STEP_Y = CRATE.h + 0.035;
export const DAY_X = (d: number) => (d - 3) * 1.0;
export const SAFETY_Y = 2.5 * STEP_Y;
/** Stock behind the chart: each tote holds about 70 units; today's count is exact. */
const UNITS_PER_CRATE = 70;
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
/** Scale's hand of functions stands about this point; its last function card becomes the Industries board. */
const SCALE_AT: [number, number] = [0, 0.2];
/**
 * Scale's hand: the cards turned upright (portrait), dealt one per step into a fan square to the viewer,
 * each a little in front of the one before so the newest lands on top. Slot i's roll is (i - mid) * roll,
 * its centre on an arc about a pivot far below, so the fan's top is a gentle arch. The whole hand stands
 * on the ground: its lowest corner rests on it. Cards not yet dealt wait off the right of the frame.
 * `step` is the gap between slot centres, in card widths.
 */
export const HAND = { s: 1.2, sP: 1.0, slots: SCALE_DEAL, step: 0.5, roll: 0.085, gap: 0.09, deck: 2.8, open: 0.6, nudge: 0.1 };
/** How far card k slides right (in card widths) while card f is read. The card lying straight over f
 *  slides off it and tucks under the next one; the rest of the hand only steps aside enough to clear
 *  f's tilted corner, so the hand barely widens and never runs off the frame. */
export const handShift = (k: number, f: number) => (f < 0 || k <= f ? 0 : k === f + 1 ? HAND.open : HAND.nudge);
/** The quarter turn that stands a card upright for the hand (its function face is drawn to match). */
export const HAND_TURN = Math.PI / 2;
type Slot = { u: number; v: number; d: number; roll: number };
const slotCache = new Map<number, Slot[]>();
/** Every slot of the hand at card scale s: u right and v up in the cards' leaned plane, d toward the viewer. */
function handSlots(s: number): Slot[] {
  let out = slotCache.get(s);
  if (out) return out;
  const W = CARD.h * s;
  const H = CARD.w * s;
  const mid = (HAND.slots - 1) / 2;
  const R = (HAND.step * W) / HAND.roll; // the arc whose chord between slots is one step
  out = Array.from({ length: HAND.slots }, (_, i) => {
    const roll = (i - mid) * HAND.roll;
    return { u: R * Math.sin(roll), v: R * (Math.cos(roll) - 1), d: i * HAND.gap, roll };
  });
  // Rest the lowest corner on the ground (standY's 0.03 clearance), measured in the leaned plane.
  const low = Math.min(...out.map((o) => o.v - (W / 2) * Math.abs(Math.sin(o.roll)) - (H / 2) * Math.cos(o.roll) + (o.d * Math.sin(LEAN)) / Math.cos(LEAN)));
  out.forEach((o) => (o.v += 0.03 / Math.cos(LEAN) - low));
  slotCache.set(s, out);
  return out;
}
/** Where the screen's right edge crosses the hand (u), read from the camera while Scale is on screen
 *  (actors/cards.tsx DeckEdge); -Infinity otherwise. */
let deckEdge = -Infinity;
export const setDeckEdge = (u: number) => void (deckEdge = u);
/** A point of the hand's plane at u along it (its middle height, front row): for DeckEdge. */
export const handAxis = (u: number) => handWorld(u, 0, 0);
/** Card i's place in the hand when `deal` cards are dealt (fractional while one is on its way). A card
 *  on its way comes in from the right, rising over the hand and turning into its slot. */
function handPlace(i: number, deal: number, s: number): Slot {
  const slots = handSlots(s);
  const at = slots[i];
  const W = CARD.h * s;
  const k = clamp01(deal - (i - 1));
  if (k >= 1) return at;
  const e = smootherstep(0, 1, k);
  // The deck waits beyond the screen's right edge as well: a near-square screen (790x780) frames the
  // hand small in a short band over the card, and the deck stood half in view.
  const deck = Math.max(slots[slots.length - 1].u + HAND.deck * W, deckEdge + W);
  return {
    u: deck + (at.u - deck) * e,
    v: at.v + Math.sin(Math.PI * e) * 0.18 * W,
    d: at.d + (1 - e) * 0.06,
    roll: at.roll + (1 - e) * 0.45,
  };
}
/** World position of a point at (u, v, d) in the hand's leaned plane. */
function handWorld(u: number, v: number, d: number): Vec3 {
  const y = v * Math.cos(LEAN) + d * Math.sin(LEAN);
  const [x, z] = isoXZ(u, d * Math.cos(LEAN) - v * Math.sin(LEAN), SCALE_AT[0], SCALE_AT[1]);
  return [x, y, z];
}
/** Pose of card i (0..4 the functions, 5 the glass layer card) in Scale's hand at local t. `peek` deals a
 *  waiting card in early while its function is pointed at on the page. */
export function handPose(i: number, t: number, portrait: boolean, peek = 0): Pose {
  const s = portrait ? HAND.sP : HAND.s;
  const { u, v, d } = handPlace(i, Math.max(scaleDeal(t), i - 1 + peek), s);
  return { p: handWorld(u, v, d), rx: FLIP - LEAN, ry: ISO.az, s };
}
/** The roll of card i in the hand about its own face, as the hand's pose cannot carry it (cardPose). */
export function handRoll(i: number, t: number, portrait: boolean, peek = 0) {
  return handPlace(i, Math.max(scaleDeal(t), i - 1 + peek), portrait ? HAND.sP : HAND.s).roll;
}

export function cardPose(k: number, c: number, t: number, portrait = false, phone = false, peek = 0): Pose | null {
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
    case CH.scale:
      // Flip: the back of each card is a different business function, dealt into a hand one per step.
      return handPose(k, t, portrait, peek);
    case CH.final: {
      // The free AI audit, standing at the hub the six systems feed, tipped back to face the viewer
      // after a half turn (its face is drawn rotated to match). It rises there as Industries hands over.
      // Wide screens end on the Decignal mark at the hub instead (actors/mark.tsx).
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

/** The road runs along x; one stop per industry, centred on the origin, each place behind the road. */
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
  /** How far the near verge reaches toward the viewer (it was laid out to the old board's feet). */
  verge: 1.75,
  dist: 9.5,
};
export const indX = (f: number) => (f - 2.5) * IND.step;
/** Screens this wide stand each industry's callout (IndustryCallout) beside the card; narrower ones
 *  stand it above the place, under the nav. */
export const IND_BESIDE_MIN = 1024;
/** Where the place stands this frame on those screens (Scene setStage): `under` the callout, right of the
 *  card, where the slot beside the callout is too narrow; the callout's leader then leaves its foot. */
export const indLayout = { under: false };
/** Each place's reach along the screen's right axis from its centre (world units, measured from its
 *  parts): the round footprint the shot used to frame cut the wider ones (the quay, the substation's
 *  pole, the truck's cab) at the stage's edge. */
const IND_REACH: [number, number][] = [
  [-1.75, 1.6], // factory
  [-1.42, 2.0], // truck
  [-1.7, 1.66], // store
  [-1.88, 2.4], // quay
  [-1.9, 1.24], // ops room
  [-1.9, 1.9], // substation (its feeder runs on off the frame by design)
];
/** The reach at a camera position between stops, eased like the glide. */
function indReach(track: number): [number, number] {
  const k = Math.min(Math.max(Math.floor(track), 0), IND_REACH.length - 1);
  const n = Math.min(k + 1, IND_REACH.length - 1);
  const a = smootherstep(0, 1, track - k);
  return [IND_REACH[k][0] + (IND_REACH[n][0] - IND_REACH[k][0]) * a, IND_REACH[k][1] + (IND_REACH[n][1] - IND_REACH[k][1]) * a];
}
/** Each place's height (world units, measured from its parts, the factory's to its smoke): portrait
 *  screens frame each place by its own, as siteH left the low ones (the truck, the quay) small under a
 *  band of empty sky in the short space a phone leaves between the callout and the card. */
const IND_TOP = [3.0, 1.45, 1.75, 1.35, 1.8, 2.25];
/** The height at a camera position between stops, eased like the glide. */
function indTop(track: number) {
  const k = Math.min(Math.max(Math.floor(track), 0), IND_TOP.length - 1);
  const n = Math.min(k + 1, IND_TOP.length - 1);
  return IND_TOP[k] + (IND_TOP[n] - IND_TOP[k]) * smootherstep(0, 1, track - k);
}

/** Where the callout's leader meets each place (island units from the place's centre): the part of it
 *  the decision is about, on the side facing the callout. */
const IND_PIN: Vec3[] = [
  [-0.36, 0.42, 0.18], // the factory's line hall
  [-0.2, 0.26, 0.05], // the harness crates on the trailer
  [-0.32, 0.36, 0.3], // the store's awning
  [-0.3, 0.3, 0.0], // the containers on the quay
  [-0.28, 0.3, -0.05], // the server racks
  [0.02, 0.4, 0.06], // the transformer
];
export const indPin = (k: number): Vec3 => {
  const [x, y, z] = IND_PIN[k];
  return [indX(k) + x * IND.siteS, y * IND.siteS, IND.siteZ + z * IND.siteS];
};
/** The road's x range: past the frame's edges at the first and last stops. */
export const IND_ROAD = { x0: indX(0) - 9, x1: indX(5) + 9 };
/** The camera glides between stops over a wider span than the title's roll (industryF), centred
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
export type Shot = { n: number; pil: Float32Array; dist: number; pan: Vec3; exit: number; steady: boolean; open: number };
export const makeShot = (): Shot => ({ n: 0, pil: new Float32Array(5 * 16), dist: 10, pan: [0, 0, 0], exit: 0, steady: false, open: 0.5 });

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
  o.open = 0.5;
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
      // carry them in a legend under the axis instead). The demand label is "DEMAND +18%" in full, from
      // 0.16 past the line's end to about 1.4 on a short screen (Marks.tsx grows its type there): a pillar
      // at 0.6 kept only its first half in frame, and at 1280 x 800 the figure ran off the right edge.
      if (!portrait) {
        pillar(o, DAY_X(0) - 1.25, 0, 0.2, SAFETY_Y - 0.1, SAFETY_Y + 0.1);
        pillar(o, DAY_X(6) + 0.95, 0.2, 0.5, 2.2, 2.6);
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
      // Framed on the whole hand as dealt, so the camera holds still while cards land in it: the
      // corners and outer edges of the two outer cards (points, so a tilted edge between two corners
      // must be pinned too or it slides under the card), and the tops of the middle two (the arch's
      // crown). Cards on their way come in from beyond the frame's right edge. 15 of the 16 pillars.
      const s = portrait ? HAND.sP : HAND.s;
      const W = (CARD.h / 2) * s;
      const H = (CARD.w / 2) * s;
      const slots = handSlots(s);
      const corner = (i: number, a: number, b: number) => {
        const { u, v, d, roll } = slots[i];
        const cu = a * W * Math.cos(roll) + b * H * Math.sin(roll);
        const cv = -a * W * Math.sin(roll) + b * H * Math.cos(roll);
        const [x, y, z] = handWorld(u + cu, v + cv, d);
        pillar(o, x, z, 0.04, y, y);
      };
      for (const i of [0, slots.length - 1]) for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) corner(i, a, b);
      // The first card's left edge leans out toward the top, over the card's top-right corner: points
      // every quarter of it, so no stretch between two of them crosses that corner.
      for (const b of [0.75, 0.5, 0.25, 0]) corner(0, -1, b);
      corner(slots.length - 1, 1, 0);
      corner(2, -1, 1);
      corner(3, 1, 1);
      // Centred in the open space right of the card, under the head's figures.
      o.open = 1;
      o.dist = 9.6 * drift;
      break;
    }
    case CH.industries: {
      // A tracking shot along the road: the place alone, its callout page text beside the card on wide
      // screens or above the place on narrow ones, outside the stage (Scene setStage). Its height and
      // depth by the round footprint, its width by what it reaches either side, so the distance holds
      // while the camera glides from one industry to the next.
      const track = industryTrack(t);
      const x = indX(track);
      pillar(o, x, IND.siteZ, IND.siteR, 0, portrait ? indTop(track) : IND.siteH);
      for (const r of indReach(track)) pillar(o, x + r * ISO_R[0], IND.siteZ + r * ISO_R[2], 0.05, 0, 0.6);
      o.dist = IND.dist * (1 - 0.02 * t);
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
      // The exit: the world drifts up with the page below as its sheet arrives (finalExit).
      o.exit = finalExit(CH.final + t);
    }
  }
  return o;
}

/* ---------------- Background: one pale solid per chapter, under a soft field ---------------- */

// Each chapter's sky is a pale solid of its colour (components/story/chapters.ts TONE); scrolling
// eases from one solid to the next, and the fog takes the same colour so the far ground still melts
// into the page. Warm chapters lean pink, never peach or cream (shadows on peach read brown).
// components/Backdrop.tsx lays the chapter's field of blooms and a film grain over the solid
// (fields.css), keeping the blooms to the edges so the ground still melts into the solid.
const SKY = {
  cobalt: [233, 238, 255],
  signal: [255, 236, 241],
  violet: [240, 236, 255],
  emerald: [229, 246, 239],
  rose: [252, 237, 248],
  sky: [236, 242, 250],
} as const satisfies Record<string, readonly [number, number, number]>;
type SkyKey = keyof typeof SKY;
export const SKY_KEYS = Object.keys(SKY) as SkyKey[];
const SKY_OF: SkyKey[] = [
  "cobalt", // systems
  "signal", // signal
  "signal", // problem
  "violet", // context
  "emerald", // decision
  "emerald", // control
  "rose", // scale
  "sky", // industries: each industry brings its own colour on its board and place
  "cobalt", // final
];
const BG = SKY_OF.map((k) => SKY[k]);

/** How much of each chapter sky (and so its field) shows at story position g. */
export function skyWeights(g: number): Record<SkyKey, number> {
  const { i, j, e } = blendAt(g);
  const w = Object.fromEntries(SKY_KEYS.map((k) => [k, 0])) as Record<SkyKey, number>;
  w[SKY_OF[i]] += 1 - e;
  w[SKY_OF[j]] += e;
  return w;
}

/** Background colour at story position g, as [r, g, b]. */
export function bgAt(g: number): [number, number, number] {
  const { i, j, e } = blendAt(g);
  return BG[i].map((v, n) => Math.round(v + (BG[j][n] - v) * e)) as [number, number, number];
}
