// The five business areas: one source for the home AreaStack (lead, signal) and the service pages at
// /solutions/{slug} (SP-01, SP-06, COPY-13..18). No "use client" and no three.js, so server components
// can import it. Rules: no em dashes, no client names, quotes or result figures; examples are labelled
// "Illustrative example" and use the figures in lib/example.ts. Claims stay within what the product
// verifiably does today (D11): read-only connectors, recommendations with evidence, named approval.
// Lines marked "confirm:" carry a promise the owner should confirm before launch.

import { APPLICATIONS, CATEGORIES, CATEGORY_TONE, type Category } from "./content";
import type { Headline } from "./copy";

export type { Headline };

/** The service routes: app/solutions/[slug] and app/sitemap.ts read these. Fixed (BRIEF, critic §2). */
export const AREA_SLUGS = ["supply-chain", "operations", "commercial", "customer", "finance-and-risk"] as const;
export type AreaSlug = (typeof AREA_SLUGS)[number];

export type Area = {
  slug: AreaSlug;
  /** Display name, the same string as its Category. */
  name: Category;
  category: Category;
  /** System colour name (CATEGORY_TONE): chapter chrome only, the dot, number and headline accent line (D6). */
  tone: string;
  /** Position in CATEGORIES, for showArea(i) on the home page. */
  index: number;
  /** Home AreaStack: one line under the area name, and the live-looking signal in its panel. */
  lead: string;
  signal: string;
  /** Service hero: two lines, the second is the accent line. */
  headline: Headline;
  /** The value proposition under the headline, two lines or fewer. */
  valueProp: string;
  /** Page title (the root layout appends "· Decignal") and meta description. */
  meta: { title: string; description: string };
  /** "What to expect": three cards, a title and one line each. */
  expect: { title: string; text: string }[];
  /** "What you get": six deliverables, shown with check marks. */
  deliverables: string[];
  /** "How it works": steps 01 to 04. Step 01 is always the free AI audit. */
  process: { n: string; when: string; title: string; text: string; gets: string[] }[];
  /** "Why Decignal": one statement and one supporting line. */
  differentiator: { title: string; text: string };
  /** "Illustrative example": one number and one sentence, from the explorer's scenario for this area. */
  example: { value: string; text: string };
  faq: { q: string; a: string }[];
};

/** What step 01, the audit, gives every area (COPY-11 "What you get"). */
const AUDIT_GETS = ["Three decisions, ranked", "The data each one needs", "A first release you can plan"];
const CONNECT_GETS = ["Read-only connectors", "Mapped definitions", "Data checks"];
const VALIDATE_GETS = ["Approval rules", "Thresholds set", "Team sign-off"];
const RELEASE_GETS = ["Production release", "Named approvers", "Live scorecard"];

const audit = (text: string) => ({ n: "01", when: "30 minutes", title: "Free AI audit", text, gets: AUDIT_GETS });
const connect = (when: string, text: string) => ({ n: "02", when, title: "Connect", text, gets: CONNECT_GETS });
const validate = (when: string, text: string) => ({ n: "03", when, title: "Configure and validate", text, gets: VALIDATE_GETS });
const release = (when: string) => ({
  n: "04",
  when,
  title: "Release and measure",
  text: "Go live with named approvers. Track the scorecard against your baseline.",
  gets: RELEASE_GETS,
});

const base = (slug: AreaSlug, category: Category) => ({
  slug,
  name: category,
  category,
  tone: CATEGORY_TONE[category],
  index: CATEGORIES.indexOf(category),
});

