// Product content: the fifteen application examples, the four industries, the delivery process, the
// FAQ and the record sources (handoff revision 3, 15 October 2026, §5 to §8).
// Section and chapter strings live in lib/copy.ts, the three demonstrations in lib/demonstrations.ts.
//
// Style rules, for every string on the site:
// (a) These are application examples for custom builds: "Application examples" names the catalogue,
//     "Illustrative example" marks a fictional scenario. Never "available", "shipped", "proposed" or a result.
// (b) No fixed delivery times, counts of products, connector promises or outcome figures.
// (c) Money is ₹ with Indian digit grouping ("₹75,000"); say INR in prose only when clarity needs it.
// (d) We design and build; the application prepares; your team approves.
// (e) Indian English: catalogue, organisation, fulfilment. Curly apostrophes. No em dashes.

/** The five business functions (handoff §4). Slugs in lib/areas.ts keep the old routes. */
export const CATEGORIES = [
  "Sales and order management",
  "Procurement and supply chain",
  "Operations and delivery",
  "Finance and receivables",
  "Service and support",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** The industry filters (handoff §5 home.industries): `?industry=` keys on /solutions. */
export const INDUSTRY_KEYS = ["manufacturing", "distribution", "logistics", "services"] as const;
export type IndustryKey = (typeof INDUSTRY_KEYS)[number];

export type Application = {
  /** The shared record id and the anchor on its function page (/solutions/{slug}#{id}). */
  id: string;
  name: string;
  category: Category;
  /** The one-line summary (cards and the homepage). */
  text: string;
  /** Who it is for. */
  fit: string;
  /** The illustrative scenario. */
  example: string;
  /** Works with. */
  data: string;
  /** What it produces. */
  output: string;
  /** Used by. */
  reviewer: string;
  /** What to measure. */
  measure: string;
  /** Industry filters this example appears under. */
  industries: readonly IndustryKey[];
};

/**
 * The fifteen application examples (handoff §7), three per function in CATEGORIES order. Industry tags
 * come from the §5 industry example links and each record's "Who it is for"; correct them here.
 */
export const APPLICATIONS: Application[] = [
  {
    id: "sales-order-intake",
    name: "Customer order intake",
    category: "Sales and order management",
    text: "Turn customer purchase orders and order messages into draft sales orders, with uncertain items and changed terms brought to the order desk.",
    fit: "Distributors, wholesalers and manufacturers receiving orders in several formats.",
    example: "An electrical distributor receives an order for 20 boxes of switches. The customer uses an old item code and the pack size is unclear. The application brings up the approved item mapping and asks the order desk to confirm the unit before preparing the order.",
    data: "Customer orders, approved item and customer masters, price lists and relevant order history.",
    output: "Draft order lines, source references and an exception queue. Approved entries can be passed to the order system through an agreed integration.",
    reviewer: "Sales operations or the order desk.",
    measure: "Time from receipt to accepted order; corrected item, quantity and price fields.",
    industries: ["distribution", "manufacturing"],
  },
  {
    id: "rfq-preparation",
    name: "RFQ preparation",
    category: "Sales and order management",
    text: "Bring enquiry lines, specifications and supplier offers into a quote worksheet, with the questions your sales team needs to resolve.",
    fit: "Manufacturers, equipment suppliers and distributors handling detailed enquiries.",
    example: "A pump supplier receives a bill of quantities, two revised datasheets and an email changing the motor requirement. The application assembles the current requirements and marks the conflicting motor specification before the estimator prices the job.",
    data: "Enquiries and revisions, product records, supplier offers and the team’s approved quote checklist.",
    output: "A quote worksheet with requirement references, candidate catalogue matches and clarification questions.",
    reviewer: "Sales estimator, with engineering review where required.",
    measure: "Time to a complete quote worksheet; requirements missed or corrected during review.",
    industries: ["manufacturing", "distribution", "services"],
  },
  {
    id: "supplier-price-updates",
    name: "Supplier price list updates",
    category: "Sales and order management",
    text: "Compare new supplier price files with your item catalogue and prepare the changes your pricing team needs to approve.",
    fit: "Industrial, electrical, building-product and spare-parts distributors.",
    example: "A supplier sends a revised spreadsheet using new item descriptions and a different pack unit. The application separates confirmed price changes from uncertain item matches and shows the effective date on each proposed update.",
    data: "Current and revised supplier files, approved item aliases, pack sizes and price records.",
    output: "A proposed update file with previous price, new price, unit, effective date and unresolved matches.",
    reviewer: "Pricing or catalogue manager.",
    measure: "Time to approve a supplier update; incorrect mappings and price corrections.",
    industries: ["distribution"],
  },
  {
    id: "purchase-quote-comparison",
    name: "Purchase quotation comparison",
    category: "Procurement and supply chain",
    text: "Put supplier quotations on a comparable basis, showing differences in quantity, specification, freight, payment terms and delivery.",
    fit: "Procurement teams in manufacturing, distribution and project businesses.",
    example: "Three suppliers quote the same purchase request. One quotes per box, another excludes freight, and the third offers a different delivery date. The application prepares a comparison sheet and keeps unconfirmed terms visible.",
    data: "Purchase request, supplier quotations, approved unit conversions and the buyer’s comparison rules.",
    output: "A comparison sheet with linked quotation lines, calculated totals where inputs are complete, and questions for suppliers.",
    reviewer: "Buyer or procurement manager.",
    measure: "Preparation time per comparison; errors in quantities, terms and total cost.",
    industries: ["manufacturing", "distribution"],
  },
  {
    id: "supplier-commitment-tracking",
    name: "Supplier commitment tracking",
    category: "Procurement and supply chain",
    text: "Turn supplier updates into a current view of promised quantities and dates, with the orders that need follow-up.",
    fit: "Manufacturers, distributors and equipment suppliers managing open purchase orders.",
    example: "A supplier changes a commitment of 100 contactors to 60 on Friday and 40 the following Wednesday. The application links the update to the purchase-order line and identifies customer commitments that need checking.",
    data: "Open purchase orders, supplier confirmations, authorised updates and verified links to internal requirements.",
    output: "A change list with previous and revised commitments, supporting messages, affected orders and follow-up owners.",
    reviewer: "Procurement or supply planning.",
    measure: "Time to capture a changed commitment; missed changes and overdue follow-ups.",
    industries: ["manufacturing", "distribution", "services"],
  },
  {
    id: "job-work-reconciliation",
    name: "Job work reconciliation",
    category: "Procurement and supply chain",
    text: "Bring job-work movements and supplier records together to explain outstanding quantities and prepare the right follow-up.",
    fit: "Manufacturers that send material or components to external processors.",
    example: "A coating job sends 1,000 pieces, receives 940 back and has accepted rejection records for 20. The application accounts for the documented 960 pieces and prepares the remaining 40 for reconciliation with the job worker.",
    data: "Job orders, challans, material movements, supplier statements, returns and approved rejection records.",
    output: "A reconciliation by challan or batch, with explained balances and unresolved differences.",
    reviewer: "Stores, procurement or operations.",
    measure: "Age of outstanding differences; time to reconcile a job-work cycle.",
    industries: ["manufacturing"],
  },
  {
    id: "operational-exception-brief",
    name: "Daily operational brief",
    category: "Operations and delivery",
    text: "Bring orders, supply updates and dispatch records into a daily brief showing what changed, what needs attention and who owns the next step.",
    fit: "Businesses coordinating work across branches, plants or operating teams.",
    example: "An operations head asks which orders due this week need attention. The application brings together a supplier delay, an unconfirmed stock allocation and a delivery hold, each linked to its source and responsible team.",
    data: "Order book, stock and allocation records, supply updates, dispatch status and agreed exception rules.",
    output: "A prioritised brief with data timestamps, supporting records, assigned follow-ups and unanswered questions.",
    reviewer: "Operations head, branch manager or supply coordinator.",
    measure: "Time to prepare the daily review; missed exceptions and follow-ups completed.",
    industries: ["manufacturing", "distribution", "logistics"],
  },
  {
    id: "production-record-capture",
    name: "Production record capture",
    category: "Operations and delivery",
    text: "Turn shift sheets and production notes into structured records, with incomplete entries routed back to the team that knows the work.",
    fit: "Manufacturers still consolidating production information from paper or spreadsheets.",
    example: "A packaging plant records output, rejection quantities and downtime on shift sheets. The application prepares a daily production record, preserves the original sheet and asks the supervisor to resolve an unreadable quantity.",
    data: "Shift sheets, job and machine references, product codes and agreed field definitions.",
    output: "Structured production records and a review queue for missing, unreadable or inconsistent entries.",
    reviewer: "Production supervisor.",
    measure: "Time from shift end to a reviewed record; transcription errors and missing entries.",
    industries: ["manufacturing"],
  },
  {
    id: "delivery-document-followup",
    name: "Delivery and POD follow-up",
    category: "Operations and delivery",
    text: "Match delivery acknowledgements to shipments and organise the follow-up for missing or disputed delivery records.",
    fit: "Manufacturers, distributors, transport operators and logistics service businesses.",
    example: "A distributor has delivered goods to several customer sites, but one proof of delivery has no clear order reference and another records a shortage. The application proposes the links and prepares separate follow-ups for missing evidence and the reported shortage.",
    data: "Shipment records, lorry receipts, proof of delivery, customer acknowledgements and relevant correspondence.",
    output: "A shipment-wise status list with matched records, unresolved links and follow-up tasks.",
    reviewer: "Dispatch or logistics coordinator.",
    measure: "Time to locate a usable POD; age of missing records and disputed deliveries.",
    industries: ["manufacturing", "distribution", "logistics"],
  },
  {
    id: "customer-deduction-investigation",
    name: "Customer deduction investigation",
    category: "Finance and receivables",
    text: "Bring debit notes, invoices and delivery evidence together so finance can investigate a short payment and prepare a response.",
    fit: "Manufacturers, distributors and service businesses with recurring customer deductions.",
    example: "A customer deducts ₹75,000 against a delivery-shortage claim. The application links the debit note, invoice and delivery records, identifies an ambiguous receiver note and prepares a response for finance to review.",
    data: "Debit notes, invoices, remittance details, delivery evidence and approved commercial terms.",
    output: "A deduction case with supporting records, missing evidence and a draft response.",
    reviewer: "Receivables or finance team.",
    measure: "Investigation time; unresolved case age; actual recoveries recorded separately.",
    industries: ["manufacturing", "distribution", "services"],
  },
  {
    id: "freight-bill-review",
    name: "Freight bill review",
    category: "Finance and receivables",
    text: "Compare transporter bills with agreed rates and trip records, and organise the charges that need explanation.",
    fit: "Shippers, distributors and logistics businesses using several transport partners.",
    example: "A transporter adds a detention charge to a freight bill. The application shows the agreed free period, available gate timestamps and any missing acknowledgement so logistics and finance can review the charge together.",
    data: "Transporter bills, rate agreements, trip records, gate timestamps and approved extra-charge rules.",
    output: "A bill review with recalculated charges where rules are complete, source references and unresolved differences.",
    reviewer: "Logistics finance or the freight accounts team.",
    measure: "Review time per bill; duplicate or unsupported charges confirmed by the reviewer.",
    industries: ["distribution", "logistics"],
  },
  {
    id: "payment-advice-matching",
    name: "Payment advice matching",
    category: "Finance and receivables",
    text: "Read customer remittance details and propose how a payment relates to open invoices, keeping unexplained differences visible.",
    fit: "Businesses receiving consolidated payments against several invoices or branches.",
    example: "A customer transfers ₹4,80,000 and sends a separate advice covering five invoices totalling ₹5,00,000. The advice identifies a ₹20,000 deduction. The application prepares the proposed allocation and carries the deduction into a separate investigation.",
    data: "Bank receipt reference, customer advice, open invoices, credit notes and approved deduction codes.",
    output: "A proposed invoice allocation with source references and unresolved amounts.",
    reviewer: "Receivables accountant.",
    measure: "Time to an approved allocation; incorrect matches and amounts left unexplained.",
    industries: ["distribution", "manufacturing", "services"],
  },
  {
    id: "service-case-intake",
    name: "Service request intake",
    category: "Service and support",
    text: "Turn customer messages into service cases with the right equipment, location and history attached.",
    fit: "Equipment suppliers, installation companies and B2B service teams.",
    example: "A customer sends a photo and a message about a pump at one of three sites. The application prepares the case, finds candidate asset records and asks for the missing serial number before assigning an engineer.",
    data: "Approved customer channels, asset and site records, prior service history and routing rules.",
    output: "A structured case, relevant history, missing-information questions and a suggested service queue.",
    reviewer: "Service coordinator.",
    measure: "Time to a complete case; incorrect asset links and misrouted requests.",
    industries: ["services"],
  },
  {
    id: "service-report-followup",
    name: "Service report to follow-up",
    category: "Service and support",
    text: "Turn recommendations in service reports into assigned follow-ups and draft quotation inputs.",
    fit: "Equipment manufacturers, dealers and independent service businesses.",
    example: "A technician recommends replacing a mechanical seal at the next shutdown. The application links the report to the equipment, checks for an existing quote and prepares a follow-up with the part and coverage questions still to be confirmed.",
    data: "Service reports, asset records, approved parts references, contract information and open quotes.",
    output: "An assigned follow-up and draft quotation inputs with the original recommendation attached.",
    reviewer: "Service manager and the responsible sales owner.",
    measure: "Time to an assigned follow-up; duplicate proposals; recommendations acted on.",
    industries: ["services", "manufacturing"],
  },
  {
    id: "service-knowledge-assistant",
    name: "Service knowledge assistant",
    category: "Service and support",
    text: "Help service teams find the right manual section and approved past resolution for the equipment they are working on.",
    fit: "Equipment support teams and B2B service businesses with a maintained knowledge base.",
    example: "An engineer looks up an error code for a particular drive model. The application retrieves the relevant manual revision and approved service note, showing the source and asking for the model suffix when it affects the answer.",
    data: "Approved manuals, model and revision records, service bulletins and reviewed past cases.",
    output: "A source-linked answer or a clear request for the information needed to find one.",
    reviewer: "Service engineering or technical support.",
    measure: "Time to a useful answer; unsupported answers and incorrect model or revision matches.",
    industries: ["services"],
  },
];

export const appById = (id: string) => APPLICATIONS.find((a) => a.id === id);

/** The six the homepage features, in the handoff's order (§5 home.applications.featured_ids). */
const FEATURED_IDS = [
  "sales-order-intake",
  "purchase-quote-comparison",
  "supplier-commitment-tracking",
  "operational-exception-brief",
  "customer-deduction-investigation",
  "service-report-followup",
] as const;
export const FEATURED = FEATURED_IDS.map((id) => appById(id)!);

/**
 * Old anchors and the record each now scrolls to (handoff §4 "Preserve old links"): the six workflow ids
 * of the previous revision, and the scene kinds used before that.
 */
export const LEGACY_ANCHORS: Record<string, string> = {
  "dispatch-pack": "delivery-document-followup",
  "rfq-clarifications": "rfq-preparation",
  "service-followup": "service-report-followup",
  "jobwork-reconciliation": "job-work-reconciliation",
  "deduction-evidence": "customer-deduction-investigation",
  "supplier-updates": "supplier-commitment-tracking",
  inventory: "job-work-reconciliation",
  demand: "supplier-commitment-tracking",
  risk: "supplier-commitment-tracking",
  production: "operational-exception-brief",
  maintenance: "service-report-followup",
  sales: "sales-order-intake",
  customer: "service-report-followup",
  finance: "customer-deduction-investigation",
};

/**
 * The four industries (handoff §5 home.industries). Examples only; the company is not limited to them.
 * `apps` are APPLICATIONS ids (the card's three example links); `href` filters the directory.
 */
export const AUDIENCE = [
  {
    key: "manufacturing",
    name: "Manufacturing",
    text: "For engineering, electrical, packaging, plastics and other manufacturing teams handling enquiries, supplier commitments and production records.",
    apps: ["rfq-preparation", "supplier-commitment-tracking", "production-record-capture"],
    href: "/solutions?industry=manufacturing",
  },
  {
    key: "distribution",
    name: "Distribution and wholesale",
    text: "For businesses managing large item catalogues, customer orders, changing supplier prices and payment follow-up.",
    apps: ["sales-order-intake", "supplier-price-updates", "payment-advice-matching"],
    href: "/solutions?industry=distribution",
  },
  {
    key: "logistics",
    name: "Logistics and transport",
    text: "For shippers and service providers coordinating delivery records, transporter bills and operational follow-up.",
    apps: ["delivery-document-followup", "freight-bill-review", "operational-exception-brief"],
    href: "/solutions?industry=logistics",
  },
  {
    key: "services",
    name: "Equipment and B2B services",
    text: "For equipment dealers, installation teams and service businesses handling requests, reports and technical knowledge.",
    apps: ["service-case-intake", "service-report-followup", "service-knowledge-assistant"],
    href: "/solutions?industry=services",
  },
] as const satisfies readonly { key: IndustryKey; name: string; text: string; apps: readonly string[]; href: string }[];

/** How we build (handoff §5 home.approach): four items, inputs to ownership. */
export const APPROACH = [
  {
    title: "Bring the relevant records together",
    text: "Use the orders, documents, messages and system records needed for the task, with a clear source and update frequency.",
  },
  {
    title: "Define how your business works",
    text: "Capture item aliases, units, customer terms, approval limits and exceptions with the people who use them.",
  },
  {
    title: "Put the result into the workflow",
    text: "Deliver a useful screen, draft, answer or task. Add system updates where the integration and approval rules support them.",
  },
  {
    title: "Keep it useful after launch",
    text: "Measure the work completed, review errors and agree responsibility for changes as documents and processes evolve.",
  },
] as const;

/** The delivery process (handoff §5 home.delivery): one sequence, no fixed durations. */
export const PATHS = {
  label: "Find the right starting point and build from there",
  steps: [
    {
      title: "Understand the work",
      text: "Walk through the processes that take time or create rework. Review the systems and people involved, including what your current tools already support.",
      deliverable: "A shortlist of useful applications.",
    },
    {
      title: "Choose the first application",
      text: "Compare expected value, data readiness and implementation effort. Agree the scope, responsibilities, cost and success measures.",
      deliverable: "A practical implementation plan.",
    },
    {
      title: "Build and test with your team",
      text: "Develop the application around real examples. Test routine cases and exceptions, then refine it with the people who will use it.",
      deliverable: "A tested application and a rollout plan.",
    },
    {
      title: "Run and improve",
      text: "Train the users, review results and agree ongoing support. Reuse established connections and rules where they help the next application.",
      deliverable: "A clear owner and a plan for improvement.",
    },
  ],
  timing: "Project scope, delivery time and support are agreed before work begins.",
};

/** The homepage FAQ (handoff §8). FAQ_TOPICS is index-aligned. */
export const FAQ = [
  {
    q: "Is Decignal a ready-made product or a custom application service?",
    a: "We design and build applications around your business. The examples show common starting points; the workflow, integrations and rollout are scoped for each implementation.",
  },
  {
    q: "Is Decignal only for manufacturers?",
    a: "No. The examples cover manufacturing, distribution, logistics and B2B services, including sales, procurement, operations, finance and support. We can also discuss processes in other industries.",
  },
  {
    q: "Can we use Decignal with SAP, Tally or other existing software?",
    a: "That is part of discovery. We review the products, versions, modules and access available, then agree how to connect or use approved exports. We also check whether your current tools already provide a good solution.",
  },
  {
    q: "Does every action need manual review?",
    a: "We agree which steps can run automatically and which need approval. Routine steps can be automated after testing; uncertain cases and important business decisions follow the rules set with your team.",
  },
  {
    q: "Can an application use WhatsApp messages or regional-language documents?",
    a: "We assess the specific business channel, language and document samples. Access must be authorised, and support is confirmed through testing for that workflow.",
  },
  {
    q: "How are data access and security handled?",
    a: "Before connecting systems, we agree the access needed, approved providers, hosting arrangements, retention and responsibilities with your team. Those requirements form part of the project scope.",
  },
  {
    q: "What will it cost and how long will it take?",
    a: "The introductory conversation is free. Assessment, implementation and support are scoped separately, based on the application, data access and testing required.",
  },
  {
    q: "Are the examples on this website customer results?",
    a: "They are illustrative examples of applications we can scope with a business. Any published customer result will be identified separately.",
  },
];

/** One topic word per FAQ entry, index-aligned with FAQ. Neutral chrome: no tones. */
export const FAQ_TOPICS = ["What we do", "Industries", "Your systems", "Approvals", "Sources", "Data", "Cost", "Examples"];

/** The five questions the nav's FAQ glance shows (NavPeek FAQ_PICK). */
export const FAQ_PEEK = [0, 1, 2, 3, 6];

/**
 * The kinds of record an application can work from: icons and tones for the systems ring and the
 * hero's islands. No vendor names or logos as connectors (handoff §5 home.systems). Ids are kept from
 * the earlier systems so photos and icons still map. `group` is the SOURCE_GROUPS entry it belongs to.
 */
export const CONNECTS: { id: string; name: string; full: string; tone: string; reads: string; read: string; group: number }[] = [
  { id: "erp", name: "ERP", full: "ERP and accounting", tone: "cobalt", reads: "Orders, invoices, purchase orders and receipts", read: "Open orders and invoices", group: 0 },
  { id: "crm", name: "CRM", full: "CRM and customer records", tone: "violet", reads: "Customers, enquiries, price lists and contracts", read: "Customer and item masters", group: 0 },
  { id: "mes", name: "Service", full: "Inventory and service records", tone: "emerald", reads: "Stock, allocations, assets and service history", read: "Stock and asset records", group: 0 },
  { id: "wms", name: "Sheets", full: "Spreadsheets and trackers", tone: "saffron", reads: "Trackers, price files, shift sheets and exports", read: "Trackers and price files", group: 1 },
  { id: "sup", name: "Documents", full: "Documents and files", tone: "tangerine", reads: "Purchase orders, quotations, reports and shared folders", read: "Orders, quotations and reports", group: 1 },
  { id: "ext", name: "Messages", full: "Business communications", tone: "pink", reads: "Approved email or messaging channels used in the workflow", read: "Approved email and messages", group: 2 },
];

/** The three source groups on the systems section (handoff §5 home.systems). */
export const SOURCE_GROUPS = [
  { name: "Business systems", text: "ERP, accounting, CRM, inventory and service records.", tone: "cobalt" },
  { name: "Documents and files", text: "Purchase orders, quotations, reports, spreadsheets and shared folders.", tone: "tangerine" },
  { name: "Business communications", text: "Approved email or messaging channels used in the selected workflow.", tone: "pink" },
] as const;

/** Each business function keeps one colour everywhere it appears (the route's colour before the rename). */
export const CATEGORY_TONE: Record<Category, string> = {
  "Sales and order management": "tangerine",
  "Procurement and supply chain": "cobalt",
  "Operations and delivery": "emerald",
  "Finance and receivables": "violet",
  "Service and support": "pink",
};
