// Shared story timeline. One scroll value (g) drives the 3D scene and the DOM overlay.
// g = chapterIndex + localProgress. Each chapter holds its state, then transitions
// into the next one after `ts` (transition start) of its length.

type Chapter = {
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
  { id: "fragments", label: "Records", len: 1.3, ts: 0.12 },
  { id: "signal", label: "Shipment", len: 1.3, ts: 0.5 },
  { id: "problem", label: "Mismatch", len: 1.5, ts: 0.55 },
  { id: "context", label: "Sources", len: 1.5, ts: 0.55 },
  { id: "decision", label: "Flag", len: 2.7, ts: 0.9 },
  { id: "control", label: "Reviewer", len: 1.7, ts: 0.62 },
  { id: "scale", label: "Functions", len: 2.5, ts: 0.75 },
  { id: "industries", label: "Industries", len: 3.2, ts: 0.85 },
  { id: "final", label: "Start", len: 1, ts: 1 },
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
  /** Control's fan on desktop: the card the reviewer tabs play forward when nobody points at one, or -1. */
  deckAt: -1,
  /** performance.now() of the last frame the pointer read a card in 3D (pauses the tabs' autoplay). */
  hoverAt: -1e9,
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

type CardRect = { x: number; y: number; w: number; h: number };
type StoryDecision = { mode: "idle" | "approved" | "rejected"; qty: number };

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
const contextBeat = (t: number) => Math.min(2, Math.max(0, Math.floor((t - 0.05) / (0.5 / 3))));

/**
 * Steps through `count` items over local progress a..a+u: equal holds, each followed by a turn that
 * takes `turn` of a hold's length. Returns the item in front, fractional while turning.
 */
function stepped(t: number, a: number, u: number, count: number, turn: number) {
  const h = u / (count + (count - 1) * turn);
  const p = h * (1 + turn);
  const n = count - 1;
  const x = Math.min(Math.max(t - a, 0), u);
  const k = Math.min(Math.floor(x / p), n);
  const r = x - k * p;
  return k < n && r > h ? k + smootherstep(h, p, r) : k;
}
/** Local progress in the middle of item k's hold, for `stepped` with the same arguments. */
const steppedAt = (k: number, a: number, u: number, count: number, turn: number) => {
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
// The page only slides over once the scroll has passed the story's end, so `after` alone says it; on a
// phone the story may still be easing into its last frame then (lib/pace.ts), and gating on g held the
// closing layer still under the sliding page, then jumped it.
export const finalExit = (g: number) => (g >= CHAPTERS.length - 1e-4 || store.after > 0 ? store.after : 0);
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
function pinAt(g: number): string | null {
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

export const SYSTEMS = ["ERP", "CUSTOMER", "QUALITY", "JOB WORK", "SUPPLIERS", "FILES"] as const;

// Figures follow the fact sheet in lib/example.ts; section and chapter strings live in lib/copy.ts.

/** The layers behind the review (LayerReadout): what each one contributes. */
export const LAYERS = [
  { name: "Situation", text: "Line 12 recorded against heat H241" },
  { name: "Sources", text: "Certificate says H214; process certificate not found" },
  { name: "Checklist", text: "Checklist Rev C: six documents per shipment" },
  { name: "Rules", text: "Exact heat numbers only, nothing edited" },
  { name: "For review", text: "Request the correct certificate, keep line 12 open" },
];

/** The five functions in Scale's hand, each with its illustrative "for review" line (handoff global.areas). */
export const FUNCTIONS = [
  { name: "Supplier coordination", decision: "60 Friday, 40 Wednesday: revised schedule for review" },
  { name: "Dispatch documentation", decision: "Line 12: H241 against H214, kept for review" },
  { name: "RFQ review", decision: "SS316 required, SS304 offered: clarification drafted" },
  { name: "Service follow-up", decision: "Seal at next shutdown: follow-up for the service owner" },
  { name: "Deduction review", decision: "₹75,000 deduction: evidence packet for finance" },
];

/**
 * The industries in focus (handoff §1 industry focus and customer segments), one per place on the road.
 * Proposed workflows only: no delivery times, no claims of customers in any of them.
 */
export const INDUSTRIES = [
  {
    name: "Engineering components",
    decision: "Link line 12 to the certificate for heat H241",
    system: "ERP · Quality · Suppliers",
    challenge: "Machined parts and castings ship with customer-specific certificates, heat references and external-process reports.",
    decisions: ["Flag a heat number that does not match", "Find a missing heat-treatment certificate", "Explain 40 pieces missing from a coating return"],
    start: "Dispatch document pack review",
  },
  {
    name: "Metal products",
    decision: "Reconcile a job-work return by challan",
    system: "ERP · Job work · Challans",
    challenge: "Material goes out for processing in kilograms and comes back in pieces, with scrap and rejections on separate records.",
    decisions: ["Reconcile a challan against its returns", "Keep kilogram and piece quantities apart", "Draft a question for the job worker"],
    start: "Job work discrepancy review",
  },
  {
    name: "Industrial machinery",
    decision: "Show a supplier’s split delivery against the PO",
    system: "ERP · Suppliers · Customer orders",
    challenge: "One late part can hold a machine build, and supplier changes often arrive by email rather than in the schedule.",
    decisions: ["Split a changed promise into schedule lines", "Show the customer order it touches", "Clarify a specification before quoting"],
    start: "Supplier promise change review",
  },
  {
    name: "Electrical equipment",
    decision: "Flag 415 V against 440 V before the quote",
    system: "Enquiries · Datasheets · Offers",
    challenge: "Enquiries arrive with schedules, specifications and revisions that do not always agree with each other.",
    decisions: ["Flag a voltage conflict in an enquiry", "Link a revised specification to its line", "Prepare evidence for a customer deduction"],
    start: "RFQ clarification pack",
  },
  {
    name: "Industrial supplies",
    decision: "Compare SS316 required with SS304 offered",
    system: "Enquiries · Supplier offers · Invoices",
    challenge: "Distributors match customer requirements to supplier offers and answer deductions from a few large buyers.",
    decisions: ["Compare a requirement with a supplier offer", "Assemble the evidence behind a deduction", "Review a supplier’s changed delivery"],
    start: "RFQ clarification pack",
  },
  {
    name: "Equipment service",
    decision: "Turn a seal recommendation into a follow-up",
    system: "Service reports · Installed base · Quotes",
    challenge: "Recommendations sit in technicians’ and partners’ reports, and the next owner has to find the equipment again.",
    decisions: ["Find a recommendation in a service report", "Leave an incomplete serial visible", "Check for an existing quote first"],
    start: "Service to quote handover",
  },
];

/** Each industry's accent: its chip, its callout and the pin on its place. */
export const INDUSTRY_TONE = ["emerald", "cobalt", "pink", "tangerine", "violet", "saffron"] as const;

/* Industries: six equal holds with a half turn between each, over local 0.02..0.83; the last hold
   ends where the chapter starts its exit (ts 0.85). */
const IND = [0.02, 0.81, 0.55] as const;

/** Which industry faces the front (fractional while turning), from local progress in the Industries chapter. */
export const industryF = (t: number) => stepped(t, IND[0], IND[1], INDUSTRIES.length, IND[2]);

/** Local progress in the middle of industry k's hold (the inverse of industryF, for jumps). */
export const industrySettle = (k: number) => steppedAt(k, IND[0], IND[1], INDUSTRIES.length, IND[2]);
