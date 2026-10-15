import { APP_FACTS, inr } from "./example";

const O = APP_FACTS.order;
const Q = APP_FACTS.quote;
const U = APP_FACTS.supplier;
const B = APP_FACTS.brief;
const D = APP_FACTS.deduction;
const S = APP_FACTS.service;

/**
 * The explorer's six featured applications, index-aligned with FEATURED (lib/content.ts) and drawn by
 * the operational scenes. `kind` names the scene that draws it (components/three/OperationalScenes);
 * `id` is the application record.
 * headline: two lines split by "\n", the second is the accent line.
 * line: the one sentence the screen shows. metric + metricLabel: the one figure the example turns on.
 * steps: one sentence per tab, Situation / Records / Next step (70 characters or fewer).
 * evidenceTitle and status: the evidence drawer's heading and its three readings (OperationEvidence).
 * Every scene ends with the work prepared for a named person; nothing is approved for them.
 */
export const APPLICATION_DEMOS = [
  {
    kind: "sales",
    id: "sales-order-intake",
    headline: "A 40-line order.\n13 lines for the order desk.",
    line: "Match each line to the approved catalogue and keep uncertain items out of the ready list.",
    metric: `${O.matched} of ${O.lines}`,
    metricLabel: "lines matched with approved references",
    steps: [
      `A customer order arrives with ${O.lines} lines, aliases and unclear pack units.`,
      "Lines are matched to approved item mappings and conversion rules.",
      `The order desk resolves ${O.item + O.unit} open lines and approves the draft.`,
    ],
    evidenceTitle: `${O.po}: lines against the catalogue`,
    status: [`${O.lines} lines received`, `${O.matched} matched, ${O.item} items to confirm`, `${O.unit} units to clarify, draft for the order desk`],
    sources: "Customer order · Item catalogue · Price list",
    readings: [["Matched", `${O.matched}`], ["Confirm item", `${O.item}`], ["Clarify unit", `${O.unit}`]],
    labels: ["Customer order", "Order desk"],
  },
  {
    kind: "inventory",
    id: "purchase-quote-comparison",
    headline: "Three quotations.\nOne comparable sheet.",
    line: "Put supplier quotations on one basis and keep unconfirmed terms visible.",
    metric: `${Q.suppliers} quotes`,
    metricLabel: "on one comparison sheet for the buyer",
    steps: [
      "Three suppliers quote the same purchase request.",
      "One quotes per box, one excludes freight, one changes the date.",
      "The buyer reviews the sheet and the questions for suppliers.",
    ],
    evidenceTitle: `${Q.pr}: three quotations compared`,
    status: ["Three quotations received", "Units and freight put on one basis", "Comparison sheet for the buyer"],
    sources: "Purchase request · Quotations · Unit rules",
    readings: [[Q.a, "Per box"], [Q.b, "No freight"], [Q.c, "Later date"]],
    labels: ["Quotation", "Comparison"],
  },
  {
    kind: "risk",
    id: "supplier-commitment-tracking",
    headline: "100 promised.\n60 Friday, 40 Wednesday.",
    line: "Link the change to the purchase-order line and show the customer orders to check.",
    metric: `${U.first} + ${U.rest}`,
    metricLabel: "revised commitment for the buyer",
    steps: [
      `A supplier changes ${U.qty} ${U.item.toLowerCase()} to ${U.first} on ${U.firstDay} and ${U.rest} on ${U.restDay}.`,
      `The PO line is linked to customer order ${U.order}.`,
      "The buyer confirms; sales reviews the affected order.",
    ],
    evidenceTitle: `${U.po}: promised against the update`,
    status: [`${U.qty} promised on the PO`, `${U.first} ${U.firstDay}, ${U.rest} ${U.restDay}`, `Order ${U.order} to check`],
    sources: "Open POs · Supplier message · Allocation",
    readings: [["Promised", `${U.qty}`], ["Revised", `${U.first} + ${U.rest}`], ["Next step", "Buyer"]],
    labels: ["Supplier", "Customer order"],
  },
  {
    kind: "production",
    id: "operational-exception-brief",
    headline: "This week’s orders.\nThree open questions.",
    line: "Bring the delay, the allocation and the hold into one brief, each with its owner.",
    metric: `${B.open} open`,
    metricLabel: "questions, each with a responsible team",
    steps: [
      "The order book lists deliveries due this week.",
      "A supplier delay, an allocation and a hold are linked to orders.",
      "The operations owner confirms priorities in the brief.",
    ],
    evidenceTitle: "Daily brief: orders due this week",
    status: ["Orders due this week", "Three issues linked to their records", "Brief ready for the operations owner"],
    sources: "Order book · Stock records · Dispatch status",
    readings: [["Supplier delay", "Buyer"], ["Allocation", "Stores"], ["Delivery hold", "Dispatch"]],
    labels: ["Order book", "Daily brief"],
  },
  {
    kind: "finance",
    id: "customer-deduction-investigation",
    headline: `${inr(D.amount)} deducted.\nOne note to resolve.`,
    line: "Link the debit note, invoice and acknowledgement before finance decides.",
    metric: inr(D.amount),
    metricLabel: "deduction prepared as a case for finance",
    steps: [
      `A customer deducts ${inr(D.amount)} for a reported delivery shortage.`,
      "The debit note, invoice and acknowledgement are linked.",
      "The receiver note is unclear. Finance decides how to respond.",
    ],
    evidenceTitle: `Debit note ${D.debit}: the case`,
    status: ["Deduction received", "Invoice and acknowledgement linked", "Receiver note left for finance"],
    sources: "Debit note · Invoice · Delivery acknowledgement",
    readings: [["Invoice", "Linked"], ["Acknowledgement", "Linked"], ["Receiver note", "Unclear"]],
    labels: ["Invoice", "Deduction case"],
  },
  {
    kind: "maintenance",
    id: "service-report-followup",
    headline: "A seal to replace.\nNow with an owner.",
    line: "Turn the report’s recommendation into an assigned follow-up with the open questions.",
    metric: "1 follow-up",
    metricLabel: "assigned to the service owner",
    steps: [
      `The report recommends a new ${S.part.toLowerCase()} at the ${S.when.toLowerCase()}.`,
      "The equipment record is found; no existing quote.",
      "The service owner confirms before sales prepares the quote.",
    ],
    evidenceTitle: `${S.report}: recommendation and equipment`,
    status: ["Recommendation found in the report", "Equipment linked, no open quote", "Follow-up assigned to the service owner"],
    sources: "Service report · Asset records · Open quotes",
    readings: [["Equipment", S.equipment], ["Existing quote", "None"], ["Owner", "Service"]],
    labels: [S.equipment, "Follow-up"],
  },
] as const;
export type DemoKind = (typeof APPLICATION_DEMOS)[number]["kind"];

/**
 * The pins in each scene (components/three/OperationalScenes ids). steps: the pin each tab opens.
 * moved: the object the review turns on (pointing at the figure opens it). readings: the pin behind
 * each evidence reading (pointing at one opens it), null when the scene has no such object.
 */
export const DEMO_PINS: Record<DemoKind, { steps: readonly [string, string, string]; moved: string; readings: readonly (string | null)[] }> = {
  inventory: { steps: ["plant02", "plant01", "truck"], moved: "plant01", readings: ["plant02", "truck", "plant01"] },
  production: { steps: ["line03", "line02", "order"], moved: "line02", readings: ["line03", "line02", "order"] },
  maintenance: { steps: ["motor", "bearing", "bearing"], moved: "bearing", readings: ["motor", "bearing", "bearing"] },
  risk: { steps: ["port", "supplier2", "supplier2"], moved: "supplier2", readings: ["port", "port", "supplier2"] },
  sales: { steps: ["west", "east", "west"], moved: "west", readings: ["west", "east", "west"] },
  finance: { steps: ["invoices", "grn", "invoices"], moved: "invoices", readings: ["po", "grn", "invoices"] },
};
