// Shared story timeline. One scroll value (g) drives the 3D scene and the DOM overlay.
// g = chapterIndex + localProgress. Each chapter holds its state, then transitions
// into the next one after `ts` (transition start) of its length.

import { STORY } from "./example";

type Chapter = {
  id: string;
  label: string;
  len: number; // length in viewport heights
  ts: number; // fraction of the chapter where the transition to the next one begins
};

// Story length budget (viewport heights): 16 in all. Chapters 02 to 06 follow one illustrative example
// (STORY in lib/example.ts: a supplier changes a delivery promise); Scale holds one function per step,
// then one more for the glass layer card that lands on the fan; Industries holds its four places; the
// final chapter is short and ends in an exit (S69-07).
export const CHAPTERS: Chapter[] = [
  // The hero hands off almost at once (ts 0.12): a long hold read as the page sticking, then the camera
  // and the folding islands rushed through half the distance (a flash). Now the move starts with the
  // first scroll and spreads over nearly the whole chapter.
  { id: "fragments", label: "Systems", len: 1.3, ts: 0.12 },
  { id: "signal", label: "Signal", len: 1.3, ts: 0.5 },
  { id: "problem", label: "Problem", len: 1.5, ts: 0.55 },
  { id: "context", label: "Context", len: 1.5, ts: 0.55 },
  { id: "decision", label: "Follow-up", len: 2.7, ts: 0.9 },
  // Long enough to scroll through its five layer cards one at a time (controlLayer), Scale's pace.
  { id: "control", label: "Control", len: 2.5, ts: 0.74 },
  { id: "scale", label: "Functions", len: 2.6, ts: 0.75 },
  { id: "industries", label: "Industries", len: 2.4, ts: 0.85 },
  { id: "final", label: "Start", len: 1, ts: 1 },
];

export type ChapterId = "fragments" | "signal" | "problem" | "context" | "decision" | "control" | "scale" | "industries" | "final";
/** Chapter index by id. */
export const CH = Object.fromEntries(CHAPTERS.map((c, i) => [c.id, i])) as Record<ChapterId, number>;
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
  /** Control's layer in front of the row (0..4), eased: a fraction while the row slides (lib/scene.ts). */
  layer: 0,
  /** Screen position (CSS px) under the front layer's foot, where the layer pills stand on wide screens. */
  layerFoot: { x: 0, y: 0 },
  /** The page points at the signal (hovering its readout: the supplier's message), so it lifts. */
  signalHint: false,
  /** performance.now() of the last frame the pointer read a card in 3D (pauses the tabs' autoplay). */
  hoverAt: -1e9,
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
  /** The reader's choice in the Control panel (written by DecisionControls), drawn on the 3D follow-up card.
   *  qty: units the buyer asks for on Friday (STORY.first.qty by default; the rest come on Wednesday). */
  decision: { mode: "idle", qty: STORY.first.qty } as StoryDecision,
  selectListeners: new Set<(i: number) => void>(),
  listeners: new Set<(g: number) => void>(),
};

type CardRect = { x: number; y: number; w: number; h: number };
/** idle: nothing chosen yet; confirmed: the buyer confirms (or asks for) a schedule; declined: the buyer
 *  goes back to the supplier. An illustrative choice: nothing posts anywhere. */
export type StoryDecision = { mode: "idle" | "confirmed" | "declined"; qty: number };

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

/** The yard scene's beats (the application explorer's quotation scene), as local progress. */
export const BEATS = {
  load: [0.05, 0.4] as const, // three forklift trips at Plant 02
  drive: [0.43, 0.6] as const,
  // Plant 01's forklift takes the three pallets off the trailer into its bays; then the empty truck leaves.
  unload: [0.63, 0.88] as const,
};

/** Context steps through the records one source at a time, in the card's order: Messages (the supplier's
 *  message), ERP (the PO line and its allocations), Sheets (the buyer's tracker). SYSTEMS indices. */
export const CONTEXT_PINS = [5, 0, 3] as const;
/** Which evidence step (0..2) Context shows at local t: its hold (0.05 to 0.55) in three equal beats. */
export const contextBeat = (t: number) => Math.min(2, Math.max(0, Math.floor((t - 0.05) / (0.5 / 3))));

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

/** Control's row brings its five layers to the front one per scroll step, Signal to the follow-up:
 *  the layer in front at local t (fractional while the row slides). */
export const CONTROL_LAYERS = 5;
/** A turn as long as a hold: a short turn left the cards still, then pushed them a place at three times
 *  the scroll's pace, which read as the row lurching ahead of the wheel. */
const CONTROL_TURN = 1;
export const controlLayer = (t: number) => stepped(t, 0.03, CHAPTERS[CH.control].ts - 0.06, CONTROL_LAYERS, CONTROL_TURN);
/** Local progress where layer k holds in front (for the pills and a click on a card). */
export const controlSettle = (k: number) => steppedAt(k, 0.03, CHAPTERS[CH.control].ts - 0.06, CONTROL_LAYERS, CONTROL_TURN);

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
 * The one 3D pin open at g, by chapter and beat. Ids: "island:<system>" (Context), "fn:<k>" (Scale),
 * "industry:<k>" (Industries). Hero, Signal, Problem, Decision, Control and Final pin nothing by default
 * (the 3D lane may add Decision pins here); between chapters nothing is pinned.
 */
