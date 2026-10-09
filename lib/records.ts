// The facts behind the transfer decision, one per source system. Shared by the page (labels)
// and the stage (the printed record tiles).
import { TINTS } from "@/components/three/palette";

export type Fact = { sys: string; tone: string; field: string; value: string; note: string; bars: number[] };

/** The six facts the transfer decision is built from, one per system, in SYSTEMS order. */
export const RECORDS: Fact[] = [
  { sys: "ERP", tone: TINTS.cobalt, field: "Transfer policy", value: "Planner approves", note: "Cost within budget", bars: [0.5, 0.5, 0.55, 0.5, 0.52, 0.5] },
  { sys: "CRM", tone: TINTS.violet, field: "Open orders", value: "+18%", note: "Next 3 weeks", bars: [0.35, 0.4, 0.45, 0.6, 0.75, 0.9] },
  { sys: "MES", tone: TINTS.emerald, field: "Production plan", value: "Line 2 · Thu", note: "Needs 175 on hand", bars: [0.6, 0.6, 0.8, 0.8, 0.6, 0.6] },
  { sys: "WMS", tone: TINTS.saffron, field: "Plant 02 stock", value: "620 units", note: "240 above its plan", bars: [0.8, 0.82, 0.85, 0.84, 0.86, 0.85] },
  { sys: "Suppliers", tone: TINTS.tangerine, field: "Next inbound", value: "Day 21", note: "Too late for day 6", bars: [0.2, 0.2, 0.2, 0.2, 0.2, 0.9] },
  { sys: "External", tone: TINTS.pink, field: "Freight", value: "2 days", note: "Clear roads, carrier free", bars: [0.4, 0.5, 0.45, 0.4, 0.42, 0.4] },
];
