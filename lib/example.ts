// The worked example: one fact sheet. Every surface that tells the dispatch-review story (story
// chapters, island panels, 3D labels, the explorer, the example section, service pages) uses these
// figures. It is an illustrative scenario, never a customer result: label it as an example
// (handoff home.example, workflows.dispatch-pack).
// No imports, so server components, the 3D faces and the OG image can all read it.

/** "₹75,000": the rupee sign and Indian digit grouping (handoff §11). */
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
/** "₹75k": only where the space is under about 120px. */
export const inrShort = (n: number) => `₹${n >= 1e7 ? `${+(n / 1e7).toFixed(1)} cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)} lakh` : `${Math.round(n / 1e3)}k`}`;
/** "40 pieces": always the word. */
export const units = (n: number) => `${n.toLocaleString("en-IN")} pieces`;

export type DocStatus = "supported" | "missing" | "conflicting";

/** How each document status reads, wherever it is shown (handoff home.example implementation note). */
export const DOC_STATUS: Record<DocStatus, string> = {
  supported: "Supported",
  missing: "Document not found",
  conflicting: "Conflicting reference",
};

export const EXAMPLE = {
  /** The quiet label that marks the story and its figures as illustrative. */
  label: "Illustrative example",
  /** The shipment under review. */
  shipment: { id: "SHP-0612", lines: 14, product: "Machined flanges", customer: "Customer A" },
  /** The delivery line with the mismatch. */
  line: { n: 12, heat: "H241", pieces: 40, item: "Flange F-80" },
  /** The certificate supplied for that line. */
  cert: { heat: "H214", kind: "Material certificate", source: "Supplier 07" },
  /** The required process certificate that is not in the supplied files. */
  process: { kind: "Heat-treatment certificate", source: "Job worker 03" },
  /** The customer’s approved checklist, its revision and every required document’s status. */
  checklist: {
    rev: "Rev C",
    items: [
      { name: "Material certificate", status: "conflicting" },
      { name: "Heat-treatment certificate", status: "missing" },
      { name: "Dimensional report", status: "supported" },
      { name: "Test report", status: "supported" },
      { name: "Packing list", status: "supported" },
      { name: "Delivery challan", status: "supported" },
    ] as { name: string; status: DocStatus }[],
  },
  /** Files found in the shipment folder. */
  files: 11,
  /** Who reviews the pack. */
  reviewer: "Quality reviewer",
  /** The two questions the review leaves for the reviewer. */
  questions: ["Confirm the correct certificate for heat H241", "Request the heat-treatment certificate"],
  /** The one line the review ends on. */
  status: "Draft review only. Dispatch has not been approved.",
} as const;

/** Supported, missing and conflicting counts in the checklist. */
export const checklistCounts = () => {
  const c = { supported: 0, missing: 0, conflicting: 0 };
  EXAMPLE.checklist.items.forEach((i) => c[i.status]++);
  return c;
};

/** The other workflows’ illustrative records: IDs and figures, consistent across the explorer, scenes and evidence. */
export const APP_FACTS = {
  jobwork: { challan: "JW-0412", process: "Coating", worker: "Job worker 03", sent: 1000, returned: 940, rejected: 20, open: 40 },
  rfq: { line: "Enquiry line 4", item: "Ball valve DN50", required: "SS316", offered: "SS304", enquiry: "RFQ-1186" },
  service: { equipment: "Pump P-07", serial: "PX-41··", part: "Mechanical seal", when: "Next shutdown", report: "SR-0918" },
  deduction: { amount: 75000, reason: "Delivery shortage", debit: "DN-2207", invoice: "INV-4472", ack: "POD-1049", note: "Receiver note" },
  supplier: { po: "PO-8842", item: "Contactors", qty: 100, first: 60, firstDay: "Friday", rest: 40, restDay: "Wednesday", order: "SO-3310" },
  /** Stencil on the shipment crate in the 3D world (buildings.tsx). */
  crate: "LINE 12 · HEAT H241 · SHP-0612 · FLANGE F-80 · ",
} as const;
