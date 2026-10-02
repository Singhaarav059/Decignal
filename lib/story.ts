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
  { id: "decision", label: "Decision", len: 1.7, ts: 0.6 },
  { id: "control", label: "Control", len: 1.9, ts: 0.62 },
  { id: "scale", label: "Scale", len: 1.5, ts: 0.55 },
  { id: "industries", label: "Industries", len: 4.2, ts: 0.9 },
  { id: "final", label: "Decide", len: 1.6, ts: 1 },
];

export const CH = Object.fromEntries(CHAPTERS.map((c, i) => [c.id, i])) as Record<string, number>;
export const TOTAL_LEN = CHAPTERS.reduce((s, c) => s + c.len, 0);

export const store = {
  g: 0,
  velocity: 0, // scroll velocity from Lenis, px per frame
  pointer: { x: 0, y: 0 },
  camK: 1, // how far narrow screens step the camera back (1 on desktop)
  listeners: new Set<(g: number) => void>(),
};

export function setG(g: number) {
  store.g = g;
  store.listeners.forEach((l) => l(g));
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
  { name: "Context", text: "Plant 02 holds 620 units above plan" },
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
  { name: "Manufacturing", decision: "Move Line 04 maintenance to Thursday night", system: "MES · CMMS · IoT" },
  { name: "Automotive", decision: "Reserve 1,200 harnesses for the launch build", system: "ERP · DMS · Supplier portal" },
  { name: "Retail", decision: "Shift 3,400 units from North to West DC", system: "POS · WMS · Planning" },
  { name: "Logistics", decision: "Reroute 6 containers through Mombasa", system: "TMS · Port feeds · ERP" },
  { name: "Financial Services", decision: "Review 18 payments before settlement", system: "Core banking · Risk · Docs" },
  { name: "Energy", decision: "Send a crew to Feeder 7 before peak load", system: "SCADA · GIS · Work orders" },
];
