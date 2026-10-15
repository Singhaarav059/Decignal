import { APP_FACTS, EXAMPLE, inr } from "./example";

const J = APP_FACTS.jobwork;
const R = APP_FACTS.rfq;
const S = APP_FACTS.service;
const D = APP_FACTS.deduction;
const U = APP_FACTS.supplier;

/**
 * The explorer's illustrative workflows, index-aligned with APPLICATIONS (lib/content.ts) and drawn by
 * the operational scenes. `kind` names the scene that draws it (components/three/OperationalScenes);
 * `id` is the workflow record.
 * headline: two lines split by "\n", the second is the accent line.
 * line: the one sentence the screen shows. metric + metricLabel: the one figure the review turns on.
 * steps: one sentence per tab, Situation / Source records / For review (70 characters or fewer).
 * evidenceTitle and status: the evidence drawer's heading and its three readings (OperationEvidence).
 * Every scene ends on a draft for review: nothing is approved, sent or posted.
 */
export const APPLICATION_DEMOS = [
  {
    kind: "production",
    id: "dispatch-pack",
    headline: "One shipment.\nOne reference to resolve.",
    line: `Line ${EXAMPLE.line.n} is recorded against heat ${EXAMPLE.line.heat}; the certificate says ${EXAMPLE.cert.heat}.`,
    metric: `${EXAMPLE.line.heat} ≠ ${EXAMPLE.cert.heat}`,
    metricLabel: "kept for the quality reviewer",
    steps: [
      `Line ${EXAMPLE.line.n} is recorded against heat ${EXAMPLE.line.heat}.`,
      `The certificate says ${EXAMPLE.cert.heat}; the process certificate is missing.`,
      "Request the correct certificate. Line 12 stays marked for review.",
    ],
    evidenceTitle: `Checklist ${EXAMPLE.checklist.rev}, shipment ${EXAMPLE.shipment.id}`,
    status: ["Delivery line and certificate disagree", "Process certificate not in the supplied files", "Two questions for the quality reviewer"],
    sources: "Delivery lines · certificates · customer checklist",
    readings: [["Delivery line", EXAMPLE.line.heat], ["Certificate", EXAMPLE.cert.heat], ["Status", "For review"]],
    labels: ["Certificate", "Line 12"],
  },
  {
    kind: "sales",
    id: "rfq-clarifications",
    headline: "The enquiry says SS316.\nThe offer says SS304.",
    line: "Flag the material difference before anyone prepares the quote.",
    metric: `${R.required} ≠ ${R.offered}`,
    metricLabel: "clarification drafted for the reviewer",
    steps: [
      `The customer asks for ${R.required} wetted parts on ${R.line.toLowerCase()}.`,
      `The supplier offer and datasheet list ${R.offered}.`,
      "Draft a clarification. No substitute is chosen and no quote is sent.",
    ],
    evidenceTitle: `${R.enquiry}: requirement against offer`,
    status: [`Customer requires ${R.required}`, `Supplier offer lists ${R.offered}`, "Clarification drafted for the reviewer"],
    sources: "Enquiry · supplier offer · datasheet",
    readings: [["Required", R.required], ["Offered", R.offered], ["Status", "For review"]],
    labels: ["Supplier offer", "Customer enquiry"],
  },
  {
    kind: "maintenance",
    id: "service-followup",
    headline: "A seal to replace.\nNo owner yet.",
    line: "A service report recommends a seal at the next shutdown; the serial is incomplete.",
    metric: "1 follow-up",
    metricLabel: "prepared for the service owner",
    steps: [
      `The report recommends a new ${S.part.toLowerCase()} at the ${S.when.toLowerCase()}.`,
      "The serial is incomplete; two equipment records could match.",
      "Prepare an internal follow-up. Part and warranty stay unresolved.",
    ],
    evidenceTitle: `${S.report}: recommendation and equipment`,
    status: ["Recommendation found in the report", "Equipment serial incomplete", "Follow-up prepared for the service owner"],
    sources: "Service report · installed base · quotes",
    readings: [["Equipment", S.equipment], ["Serial", "Incomplete"], ["Status", "For review"]],
    labels: [S.equipment, "Follow-up"],
  },
  {
    kind: "inventory",
    id: "jobwork-reconciliation",
    headline: "1,000 sent. 940 back.\n40 to explain.",
    line: "Match the challan, the return and the rejection records before anyone calls the pieces lost.",
    metric: `${J.open} pieces`,
    metricLabel: "left to reconcile, not lost",
    steps: [
      `${J.sent.toLocaleString("en-IN")} pieces left for ${J.process.toLowerCase()}; ${J.returned} came back.`,
      `Rejection records account for ${J.rejected} more; ${J.open} remain.`,
      "Prepare a follow-up with the linked challan and return records.",
    ],
    evidenceTitle: `Challan ${J.challan}: sent, returned, explained`,
    status: [`${J.sent.toLocaleString("en-IN")} sent, ${J.returned} returned`, `${J.rejected} accepted rejections on record`, `${J.open} pieces prepared for review`],
    sources: "Challans · returns · rejection records",
    readings: [["Sent", J.sent.toLocaleString("en-IN")], ["Returned", `${J.returned}`], ["Open", `${J.open}`]],
    labels: [J.worker, "Your plant"],
  },
  {
    kind: "finance",
    id: "deduction-evidence",
    headline: "₹75,000 deducted.\nOne note unclear.",
    line: "Bring the invoice, the delivery acknowledgement and the receiver note into one packet.",
    metric: inr(D.amount),
    metricLabel: "pending review, not recovered",
    steps: [
      `A buyer deducts ${inr(D.amount)} for a reported delivery shortage.`,
      "The invoice and delivery acknowledgement are on record.",
      "The receiver note is ambiguous. Finance reviews the packet.",
    ],
    evidenceTitle: `Debit note ${D.debit}: the evidence`,
    status: ["Deduction received", "Invoice and acknowledgement linked", "Receiver note flagged for finance"],
    sources: "Debit note · invoice · delivery acknowledgement",
    readings: [["Invoice", "Linked"], ["Acknowledgement", "Linked"], ["Receiver note", "Unclear"]],
    labels: ["Invoice", "Evidence packet"],
  },
  {
    kind: "risk",
    id: "supplier-updates",
    headline: "100 confirmed.\n60 Friday, 40 Wednesday.",
    line: "Split the changed promise into schedule lines and show the customer order it touches.",
    metric: `${U.first} + ${U.rest}`,
    metricLabel: "proposed schedule lines for the buyer",
    steps: [
      `A supplier changes ${U.qty} ${U.item.toLowerCase()} to ${U.first} on ${U.firstDay} and ${U.rest} on ${U.restDay}.`,
      `The PO line is allocated to customer order ${U.order}.`,
      "Prepare the revised schedule. The PO is not changed.",
    ],
    evidenceTitle: `${U.po}: confirmed against the update`,
    status: [`${U.qty} confirmed on the PO`, `${U.first} ${U.firstDay}, ${U.rest} ${U.restDay}`, `Order ${U.order} marked for checking`],
    sources: "Open POs · supplier message · allocation",
    readings: [["Confirmed", `${U.qty}`], ["Update", `${U.first} + ${U.rest}`], ["Status", "For review"]],
    labels: ["Supplier", "Customer order"],
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
