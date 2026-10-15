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

/**
 * The 3D story's running example (chapters 02 to 06): the supplier follow-up from handoff revision 3 §5
 * ("A changed delivery promise becomes a clear follow-up"). One story, told once, in the scroll story only;
 * the homepage demonstrations carry all three examples. Always labelled as an illustrative example.
 * Invariants: first + rest = qty (60 + 40 = 100); the orders' quantities sum to qty; impact comes only from
 * verified allocation links (handoff §11), and the buyer confirms, sales reviews; nothing is auto-approved.
 */
export const STORY = {
  label: "Illustrative example",
  item: "Contactors",
  itemCode: "CT-40A",
  po: APP_FACTS.supplier.po,
  poLine: 3,
  supplier: "Supplier 1140",
  /** The original promise on the purchase-order line. */
  qty: 100,
  due: "Friday",
  /** The supplier's revised commitment (message received Tuesday 09:41). */
  first: { qty: 60, day: "Friday" },
  rest: { qty: 40, day: "Wednesday", long: "the following Wednesday" },
  /** Working days the 40 arrive late. */
  lateDays: 3,
  messageAt: "Tuesday 09:41",
  /** Customer orders allocated against this PO line (verified allocation links). 50 + 30 + 20 = 100. */
  orders: [
    { id: "SO-3310", customer: "Customer A", qty: 50, due: "Friday", covered: true },
    { id: "SO-3318", customer: "Customer B", qty: 30, due: "Monday", covered: false },
    { id: "SO-3324", customer: "Customer C", qty: 20, due: "Thursday", covered: true },
  ],
  /** SO-3318: 10 of its 30 are covered on Friday (60 − 50); 20 wait for Wednesday, after its Monday due date. */
  short: { order: "SO-3318", covered: 10, waiting: 20 },
  /** Who acts: the application prepares, people decide. */
  owners: { confirm: "Buyer", review: "Sales" },
  /** The follow-up the application prepares. */
  followUp: "Confirm 60 on Friday and 40 on Wednesday; sales reviews SO-3318",
} as const;
