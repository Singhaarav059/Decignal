// Product content: applications, outcomes, delivery paths, FAQ and the systems Decignal reads.
// Section and chapter strings live in lib/copy.ts, the running example in lib/example.ts.
//
// Style rules (COPY-03), for every string on the site:
// (a) "units", never "u".
// (b) Durations are "N to M weeks" in full. NavPeek reads PATHS.catalogue.total, so keep it starting "N to M weeks".
// (c) Currency is "INR" plus the full figure with western grouping ("INR 38,000"). "INR 38k" only under
//     about 120px of width. Never lakh ("L").
// (d) "safety stock" and "breach". "Day 6" in labels, "day 6" in sentences.
// (e) "service cases", never tickets or records.
// (f) The decision is "Transfer 240 units, Plant 02 to Plant 01".
// (g) Curly apostrophes in rendered copy. No em dashes. British spelling.

export const CATEGORIES = ["Supply Chain", "Operations", "Commercial", "Customer", "Finance & Risk"] as const;
export type Category = (typeof CATEGORIES)[number];

export const APPLICATIONS: {
  name: string;
  category: Category;
  text: string;
  weeks: string;
  connects: string[];
  example: string;
}[] = [
  {
    name: "Inventory Intelligence",
    category: "Supply Chain",
    text: "Catch shortages and excess early, and move stock to where it is needed.",
    weeks: "4 to 6",
    connects: ["ERP", "WMS", "Demand plans", "Supplier feeds"],
    example: "Transfer 240 units, Plant 02 to Plant 01",
  },
  {
    name: "Demand & Replenishment",
    category: "Supply Chain",
    text: "Spot demand shifts by region and adjust replenishment before stock runs short.",
    weeks: "5 to 7",
    connects: ["ERP", "POS", "WMS", "Planning"],
    example: "Raise the West DC order by 1,800 units",
  },
  {
    name: "Production Intelligence",
    category: "Operations",
    text: "Detect bottlenecks, quality drift and schedule risk while there is time to act.",
    weeks: "6 to 8",
    connects: ["MES", "ERP", "QMS", "IoT"],
    example: "Resequence Line 03 before the 14:00 shift",
  },
  {
    name: "Predictive Maintenance",
    category: "Operations",
    text: "Turn asset signals into maintenance decisions, not another alert queue.",
    weeks: "6 to 10",
    connects: ["SCADA", "CMMS", "MES", "ERP"],
    example: "Service Line 04 bearing by Friday",
  },
  {
    name: "Supply Chain Risk",
    category: "Supply Chain",
    text: "See supplier and lane disruption early, and switch source before production feels it.",
    weeks: "5 to 8",
    connects: ["ERP", "TMS", "Supplier portals", "Risk feeds"],
    example: "Dual-source 2 parts ahead of a port delay",
  },
  {
    name: "Sales & Dealer Intelligence",
    category: "Commercial",
    text: "See where orders outrun allocation, and move stock to the dealers who can sell it.",
    weeks: "4 to 6",
    connects: ["CRM", "DMS", "ERP", "Marketing"],
    example: "Shift 12% of allocation to the West region",
  },
  {
    name: "Customer Service Intelligence",
    category: "Customer",
    text: "Link related cases by part and order history, and send one escalation to one owner.",
    weeks: "4 to 6",
    connects: ["Service CRM", "Service desk", "OMS", "Knowledge"],
    example: "Escalate 14 service cases, one root cause",
  },
  {
    name: "Finance & Risk Operations",
    category: "Finance & Risk",
    text: "Check every exception against PO, receipt and policy before money moves.",
    weeks: "6 to 8",
    connects: ["Finance ERP", "Payments", "Documents", "Policy"],
    example: "Hold 3 invoices until goods arrive",
  },
];

/** Three example decisions from the scenes above (COPY-09). `value` feeds CountUp: keep its digits and "→". */
export const OUTCOMES = [
  {
    value: "2 days",
    label: "to arrive, four days before the breach",
    sector: "Act earlier",
    quote: "The transfer reaches Plant 01 on day 2. Without it, stock falls below safety stock on day 6.",
    context: "Transfer timing · Stock forecast",
  },
  {
    value: "380",
    label: "units Plant 02 keeps for its own plan",
    sector: "Protect both plants",
    quote: "Plant 02 sends only what sits above its own plan, so fixing one shortage does not create another.",
    context: "Available stock · Production plan",
  },
  {
    value: "14 → 1",
    label: "service cases, one escalation",
    sector: "Fix the cause once",
    quote: "Cases linked by the same part reach one owner, who fixes the cause once.",
    context: "Service cases · Part history",
  },
];

