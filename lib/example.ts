// The illustrative records behind the application scenes: IDs and figures, consistent across the
// explorer, its 3D scenes, the evidence drawer and the hand cards. Illustrative scenarios, never customer
// results: label them as examples (handoff revision 3, §5 and §7).
// No imports, so server components, the 3D faces and the OG image can all read it.

/** "₹75,000": the rupee sign and Indian digit grouping (handoff §11). */
export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
/** "₹75k": only where the space is under about 120px. */
export const inrShort = (n: number) => `₹${n >= 1e7 ? `${+(n / 1e7).toFixed(1)} cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)} lakh` : `${Math.round(n / 1e3)}k`}`;
/** "40 pieces": always the word. */
export const units = (n: number) => `${n.toLocaleString("en-IN")} pieces`;

/** The featured applications' illustrative records (lib/application-demos.ts, OperationalScenes). */
export const APP_FACTS = {
  order: { po: "PO-7731", lines: 40, matched: 27, item: 8, unit: 5, alias: "Old item code", pack: "Box or piece?" },
  quote: { pr: "PR-2214", suppliers: 3, a: "Supplier A", b: "Supplier B", c: "Supplier C" },
  supplier: { po: "PO-8842", item: "Contactors", qty: 100, first: 60, firstDay: "Friday", rest: 40, restDay: "Wednesday", order: "SO-3310" },
  brief: { order: "SO-3310", hold: "SO-3318", open: 3 },
  deduction: { amount: 75000, reason: "Delivery shortage", debit: "DN-2207", invoice: "INV-4472", ack: "POD-1049", note: "Receiver note" },
  service: { equipment: "Pump P-07", part: "Mechanical seal", when: "Next shutdown", report: "SR-0918" },
} as const;
