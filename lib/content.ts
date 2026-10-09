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

/** What each system contributes, grouped by the kind of signal it carries. */
export const STACK_ROWS: { name: string; role: string }[][] = [
  [
    { name: "SAP", role: "ERP" }, { name: "Snowflake", role: "Warehouse" }, { name: "Databricks", role: "Lakehouse" },
    { name: "Google Cloud", role: "Cloud" }, { name: "MongoDB", role: "Database" },
  ],
  [
    { name: "PostgreSQL", role: "Database" }, { name: "HubSpot", role: "CRM" }, { name: "Atlassian", role: "Work" },
    { name: "Zendesk", role: "Service" },
  ],
];

/** Each business area keeps one colour everywhere it appears. */
export const CATEGORY_TONE: Record<Category, string> = {
  "Supply Chain": "cobalt",
  Operations: "emerald",
  Commercial: "tangerine",
  Customer: "pink",
  "Finance & Risk": "violet",
};

/** What each business area is for, and the kind of signal that starts its decisions. */
export const AREA_COPY: Record<Category, { lead: string; signal: string }> = {
  "Supply Chain": { lead: "Stock, demand and suppliers, balanced before service slips.", signal: "Plant 01 below safety stock in 6 days" },
  Operations: { lead: "Lines, assets and quality, acted on while there is time.", signal: "Line 04 bearing vibration rising" },
  Commercial: { lead: "Pricing, pipeline and allocation tied to what you can deliver.", signal: "Key account margin down 3.1 pts" },
  Customer: { lead: "Cases, orders and promises read together, not one ticket at a time.", signal: "14 cases share one part issue" },
  "Finance & Risk": { lead: "Exposure, cash and controls checked before money moves.", signal: "Supplier credit limit at 92%" },
};

/** Why decisions stall today: the three gaps between the data and the action. */
export const GAPS = [
  { title: "Context is scattered", text: "Every function sees a different part of the business." },
  { title: "Signals arrive late", text: "Manual reporting turns live conditions into yesterday's news." },
  { title: "Action waits", text: "Teams reconcile evidence before they can move with confidence." },
];

/** How Decignal joins the systems up, without replacing any of them. */
export const CONNECT = [
  { title: "Connect", text: "Read-only links to what you run" },
  { title: "Read", text: "Live context, refreshed in minutes" },
  { title: "Recommend", text: "One action, sent for approval" },
];
export const PROMISES = ["No rip-and-replace programme", "No perfect data lake", "Read-only to start"];

/** The transfer decision, step by step, as it is recorded. */
export const TRACE = [
  { step: "Signal", text: "SKU 4471 short at Plant 01" },
  { step: "Evidence", text: "Open orders up 18% in 3 weeks" },
  { step: "Context", text: "Plant 02 holds 240 spare units" },
  { step: "Policy", text: "Max 300 units per transfer" },
  { step: "Decision", text: "Transfer 240 units today" },
  { step: "Approval", text: "Planner approves at 09:42" },
  { step: "Result", text: "Lands 2 days before the breach" },
];

/** What working with Decignal looks like, in five numbers. */
export const GLANCE = [
  { value: "0", label: "systems replaced", text: "Read-only to start, across the ERP, MES, CRM and WMS you run." },
  { value: "4–8 wks", label: "to the first release", text: "From the catalogue. A custom application takes 6 to 12 weeks." },
  { value: "8", label: "ready applications", text: "Inventory to finance, each fitted to your systems and policies." },
  { value: "5", label: "business areas", text: "Supply chain, operations, commercial, customer, finance and risk." },
  { value: "1", label: "named approver per action", text: "Human approval can always be required. You set roles and thresholds." },
];

