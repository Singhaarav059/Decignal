// The five business functions: one source for the home rows (AreaRows: lead, signal) and the solution
// pages at /solutions/{slug} (handoff §6 and the solution template map). No "use client" and no three.js,
// so server components can import it. Rules: every workflow is proposed; no fixed timelines, connector or
// automation claims, or realised benefits; examples are labelled "Illustrative example" and come from the
// shared workflow records (lib/content.ts).

import { APPLICATIONS, CATEGORIES, CATEGORY_TONE, type Category } from "./content";
import type { Headline } from "./copy";

export type { Headline };

/** The service routes: app/solutions/[slug] and app/sitemap.ts read these. Fixed: the URLs are kept. */
export const AREA_SLUGS = ["supply-chain", "operations", "commercial", "customer", "finance-and-risk"] as const;
export type AreaSlug = (typeof AREA_SLUGS)[number];

export type Area = {
  slug: AreaSlug;
  /** Display name, the same string as its Category. */
  name: Category;
  category: Category;
  /** System colour name (CATEGORY_TONE): the dot, number and headline accent line. */
  tone: string;
  /** Position in CATEGORIES. */
  index: number;
  /** Area card: one line under the function name (handoff global.areas). */
  lead: string;
  /** The example line in its open row. */
  signal: string;
  /** Solution hero: two lines, the second is the accent line. */
  headline: Headline;
  /** The body under the headline. */
  valueProp: string;
  /** Who the page is for (handoff customer_fit). */
  fit: string;
  /** Page title (used as given) and meta description (handoff §10). */
  meta: { title: string; description: string };
  /** "Where the manual work remains": three cards, a short title and the sentence. */
  expect: { title: string; text: string }[];
  /** "What a scoped application would prepare": three outputs. */
  deliverables: string[];
  /** The customer-facing scope note. */
  scope: string;
  /** The workflow records the page renders (APPLICATIONS ids). */
  workflowIds: string[];
  /** "Illustrative example": one figure and the first workflow's situation. */
  example: { value: string; text: string };
  faq: { q: string; a: string }[];
  /** The closing call to action (handoff closing_heading, closing_body). */
  closing: { heading: string; body: string };
};

/** Shared solution-page copy (handoff §6: identical on every page). */
export const AREA_SHARED = {
  problemHeading: "Where the manual work remains",
  outputHeading: "What a scoped application would prepare",
  processHeading: "Start by checking the existing workflow",
  processBody:
    "Show us a recent exception and how your current software handles it. We will assess whether configuration, a specialist tool or a custom application is worth considering.",
  processLink: { label: "See how we work", href: "/#how" },
  closingBody:
    "The first conversation is free and takes 30 minutes. Describe the workflow and the records involved; no confidential files are needed for the introductory call.",
} as const;

const base = (slug: AreaSlug, category: Category) => ({
  slug,
  name: category,
  category,
  tone: CATEGORY_TONE[category],
  index: CATEGORIES.indexOf(category),
});

