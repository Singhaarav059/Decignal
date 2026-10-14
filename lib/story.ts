// Shared story timeline. One scroll value (g) drives the 3D scene and the DOM overlay.
// g = chapterIndex + localProgress. Each chapter holds its state, then transitions
// into the next one after `ts` (transition start) of its length.

export type Chapter = {
  id: string;
  label: string;
  len: number; // length in viewport heights
  ts: number; // fraction of the chapter where the transition to the next one begins
};

// Story length budget (viewport heights): 16.7 in all. Scale holds one function per step (S69-04),
// then one more for the glass layer card that lands on the fan;
// the final chapter is short and ends in an exit (S69-07).
export const CHAPTERS: Chapter[] = [
  // The hero hands off almost at once (ts 0.12): a long hold read as the page sticking, then the camera
  // and the folding islands rushed through half the distance (a flash). Now the move starts with the
  // first scroll and spreads over nearly the whole chapter.
  { id: "fragments", label: "Systems", len: 1.3, ts: 0.12 },
  { id: "signal", label: "Signal", len: 1.3, ts: 0.5 },
  { id: "problem", label: "Problem", len: 1.5, ts: 0.55 },
  { id: "context", label: "Context", len: 1.5, ts: 0.55 },
  { id: "decision", label: "Decision", len: 2.7, ts: 0.9 },
  { id: "control", label: "Control", len: 1.7, ts: 0.62 },
  { id: "scale", label: "Scale", len: 2.5, ts: 0.75 },
  { id: "industries", label: "Industries", len: 3.2, ts: 0.85 },
  { id: "final", label: "Decide", len: 1, ts: 1 },
];

export const CH = Object.fromEntries(CHAPTERS.map((c, i) => [c.id, i])) as Record<string, number>;
export const TOTAL_LEN = CHAPTERS.reduce((s, c) => s + c.len, 0);

/** How long the scroll must rest before hover effects wake (ms). */
export const HOVER_REST = 380;

export const store = {
  g: 0,
  /** How far the page below has slid over the finished story, 0..1 (finalExit). */
  after: 0,
  velocity: 0, // scroll velocity from Lenis, px per frame
  /** performance.now() of the last scroll frame (Lenis), so hover effects can wait for the scroll to settle. */
  scrollAt: -1e9,
  /** performance.now() of the first frame of the current scroll (after a pause of HOVER_REST or more). */
  scrollFrom: -1e9,
  /** performance.now() of the pointer's last real move (not content sliding under a still pointer). */
  pointerAt: -1e9,
  pointer: { x: 0, y: 0 },
  camK: 1, // how far narrow screens step the camera back (1 on desktop)
  /** Pointer is over the page (false once it leaves the window). */
  pointerIn: false,
  /** Card under the pointer in the chapters where cards can be read, or -1. */
  focus: -1,
  /** A card the page asks to bring forward (the approval panel points at the decision card). */
  focusHint: -1,
  /** The page points at the signal crate (hovering its readout), so it lifts and glows. */
  signalHint: false,
  /** The system island opened for a closer look (click), or -1. */
  selected: -1,
  /** A system the page points at (hovering its chip), lifted as if under the pointer. */
  islandHint: -1,
  /** Screen position (px) of the opened island's top, for the panel's leader line. */
  anchor: { x: 0, y: 0 },
  /** The one 3D pin open at this scroll position, from the timeline (pinAt), or null. Written by setG. */
  pin: null as string | null,
  /** A pin the page points at (hover or focus on a card row), which wins over the timeline's pin. */
  pinHint: null as string | null,
  /** The StoryCard's viewport rect in CSS px (written by StoryCard), or null when no card shows. */
  cardRect: null as CardRect | null,
  /** The story canvas has drawn its first frames (shaders compiled). */
  sceneReady: false,
  /** The reader's choice in the Control panel (written by DecisionControls), drawn on the 3D decision card. */
  decision: { mode: "idle", qty: 240 } as StoryDecision,
  selectListeners: new Set<(i: number) => void>(),
  listeners: new Set<(g: number) => void>(),
};