function pinAt(g: number): string | null {
  const { i, local, e } = blendAt(g);
  if (e > 0.4) return null;
  switch (i) {
    case CH.context:
      return `island:${CONTEXT_PINS[contextBeat(local)]}`;
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

export const SYSTEMS = ["ERP", "CRM", "SERVICE", "SHEETS", "DOCUMENTS", "MESSAGES"] as const;

// Figures follow the fact sheet in lib/example.ts; section and chapter strings live in lib/copy.ts.

/**
 * The five cards behind the follow-up (chapters 02 to 06, the 3D card stack and the phone deck), in the
 * order the application builds them. The running example is STORY in lib/example.ts: illustrative only.
 */
export const LAYERS = [
  { name: "Signal", text: `Supplier: ${STORY.first.qty} on ${STORY.first.day}, ${STORY.rest.qty} on ${STORY.rest.day}` },
  { name: "Record", text: `${STORY.po} line ${STORY.poLine}: ${STORY.qty} ${STORY.item.toLowerCase()} due ${STORY.due}` },
  { name: "Impact", text: `${STORY.short.order} needs ${STORY.orders[1].qty} by ${STORY.orders[1].due}; ${STORY.short.covered} covered` },
  { name: "Rules", text: `${STORY.owners.confirm} confirms; ${STORY.owners.review.toLowerCase()} reviews affected orders` },
  { name: "Follow-up", text: `Confirm ${STORY.first.qty} + ${STORY.rest.qty}; review ${STORY.short.order}` },
];

/** The five functions in Scale's hand, each with one illustrative line (handoff revision 3, §5 and §6). */
export const FUNCTIONS = [
  { name: "Sales and order management", decision: "40-line order: 27 matched, 13 for the order desk" },
  { name: "Procurement and supply chain", decision: "100 contactors: 60 on Friday, 40 on Wednesday" },
  { name: "Operations and delivery", decision: "Daily brief: each open question with its owner" },
  { name: "Finance and receivables", decision: "₹75,000 deduction: a case for finance to review" },
  { name: "Service and support", decision: "Seal at next shutdown: a follow-up with an owner" },
];

/**
 * The four industries (handoff §5 home.industries), one per place on the road. Example contexts, not
 * claims of customers in any of them. `apps` are APPLICATIONS ids (lib/content.ts).
 */
export const INDUSTRIES = [
  {
    name: "Manufacturing",
    decision: "An RFQ worksheet with the open questions marked",
    system: "Enquiries · Supplier updates · Shift sheets",
    challenge: "For engineering, electrical, packaging, plastics and other manufacturing teams handling enquiries, supplier commitments and production records.",
    apps: ["rfq-preparation", "supplier-commitment-tracking", "production-record-capture"],
    href: "/solutions?industry=manufacturing",
  },
  {
    name: "Distribution and wholesale",
    decision: "A customer order drafted, uncertain units kept aside",
    system: "Orders · Price files · Remittances",
    challenge: "For businesses managing large item catalogues, customer orders, changing supplier prices and payment follow-up.",
    apps: ["sales-order-intake", "supplier-price-updates", "payment-advice-matching"],
    href: "/solutions?industry=distribution",
  },
  {
    name: "Logistics and transport",
    decision: "A missing POD and a shortage, followed up separately",
    system: "Lorry receipts · PODs · Freight bills",
    challenge: "For shippers and service providers coordinating delivery records, transporter bills and operational follow-up.",
    apps: ["delivery-document-followup", "freight-bill-review", "operational-exception-brief"],
    href: "/solutions?industry=logistics",
  },
  {
    name: "Equipment and B2B services",
    decision: "A seal recommendation assigned to an owner",
    system: "Service reports · Assets · Manuals",
    challenge: "For equipment dealers, installation teams and service businesses handling requests, reports and technical knowledge.",
    apps: ["service-case-intake", "service-report-followup", "service-knowledge-assistant"],
    href: "/solutions?industry=services",
  },
];

/** Each industry's accent: its chip, its callout and the pin on its place. */
export const INDUSTRY_TONE = ["emerald", "violet", "tangerine", "pink"] as const;

/* Industries: four equal holds with a half turn between each, over local 0.02..0.83; the last hold
   ends where the chapter starts its exit (ts 0.85). */
const IND = [0.02, 0.81, 0.55] as const;

/** Which industry faces the front (fractional while turning), from local progress in the Industries chapter. */
export const industryF = (t: number) => stepped(t, IND[0], IND[1], INDUSTRIES.length, IND[2]);

/** Local progress in the middle of industry k's hold (the inverse of industryF, for jumps). */
export const industrySettle = (k: number) => steppedAt(k, IND[0], IND[1], INDUSTRIES.length, IND[2]);
