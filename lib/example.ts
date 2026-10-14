// The running example: one fact sheet (COPY-02). Every surface that tells the Bearing X90 story
// (story chapters, island panels, 3D faces, the explorer, outcomes, service pages) uses these
// figures. It is an illustrative scenario, never a client result: label it as an example.
// No imports, so server components, the 3D faces and the OG image can all read it.

/** "INR 38,000": full figure, western grouping, never lakh notation (COPY-03 c). */
export const inr = (n: number) => `INR ${n.toLocaleString("en-US")}`;
/** "INR 38k": only where the space is under about 120px. */
export const inrShort = (n: number) => `INR ${n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}k`}`;
/** "240 units": always the word, never "u" (COPY-03 a). */
export const units = (n: number) => `${n.toLocaleString("en-US")} units`;

export const EXAMPLE = {
  /** The quiet label that marks the story and its figures as illustrative (COPY-01 10). */
  label: "Example scenario",
  part: "Bearing X90",
  plant01: {
    name: "Plant 01",
    onHand: 410,
    safety: 175,
    /** X90 drawn per day by Line 02. 410 - 6 x 45 = 140, below 175 on day 6. */
    dailyUse: 45,
    breachDay: 6,
    day6Without: 140,
    /** 140 + 240 once the transfer lands on day 2. */
    day6With: 380,
  },
  plant02: { name: "Plant 02", stock: 620, ownPlan: 380, transferable: 240 },
  transfer: {
    id: "TRF-0240",
    units: 240,
    pallets: 3,
    perPallet: 80,
    arrivesDay: 2,
    /** 240 x INR 158, rounded. */
    costINR: 38000,
    perUnitINR: 158,
    approvedBy: "Planner",
    approvedAt: "09:42",
    /** The canonical decision string (COPY-03 f). */
    text: "Transfer 240 units, Plant 02 to Plant 01",
  },
  supplier: { vendor: "Vendor 1140", nextDeliveryDay: 21, expediteINR: 92000, onTime: "91%" },
  /** CRM: open orders for X90, 950 three weeks ago, 1,120 today. */
  demand: { upPct: 18, weeks: 3, before: 950, now: 1120, accounts: 37 },
  /** MES: Line 02 at Plant 01 builds about 157 units a week, two X90 each (about 45 a day). */
  line: { name: "Line 02", planPerWeek: 157, capacityPerWeek: 190, perUnit: 2, changeover: "Thursday" },
  lane: { days: 2, status: "Clear", horizonDays: 14, rain: "Low" },
  policy: { maxUnits: 300, approver: "Planner", aboveLimit: "Plant manager", text: "Max 300 units, planner approves" },
} as const;

/** Plant 01 X90 stock at the end of `day` (0 = today), with or without the transfer landing on day 2. */
export function plant01Stock(day: number, withTransfer = false) {
  const p = EXAMPLE.plant01;
  const landed = withTransfer && day >= EXAMPLE.transfer.arrivesDay ? EXAMPLE.transfer.units : 0;
  return p.onHand - day * p.dailyUse + landed;
}

/** The other applications' scenarios: IDs and figures, consistent across the explorer, scenes and evidence. */
export const APP_FACTS = {
  demand: { region: "West", dc: "West DC", raiseUnits: 1800 },
  production: { order: "MO-2207", queuedAt: "Line 03", queued: 6, moved: 3, to: "Line 02", shift: "14:00" },
  maintenance: { line: "Line 04", asset: "Motor M-041", sensor: "V-04", peak: "4.8 mm/s", workOrder: "WO-0412", window: "Friday" },
  risk: { parts: ["Bearing X90", "Seal S02"], laneDelayDays: 14, alternative: "Supplier 02", alternativeDays: 4 },
  sales: { region: "West", shiftPct: 12 },
  customer: { cases: 14, part: "Bearing X90", owner: "Quality" },
  finance: {
    po: "PO-8842",
    receipt: "GRN-1049",
    held: [
      ["INV-4472", "Vendor 2031", 86000],
      ["INV-4475", "Vendor 1187", 110000],
      ["INV-4478", "Vendor 0954", 64000],
    ],
    heldTotal: 260000,
    matched: ["INV-4471", 240000],
  },
  /** The manufacturing industry card's quality hold (not the production order). */
  qualityBatch: "Batch 2214",
  /** Stencil on the bearing crate in the 3D world (buildings.tsx). */
  crate: "BEARING X90 · 6204-C3 · LOT 0617 · PLANT 01 · ",
} as const;