export type CardRect = { x: number; y: number; w: number; h: number };
export type StoryDecision = { mode: "idle" | "approved" | "rejected"; qty: number };

/** StoryCard reports its viewport rect (ResizeObserver plus resize); null when it is gone. */
export function setCardRect(r: CardRect | null) {
  store.cardRect = r;
}

/** Points at a pin from the page (null clears it). The open pin is activePin(). */
export function setPinHint(id: string | null) {
  store.pinHint = id;
}

/** The pin that is open now: the page's hint, else the timeline's. */
export const activePin = () => store.pinHint ?? store.pin;

export function setSceneReady(ready = true) {
  store.sceneReady = ready;
}

export function setG(g: number) {
  store.g = g;
  store.pin = pinAt(g);
  store.listeners.forEach((l) => l(g));
}

export function select(i: number) {
  if (store.selected === i) return;
  store.selected = i;
  store.selectListeners.forEach((l) => l(i));
}

export function onSelect(fn: (i: number) => void) {
  store.selectListeners.add(fn);
  return () => {
    store.selectListeners.delete(fn);
  };
}

export function subscribe(fn: (g: number) => void) {
  store.listeners.add(fn);
  fn(store.g);
  return () => {
    store.listeners.delete(fn);
  };
}

/** Converts story scroll progress (0..1) into g. */
export function progressToG(p: number) {
  let d = Math.min(Math.max(p, 0), 1) * TOTAL_LEN;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const len = CHAPTERS[i].len;
    if (d <= len || i === CHAPTERS.length - 1) return i + Math.min(d / len, 1);
    d -= len;
  }
  return CHAPTERS.length;
}

/** Inverse of progressToG. */
export function gToProgress(g: number) {
  const i = Math.min(Math.floor(g), CHAPTERS.length - 1);
  const before = CHAPTERS.slice(0, i).reduce((s, c) => s + c.len, 0);
  return (before + (g - i) * CHAPTERS[i].len) / TOTAL_LEN;
}

export const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/** Splits g into the two chapter states being blended and the eased blend amount. */
export function blendAt(g: number) {
  const last = CHAPTERS.length - 1;
  const i = Math.min(Math.floor(g), last);
  const local = i === last ? clamp01(g - last) : g - i;
  const e = i === last ? 0 : smootherstep(CHAPTERS[i].ts, 1, local);
  return { i, j: Math.min(i + 1, last), local, e };
}

/** How much state c is present at g (0..1). */
export function weight(c: number, g: number) {
  const { i, j, e } = blendAt(g);
  let w = 0;
  if (c === i) w += 1 - e;
  if (c === j && j !== i) w += e;
  return w;
}

/** Local progress (0..1) within chapter c, clamped. */
export function localIn(c: number, g: number) {
  return clamp01(g - c);
}

/* ------------------------------------------------------------------ */
/* Beats: what each chapter points at as it plays                       */
/* ------------------------------------------------------------------ */

/** Decision chapter beats, as local progress through the chapter. */
export const BEATS = {
  load: [0.05, 0.4] as const, // three forklift trips at Plant 02
  drive: [0.43, 0.6] as const,
  // Plant 01's forklift takes the three pallets off the trailer into its bays; then the empty truck leaves.
  unload: [0.63, 0.88] as const,
};

/** Context steps through the evidence one system at a time, in the card's order: WMS, Suppliers, External. */
export const CONTEXT_PINS = [3, 4, 5] as const;
/** Which evidence step (0..2) Context shows at local t: its hold (0.05 to 0.55) in three equal beats. */
export const contextBeat = (t: number) => Math.min(2, Math.max(0, Math.floor((t - 0.05) / (0.5 / 3))));

/**
 * Steps through `count` items over local progress a..a+u: equal holds, each followed by a turn that
 * takes `turn` of a hold's length. Returns the item in front, fractional while turning.
 */