export const AREAS: Area[] = [
  {
    ...base("supply-chain", "Supply Chain"),
    lead: "Stock, demand and suppliers, balanced before service slips.",
    signal: "Plant 01 below safety stock on day 6",
    headline: ["See the shortage.", "Move the stock first."],
    valueProp:
      "Decignal reads stock, demand, supplier timing and transfer rules across your ERP and WMS, then prepares the move for a planner to approve.",
    meta: {
      title: "Supply chain decision intelligence",
      description:
        "Transfers, replenishment and supplier risk, prepared from your ERP, WMS and supplier data and approved by your planners. First release in 4 to 8 weeks.",
    },
    expect: [
      { title: "A decision, not a dashboard", text: "Each recommendation names the quantity, the source, the destination and the deadline." },
      { title: "Evidence beside every move", text: "Stock by site, safety stock, open orders and supplier ETAs, side by side." },
      { title: "Your planners stay in charge", text: "Approve, adjust or reject. Nothing moves until a named planner approves." },
    ],
    deliverables: [
      "Read-only connectors to ERP, WMS, planning and supplier feeds",
      "A shortage and excess watchlist by part and site",
      "Transfer, reorder and dual-source recommendations with their evidence",
      "Approval rules by role, quantity and value",
      "Each approved move sent to the team that releases it, with its evidence",
      "A scorecard against your own baseline: stockout days, expedite spend, excess stock",
    ],
    process: [
      audit("Choose the first decision: transfers, replenishment or supplier risk."),
      connect("Weeks 1 to 3", "Read-only links to ERP, WMS and supplier data. Parts, sites and safety stock mapped."),
      validate("Weeks 3 to 6", "Set transfer limits, safety stock and approvers. Planners test recommendations on live data."),
      release("Weeks 4 to 8"),
    ],
    differentiator: {
      title: "Decides across sites, not inside one system.",
      text: "Decignal checks the source site’s own plan before it recommends moving a single unit, so fixing one shortage does not create the next one.",
    },
    example: {
      value: "240 units",
      text: "Transfer Bearing X90 from Plant 02 to Plant 01, arriving four days before the breach. Plant 02 keeps its 380-unit plan.",
    },
    faq: [
      {
        q: "We already run a planning system. Why add Decignal?",
        a: "Your planning system sets the plan. Decignal spots where reality drifts from it and prepares the fix.",
      },
      {
        q: "Our master data is messy. Can we still start?",
        a: "Yes. We start with the parts and sites behind one decision. The audit shows which gaps matter for it and which can wait.",
      },
      {
        q: "Will it move stock without asking?",
        a: "No. Every transfer or order needs a named approver, within limits you set by quantity and value.",
      },
      {
        q: "How does it know a supplier will be late?",
        a: "From confirmations, ship notices and portal updates, plus freight and port feeds. Every ETA shows its source.",
      },
      {
        q: "We have many sites and thousands of parts. Will planners drown in alerts?",
        a: "No. Recommendations are ranked by risk and value, so planners see the few that matter today, each with a deadline.",
      },
      {
        q: "How will we know it works?",
        a: "We agree the baseline in the blueprint, such as stockout days or expedite spend, and report against it after release.",
      },
    ],
  },
  {
    ...base("operations", "Operations"),
    lead: "Lines, assets and quality, acted on while there is time.",
    signal: "Line 04 bearing vibration rising",
    headline: ["Plan the repair.", "Before the breakdown."],
    valueProp:
      "Decignal reads machine signals, production plans and quality data, and turns them into proposed work: the asset, the reason and the window to act.",
    meta: {
      title: "Operations decision intelligence",
      description:
        "Maintenance windows and line resequencing, prepared from your MES, CMMS and sensor data and approved by your supervisors. First release in 6 to 10 weeks.",
    },
    expect: [
      { title: "Fewer alerts, more decisions", text: "Each signal arrives with the asset, the evidence and a proposed slot in the shift plan." },
      { title: "Bottlenecks while lots can still move", text: "Queues, capacity and changeovers read together, before the shift starts." },
      { title: "Supervisors approve", text: "Nothing is scheduled until a supervisor or maintenance planner approves it." },
    ],
    deliverables: [
      "Read-only connectors to MES, CMMS, historian or SCADA, QMS and ERP",
      "An asset and line watchlist ranked by risk to the production plan",
      "Maintenance recommendations with a proposed window from the shift plan",
      "Resequencing recommendations for queued lots, checked against capacity",
      "Approval rules for supervisors and maintenance planners",
      "A scorecard against your baseline: unplanned downtime, schedule adherence, emergency work orders",
    ],
    process: [
      audit("Choose the first decision: maintenance timing or line sequencing."),
      connect("Weeks 1 to 3", "Read-only links to MES, CMMS and sensor data. Asset and line hierarchy mapped."),
      validate("Weeks 3 to 8", "Thresholds tuned on your own history, windows and approvers set, tested on live shifts."),
      release("Weeks 6 to 10"),
    ],
    differentiator: {
      title: "Signals become scheduled work, not another alert queue.",
      text: "Every recommendation checks the production plan first, so maintenance lands in a window you can afford.",
    },
    example: {
      value: "Friday",
      text: "Replace the drive-end bearing on Line 04, Motor M-041, in Friday’s planned window, before vibration becomes a stoppage.",
    },
    faq: [
      {
        q: "We already have condition monitoring. What does Decignal add?",
        a: "Condition monitoring says an asset is drifting. Decignal adds the plan, spares and asset history, and proposes when to act.",
      },
      {
        q: "Our sensor coverage is patchy. Is that a problem?",
        a: "Not to start. We use the signals you have, including manual readings and work orders, and show where a sensor would pay off.",
      },
      {
        // confirm: read-only access through the historian, MES or a gateway; no writes to machine controls.
        q: "Will it write to our control systems?",
        a: "No. Decignal connects read-only through your historian, MES or a gateway. Your team carries out each approved action.",
      },
      {
        q: "Will supervisors trust it?",
        a: "They see why: the trend, the history and the plan behind each recommendation. They approve, adjust or reject each one.",
      },
      {
        q: "How do you avoid false alarms?",
        a: "Thresholds are tuned on your own history, and nothing reaches a supervisor without an asset, a reason and a window.",
      },
      {
        q: "How long until the first release?",
        a: "Six to ten weeks, depending on how many lines and data sources are in scope.",
      },
    ],
  },
  {
    ...base("commercial", "Commercial"),
    lead: "Dealer orders and allocation, matched to the stock you can ship.",
    signal: "West dealer orders outrun allocation",
    headline: ["Follow the orders.", "Move the allocation."],
    valueProp:
      "Decignal reads dealer orders, pipeline and available stock, and shows where allocation should move, inside your allocation policy.",
    meta: {
      title: "Commercial decision intelligence",
      description:
        "Dealer allocation and sales performance, prepared from your CRM, DMS and ERP and approved by sales operations. First release in 4 to 6 weeks.",
    },
    expect: [
      { title: "Where orders and allocation drift apart", text: "A short list of regions and dealers, each with its evidence." },
      { title: "Sized to what you can ship", text: "Available stock is checked before any allocation moves." },
      { title: "Sales operations approves", text: "Allocation changes only after sales operations approves them." },
    ],
    deliverables: [
      "Read-only connectors to CRM, DMS, ERP and order data",
      "A regional view of orders, allocation and stock",
      "Allocation shift recommendations with policy checks",
      "Plain explanations of why a region or dealer moved",
      "Approval rules for sales operations and regional managers",
      "A scorecard against your baseline: fill rate, lost orders, aged stock by region",
    ],
    process: [
      audit("Choose the first decision: allocation, dealer performance or both."),
      connect("Weeks 1 to 2", "Read-only links to CRM, DMS and ERP. Regions, dealers and products mapped."),
      validate("Weeks 2 to 5", "Set allocation rules and approvers. Sales operations tests on live orders."),
      release("Weeks 4 to 6"),
    ],
    differentiator: {
      title: "Commercial decisions tied to supply.",
      text: "Decignal reads inventory and allocation policy alongside the pipeline, so it does not recommend selling stock you cannot ship.",
    },
    example: {
      value: "12%",
      text: "Move 12% of allocation to West dealers, where validated orders exceed allocated stock.",
    },
    faq: [
      {
        q: "Our CRM data is incomplete. Will this work?",
        a: "Yes. Dealer orders and ERP shipments carry most of the signal. CRM adds context where it exists.",
      },
      {
        q: "Will it override our allocation rules?",
        a: "No. Your allocation policy is a hard limit. Recommendations stay inside it, and anything outside needs explicit approval.",
      },
      {
        q: "Is this a forecasting tool?",
        a: "No. It compares your plan with what dealers actually order and flags where they diverge. Your forecast stays as it is.",
      },
      {
        q: "Can it explain why a region is down?",
        a: "It shows which drivers moved, such as orders, stock or dealer activity, with the records behind each one.",
      },
      {
        q: "Who sees the recommendations?",
        a: "Only the people you name, usually sales operations and regional managers.",
      },
    ],
  },
  {
    ...base("customer", "Customer"),
    lead: "Cases, orders and promises read together, not one case at a time.",
    signal: "14 service cases share one part",
    headline: ["Read cases together.", "Fix the cause once."],
    valueProp:
      "Decignal links service cases by part, product and order history, so related issues reach one owner with the full context.",
    meta: {
      title: "Customer service decision intelligence",
      description:
        "Related service cases linked by part and order history and escalated to one owner, approved by your team leads. First release in 4 to 6 weeks.",
    },
    expect: [
      { title: "Related cases, grouped", text: "Each group shows the shared part, batch or order that links it." },
      { title: "Escalations before the chase", text: "Cases likely to escalate are flagged while there is time to respond." },
      { title: "Team leads approve", text: "No case is grouped or escalated until a team lead approves." },
    ],
    deliverables: [
      "Read-only connectors to your service desk, order management and knowledge base",
      "Case groups by shared part, batch, product or order",
      "Escalation recommendations carrying the evidence from every linked case",
      "Suggested resolution steps from your own knowledge base",
      "Approval rules for team leads and quality owners",
      "A scorecard against your baseline: repeat contacts, time to root cause, escalations",
    ],
    process: [
      audit("Choose the first decision: case grouping, escalation or both."),
      connect("Weeks 1 to 2", "Read-only links to your service desk, orders and part history."),
      validate("Weeks 2 to 5", "Set grouping rules, escalation paths and approvers. Team leads test on live cases."),
      release("Weeks 4 to 6"),
    ],
    differentiator: {
      title: "One owner fixes the cause, instead of many agents fixing symptoms.",
      text: "Decignal reads the part and order history behind each case, not just the words in it.",
    },
    example: {
      value: "14 → 1",
      text: "Fourteen service cases share Bearing X90. One escalation goes to Quality, with every case attached.",
    },
    faq: [
      {
        q: "Is this a chatbot?",
        a: "No. It works behind your service team, linking cases and preparing escalations. Customers never talk to it.",
      },
      {
        q: "We have our own service desk. Do we need to switch?",
        a: "No. Decignal reads from the service desk you already use, read-only to start.",
      },
      {
        q: "Does it read personal customer data?",
        a: "Only the fields a decision needs, under access rules agreed with your security team.",
      },
      {
        q: "How does it link cases that look unrelated?",
        a: "Through the records behind them: the part, batch, product or order each case touches, not just similar wording.",
      },
      {
        q: "Who decides on an escalation?",
        a: "A named team lead or quality owner. They see every linked case before they approve.",
      },
    ],
  },
  {
    ...base("finance-and-risk", "Finance & Risk"),
    lead: "Invoices, receipts and policy, checked before money moves.",
    signal: "3 invoices arrived without a goods receipt",
    headline: ["Check every exception.", "Before money moves."],
    valueProp:
      "Decignal checks invoices, purchase orders, receipts and policy together, and routes each exception to the right reviewer with its evidence.",
    meta: {
      title: "Finance and risk decision intelligence",
      description:
        "Invoice exceptions and payment holds checked against PO, receipt and policy before money moves, approved by your reviewers. First release in 6 to 8 weeks.",
    },
    expect: [
      { title: "Exceptions ranked by risk", text: "Sorted by value and risk, not by arrival time." },
      { title: "Evidence attached", text: "PO, goods receipt, invoice and the policy each one tests." },
      { title: "A named reviewer decides", text: "Each exception is approved, held or rejected by the reviewer you name." },
    ],
    deliverables: [
      "Read-only connectors to finance ERP, payments, document stores and policy",
      "Three-way match checks on every invoice in scope",
      "An exception queue ranked by value and risk",
      "Hold and release recommendations with the evidence attached",
      "Approval limits by role and value",
      "A scorecard against your baseline: exceptions cleared per day, time to resolve, payments released in error",
    ],
    process: [
      audit("Choose the first decision: invoice holds, payment review or both."),
      connect("Weeks 1 to 3", "Read-only links to finance ERP, payments and documents. Policies and approval limits mapped."),
      validate("Weeks 3 to 6", "Set match rules, hold reasons and reviewers. Finance tests on live exceptions."),
      release("Weeks 6 to 8"),
    ],
    differentiator: {
      title: "Controls run before money moves, not after.",
      text: "Every recommendation shows the records it read and the policy it applied, before a reviewer decides.",
    },
    example: {
      value: "3 held",
      text: "Three supplier payments stay on hold until the goods receipt is verified.",
    },
    faq: [
      {
        // confirm: decision log retention before promising a full audit trail.
        q: "Can reviewers see why a payment was held?",
        a: "Yes. Each recommendation shows the records it read and the policy it applied.",
      },
      {
        q: "Can it release payments on its own?",
        a: "No. A named reviewer approves every release, within the approval limits you set.",
      },
      {
        q: "Where does our financial data stay?",
        a: "Where your security and risk teams decide. Hosting and access are agreed with them first, and access is read-only to start.",
      },
      {
        q: "Does it replace our accounts payable workflow?",
        a: "No. It prepares each exception for the workflow you already run. Your team applies the approved hold or release.",
      },
      {
        q: "Can it cover risk beyond invoices?",
        a: "Over time, yes. The same layer can check payments before settlement or flag accounts for a KYC refresh.",
      },
    ],
  },
];

/** "Why Decignal" points every area shares; an area's differentiator leads, these follow (SP-06). */
export const SHARED_WHY: { title: string; text: string }[] = [
  { title: "Works across what you run", text: "No rip-and-replace programme, no perfect data lake, read-only to start." },
  { title: "Every recommendation shows its evidence", text: "The signal, the connected records and the policy check sit beside the action." },
  { title: "A named person approves", text: "Human approval can always be required, and you set roles and thresholds." },
];

export const areaBySlug = (slug: string) => AREAS.find((a) => a.slug === slug);
export const areaOf = (category: Category) => AREAS.find((a) => a.category === category)!;
export const areaHref = (category: Category) => `/solutions/${areaOf(category).slug}`;

/** The area's applications with their index in APPLICATIONS (for openApplication / the explorer). */
export const appsOf = (area: Area) => APPLICATIONS.map((x, i) => ({ ...x, i })).filter((x) => x.category === area.category);

/** "Supply Chain · 3 applications": the service hero eyebrow. */
export const areaEyebrow = (area: Area) => {
  const n = appsOf(area).length;
  return `${area.name} · ${n} ${n === 1 ? "application" : "applications"}`;
};