/** What each step of each route hands over. */
export const DELIVERS: Record<keyof typeof PATHS, string[][]> = {
  custom: [
    ["Decision map", "System inventory", "Constraints and owners"],
    ["Value case", "Scope and controls", "Scorecard to measure"],
    ["Production release", "Trained users", "Live scorecard"],
    ["Next use case", "Reused context layer", "Shared controls"],
  ],
  catalogue: [
    ["Chosen application", "Outcome to measure", "Named owner"],
    ["Read-only connectors", "Mapped definitions", "Data checks"],
    ["Approval rules", "Thresholds set", "Team sign-off"],
    ["Next application", "Reused context layer", "Shared controls"],
  ],
};

/** The topic of each FAQ, in FAQ order. */
export const FAQ_TOPICS = ["Integration", "Data", "Security", "Automation", "Control", "Ownership", "Getting started", "Timeline"];

export const AUDIT_POINTS = [
  { title: "A working session", text: "No generic product presentation." },
  { title: "A clear first use case", text: "Leave with a practical starting point." },
  { title: "No commitment", text: "We decide together if the next step makes sense." },
];
export const COUNTRIES = ["India", "Nigeria", "Kenya", "South Africa", "Egypt", "Ghana", "Morocco", "Other"];
export const AUDIT_SYSTEMS = ["SAP", "Oracle", "Microsoft Dynamics", "Salesforce", "Custom / in-house", "Spreadsheets"];

/** What Decignal reads from each system in the stack, as the live feed shows it. */
export const READS: { sys: string; role: string; text: string }[] = [
  { sys: "SAP", role: "ERP", text: "Plant 02 stock 620, 240 above plan" },
  { sys: "Snowflake", role: "Warehouse", text: "21-day demand forecast refreshed" },
  { sys: "Databricks", role: "Lakehouse", text: "Supplier lead time model, p90 9 days" },
  { sys: "Google Cloud", role: "Cloud", text: "Shipment events streaming" },
  { sys: "MongoDB", role: "Database", text: "Order lines for Plant 01 updated" },
  { sys: "PostgreSQL", role: "Database", text: "Transfer policy: max 300 units" },
  { sys: "HubSpot", role: "CRM", text: "Key account renewal at risk" },
  { sys: "Atlassian", role: "Work", text: "Line 3 maintenance ticket opened" },
  { sys: "Zendesk", role: "Service", text: "4 open cases mention late delivery" },
];

/** The foundation under every application: five principles, each shown on a working screen. */
export const PRINCIPLES = [
  { name: "Simple", title: "As natural as asking a colleague.", text: "Teams ask in plain language, see the evidence and approve the next action without learning another complex tool.", badge: "Familiar from the first day" },
  { name: "Reliable", title: "Built for real operating pressure.", text: "Guardrails, approvals and graceful fallbacks keep critical workflows predictable when systems or conditions change.", badge: "Safe failure paths included" },
  { name: "Secure", title: "Access stays inside the boundary.", text: "Every application inherits your roles, permissions and data boundaries before it is allowed to recommend or act.", badge: "Least-privilege by design" },
  { name: "Traceable", title: "Every decision leaves a clear record.", text: "See what was recommended, which evidence was used, who approved it and what changed in the operating system.", badge: "Audit-ready by default" },
  { name: "Scalable", title: "One foundation, many applications.", text: "Start with one high-value decision, then reuse the same context, controls and integrations across teams and locations.", badge: "Every next build starts ahead" },
];