export function stepped(t: number, a: number, u: number, count: number, turn: number) {
  const h = u / (count + (count - 1) * turn);
  const p = h * (1 + turn);
  const n = count - 1;
  const x = Math.min(Math.max(t - a, 0), u);
  const k = Math.min(Math.floor(x / p), n);
  const r = x - k * p;
  return k < n && r > h ? k + smootherstep(h, p, r) : k;
}
/** Local progress in the middle of item k's hold, for `stepped` with the same arguments. */
export const steppedAt = (k: number, a: number, u: number, count: number, turn: number) => {
  const h = u / (count + (count - 1) * turn);
  return a + k * h * (1 + turn) + h / 2;
};

/** Scale deals its hand one card per step: the five functions, then the glass layer card that lands on
 *  top of them. How many are dealt at local t (fractional while one is on its way). */
export const SCALE_DEAL = 6;
export const scaleDeal = (t: number) => stepped(t, 0.03, CHAPTERS[CH.scale].ts - 0.06, SCALE_DEAL, 0.6);
/** The function being read: the last one dealt (the glass card's step keeps the last function). */
export const scaleF = (t: number) => Math.min(FUNCTIONS.length - 1, scaleDeal(t));
export const scaleBeat = (t: number) => Math.round(scaleF(t));
/** Local progress where step k holds (for jumps from the card's function tabs). */
export const scaleSettle = (k: number) => steppedAt(k, 0.03, CHAPTERS[CH.scale].ts - 0.06, SCALE_DEAL, 0.6);

/**
 * The hand-off to the page below: how far its sheet has slid over the finished story (0..1, from
 * SmoothScroll). The story holds its last frame to the end of its track; then, as the sheet rises, the
 * world and the closing copy drift up with it at a slower pace (parallax), never sinking against it.
 */
export const finalExit = (g: number) => (g >= CHAPTERS.length - 1e-4 ? store.after : 0);
/** Screen heights the closing layer drifts up while the sheet covers it (the sheet itself travels 1). */
export const EXIT_DRIFT = 0.42;

export function setAfter(p: number) {
  const v = clamp01(p);
  if (Math.abs(v - store.after) < 1e-4) return;
  store.after = v;
  store.listeners.forEach((l) => l(store.g));
}

/**
 * The one 3D pin open at g, by chapter and beat. Ids: "island:<system>" (Context), "plant02",
 * "truck", "plant01" (Decision), "fn:<k>" (Scale), "industry:<k>" (Industries). Hero, Signal,
 * Problem, Control and Final pin nothing by default; between chapters nothing is pinned.
 */
