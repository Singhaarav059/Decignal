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
    text: "Prevent shortages and excess stock before service levels are affected.",
    weeks: "4 to 6",
    connects: ["ERP", "WMS", "Demand plans", "Supplier feeds"],
    example: "Transfer 240 units, Plant 02 to Plant 01",
  },
  {
    name: "Demand & Replenishment",
    category: "Supply Chain",
    text: "Sense changing demand and coordinate replenishment at the right level.",
    weeks: "5 to 7",
    connects: ["ERP", "POS", "WMS", "Planning"],
    example: "Raise West DC order by 1,800 units",
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
    text: "Recognise supplier and logistics disruption before it reaches operations.",
    weeks: "5 to 8",
    connects: ["ERP", "TMS", "Supplier portals", "Risk feeds"],
    example: "Dual-source 2 parts ahead of port delay",
  },
  {
    name: "Sales & Dealer Intelligence",
    category: "Commercial",
    text: "Explain performance changes and guide the next best commercial action.",
    weeks: "4 to 6",
    connects: ["CRM", "DMS", "ERP", "Marketing"],
    example: "Shift 12% of allocation to the West region",
  },
  {
    name: "Customer Service Intelligence",
    category: "Customer",
    text: "Prioritise issues, predict escalation and guide consistent resolution.",
    weeks: "4 to 6",
    connects: ["Service CRM", "Ticketing", "OMS", "Knowledge"],
    example: "Escalate 14 cases, one root cause",
  },
  {
    name: "Finance & Risk Operations",
    category: "Finance & Risk",
    text: "Move high-volume exceptions from alert to governed resolution.",
    weeks: "6 to 8",
    connects: ["Finance ERP", "Payments", "Documents", "Policy"],
    example: "Hold 3 invoices pending GRN",
  },
];

export const OUTCOMES = [
  { value: "2 days", label: "to arrive before the day 6 risk", sector: "Earlier intervention", quote: "The transfer reaches Plant 01 before the projected safety-stock breach.", context: "Transfer timing · Stock forecast" },
  { value: "380", label: "units protected at the source", sector: "Balanced decisions", quote: "Plant 02 gives up its transferable stock while retaining the full quantity reserved for its own plan.", context: "Available stock · Production plan" },
  { value: "14 → 1", label: "cases, one coordinated escalation", sector: "Shared context", quote: "Related service records travel together, so the owner can address the shared part issue.", context: "Service cases · Part history" },
];

export const PATHS = {
  custom: {
    label: "Custom to your business",
    intro:
      "We begin with the operation that needs to change. The first month produces a clear blueprint before the production build begins.",
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
    intro:
      "Start from an application that already solves a common decision, then fit it to your systems, policies and teams.",
    total: "4 to 8 weeks to the first production release",
    steps: [
      { when: "Week 1", title: "Choose the application", text: "Pick the decision and confirm the outcome to measure." },
      { when: "Weeks 1 to 3", title: "Connect your systems", text: "Link the sources it needs and map your definitions." },
      { when: "Weeks 3 to 8", title: "Configure and validate", text: "Set approvals and thresholds, then test with your team." },
      { when: "Ongoing", title: "Add the next one", text: "Each application reuses the same context layer." },
    ],
  },
};

export const FAQ = [
  {
    q: "Does Decignal replace our ERP, MES or CRM?",
    a: "No. Decignal works across the systems you already run. It connects the context needed for a decision, adds intelligence and controls, and sends approved actions back into the right workflow.",
  },
  {
    q: "Do we need perfectly organised data before starting?",
    a: "No. We begin with one decision and the minimum reliable context it requires. The audit identifies usable sources, material gaps and what should improve as the application moves toward production.",
  },
  {
    q: "Where does our data remain?",
    a: "The deployment architecture is agreed with your technology and security teams. Data access, storage and model boundaries are configured around your environment, policies and regulatory requirements.",
  },
  {
    q: "Can Decignal take actions automatically?",
    a: "Only where you choose. A workflow can provide recommendations, require named approval or automate a tightly defined low-risk action. The operating mode is explicit and can change as confidence grows.",
  },
  {
    q: "Can human approval always be required?",
    a: "Yes. Approval roles, thresholds and escalation paths are part of the application design. Teams see the recommendation, supporting evidence and policy checks before anything changes downstream.",
  },
  {
    q: "Who owns the application and business definitions?",
    a: "Your enterprise retains its data, operating definitions and deployment-specific assets. The statement of work makes ownership, reusable platform components and ongoing responsibilities clear before delivery begins.",
  },
  {
    q: "How do we choose the first use case?",
    a: "We look for a frequent, measurable decision where better timing or context can materially change an operating result. The AI audit ranks candidates by value, feasibility, risk and time to production.",
  },
  {
    q: "How long does the first deployment take?",
    a: "A catalogue application typically reaches its first production deployment in four to eight weeks. A custom application usually takes six to twelve weeks, depending on integrations, controls and validation requirements.",
  },
];

export const STACK = ["SAP", "Snowflake", "Databricks", "Google Cloud", "MongoDB", "PostgreSQL", "HubSpot", "Atlassian", "Zendesk"];

/** Each business area keeps one colour everywhere it appears. */
export const CATEGORY_TONE: Record<Category, string> = {
  "Supply Chain": "cobalt",
  Operations: "emerald",
  Commercial: "tangerine",
  Customer: "pink",
  "Finance & Risk": "violet",
};
