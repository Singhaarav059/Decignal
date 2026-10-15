// Product content: the six proposed workflows, the three customer segments, the delivery process, the
// FAQ and the record sources the workflows use (handoff 15 October 2026, §3 to §7).
// Section and chapter strings live in lib/copy.ts, the worked dispatch example in lib/example.ts.
//
// Style rules, for every string on the site:
// (a) Every workflow is a proposed workflow. Never "available", "live", "approved" or a delivered result.
// (b) No fixed delivery times, counts of products, connector promises or outcome figures.
// (c) Money is ₹ with Indian digit grouping ("₹75,000"); say INR in prose only when clarity needs it.
// (d) The workflow prepares; a named person reviews and decides. Nothing is approved, sent or posted.
// (e) Indian English: catalogue, organisation, fulfilment. Curly apostrophes. No em dashes.

/** The five business functions (handoff global.areas). Slugs in lib/areas.ts keep the old routes. */
export const CATEGORIES = [
  "Supplier coordination",
  "Dispatch documentation",
  "RFQ review",
  "Service follow-up",
  "Deduction review",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Workflow = {
  /** The shared record id (handoff §7); also the page anchor #application-{id}. */
  id: string;
  name: string;
  category: Category;
  status: string;
  /** The one-line summary. */
  text: string;
  data: string;
  output: string;
  reviewer: string;
  measure: string;
  fit: string;
  example: { situation: string; evidence: string; action: string; limitation: string };
};

const STATUS = "Proposed workflow";

/**
 * The six proposed workflows, in directory order: D01, D05 and D06 first (one per audience, the three
 * the homepage features), then D02, D03 and D04. APPLICATION_DEMOS (lib/application-demos.ts) is
 * index-aligned with this array.
 */
export const APPLICATIONS: Workflow[] = [
  {
    id: "dispatch-pack",
    name: "Dispatch document pack review",
    category: "Dispatch documentation",
    status: STATUS,
    text: "Prepare a customer-specific document index and flag missing certificates, revision conflicts or mismatched references.",
    data: "Customer checklist, delivery-line export, material and process certificates, approved test reports.",
    output: "A draft document pack with source links and a list of items for the quality team to resolve.",
    reviewer: "Quality or dispatch reviewer.",
    measure: "Total preparation and review time, document-related rework and critical mismatches found.",
    fit: "Manufacturers and certificate-dependent industrial stockists.",
    example: {
      situation: "Delivery line 12 refers to heat H241; the attached certificate refers to H214.",
      evidence: "Show both original references and their source records.",
      action: "Request confirmation of the correct certificate and keep the line marked for review.",
      limitation: "This does not certify conformance or approve dispatch. Use existing quality-system functions where they adequately support the task.",
    },
  },
  {
    id: "rfq-clarifications",
    name: "RFQ clarification pack",
    category: "RFQ review",
    status: STATUS,
    text: "Prepare a review of customer requirements and supplier documents, highlighting conflicts and questions to resolve before quoting.",
    data: "Customer enquiry and revisions, supplier offer, technical datasheets, approved item references and a reviewed requirement checklist.",
    output: "A source-linked requirement sheet and draft clarification questions.",
    reviewer: "Sales owner with a qualified product or engineering reviewer.",
    measure: "Time to a complete handover, missed requirements and review corrections.",
    fit: "Industrial distributors, equipment dealers and manufacturers handling specification-heavy enquiries.",
    example: {
      situation: "A valve stockist receives a customer enquiry specifying SS316 wetted parts, while the supplier offer lists SS304.",
      evidence: "Show the customer requirement and supplier statement with document references and their proposed link to the enquiry line.",
      action: "Flag the material difference and prepare a clarification for the reviewer before a quotation is sent.",
      limitation: "Do not treat the grades as equivalent, approve a substitute or calculate a quote automatically. If the line match is uncertain, leave it for review.",
    },
  },
  {
    id: "service-followup",
    name: "Service to quote handover",
    category: "Service follow-up",
    status: STATUS,
    text: "Find follow-up recommendations in authorised service reports and prepare them for the responsible service or sales owner.",
    data: "Service reports, equipment records, approved part references, coverage information and existing quote status.",
    output: "A proposed follow-up with the recommendation source and unresolved part or entitlement questions.",
    reviewer: "Service owner, then sales where appropriate.",
    measure: "Time to reviewed follow-up, duplicate proposals and confirmed actions.",
    fit: "Industrial equipment manufacturers, dealers and independent service businesses.",
    example: {
      situation: "A pump service partner’s authorised report recommends replacing a seal at the next shutdown, but the equipment serial is incomplete.",
      evidence: "Show the original recommendation, candidate equipment records and any existing follow-up or quote.",
      action: "Prepare an internal follow-up asking the service owner to confirm the equipment, required part and next step.",
      limitation: "Do not infer part compatibility, decide warranty coverage or send a customer quote. Use an existing field-service workflow if it already captures the recommendation.",
    },
  },
  {
    id: "jobwork-reconciliation",
    name: "Job work discrepancy review",
    category: "Supplier coordination",
    status: STATUS,
    text: "Bring job-work movements, supplier statements and return documents together to explain unresolved differences.",
    data: "Challans, material movements, job orders, supplier statements and approved rejection or scrap records.",
    output: "A reconciliation sheet by challan and batch with source-backed explanations and unresolved items.",
    reviewer: "Stores, procurement or operations owner.",
    measure: "Age of unresolved differences, review time and corrections required.",
    fit: "Manufacturers outsourcing processing to job workers.",
    example: {
      situation: "A coating job sends 1,000 pieces, receives 940 back and has accepted rejection records for 20.",
      evidence: "The available records account for 960 pieces; 40 remain to be reconciled.",
      action: "Prepare a follow-up with the linked challan, return and rejection records.",
      limitation: "The 40 pieces are not automatically lost. Existing SAP or Tally job-work records remain the source for postings.",
    },
  },
  {
    id: "deduction-evidence",
    name: "Customer deduction evidence",
    category: "Deduction review",
    status: STATUS,
    text: "Assemble the records behind a short payment or debit note so finance can review the reason and prepare a response.",
    data: "Deduction advice, invoice, remittance, delivery evidence and relevant approved commercial or quality records.",
    output: "A draft evidence packet with missing support and a proposed response for review.",
    reviewer: "Finance controller or authorised receivables owner.",
    measure: "Preparation time, unresolved age and attributable recovery after review.",
    fit: "Manufacturers and industrial distributors with recurring customer deductions.",
    example: {
      situation: "A buyer deducts ₹75,000 for a reported delivery shortage.",
      evidence: "The invoice and delivery acknowledgement are available, but the receiver note is ambiguous.",
      action: "Prepare the evidence and highlight the unresolved note for the finance owner.",
      limitation: "This does not establish that the deduction is invalid or guarantee recovery. Existing dispute-management products must be assessed first.",
    },
  },
  {
    id: "supplier-updates",
    name: "Supplier promise change review",
    category: "Supplier coordination",
    status: STATUS,
    text: "Prepare a review of changed quantities or dates from supplier updates and link them to the relevant purchase-order lines.",
    data: "Open purchase orders, confirmed schedules, authorised supplier messages and linked internal requirements.",
    output: "Proposed changes with source statements, affected commitments and questions for the buyer.",
    reviewer: "Procurement owner.",
    measure: "Time to reviewed update, extraction errors and unnecessary escalations.",
    fit: "Manufacturers, industrial distributors and equipment dealers receiving supplier schedule changes.",
    example: {
      situation: "A distributor’s supplier changes a confirmed order of 100 contactors to 60 on Friday and 40 the following Wednesday.",
      evidence: "Show the supplier message, confirmed PO schedule and any verified allocation to a customer order.",
      action: "Prepare the revised schedule for review and identify linked customer commitments that need checking.",
      limitation: "Do not change the PO or promise a delivery date. If the allocation or customer commitment is unknown, mark impact as needing review.",
    },
  },
];

/** The three the homepage features, in order (handoff home.examples_intro). */
export const FEATURED = [0, 1, 2] as const;

/** Old anchors (#application-{kind}) and the workflow each now scrolls to (handoff §11 legacy mapping). */
export const LEGACY_ANCHORS: Record<string, string> = {
  inventory: "jobwork-reconciliation",
  demand: "supplier-updates",
  risk: "supplier-updates",
  production: "dispatch-pack",
  maintenance: "dispatch-pack",
  sales: "rfq-clarifications",
  customer: "service-followup",
  finance: "deduction-evidence",
};

/**
 * The three customer segments (handoff home.audience). These are who buys, not three more products.
 * `workflows` are APPLICATIONS ids; `href` is the card's link.
 */
export const AUDIENCE = [
  {
    name: "Manufacturers",
    text: "Prepare dispatch evidence, review job-work differences and investigate supplier or payment exceptions.",
    workflows: ["dispatch-pack", "jobwork-reconciliation", "deduction-evidence"],
    href: "/solutions/operations",
    example: "A machined-components supplier links a delivery line to the material certificate for the correct heat and flags an absent external-process report.",
    industries: "Engineering components, metal products, industrial machinery, electrical equipment",
  },
  {
    name: "Industrial distributors and stockists",
    text: "Clarify customer specifications against supplier offers, review delivery changes and assemble deduction evidence.",
    workflows: ["rfq-clarifications", "supplier-updates", "deduction-evidence"],
    href: "/solutions/commercial",
    example: "A valve stockist compares a customer’s material requirement with a supplier’s offered grade and prepares a clarification before the sales team quotes.",
    industries: "Industrial components, electrical equipment, machinery spares, metal products",
  },
  {
    name: "Equipment dealers and service businesses",
    text: "Turn recommendations from authorised service reports into internal follow-ups with equipment, part and coverage questions visible.",
    workflows: ["service-followup"],
    href: "/solutions/customer",
    example: "A pump service partner’s report recommends a seal replacement, but the serial number is incomplete and no one owns the follow-up.",
    industries: "Dealers and service businesses supporting industrial equipment",
  },
] as const;

/** The delivery process (handoff home.delivery): one sequence, no fixed durations. */
export const PATHS = {
  label: "From a real exception to a tested workflow",
  steps: [
    {
      title: "Review the task and existing tools",
      text: "Look at a recent exception with the process owner. Check what the current software and its configuration already support.",
      deliverable: "A decision on whether there is a gap worth investigating.",
    },
    {
      title: "Agree the scope and evidence",
      text: "Define the documents, record links, reviewer and acceptance criteria. Compare the proposed build with improving the existing setup.",
      deliverable: "A written scope, estimate and agreed evaluation.",
    },
    {
      title: "Test on representative cases",
      text: "Use complete, incomplete and conflicting records. Compare the proposed output with the team’s reviewed results and measure the full preparation effort.",
      deliverable: "Evidence of what works, what fails and what still requires review.",
    },
    {
      title: "Launch with an owner",
      text: "Define who uses the application, how issues are handled and how performance will be reviewed. Agree any ongoing support separately.",
      deliverable: "A rollout plan with named responsibilities.",
    },
  ],
  timing: "The delivery estimate depends on scope, data access and testing. We confirm it after the workflow review.",
};

/** The homepage FAQ (handoff home.faq). FAQ_TOPICS is index-aligned. */
export const FAQ = [
  {
    q: "Why would we need this if we already use SAP, Tally or another ERP?",
    a: "You may not. The first step is to check the task against your current software and configuration. We would consider a custom application only for a specific gap, such as preparing evidence from external documents that still takes your team substantial manual work.",
  },
  {
    q: "Is Decignal only for manufacturers?",
    a: "Our initial audience also includes industrial distributors, stockists, equipment dealers and service businesses. We select the workflow that fits your operations. For example, a distributor may need RFQ clarification, while a manufacturer using external processors may need job-work reconciliation.",
  },
  {
    q: "What is Decignal building?",
    a: "Custom applications for specific operational tasks, including dispatch documents, supplier exceptions, RFQ clarification, customer deductions and service follow-up. The examples are proposed workflows; we confirm scope and capability before a build.",
  },
  {
    q: "Does this replace our ERP or quality system?",
    a: "The proposed applications prepare work for your team while the existing systems remain responsible for their records and transactions. Any write-back or automated action would need a separately agreed scope.",
  },
  {
    q: "Could our software partner build this?",
    a: "Possibly. Configuration, an established product or an application built by your current partner may be the right option. Compare the complete cost, support needs and results on your actual records before choosing.",
  },
  {
    q: "Which systems can you connect to?",
    a: "We assess the exact product, version, available exports and access restrictions. An initial evaluation can use approved files. We confirm any live integration before including it in the proposal.",
  },
  {
    q: "How do you handle wrong or missing information?",
    a: "The proposed workflow must show its source records and distinguish a supported match from missing or conflicting evidence. Your reviewer resolves the exceptions. We test that behaviour on representative cases before considering a rollout.",
  },
  {
    q: "Can we send WhatsApp messages, scans or regional-language documents?",
    a: "Describe the sources and languages during the review. We assess authorised access and test representative samples. We do not assume access to private chats or promise accuracy on an untested document type or language.",
  },
  {
    q: "How is our data handled?",
    a: "Data access, storage, model providers, retention and deletion must be agreed before project data is shared. The introductory call does not require credentials or confidential documents. Website enquiry data is covered by the privacy notice.",
  },
  {
    q: "What does the first engagement cost?",
    a: "The introductory 30-minute call is free. A more detailed assessment, implementation and ongoing support are scoped separately. Fees and timing are set out in a written proposal.",
  },
  {
    q: "Who owns the work and supports it?",
    a: "The project agreement defines ownership or licences for custom work, reusable components and third-party services. It also defines documentation, data access, maintenance and handover responsibilities.",
  },
  {
    q: "Are the examples customer results?",
    a: "No. They illustrate proposed workflows. Ask us what can currently be demonstrated for your use case; any future customer results will be identified separately.",
  },
];

/** One topic word per FAQ entry, index-aligned with FAQ. Neutral chrome: no tones. */
export const FAQ_TOPICS = [
  "Existing software",
  "Audience",
  "What we build",
  "Your systems",
  "Alternatives",
  "Integration",
  "Exceptions",
  "Sources",
  "Data",
  "Cost",
  "Ownership",
  "Examples",
];

/** The five questions the nav's FAQ glance shows (NavPeek FAQ_PICK). */
export const FAQ_PEEK = [0, 1, 5, 6, 9];

/**
 * The six record sources behind the worked dispatch review: the story's islands, the systems ring and
 * the evidence panels. `read` is the example's record from that source. No vendor names or logos as
 * connectors (handoff home.systems). Ids are kept from the earlier systems so photos and icons still map.
 */
export const CONNECTS: { id: string; name: string; full: string; tone: string; reads: string; read: string }[] = [
  { id: "erp", name: "ERP", full: "ERP and accounting", tone: "cobalt", reads: "Delivery lines, invoices, purchase orders and receipts", read: "Line 12 recorded against heat H241" },
  { id: "crm", name: "Customer", full: "Customer requirements", tone: "violet", reads: "Checklists, enquiries, revisions and deduction advices", read: "Checklist Rev C · six documents per shipment" },
  { id: "mes", name: "Quality", full: "Quality records", tone: "emerald", reads: "Test reports, inspection records and batch references", read: "Dimensional report for line 12 · supported" },
  { id: "wms", name: "Job work", full: "Job workers and processors", tone: "saffron", reads: "Challans, returns and process certificates", read: "Heat-treatment certificate · not found" },
  { id: "sup", name: "Suppliers", full: "Supplier documents", tone: "tangerine", reads: "Material certificates, offers, datasheets and schedule updates", read: "Mill certificate refers to heat H214" },
  { id: "ext", name: "Files", full: "Authorised email and folders", tone: "pink", reads: "Shared folders, authorised mailboxes, scans and exports", read: "Shipment folder · 11 files supplied" },
];

/** Each business function keeps one colour everywhere it appears. */
export const CATEGORY_TONE: Record<Category, string> = {
  "Supplier coordination": "cobalt",
  "Dispatch documentation": "emerald",
  "RFQ review": "tangerine",
  "Service follow-up": "pink",
  "Deduction review": "violet",
};