/** The same foundation, configured for each industry. `area` is the business area its applications start in. */
export const INDUSTRIES = [
  {
    name: "Manufacturing", tone: "emerald", area: "Operations" as Category,
    title: "Keep production moving before disruption spreads.",
    text: "Connect production, inventory, quality and maintenance signals so plant teams can act before output is affected.",
    caps: ["Production risk", "Inventory optimisation", "Predictive maintenance"],
    signal: "Line 04 bearing temperature rising", where: "Pune plant · detected 2 min ago", metric: "98.4%", metricLabel: "Output protected",
  },
  {
    name: "Automotive & Mobility", tone: "cobalt", area: "Commercial" as Category,
    title: "Coordinate every decision across vehicles, dealers and demand.",
    text: "Bring dealer performance, vehicle inventory and aftersales signals into one operating picture for faster commercial action.",
    caps: ["Dealer performance", "Parts intelligence", "Aftersales growth"],
    signal: "Six South-region dealers below target", where: "Dealer network · updated now", metric: "₹2.4 Cr", metricLabel: "Revenue protected",
  },
  {
    name: "Retail & Distribution", tone: "saffron", area: "Supply Chain" as Category,
    title: "Put inventory where demand is forming, not where it was.",
    text: "Sense local demand, identify availability risks and coordinate replenishment across stores, warehouses and channels.",
    caps: ["Demand sensing", "Assortment intelligence", "Stock reallocation"],
    signal: "West-region demand accelerating 18%", where: "184 stores · last 30 minutes", metric: "+7.2%", metricLabel: "Availability uplift",
  },
  {
    name: "Logistics & Supply Chain", tone: "tangerine", area: "Supply Chain" as Category,
    title: "See delays early enough to change the outcome.",
    text: "Unify shipment, route, capacity and supplier signals to protect service levels when conditions change.",
    caps: ["ETA risk", "Route optimisation", "Capacity planning"],
    signal: "Port congestion may delay 14 priority loads", where: "Western corridor · 09:42", metric: "94.8%", metricLabel: "On-time delivery",
  },
  {
    name: "Financial Services", tone: "violet", area: "Finance & Risk" as Category,
    title: "Turn high-volume signals into governed decisions.",
    text: "Help operations and risk teams prioritise exceptions, understand evidence and move safely from alert to resolution.",
    caps: ["Risk monitoring", "Exception handling", "Service intelligence"],
    signal: "Payment exceptions above the normal range", where: "126 cases · policy threshold crossed", metric: "−38%", metricLabel: "Review time",
  },
  {
    name: "Energy & Utilities", tone: "pink", area: "Operations" as Category,
    title: "Balance reliability, demand and field operations in real time.",
    text: "Connect grid conditions, asset health and demand forecasts to coordinate safer, more resilient operations.",
    caps: ["Load forecasting", "Outage prevention", "Field maintenance"],
    signal: "Peak demand may exceed feeder capacity", where: "North cluster · next 90 minutes", metric: "96.1%", metricLabel: "Forecast confidence",
  },
];

/** Illustrative deployment patterns from other operations, until verified client results replace them. */
export const PROOF = [
  { sector: "Automotive components", title: "Material-risk response", quote: "The shortage signal now reaches purchasing and production while there is still time to respond, not inside the next morning review.", value: "38%", label: "faster response to shortage risk", context: "SAP ERP · MES · Quality records", tone: "cobalt" },
  { sector: "Multi-location distribution", title: "Inventory rebalancing", quote: "Planners see where inventory is becoming constrained and the safest movement before an urgent transfer is requested.", value: "24%", label: "fewer emergency stock transfers", context: "ERP · WMS · Demand plans", tone: "saffron" },
  { sector: "Industrial services", title: "Priority-case coordination", quote: "Service, parts and logistics now see the shared operational issue and coordinate one response across every affected case.", value: "41%", label: "faster priority-case resolution", context: "Service CRM · ERP · Parts inventory", tone: "pink" },
];