export function pinAt(g: number): string | null {
  const { i, local, e } = blendAt(g);
  if (e > 0.4) return null;
  switch (i) {
    case CH.context:
      return `island:${CONTEXT_PINS[contextBeat(local)]}`;
    case CH.decision:
      return local < BEATS.drive[0] ? "plant02" : local < BEATS.drive[1] - 0.05 ? "truck" : "plant01";
    case CH.scale:
      return `fn:${scaleBeat(local)}`;
    case CH.industries:
      return `industry:${Math.round(industryF(local))}`;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Product truth: one running example, used everywhere.                 */
/* ------------------------------------------------------------------ */

export const SYSTEMS = ["ERP", "CRM", "MES", "WMS", "SUPPLIERS", "EXTERNAL"] as const;

// Figures follow the fact sheet in lib/example.ts; section and chapter strings live in lib/copy.ts.

export const CONTEXT = [
  { system: "ERP", title: "410 on hand, safety stock 175" },
  { system: "CRM", title: "Open orders up 18%" },
  { system: "MES", title: "45 X90 used a day" },
  { system: "WMS", title: "Plant 02 holds 620" },
  { system: "SUPPLIERS", title: "Next delivery in 21 days" },
  { system: "EXTERNAL", title: "Lane clear, 2 days" },
];

export const LAYERS = [
  { name: "Signal", text: "Plant 01 below safety stock on day 6" },
  { name: "Evidence", text: "Orders up 18% in 3 weeks" },
  { name: "Context", text: "Plant 02 holds 620 units, 240 above its plan" },
  { name: "Policy", text: "Max 300 units, planner approves" },
  { name: "Decision", text: "Transfer 240 units, Plant 02 to Plant 01" },
];

export const FUNCTIONS = [
  { name: "Supply Chain", decision: "Transfer 240 units, Plant 02 to Plant 01" },
  { name: "Operations", decision: "Service Line 04 bearing by Friday" },
  { name: "Commercial", decision: "Shift 12% of allocation to the West" },
  { name: "Customer", decision: "Escalate 14 service cases, one root cause" },
  { name: "Finance & Risk", decision: "Hold 3 invoices until goods arrive" },
];

export const INDUSTRIES = [
  {
    name: "Manufacturing",
    decision: "Reserve Friday’s service window for Line 04",
    system: "MES · CMMS · IoT",
    challenge: "Downtime, quality drift and schedule risk move faster than the morning review.",
    decisions: ["Reserve Friday’s service window for Line 04", "Resequence Line 03 before the 14:00 shift", "Hold Batch 2214 for a seal inspection"],
    start: "Predictive Maintenance",
    weeks: "6 to 10",
  },
  {
    name: "Automotive",
    decision: "Reserve 1,200 harnesses for the launch build",
    system: "ERP · DMS · Supplier portal",
    challenge: "A launch build depends on thousands of parts from hundreds of suppliers arriving on time.",
    decisions: ["Reserve 1,200 harnesses for the launch build", "Dual-source 2 parts ahead of a port delay", "Shift 12% of dealer allocation to the West"],
    start: "Supply Chain Risk",
    weeks: "5 to 8",
  },
  {
    name: "Retail",
    decision: "Shift 3,400 units from North to West DC",
    system: "POS · WMS · Planning",
    challenge: "Demand moves by region and by week, faster than replenishment cycles can follow.",
    decisions: ["Shift 3,400 units from North to West DC", "Raise the West DC order by 1,800 units", "Mark down 6 slow lines before season end"],
    start: "Demand & Replenishment",
    weeks: "5 to 7",
  },
  {
    name: "Logistics",
    decision: "Reroute 6 containers through Mombasa",
    system: "TMS · Port feeds · ERP",
    challenge: "Disruption at one port ripples through every lane, booking and promise date.",
    decisions: ["Reroute 6 containers through Mombasa", "Rebook 14 shipments onto Tuesday’s sailing", "Warn 3 customers of a 2-day delay"],
    start: "Supply Chain Risk",
    weeks: "5 to 8",
  },
  {
    name: "Financial Services",
    decision: "Review 18 payments before settlement",
    system: "Core banking · Risk · Docs",
    challenge: "High-volume exceptions need fast review without loosening control.",
    decisions: ["Review 18 payments before settlement", "Hold 3 invoices until goods arrive", "Escalate 2 accounts for a KYC refresh"],
    start: "Finance & Risk Operations",
    weeks: "6 to 8",
  },
  {
    name: "Energy",
    decision: "Send a crew to Feeder 7 before peak load",
    system: "SCADA · GIS · Work orders",
    challenge: "Peak load and asset health decide where a limited number of crews should go.",
    decisions: ["Send a crew to Feeder 7 before peak load", "Defer a transformer swap to the weekend", "Pre-position spares at Substation 12"],
    start: "Predictive Maintenance",
    weeks: "6 to 10",
  },
];

/** Each industry's accent, matching its 3D card badge (components/three/faces.ts INDUSTRY_TONE). */
export const INDUSTRY_TONE = ["emerald", "cobalt", "pink", "tangerine", "violet", "saffron"] as const;

/** The industries stand on the ground: no turning block any more (kept for old importers). */
export const PLINTH_H = 0;

/* Industries: six equal holds with a half turn between each, over local 0.02..0.83; the last hold
   ends where the chapter starts its exit (ts 0.85). */
const IND = [0.02, 0.81, 0.55] as const;

/** Which industry faces the front (fractional while turning), from local progress in the Industries chapter. */
export const industryF = (t: number) => stepped(t, IND[0], IND[1], INDUSTRIES.length, IND[2]);

/** Local progress in the middle of industry k's hold (the inverse of industryF, for jumps). */
export const industrySettle = (k: number) => steppedAt(k, IND[0], IND[1], INDUSTRIES.length, IND[2]);