export const PATHS = {
  custom: {
    label: "Custom to your business",
    intro: "Month one maps the operation and ends in a blueprint you sign off before we build.",
    total: "6 to 12 weeks to the first production release",
    steps: [
      { when: "Days 0 to 14", title: "Map the operation", text: "Understand the decision, users, systems and constraints." },
      { when: "Days 14 to 30", title: "Deliver the blueprint", text: "Define value, scope, controls and the scorecard." },
      { when: "Days 30 to 90", title: "Build and launch", text: "Validate with real users, then move into production." },
      { when: "Ongoing", title: "Expand on the foundation", text: "Reuse context and controls for the next application." },
    ],
  },
  catalogue: {
    label: "From the catalogue",
    intro: "Start from a catalogue application and fit it to your systems, policies and teams.",
    total: "4 to 8 weeks to the first production release",
    steps: [
      { when: "Week 1", title: "Choose the application", text: "Pick the decision and confirm the outcome to measure." },
      { when: "Weeks 1 to 3", title: "Connect your systems", text: "Link the sources it needs and map your definitions." },
      { when: "Weeks 3 to 8", title: "Configure and validate", text: "Set approvals and thresholds, then test with your team." },
      { when: "Ongoing", title: "Add the next one", text: "Each application reuses the same context layer." },
    ],
  },
};

/**
 * Buyer objections (E08), each answered in at most three lines at 390px: keep answers to about 105 characters. Answers only restate what the
 * site already says: read-only to start, named approval, thresholds, the audit, the delivery ranges.
 * FAQ_TOPICS and FAQ_PEEK are index-aligned with this array: update them together.
 */
export const FAQ = [
  {
    q: "We already have dashboards. Why add this?",
    a: "A dashboard shows what happened. Decignal prepares the next action, with its evidence, for approval.",
  },
  {
    q: "Do we have to replace our ERP, MES or CRM?",
    a: "No. Decignal reads across the systems you already run, read-only to start. Nothing is ripped out.",
  },
  {
    q: "Our data is messy. Is that a blocker?",
    a: "No. We start with one decision and the minimum data it needs. The audit shows which gaps matter.",
  },
  {
    q: "Will our security team approve it?",
    a: "Access is read-only to start. Hosting, storage and model limits are agreed with your security team first.",
  },
  {
    q: "What if a recommendation is wrong?",
    a: "A named person approves every action, within limits you set, after seeing the evidence and policy checks.",
  },
  {
    q: "Our AI pilots never reached production. Why would this?",
    a: "One decision first, not a platform. A catalogue application goes live in 4 to 8 weeks, custom in 6 to 12.",
  },
  {
    q: "Who owns the application and our definitions?",
    a: "You own your data and definitions. The statement of work sets out what is yours and who runs what.",
  },
  {
    q: "Where do we start?",
    a: "With a frequent decision where timing changes the result. The free AI audit ranks the candidates for you.",
  },
];

/** One topic word per FAQ entry (Editorial FAQ_META), index-aligned with FAQ. Neutral chrome: no tones (D6). */
export const FAQ_TOPICS = ["Dashboards", "Integration", "Data", "Security", "Control", "Delivery", "Ownership", "Getting started"];

/** The five questions the nav's FAQ glance shows (NavPeek FAQ_PICK): integration, data, security, control, delivery. */
export const FAQ_PEEK = [1, 2, 3, 4, 5];

/**
 * The systems strip (E10, COPY-10, D8): system types in their system colours and what Decignal reads
 * from each. No vendor names or logos. `read` is the running example's fact from that system, for the
 * strip's example feed card. Names match SYSTEM_TYPES in lib/audit.ts.
 */
export const CONNECTS: { id: string; name: string; full: string; tone: string; reads: string; read: string }[] = [
  { id: "erp", name: "ERP", full: "Enterprise resource planning", tone: "cobalt", reads: "On-hand stock, safety stock, orders and costs", read: "Plant 01 on hand 410, safety stock 175" },
  { id: "crm", name: "CRM", full: "Customer relationships", tone: "violet", reads: "Accounts, open orders and pipeline", read: "Open orders for X90 up 18% in 3 weeks" },
  { id: "mes", name: "MES", full: "Manufacturing execution", tone: "emerald", reads: "Production plans, lines, lots and changeovers", read: "Line 02 uses 45 X90 bearings a day" },
  { id: "wms", name: "WMS", full: "Warehouse management", tone: "saffron", reads: "Stock by site and bin, dock slots", read: "Plant 02 holds 620 units, 380 for its plan" },
  { id: "sup", name: "Suppliers", full: "Supplier portals and feeds", tone: "tangerine", reads: "Confirmations, lead times and ETAs", read: "Vendor 1140 next delivery in 21 days" },
  { id: "ext", name: "External feeds", full: "Freight, port and weather feeds", tone: "pink", reads: "Freight rates, port status and weather on the route", read: "Inter-plant lane clear, 2 days" },
];

/** Each business area keeps one colour everywhere it appears. */
export const CATEGORY_TONE: Record<Category, string> = {
  "Supply Chain": "cobalt",
  Operations: "emerald",
  Commercial: "tangerine",
  Customer: "pink",
  "Finance & Risk": "violet",
};