export const AREAS: Area[] = [
  {
    ...base("supply-chain", "Supplier coordination"),
    lead: "Review supplier delivery changes and, where relevant, job-work discrepancies with the source records attached.",
    signal: "1,000 sent, 940 back: 40 pieces to reconcile",
    headline: ["Review the supplier records", "that do not agree"],
    valueProp:
      "Manufacturers and distributors can receive delivery changes outside their recorded supplier schedule. Manufacturers using job workers may also have conflicting challan and return records. We are exploring applications that prepare these exceptions for the responsible buyer or operations owner.",
    fit: "Manufacturers and industrial distributors for supplier changes; manufacturers with external processing for job-work reconciliation.",
    meta: {
      title: "Supplier and Job Work Reviews | Decignal",
      description:
        "Explore proposed workflows for job-work discrepancies and supplier promise changes, with source records prepared for your team to review.",
    },
    expect: [
      { title: "Returns that do not match", text: "External return records do not match the recorded challan." },
      { title: "Changes left in messages", text: "A partial quantity or revised date remains in a supplier message." },
      { title: "Evidence to collect first", text: "The reviewer has to collect several documents before asking a useful follow-up question." },
    ],
    deliverables: [
      "A proposed match to the relevant challan or purchase-order line.",
      "The original records and the differences between them.",
      "A list of unresolved items and draft questions for the owner.",
    ],
    scope: "The proposal supports exception review. Existing ERP or job-work functions keep responsibility for balances, postings and commitments.",
    workflowIds: ["jobwork-reconciliation", "supplier-updates"],
    example: {
      value: "40 pieces",
      text: "A coating job sends 1,000 pieces, receives 940 back and has accepted rejection records for 20. The remaining 40 are prepared for review, not declared lost.",
    },
    faq: [
      {
        q: "Does this replace job work in Tally or subcontracting in SAP?",
        a: "No. Those systems already support the underlying records. We would assess only the external-document reconciliation or update task that remains unresolved.",
      },
      {
        q: "Can you read supplier WhatsApp messages?",
        a: "We can discuss an authorised way to receive relevant business messages or exports. Access and supported formats must be confirmed; private chat access is not assumed.",
      },
      {
        q: "Will it update quantities or delivery dates automatically?",
        a: "The proposed first workflow prepares changes for review. Posting them back to a system requires a separately agreed scope.",
      },
    ],
    closing: { heading: "Which supplier exception needs too much investigation?", body: AREA_SHARED.closingBody },
  },
  {
    ...base("operations", "Dispatch documentation"),
    lead: "Prepare a customer-specific document pack and highlight missing or conflicting evidence.",
    signal: "Line 12: heat H241 on record, H214 on the certificate",
    headline: ["Prepare the documents needed", "for a shipment review"],
    valueProp:
      "We are exploring applications that assemble customer-specific dispatch evidence and flag missing or conflicting records. Your quality team remains responsible for checking the pack and approving its use.",
    fit: "Manufacturers and industrial stockists whose customers require certificates linked to the delivered material.",
    meta: {
      title: "Dispatch Document Pack Review | Decignal",
      description:
        "Explore a proposed workflow for customer-specific dispatch documents, missing certificates and conflicting references. Quality approval stays with your team.",
    },
    expect: [
      { title: "Certificates in many places", text: "Required certificates sit in different systems or supplier folders." },
      { title: "References that disagree", text: "Heat, batch or revision references do not match the delivery records." },
      { title: "The same checklist, again", text: "A customer checklist has to be checked again for every shipment." },
    ],
    deliverables: [
      "A document index tied to the relevant delivery lines.",
      "A status for each item in the approved checklist.",
      "Missing-document and conflicting-reference lists with source links.",
    ],
    scope: "This is a document preparation and review proposal. It does not create test results, sign certificates, establish conformity or release a shipment.",
    workflowIds: ["dispatch-pack"],
    example: {
      value: "H241 ≠ H214",
      text: "Delivery line 12 refers to heat H241; the attached certificate refers to H214. The line stays marked for review and neither number is corrected.",
    },
    faq: [
      {
        q: "Our quality system already creates certificates. What would be different?",
        a: "It may already be sufficient. The assessment focuses on the remaining work of bringing external evidence together and checking the whole pack against a customer-specific checklist.",
      },
      {
        q: "Can it decide whether a certificate is acceptable?",
        a: "It can be scoped to flag defined checks and supporting evidence. Your quality reviewer decides whether the documents meet the applicable requirements.",
      },
      {
        q: "What if the certificate is unreadable or does not match?",
        a: "The item must remain marked for review. The workflow should not guess a missing heat number, result or signature.",
      },
    ],
    closing: { heading: "Show us how your team prepares a dispatch pack", body: AREA_SHARED.closingBody },
  },
  {
    ...base("commercial", "RFQ review"),
    lead: "Compare customer requirements with supplied documents and prepare clarification questions for the sales or engineering reviewer.",
    signal: "Enquiry says SS316, supplier offer says SS304",
    headline: ["Find the questions to resolve", "before preparing a quote"],
    valueProp:
      "For industrial distributors, equipment dealers and manufacturers, we are exploring applications that bring customer requirements, supplier offers and later clarifications into one review. The output highlights conflicts and missing information before your team prepares the quote.",
    fit: "Industrial distributors, equipment dealers and manufacturers handling specification-heavy enquiries.",
    meta: {
      title: "RFQ Requirements and Clarifications | Decignal",
      description:
        "Explore RFQ clarification for industrial distributors and manufacturers. Compare customer requirements with supplier documents before preparing a quote.",
    },
    expect: [
      { title: "Requirement against offer", text: "A customer requirement differs from the supplier offer or product datasheet." },
      { title: "Lines hard to match", text: "Item aliases or revised documents make it hard to establish which enquiry line a statement belongs to." },
      { title: "Questions found late", text: "The sales or engineering reviewer discovers a material question late in quote preparation." },
    ],
    deliverables: [
      "A requirement sheet linked to customer and supplier document references.",
      "A list of conflicting specifications, uncertain item links and missing information.",
      "Draft clarification questions for the sales or engineering reviewer.",
    ],
    scope: "The proposed application prepares the review. Technical feasibility, pricing, terms and customer commitments remain with your team.",
    workflowIds: ["rfq-clarifications"],
    example: {
      value: "SS316 ≠ SS304",
      text: "A valve stockist’s enquiry specifies SS316 wetted parts while the supplier offer lists SS304. The difference is flagged and a clarification drafted; no substitute is chosen.",
    },
    faq: [
      {
        q: "Can our CRM or CPQ do this already?",
        a: "It may cover the task. We would first assess the exact workflow and configuration, especially whether the remaining problem is document interpretation or ordinary data entry.",
      },
      {
        q: "Will it calculate the quote or approve a design?",
        a: "Those are outside this example. The initial output is a requirement and clarification pack for the estimator.",
      },
      {
        q: "Can it handle revised specifications?",
        a: "Revision comparison can be assessed using a complete, authorised document set. Conflicting instructions stay visible until your engineer resolves them.",
      },
      {
        q: "Will it choose an equivalent product for a distributor?",
        a: "The proposed scope flags differences and prepares questions. It does not establish technical equivalence or approve a substitution. Your qualified reviewer decides what can be offered.",
      },
    ],
    closing: { heading: "Which RFQ questions arrive too late?", body: AREA_SHARED.closingBody },
  },
  {
    ...base("customer", "Service follow-up"),
    lead: "Turn an authorised service recommendation into an internal follow-up for review.",
    signal: "A seal recommended at the next shutdown, serial incomplete",
    headline: ["Turn a service recommendation", "into a reviewable next step"],
    valueProp:
      "A service report may recommend additional work without creating a follow-up in the systems your team uses. We are exploring a scoped handover for those recommendations, with part and coverage questions left visible.",
    fit: "Industrial equipment manufacturers, dealers and independent service businesses with authorised reports and an owner for follow-up.",
    meta: {
      title: "Service Report Follow Up | Decignal",
      description:
        "Explore service-report follow-up for equipment dealers and service businesses, with equipment, part and coverage questions prepared for review.",
    },
    expect: [
      { title: "Recommendations in PDFs", text: "Recommendations remain in PDF reports from technicians or service partners." },
      { title: "Records found again", text: "The next owner has to find the equipment and contract records again." },
      { title: "Work already open", text: "A proposed follow-up may already have a quote or open job." },
    ],
    deliverables: [
      "The original recommendation linked to the equipment record.",
      "Candidate parts and unresolved coverage questions.",
      "An internal follow-up for review, checked against existing work where records allow.",
    ],
    scope: "Existing field-service software may already manage this flow. The candidate applies only to recommendations still missed outside that process.",
    workflowIds: ["service-followup"],
    example: {
      value: "1 follow-up",
      text: "A pump service report recommends a seal replacement at the next shutdown, but the serial is incomplete. An internal follow-up asks the owner to confirm the equipment and part.",
    },
    faq: [
      {
        q: "Does this replace our field-service software?",
        a: "No. If the existing system captures recommendations and creates the required follow-up, use that workflow. We would assess only the remaining gap.",
      },
      {
        q: "Will it send a quotation to the customer?",
        a: "The proposed first workflow prepares an internal review. Your team validates the part, price and coverage before sending any quote.",
      },
      {
        q: "Can it decide whether the work is under warranty?",
        a: "It can be scoped to retrieve the relevant records and flag questions. An authorised person decides entitlement.",
      },
    ],
    closing: { heading: "Where do service recommendations lose their owner?", body: AREA_SHARED.closingBody },
  },
  {
    ...base("finance-and-risk", "Deduction review"),
    lead: "Bring the records behind a customer deduction together for the finance team.",
    signal: "₹75,000 deducted for a reported shortage",
    headline: ["Prepare the evidence behind", "a customer deduction"],
    valueProp:
      "We are exploring applications that bring debit notes, invoices, delivery records and relevant correspondence into a review packet. Finance can then assess the deduction and decide how to respond.",
    fit: "Manufacturers and industrial distributors with recurring customer deductions and a finance owner able to review the evidence.",
    meta: {
      title: "Customer Deduction Evidence | Decignal",
      description:
        "Explore a proposed workflow that prepares invoices, delivery records and supporting evidence for a finance team to review a customer deduction.",
    },
    expect: [
      { title: "Codes to investigate", text: "A debit note uses a reference or reason code that needs investigation." },
      { title: "Records in three teams", text: "Supporting records are spread across dispatch, sales and finance." },
      { title: "Responses that wait", text: "A response is delayed while the team searches for missing evidence." },
    ],
    deliverables: [
      "A proposed link between the deduction and the relevant transaction records.",
      "Supporting documents and missing evidence in one review packet.",
      "A draft response for the finance owner to approve or change.",
    ],
    scope: "This is not generic accounts-payable automation. Existing dispute and deduction platforms must be assessed before proposing a custom evidence workflow.",
    workflowIds: ["deduction-evidence"],
    example: {
      value: "₹75,000",
      text: "A buyer deducts ₹75,000 for a reported delivery shortage. The invoice and acknowledgement are linked; the ambiguous receiver note is left for finance to review.",
    },
    faq: [
      {
        q: "Does SAP or a deduction-management product already do this?",
        a: "These products can cover significant parts of the workflow, including evidence handling. We would look for a specific unresolved requirement and compare alternatives before proposing custom work.",
      },
      {
        q: "Will you guarantee recovery of the deduction?",
        a: "No. Evidence preparation does not establish that a deduction is invalid. Recovery also depends on the facts, commercial terms and the customer’s decision.",
      },
      {
        q: "Does it post a credit note or send a dispute automatically?",
        a: "Those actions are outside the proposed first scope. Finance reviews the evidence and implements the authorised response through its existing process.",
      },
    ],
    closing: { heading: "Which deductions take too long to investigate?", body: AREA_SHARED.closingBody },
  },
];

export const areaBySlug = (slug: string) => AREAS.find((a) => a.slug === slug);
export const areaOf = (category: Category) => AREAS.find((a) => a.category === category)!;
export const areaHref = (category: Category) => `/solutions/${areaOf(category).slug}`;

/** The function's workflows with their index in APPLICATIONS (for the explorer and anchors). */
export const appsOf = (area: Area) => APPLICATIONS.map((x, i) => ({ ...x, i })).filter((x) => x.category === area.category);

/** The workflows a page renders, in its workflowIds order, with their index in APPLICATIONS. */
export const pageApps = (area: Area) =>
  area.workflowIds.map((id) => {
    const i = APPLICATIONS.findIndex((a) => a.id === id);
    return { ...APPLICATIONS[i], i };
  });

/** "Proposed workflows": the solution hero eyebrow. */
export const areaEyebrow = () => "Proposed workflows";