/** One worked decision per application, in APPLICATIONS order. Illustrative scenarios. */
export const STORIES: {
  headline: string; signal: string; evidence: string; action: string; result: string; metric: string;
  sources: string; asset: string; readings: [string, string][]; beats: string[];
}[] = [
  { headline: "Move the stock.\nProtect the plan.", signal: "Plant 01 crosses its safety threshold on day 6.", evidence: "620 on hand − 380 kept for Plant 02's plan = 240 transferable units.", action: "Load six 40-unit pallets. Transfer to Plant 01.", result: "240 units delivered two days early; Plant 02 keeps its 380-unit plan.", metric: "240 units", sources: "Stock · production plan · transfer policy", asset: "SKU 4471 / TRF-0240", readings: [["Risk horizon", "6 days"], ["Supplier ETA", "21 days"], ["Transfer ETA", "2 days"]], beats: ["Locate stock", "Check reserves", "Load & transfer"] },
  { headline: "See demand.\nStay ahead.", signal: "West region orders are outpacing the replenishment plan.", evidence: "Orders, point-of-sale demand and stock agree on the gap.", action: "Raise the West DC order by 1,800 units.", result: "The dispatch plan follows demand before stock runs short.", metric: "+1,800", sources: "Orders · POS · replenishment plan", asset: "West region / replenishment", readings: [["Demand", "Above plan"], ["Stock", "Cross-checked"], ["Order change", "+1,800 units"]], beats: ["Sense demand", "Compare sources", "Replenish"] },
  { headline: "Find the bottleneck.\nKeep work moving.", signal: "Work queues at Line 03 while Line 02 has capacity.", evidence: "The next three lots can run on the available line.", action: "Resequence the lots before the 14:00 shift.", result: "A revised production sequence balances the two lines.", metric: "14:00", sources: "MES · capacity · production orders", asset: "Order PO-2207 / Line 03", readings: [["Constraint", "Line 03"], ["Available", "Line 02"], ["Next shift", "14:00"]], beats: ["Detect queue", "Check capacity", "Resequence"] },
  { headline: "Catch the drift.\nPlan the repair.", signal: "A vibration trend points to the drive-end bearing on Line 04.", evidence: "Asset history and the shift plan reveal a Friday service window.", action: "Reserve the window and create a bearing inspection work order.", result: "Maintenance has an asset, a reason and a planned window.", metric: "By Friday", sources: "Vibration · asset history · work orders", asset: "Line 04 / Motor M-041", readings: [["Asset", "Drive motor"], ["Inspect", "Bearing X90"], ["Window", "Friday"]], beats: ["Detect drift", "Inspect bearing", "Plan service"] },
  { headline: "Trace the disruption.\nProtect the delivery.", signal: "A port delay puts Bearing X90 and Seal S02 at risk.", evidence: "Supplier 02 can supply both parts through a viable lane.", action: "Dual-source the affected parts through the alternative lane.", result: "The sourcing plan changes before the delay reaches production.", metric: "2 parts", sources: "Supplier capacity · lead time · logistics", asset: "Supply route / exception 02", readings: [["Primary lane", "Delayed"], ["Parts at risk", "2"], ["Alternative", "Checked"]], beats: ["Locate disruption", "Check alternative", "Reroute"] },
  { headline: "Follow the orders.\nShift the allocation.", signal: "West dealers have stronger demand than their allocation.", evidence: "Dealer orders and available inventory support a regional shift.", action: "Move 12% of allocation to the West dealer network.", result: "More stock goes where the orders are, within allocation policy.", metric: "12%", sources: "Dealer orders · CRM · inventory", asset: "West / dealer allocation", readings: [["Demand centre", "West"], ["Orders", "Validated"], ["Allocation", "+12%"]], beats: ["Spot imbalance", "Check inventory", "Reallocate"] },
  { headline: "Fourteen cases.\nOne underlying issue.", signal: "Service cases look separate until their part histories connect.", evidence: "The same bearing links fourteen affected service records.", action: "Group the cases and escalate the shared part issue.", result: "One coordinated response carries the context from all 14 cases.", metric: "14 → 1", sources: "Case history · part records · service context", asset: "Service / Bearing X90", readings: [["Related cases", "14"], ["Common part", "Bearing X90"], ["Escalation", "One owner"]], beats: ["Read cases", "Link the part", "Coordinate"] },
  { headline: "Match the records.\nKeep control.", signal: "Three supplier invoices arrive without the goods receipt.", evidence: "The purchase order matches. The required receipt is missing.", action: "Hold the three payments and route the exception for review.", result: "Payment stays on hold until the receipt can be verified.", metric: "3 held", sources: "Invoices · purchase order · goods receipt", asset: "Finance / three-way match", readings: [["Purchase order", "Matched"], ["Goods receipt", "Missing"], ["Invoices", "3 on hold"]], beats: ["Read invoices", "Match records", "Apply control"] },
];
