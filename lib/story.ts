// Shared story timeline. One scroll value (g) drives the 3D scene and the DOM overlay.
// g = chapterIndex + localProgress. Each chapter holds its state, then transitions
// into the next one after `ts` (transition start) of its length.

export type Chapter = {
  id: string;
  label: string;
  len: number; // length in viewport heights
  ts: number; // fraction of the chapter where the transition to the next one begins
};

export const CHAPTERS: Chapter[] = [
  { id: "fragments", label: "Fragmented", len: 1.3, ts: 0.45 },
  { id: "signal", label: "Signal", len: 1.3, ts: 0.5 },
  { id: "problem", label: "Problem", len: 1.5, ts: 0.55 },
  { id: "context", label: "Context", len: 1.5, ts: 0.55 },
  { id: "decision", label: "Decision", len: 2.8, ts: 0.8 },
  { id: "control", label: "Control", len: 1.9, ts: 0.62 },
  { id: "scale", label: "Scale", len: 1.5, ts: 0.55 },
  { id: "industries", label: "Industries", len: 5.4, ts: 0.9 },
  { id: "final", label: "Decide", len: 1.6, ts: 1 },
];

export const CH = Object.fromEntries(CHAPTERS.map((c, i) => [c.id, i])) as Record<string, number>;
export const TOTAL_LEN = CHAPTERS.reduce((s, c) => s + c.len, 0);

export const store = {
  g: 0,
  velocity: 0, // scroll velocity from Lenis, px per frame
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
  selectListeners: new Set<(i: number) => void>(),
  listeners: new Set<(g: number) => void>(),
};

export function setG(g: number) {
  store.g = g;
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
/* Product truth: one running example, used everywhere.                 */
/* ------------------------------------------------------------------ */

export const SYSTEMS = ["ERP", "CRM", "MES", "WMS", "SUPPLIERS", "EXTERNAL"] as const;

export const CONTEXT = [
  { system: "ERP", title: "Transfer policy & cost" },
  { system: "CRM", title: "Open orders up 18%" },
  { system: "MES", title: "Production plan" },
  { system: "WMS", title: "Stock at every plant" },
  { system: "SUPPLIERS", title: "Inbound in 21 days" },
  { system: "EXTERNAL", title: "Freight & weather" },
];

export const LAYERS = [
  { name: "Signal", text: "Plant 01 short in 6 days" },
  { name: "Evidence", text: "Orders up 18% in 3 weeks" },
  { name: "Context", text: "Plant 02 holds 620 units; 240 above its plan" },
  { name: "Policy", text: "Inter-plant transfer, planner approval" },
  { name: "Decision", text: "Transfer 240 units, Plant 02 to Plant 01" },
];

export const FUNCTIONS = [
  { name: "Supply Chain", decision: "Transfer 240 units to Plant 01" },
  { name: "Operations", decision: "Service Line 04 bearing by Friday" },
  { name: "Commercial", decision: "Shift 12% of allocation to West" },
  { name: "Customer", decision: "Escalate 14 cases, one root cause" },
  { name: "Finance & Risk", decision: "Hold 3 invoices pending GRN" },
];

export const INDUSTRIES = [
  {
    name: "Manufacturing",
    decision: "Reserve Friday’s service window for Line 04",
    system: "MES · CMMS · IoT",
    challenge: "Downtime, quality drift and schedule risk move faster than the morning review.",
    decisions: ["Reserve Friday’s service window for Line 04", "Resequence Line 03 before the 14:00 shift", "Hold Batch 2207 for a seal inspection"],
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
    decisions: ["Reroute 6 containers through Mombasa", "Rebook 14 shipments onto Tuesday's sailing", "Warn 3 customers of a 2 day delay"],
    start: "Supply Chain Risk",
    weeks: "5 to 8",
  },
  {
    name: "Financial Services",
    decision: "Review 18 payments before settlement",
    system: "Core banking · Risk · Docs",
    challenge: "High-volume exceptions need fast review without loosening control.",
    decisions: ["Review 18 payments before settlement", "Hold 3 invoices pending goods receipt", "Escalate 2 accounts for a KYC refresh"],
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
