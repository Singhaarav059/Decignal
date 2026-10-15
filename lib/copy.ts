// The copy deck: every section and chapter string, keyed by slot (COPY-01..19, critic §2, D1 to D14).
// Component lanes wire these in; each slot's comment names the component that renders it.
// Rules for every string here:
// - No em dashes. Curly apostrophes. British spelling.
// - Headlines are [line1, line2]; line 2 is the accent line in the chapter tone (D6, D14).
// - Body copy runs at most 2 lines on a screen.
// - One CTA wording: CTA.primary.
// - Figures about the running example come from lib/example.ts and read as an example, never as a result.
// - No vendor names or logos (D8). No client names, quotes or result numbers.
// Data lives elsewhere: applications, outcomes, paths, FAQ and system types in lib/content.ts, the five
// areas in lib/areas.ts, the explorer scenarios in lib/application-demos.ts, the island panels in
// components/ui/systems.tsx, form messages and booking states in lib/audit.ts (AUDIT_MESSAGES).

import { APP_FACTS, EXAMPLE, inr, inrShort } from "./example";

export type Headline = readonly [string, string];

const T = EXAMPLE.transfer;
const P1 = EXAMPLE.plant01;
const P2 = EXAMPLE.plant02;

/* ------------------------------------------------------------------ */
/* Calls to action (COPY-07)                                           */
/* ------------------------------------------------------------------ */

export const CTA = {
  /** Every primary button: Nav, story hero card, final chapter, FAQ, footer, service pages. With an arrow. */
  primary: "Book a free AI audit",
  /** Nav under 640px and other tight spaces (Nav.tsx, the `sm:hidden` span). */
  compact: "Book audit",
  href: "#audit",
  /** Secondary text links to the service pages (AreaRows, footer, ScaleApps, apps index). */
  explore: (area: string) => `Explore ${area}`,
  /** Final chapter secondary button (FinalEngine / StoryCard). */
  applications: "See the 8 applications",
} as const;

/* ------------------------------------------------------------------ */
/* Metadata (COPY-06). lib/site.ts owns the constants; these are the words. */
/* ------------------------------------------------------------------ */

export const META = {
  /** SITE_TITLE. */
  title: "Decignal · Decision intelligence for operations",
  /** SITE_DESCRIPTION (155 characters). */
  description:
    "Decignal reads the ERP, CRM, MES and WMS you already run, finds the decision that matters and sends it, with its evidence, to the right person to approve.",
  /** openGraph and twitter title. */
  shareTitle: "Your operation. Seen as a whole.",
  /** SHARE_DESCRIPTION. */
  shareDescription: "Decision intelligence for enterprises in India and Africa. Book a free 30-minute AI audit.",
  /** OG image footer line (opengraph-image.tsx); its two headline lines are HERO.headline. */
  ogFooter: "Decision intelligence for enterprises in India and Africa.",
} as const;

/* ------------------------------------------------------------------ */
/* Story: hero and chapters (Story.tsx, StoryCard.tsx)                  */
/* ------------------------------------------------------------------ */

/** The quiet label in the StoryCard label row, on every chapter (COPY-01 10). */
export const EXAMPLE_LABEL = EXAMPLE.label;

/** 01: the only chapter besides the final one with the giant display headline (D14). */
export const HERO = {
  /** Story.tsx back layer, above the headline. */
  eyebrow: "Decision intelligence · India and Africa",
  /** The page h1 (critic §2 "Hero h1"): the visible back-layer line, promoted in place. */
  headline: ["Your operation.", "Seen as a whole."] as Headline,
  /** The hero's right column on wide screens, beside the h1: what Decignal does, in one sentence. */
  lede: "Decignal reads the systems you already run, finds the decision that matters and sends it to the right person to approve.",
  /** The quiet second action beside the CTA: the How it works section. */
  secondary: "How it works",
  /** The hero StoryCard: label row, one body line, the chips, the CTA (narrow screens; wide ones carry it
   *  beside the h1). No second headline (D14). */
  card: "Six systems, one shortage. Watch it become one approved decision.",
  scrollCue: "Scroll",
} as const;

type ChapterCopy = {
  /** Two lines, line 2 in the chapter tone; red only when the line states a risk (S14). */
  title: Headline;
  /** At most 2 lines in the 440px card (95 characters or fewer). */
  body: string;
  /** The one readout under the body: a number and what it counts. */
  readout?: { value: string; label: string; risk?: boolean };
  /** Rows revealed by the card's "Details" disclosure. */
  details?: { label: string; value: string; risk?: boolean }[];
};

/**
 * Chapters 02 to 09, index-aligned with CHAPTERS in lib/story.ts (index 0 is the hero, above).
 * The StoryCard label row reads `0{i + 1} · {CHAPTERS[i].label}` plus EXAMPLE_LABEL.
 */
export const CHAPTER_COPY: (ChapterCopy | null)[] = [
  null,
  {
    title: ["A part runs short.", "Six days to act."],
    body: `${EXAMPLE.part} falls below safety stock at Plant 01 on day 6. Decignal flags it now.`,
    readout: { value: "Day 6", label: "Below safety stock", risk: true },
    details: [
      { label: "On hand", value: `${P1.onHand} units` },
      { label: "Safety stock", value: `${P1.safety} units` },
      { label: "Breach", value: "Day 6", risk: true },
    ],
  },
  {
    title: ["Demand is rising.", "Stock is falling."],
    body: "Orders are up 18%. The next supplier delivery lands on day 21, fifteen days too late.",
    readout: { value: "21 days", label: "Until the next supplier delivery" },
    details: [
      { label: "Daily usage", value: `${P1.dailyUse} units` },
      { label: "Open orders", value: "+18% in 3 weeks" },
      { label: "Safety breach", value: "Day 6", risk: true },
    ],
  },
  {
    title: ["Every fact.", "One picture."],
    body: "Six systems, checked together. Select one to see the evidence it adds.",
  },
  {
    title: ["One clear", "decision."],
    body: `Send ${T.units} units from Plant 02 to Plant 01. Plant 02 keeps its ${P2.ownPlan}-unit plan.`,
    readout: { value: "2 days", label: "Until the transfer arrives" },
    details: [
      { label: "Arrives", value: "2 days" },
      { label: "Plant 02 left", value: `${P2.ownPlan} units` },
      { label: "Cost", value: inr(T.costINR) },
    ],
  },
  {
    title: ["You see why.", "You decide."],
    body: "Check the evidence, change the quantity, approve or reject. Your policy sets who signs off.",
  },
  {
    title: ["One layer.", "Every function."],
    body: "From stock transfers to service cases, every application reuses the same context and controls.",
  },
  {
    // Line 2 is the industry name: INDUSTRY.title(name).
    title: ["Built for", "your industry."],
    body: "One foundation, configured around the systems and decisions of your industry.",
  },
  {
    // 09 uses the giant display headline (D14) and FINAL below.
    title: ["Turn information", "into decisions."],
    body: "Decignal reads the systems you run, recommends one action and leaves the approval with your team.",
  },
];

/**
 * The chapter heads on wide screens (ChapterHeads.tsx): three figures beside each chapter's headline.
 * Each names the system it is read from and takes that system's tone; `risk` turns the figure red.
 * Figures come from the running example (lib/example.ts) and never repeat the card's own readout.
 */
type ChapterFact = { value: string; unit?: string; label: string; source: string; tone: string; risk?: boolean };
export const CHAPTER_FACTS: (ChapterFact[] | null)[] = [
  null,
  [
    { value: `${P1.onHand}`, unit: "units", label: "On hand at Plant 01", source: "ERP", tone: "cobalt" },
    { value: `${P1.dailyUse}`, unit: "/ day", label: `Drawn by ${EXAMPLE.line.name}`, source: "MES", tone: "emerald" },
    { value: `${P1.safety}`, unit: "units", label: "Safety stock", source: "ERP", tone: "signal", risk: true },
  ],
  [
    { value: `+${EXAMPLE.demand.upPct}%`, label: `Open orders in ${EXAMPLE.demand.weeks} weeks`, source: "CRM", tone: "violet" },
    { value: `${P1.day6Without}`, unit: "units", label: "Left at Plant 01 on day 6", source: "ERP", tone: "signal", risk: true },
    { value: `${EXAMPLE.supplier.nextDeliveryDay - P1.breachDay}`, unit: "days", label: "Supplier relief arrives late", source: "Suppliers", tone: "tangerine" },
  ],
  [
    { value: "6", unit: "systems", label: "Read together, read-only", source: "All six", tone: "cobalt" },
    { value: `${P2.transferable}`, unit: "units", label: "Free at Plant 02 above plan", source: "WMS", tone: "saffron" },
    { value: `${EXAMPLE.lane.days}`, unit: "days", label: "By road, lane clear", source: "External", tone: "pink" },
  ],
  [
    { value: `${T.units}`, unit: "units", label: "Plant 02 to Plant 01", source: "WMS", tone: "saffron" },
    { value: `${T.pallets}`, unit: "pallets", label: `${T.perPallet} units each, one truck`, source: "WMS", tone: "saffron" },
    { value: inrShort(T.costINR), label: "Freight for the transfer", source: "External", tone: "pink" },
  ],
  [
    { value: `${EXAMPLE.policy.maxUnits}`, unit: "units", label: `${EXAMPLE.policy.approver}'s approval limit`, source: "Policy", tone: "violet" },
    { value: "3 / 3", label: "Policy checks pass", source: "Policy", tone: "emerald" },
    { value: T.approvedAt, label: `Approved by the ${T.approvedBy.toLowerCase()}`, source: "Example", tone: "cobalt" },
  ],
  [
    { value: "8", unit: "applications", label: "In the catalogue", source: "Catalogue", tone: "emerald" },
    { value: "5", unit: "areas", label: "From supply chain to finance", source: "Catalogue", tone: "violet" },
    { value: "1", unit: "layer", label: "Shared context and controls", source: "Platform", tone: "cobalt" },
  ],
  [
    { value: "6", unit: "industries", label: "One foundation for each", source: "Platform", tone: "cobalt" },
    { value: "5 to 10", unit: "weeks", label: "Typical first release", source: "Catalogue", tone: "emerald" },
    { value: "1", unit: "decision", label: "To start with, in any of them", source: "Audit", tone: "tangerine" },
  ],
  null,
];

/** 02 Signal readout card (Story.tsx SignalReadout): its accessible summary. */
export const SIGNAL_ARIA = `${EXAMPLE.part} at Plant 01: ${P1.onHand} units on hand, safety stock ${P1.safety}, breach on day 6`;

/** 04 Context: the three checks, each linked to its island (Story.tsx EvidenceChecks). `island` is the SYSTEMS index. */
export const EVIDENCE_CHECKS = {
  aria: "Evidence behind this transfer",
  rows: [
    { tone: "saffron", label: "Stock available", value: `${P2.stock} − ${P2.ownPlan} = ${P2.transferable} units`, island: 3, system: "WMS" },
    { tone: "tangerine", label: "Supplier timing", value: "21 days · too late", island: 4, system: "Suppliers" },
    { tone: "pink", label: "Transfer route", value: "2 days · lane clear", island: 5, system: "External" },
  ],
  /** Accessible name per row. */
  rowAria: (label: string, value: string, system: string) => `${label}: ${value}. From ${system}. Open its evidence.`,
} as const;

/** 05 Decision: the transfer order's progress (Story.tsx Stepper). */
export const STEPPER = ["Approved", "Picking", "Loaded", "In transit", "Received"] as const;

/** 06 Control: the approval panel (DecisionControls.tsx). Approval is the only claim: no write-back, no learning. */
export const CONTROL = {
  eyebrow: "Interactive example",
  title: (qty: number) => `Transfer ${qty} units`,
  sourceLeft: (left: number) => `Plant 02 · ${left} left`,
  balanceAria: (left: number, qty: number) => `Plant 02 keeps ${left} units; Plant 01 receives ${qty} units`,
  retained: "retained",
  incoming: "incoming",
  approve: "Approve",
  adjust: "Adjust",
  reject: "Reject",
  approveQty: (qty: number) => `Approve ${qty}`,
  cancel: "Cancel",
  /** Under the quantity slider. The slider runs 80 to 400 in steps of 20. */
  note: (qty: number) =>
    qty < 220
      ? "Below the recommended quantity. Check the forecast before approving."
      : qty <= T.units
        ? "Matches the recommendation. Plant 02 keeps its 380-unit plan."
        : qty <= EXAMPLE.policy.maxUnits
          ? "Plant 02 would drop below its 380-unit plan."
          : "Above the 300-unit transfer limit. Needs plant manager approval.",
  rejectPrompt: "Why not? Pick the reason that fits.",
  reasons: ["Plant 02 needs the stock", "Expedite instead", "Demand looks temporary"],
  planLabel: "Example plan",
  /** The approved chip: "240 units · Plant 02 → Plant 01". */
  planChip: (qty: number) => `${qty} units · Plant 02 → Plant 01`,
  approvedTitle: (qty: number) =>
    `Approved in this example. In a live setup, your team releases a ${qty}-unit transfer order in your ERP.`,
  approvedMeta: "Example · Planner approval → transfer order in your ERP",
  rejectedTitle: "Rejected. No stock moves.",
  rejectedMeta: (reason: string) => `Reason: ${reason}`,
  undo: "Undo",
} as const;

/** 07 Scale: the function card (StoryCard / ScaleApps). */
export const SCALE = {
  apps: (n: number) => `${n} ${n === 1 ? "application" : "applications"}`,
  /** One app row: "Inventory Intelligence · 4 to 6 weeks". */
  appRow: (name: string, weeks: string) => `${name} · ${weeks} weeks`,
  /** A delivery estimate on its own: "4 to 6 weeks". */
  weeks: (w: string) => `${w} weeks`,
  link: (area: string) => CTA.explore(area),
} as const;

/** Labels and accessible names in the story's DOM (StoryCard, ScaleCard, LayerReadout, ScalePhone,
 *  DecisionControls, IslandPanel). Wired by the story lanes. */
export const STORY_UI = {
  details: "Details",
  cardAria: "The story, chapter by chapter",
  functionsAria: "Business functions",
  layers: "Layers behind the decision",
  phoneAria: "Decisions by business function",
  qtyAria: "Units to transfer",
  qtyDown: "Decrease quantity",
  qtyUp: "Increase quantity",
  /** IslandPanel: "Source 3 of 6". */
  source: (n: number, total = 6) => `Source ${n} of ${total}`,
  synced: (time: string) => `Synced ${time}`,
  readFor: "Read for this decision",
  close: "Close",
} as const;

/** 08 Industries (Story.tsx headline, IndustryDetail.tsx card). */
export const INDUSTRY = {
  title: (name: string) => ["Built for", `${name}.`] as Headline,
  /** Was "Decisions Decignal makes": Decignal recommends, people decide (COPY-03). */
  decisions: "What Decignal recommends",
  startLink: (app: string, weeks: string) => `Typical start: ${app} · ${weeks} weeks`,
  indexAria: "Industries",
  /** IndustryCallout: the decision pinned to the place on wide screens. */
  action: "Recommended action",
} as const;

/** 09 Decide (D1 Option A): the 3D world, the giant headline, one line, the CTA pair and the example card. */
export const FINAL = {
  headline: ["Turn information", "into decisions."] as Headline,
  sub: "Decignal reads the systems you run, recommends one action and leaves the approval with your team.",
  /** Under the primary CTA. */
  ctaNote: "30 minutes. We pick one decision in your operation and show what Decignal would recommend.",
  secondary: CTA.applications,
  /** The StoryCard in this chapter. */
  cardTitle: `Example · Transfer ${T.id}`,
  /** Three results of the same transfer (S69-14). Tone = the system the figure comes from (D6). No money figure. */
  outcomes: [
    { value: "2 days", label: "Reaches Plant 01 before day 6", tone: "pink" },
    { value: `${P2.ownPlan} units`, label: "Plant 02 keeps its own plan", tone: "saffron" },
    { value: "Day 6", label: "Safety-stock breach avoided", tone: "cobalt" },
  ],
  chipsAria: "The six systems behind this decision",
  /** Before the row of system discs on the card. */
  readFrom: "Read from six systems",
} as const;

/** The nav's story glance (NavPeek CHAPTER_INFO and its groups), index-aligned with CHAPTERS. */
export const STORY_PEEK = {
  title: "The story in nine chapters",
  sub: "One stock shortage, followed from the first signal to an approved transfer.",
  chapters: [
    "Six systems, six partial views",
    "One shortage worth acting on",
    "Demand rises while stock runs low",
    "Every fact, checked in one view",
    "Move 240 units, Plant 02 to Plant 01",
    "A named person approves it",
    "The same layer, five functions",
    "Configured for your industry",
    "Information, turned into decisions",
  ],
  groups: [
    { name: "The problem", from: 0 },
    { name: "The answer", from: 3 },
    { name: "At scale", from: 6 },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Nav and glances (Nav.tsx, NavPeek.tsx)                               */
/* ------------------------------------------------------------------ */

export const NAV = {
  /** Nav.tsx section links: [id, label]. */
  /** One link per home section, in page order; the audit is the CTA. */
  sections: [
    ["systems", "Integrations"],
    ["platform", "Platform"],
    ["applications", "Solutions"],
    ["trail", "Decision trail"],
    ["outcomes", "Results"],
    ["how", "How it works"],
    ["faq", "FAQ"],
    ["audit", "Free AI audit"],
  ],
  logoAria: "Decignal, back to top",
  menuOpen: "Open menu",
  menuClose: "Close menu",
  /** NavPeek PEEKS blurbs: the glance side card and the phone menu. */
  blurbs: {
    systems: "Reads the ERP, CRM, MES and WMS you already run.",
    platform: "What Decignal does, in one sentence and five facts.",
    trail: "Seven steps from one signal to a result.",
    apps: "Eight applications across five business areas.",
    outcomes: "Three example decisions and what they change.",
    how: "One decision first, live in weeks.",
    faq: "What teams ask before they start.",
  },
  /** Glance footers: a figure and what it counts. No figure that reads as a result (NAV-15). */
  foot: {
    apps: { figure: "8", label: "applications in the catalogue" },
    outcomes: { figure: "Read-only", label: "to start, nothing replaced" },
    how: { label: "weeks to a first release" },
  },
  /** The outcomes glance eyebrow: its numbers are the example's. */
  outcomesEyebrow: "Example outcomes",
  appsCount: (n: number) => `${n} ${n === 1 ? "app" : "apps"}`,
  /** The Platform glance's side card: what Decignal does, in one line. */
  platformSide: {
    label: "What Decignal does",
    blurb: "Reads the systems you already run, finds the decision that matters and sends it, with its evidence, for approval.",
  },
  faqSide: {
    label: "Free AI audit",
    blurb: "Three decisions ranked, in 30 minutes. Free.",
    all: (n: number) => `All ${n} questions`,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Editorial sections (Editorial.tsx and the sections it composes) */
/* ------------------------------------------------------------------ */

/** The systems strip (E10, COPY-10, D8): system types from CONNECTS in lib/content.ts. */
export const SYSTEMS_STRIP = {
  eyebrow: "Works with what you run",
  headline: ["Keep your systems.", "We read across them."] as Headline,
  /** The three promises as chips in the glass panel (SystemsRing). */
  promises: ["Read-only to start", "No migration", "No new data lake"],
  footnote: "The audit confirms how we connect to the systems you run.",
} as const;

/** Applications section and explorer (Editorial.tsx, ApplicationExplorer.tsx). */
export const APPLICATIONS_COPY = {
  eyebrow: "Solutions",
  headline: ["Eight applications.", "Five business areas."] as Headline,
  intro: "From the first signal to the right action. Follow the decisions as you scroll.",
  chaptersAria: "Application chapters",
  stages: ["Signal", "Evidence", "Action"],
  stageLabels: ["The signal", "Connected evidence", "Recommended action"],
  showEvidence: "Show evidence",
  hideEvidence: "Hide evidence",
  sources: "Connected sources",
  /** The explorer's one honesty label (COPY-08 6). */
  example: "Illustrative examples",
  /** The full list of applications (Editorial.tsx). */
  listAria: "All eight applications",
} as const;

/** The static trail after the explorer (E04, COPY-02 8): every application runs the same seven steps. */
export const TRAIL = {
  label: "Every application runs the same trail",
  /** The dial's head (TrailDial.tsx, Orvan's process dial). */
  headline: ["One shortage.", "Seven steps to a result."] as Headline,
  /** The dial's last turn, from Result back to Signal: the loop closes. */
  loop: { k: "Loop", name: "Next signal", ex: "The result is measured against the plan, and the next signal starts the trail again." },
  aria: "How one decision moves: signal, evidence, context, policy, decision, approval, result",
  groups: ["Signal", "Evidence", "Action"],
  steps: [
    { step: "Signal", ex: `${EXAMPLE.part} short at Plant 01 on day 6`, tone: "signal", group: 0 },
    { step: "Evidence", ex: "Open orders up 18% in 3 weeks", tone: "violet", group: 1 },
    { step: "Context", ex: `Plant 02 has ${P2.transferable} units above plan`, tone: "saffron", group: 1 },
    { step: "Policy", ex: "Max 300 units per transfer", tone: "cobalt", group: 1 },
    { step: "Decision", ex: T.text, tone: "emerald", group: 2 },
    // Emerald like the Control chapter: tangerine means suppliers (D6).
    { step: "Approval", ex: `Planner approves at ${T.approvedAt}`, tone: "emerald", group: 2 },
    { step: "Result", ex: "Arrives on day 2, before the day 6 breach", tone: "pink", group: 2 },
  ],
} as const;

/** Outcomes (Editorial.tsx). The cases are OUTCOMES in lib/content.ts. */
export const OUTCOMES_COPY = {
  eyebrow: "Example outcomes",
  headline: ["Every decision", "ends in a number."] as Headline,
  intro: "Three decisions from the scenes above, and the number each one changes.",
  tabsAria: "Example outcomes",
  /** The single disclaimer, under the intro. */
  note: "Illustrative decisions from the scenes above. Your results are measured against your own baseline.",
} as const;

/** The statement after the systems ring (Statement.tsx, Orvan's "About"): one sentence that sharpens
 *  word by word as it scrolls in, then the five facts as cards. */
export const STATEMENT = {
  eyebrow: "What Decignal does",
  text: "Decignal reads your ERP, CRM, MES and WMS, finds the decision that matters and sends it, with its evidence, to whoever approves.",
  approverAlt: "A planner reviewing a decision at a laptop",
  /** The approver card's trail (Statement.tsx bento): the running example, minute by minute. */
  log: [
    { t: "09:41", text: "Recommendation sent to the planner", tone: "cobalt" },
    { t: T.approvedAt, text: `Approved, ${T.units} units`, tone: "emerald" },
    { t: "09:44", text: "Your team releases the transfer in the ERP", tone: "tangerine" },
  ],
} as const;

/**
 * The Also reads dial (ReadWheel.tsx): the nine other system types, in three groups, each with one read
 * from an application's illustrative scenario (lib/application-demos.ts, APP_FACTS). `compare` is two
 * figures side by side, f their bar length (0..1), `risk` the red one. `icon` is a SystemIcon id.
 */
export type WheelItem = {
  name: string;
  title: string;
  text: string;
  app: string;
  fig: string;
  unit?: string;
  caption: string;
  icon: string;
  compare: { label: string; value: string; f: number; risk?: boolean }[];
};
const MAINT = APP_FACTS.maintenance;
export const ALSO_READS = {
  label: "Also reads",
  title: "Plus the rest of your stack.",
  lede: "Nine more kinds of system, read the same way: read-only, mapped to your definitions, and used only by the applications that need them.",
  example: "Example read",
  usedBy: "Used by",
  tabsAria: "Other systems Decignal reads, by group",
  itemOf: (n: number, total: number) => `${n} of ${total}`,
  groups: [
    {
      id: "ops",
      label: "Operations",
      tone: "emerald",
      items: [
        {
          name: "CMMS",
          title: "Maintenance system",
          text: "Assets, work orders and maintenance history: which asset, when it was last serviced, and when it can stop.",
          app: "Predictive Maintenance",
          fig: MAINT.workOrder,
          caption: `${MAINT.asset} · ${MAINT.line} · ${MAINT.window} window`,
          icon: "cmms",
          compare: [
            { label: "Hours since last service", value: "3,900 h", f: 0.92, risk: true },
            { label: "Service interval", value: "4,000 h", f: 0.95 },
          ],
        },
        {
          name: "SCADA and IoT",
          title: "Sensors on the line",
          text: "Readings such as vibration and temperature, as the machine runs. A trend here is often the first sign of a failure.",
          app: "Predictive Maintenance",
          fig: MAINT.peak.split(" ")[0],
          unit: "mm/s",
          caption: `Vibration peak · sensor ${MAINT.sensor} · ${MAINT.asset}`,
          icon: "scada",
          compare: [
            { label: "Peak this week", value: MAINT.peak, f: 0.96, risk: true },
            { label: "Running baseline", value: "2.1 mm/s", f: 0.42 },
          ],
        },
        {
          name: "QMS",
          title: "Quality system",
          text: "Inspections, non-conformances and batch holds, so no recommendation moves stock that quality has stopped.",
          app: "Production Intelligence",
          fig: "1",
          unit: "batch held",
          caption: `${APP_FACTS.qualityBatch} · held for inspection`,
          icon: "qms",
          compare: [
            { label: "Lots inspected this week", value: "42", f: 1 },
            { label: "Non-conformances", value: "3", f: 0.07, risk: true },
          ],
        },
      ],
    },
    {
      id: "com",
      label: "Commercial",
      tone: "violet",
      items: [
        {
          name: "POS",
          title: "Point of sale",
          text: "Sell-through by store and region, the demand that reaches shelves before it reaches orders.",
          app: "Demand & Replenishment",
          fig: `+${APP_FACTS.demand.raiseUnits.toLocaleString("en-US")}`,
          unit: "units",
          caption: `${APP_FACTS.demand.dc} order raised · POS and orders agree`,
          icon: "pos",
          compare: [
            { label: "West sell-through, this month", value: "9,600 units", f: 0.92 },
            { label: "Replenishment plan", value: "7,800 units", f: 0.75 },
          ],
        },
        {
          name: "DMS",
          title: "Dealer management",
          text: "Dealer orders, stock and allocation, so supply follows the dealers who are actually selling.",
          app: "Sales & Dealer Intelligence",
          fig: `${APP_FACTS.sales.shiftPct}%`,
          caption: "Allocation shifted to West dealers",
          icon: "dms",
          compare: [
            { label: "West share of dealer orders", value: "38%", f: 0.76 },
            { label: "West share of allocation", value: "26%", f: 0.52 },
          ],
        },
        {
          name: "Service desk",
          title: "Service cases",
          text: "Cases, SLAs and part history, so a pattern across many tickets reaches the one team that can fix its cause.",
          app: "Customer Service Intelligence",
          fig: `${APP_FACTS.customer.cases} → 1`,
          caption: `Cases linked by ${APP_FACTS.customer.part} · owner: ${APP_FACTS.customer.owner}`,
          icon: "desk",
          compare: [
            { label: "Open cases on the same part", value: `${APP_FACTS.customer.cases}`, f: 1 },
            { label: "Escalations after grouping", value: "1", f: 0.07 },
          ],
        },
      ],
    },
    {
      id: "data",
      label: "Logistics & data",
      tone: "cobalt",
      items: [
        {
          name: "TMS",
          title: "Transport management",
          text: "Shipments, lanes and carrier ETAs: when goods in transit will really arrive, and which routes are slipping.",
          app: "Supply Chain Risk",
          fig: `+${APP_FACTS.risk.laneDelayDays}`,
          unit: "days",
          caption: `Port lane delay · ${APP_FACTS.risk.parts.length} parts at risk`,
          icon: "tms",
          compare: [
            { label: "Port lane, delayed", value: `+${APP_FACTS.risk.laneDelayDays} days`, f: 1, risk: true },
            { label: `${APP_FACTS.risk.alternative} instead`, value: `${APP_FACTS.risk.alternativeDays} days`, f: 0.29 },
          ],
        },
        {
          name: "Data warehouse",
          title: "Data warehouse",
          text: "The history, forecasts and models you already keep. Decignal reads them; it does not ask for a new data lake.",
          app: "Demand & Replenishment",
          fig: "36",
          unit: "months",
          caption: `${EXAMPLE.part} demand history behind the forecast`,
          icon: "dwh",
          compare: [
            { label: "Forecast, this month", value: "1,080 units", f: 0.86 },
            { label: "Open orders, today", value: `${EXAMPLE.demand.now.toLocaleString("en-US")} units`, f: 0.9 },
          ],
        },
        {
          name: "Spreadsheets",
          title: "Plans in spreadsheets",
          text: "The shift plans and trackers that live outside any system, read as they are, with nothing to re-key.",
          app: "Predictive Maintenance",
          fig: MAINT.window,
          caption: `Shift plan · the free window on ${MAINT.line}`,
          icon: "sheet",
          compare: [
            { label: `${MAINT.line} load, ${MAINT.window}`, value: "40%", f: 0.4 },
            { label: `${MAINT.line} load, other days`, value: "95%", f: 0.95 },
          ],
        },
      ],
    },
  ] as { id: string; label: string; tone: string; items: WheelItem[] }[],
} as const;

/** The facts band under the outcome card (Statement.tsx). No "0" figure (NAV-15), no readiness claim (COPY-09). */
export const GLANCE = [
  { n: "Read-only", label: "to start", text: "Decignal reads the ERP, MES, CRM and WMS you already run. Nothing is replaced.", tone: "cobalt" },
  { n: "4 to 8", label: "weeks to a first release", text: "From the catalogue. A custom application takes 6 to 12 weeks.", tone: "emerald" },
  { n: "8", label: "applications in the catalogue", text: "Inventory to finance, each fitted to your systems and policies.", tone: "saffron" },
  { n: "5", label: "business areas", text: "Supply chain, operations, commercial, customer, finance and risk.", tone: "violet" },
  { n: "1", label: "named approver per action", text: "Human approval can always be required. You set roles and thresholds.", tone: "tangerine" },
] as const;

/** How it works (Editorial.tsx, HowSteps.tsx). Routes and steps are PATHS in lib/content.ts. */
export const HOW = {
  eyebrow: "How it works",
  headline: ["One decision first.", "Then build from there."] as Headline,
  intro: "Two routes to production: build around your operation, or start from the catalogue.",
  routeAria: "Two routes to production",
  /** Each colour sheet's head (HowSteps.tsx): its place in the order, in words rather than numerals. */
  stepWords: ["First.", "Second.", "Third.", "Then."],
  youGet: "You get",
  /** What each step delivers, index-aligned with PATHS[route].steps (HowSteps.tsx). */
  delivers: {
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
  },
} as const;

/** FAQ (Editorial.tsx). Questions are FAQ in lib/content.ts, topics FAQ_TOPICS. */
export const FAQ_COPY = {
  eyebrow: "FAQ",
  headline: ["Questions teams", "ask us first."] as Headline,
  helpTitle: "Still have a question?",
  helpText: "Bring it to your free 30-minute AI audit.",
  /** The one text link to the audit (E08), with an arrow. */
  helpLink: "Ask it in your audit",
} as const;

/* ------------------------------------------------------------------ */
/* The free AI audit: lead magnet and booking (Audit.tsx)               */
/* Field messages, consent, slot help and request states: lib/audit.ts.  */
/* ------------------------------------------------------------------ */

export const AUDIT = {
  eyebrow: "Free AI audit",
  headline: ["Bring one decision.", "Leave with a plan."] as Headline,
  intro: "Thirty minutes on one workflow. Free, with no commitment.",
  getTitle: "What you get",
  get: [
    { title: "Three decisions, ranked", text: "Scored on value, feasibility, risk and time to production." },
    { title: "The data each one needs", text: "Which systems hold it, and which gaps matter." },
    { title: "A first release you can plan", text: "Catalogue or custom, with a realistic timeline." },
  ],
  /** Facts row (dl). confirm: "Video call" is an owner promise (D11, README). No turnaround is promised
   *  until the owner confirms one. */
  facts: [
    { k: "Length", v: "30 minutes" },
    { k: "Cost", v: "Free" },
    { k: "Format", v: "Video call" },
    { k: "Summary", v: "In writing, after the call" },
  ],
  nextTitle: "What happens next",
  /** In the form's order: step 2 asks the three questions (area, decision, systems), step 3 the times. */
  next: ["Answer three short questions", "Choose two or three times", "Meet for 30 minutes", "Get your written summary"],
  tail: "If there is a fit, we propose a scoped first release. If not, the summary is yours to keep.",
  /** The three steps of the form: progress reads "Step 1 of 3 · About you". */
  steps: ["About you", "Your decision", "Pick your times"],
  progress: (n: number, total = 3) => `Step ${n} of ${total}`,
  fields: {
    name: { label: "Full name", placeholder: "Your name" },
    email: { label: "Work email", placeholder: "name@company.com" },
    company: { label: "Company", placeholder: "Company name" },
    role: { label: "Role", placeholder: "Head of Supply Chain" },
    country: { label: "Country", placeholder: "Select" },
    phone: { label: "Phone (optional)", placeholder: "Country code and number" },
    area: { label: "Business area" },
    decision: {
      label: "The decision you want to move faster",
      placeholder: "For example: rebalancing stock between plants before shortages hit",
    },
    systems: { label: "Systems you run" },
    systemsOther: { label: "Which products? (optional)", placeholder: "For example: the ERP and WMS you use" },
  },
  continue: "Continue",
  back: "Back",
  toTimes: "Choose your times",
  /** Accessible name of the step bars. */
  progressAria: "Progress",
  /** The chosen-times list: "Your times 2 of 3". */
  picks: "Your times",
  picksCount: (n: number, max: number) => `${n} of ${max}`,
  /** Step 3, when CONTACT_EMAIL is set: text before and after the email link (COPY-12). */
  timesAlt: ["None of these work? Email", "and we will find a time."],
  /** Notice fallback link when a send did not go through. */
  orEmail: (email: string) => `Or email ${email}`,
  /** Screen-reader suffix on links that open a new tab. */
  newTab: "(opens in a new tab)",
  /** The honeypot's label (hidden from people). */
  honeypot: "Website",
} as const;

/* ------------------------------------------------------------------ */
/* Footer, loader and standalone pages                                  */
/* ------------------------------------------------------------------ */

export const FOOTER = {
  /** Footer display headline (COPY-04). */
  headline: ["Start with", "one decision."] as Headline,
  navTitle: "Explore",
  /** Section cards (Footer.tsx NAV). Card 05 is dropped (critic §2). */
  nav: [
    { label: "Platform", href: "#platform", blurb: "What Decignal does, in one sentence and five facts" },
    { label: "Solutions", href: "#applications", blurb: "Eight applications across five business areas" },
    { label: "How it works", href: "#how", blurb: "One decision first, live in weeks" },
    { label: "FAQ", href: "#faq", blurb: "What teams ask before they start" },
  ],
  areasTitle: "Where Decignal works",
  /** Area link text: "{Area}" with its count (COPY-19), linking to /solutions/{slug}. */
  areaCount: (n: number) => `${n} ${n === 1 ? "application" : "applications"}`,
  positioning: "Decision intelligence for enterprises across India and Africa.",
  /** No legal entity is invented (D11): the owner replaces "Decignal" when it is known. */
  copyright: "© 2026 Decignal",
  privacy: "Privacy",
  terms: "Terms",
  /** Rendered only when NEXT_PUBLIC_CONTACT_EMAIL is set (lib/site.ts CONTACT_EMAIL). */
  contact: (email: string) => email,
  top: "Back to top",
} as const;

/** Loader.tsx positioning line. */
export const LOADER = {
  positioning: "Decision intelligence for enterprises across India and Africa",
} as const;

/** app/not-found.tsx and the legal pages (COPY-19). */
export const PAGES = {
  notFound: {
    /** Document title (metadata). */
    title: "Page not found",
    eyebrow: "404",
    headline: ["This page is not here.", "Your operation still is."] as Headline,
    body: "The link may be old or mistyped.",
    home: "Back to the start",
    cta: CTA.primary,
  },
  /** Placeholders until the owner supplies the legal text (D11, PROD-11). */
  privacy: {
    title: "Privacy notice",
    lead: "We use the details you send us only to arrange and prepare your audit.",
    draft: "This notice is a draft. The final text will name who we are and how to reach us.",
    /**
     * PROD-11 sections. Each states what the site does today (app/api/audit, lib/rate-limit.ts, Loader).
     * confirm: retention and the delivery services in use, before launch; the owner adds the legal entity,
     * registered address and grievance contact (India DPDP Act) when known. Nothing here is invented.
     */
    sections: [
      {
        title: "What we collect",
        text: "Your name, work email, company, role and country, and your phone number if you give one. Your answers about the decision, the systems you run and the times that suit you.",
      },
      {
        title: "Why we collect it",
        text: "To arrange your audit, prepare for it and follow up about it. We do not use it for anything else.",
      },
      {
        title: "Who handles it",
        text: "The form sends your request to our team by email or through a web hook we set up. We do not sell it.",
      },
      {
        title: "How long we keep it",
        text: "Until your audit and any follow-up are complete, unless you ask us to delete it sooner.",
      },
      {
        title: "Cookies",
        text: "This site sets no cookies and runs no analytics. Your browser keeps one setting for this visit, so the intro plays once.",
      },
      {
        title: "Your rights",
        text: "You can ask to see, correct or delete your details at any time.",
      },
    ],
    /** How to reach us: the email when CONTACT_EMAIL is set. Without one, only what holds whether or not a
     *  delivery channel is configured (a request may end in the download fallback, with no email sent). */
    contact: (email?: string) =>
      email
        ? `Email ${email} with any question about your data.`
        : "Contact details will be added here before launch. If we have emailed you about an audit, you can reply to that email.",
  },
  terms: {
    title: "Terms of use",
    lead: "These terms are being prepared.",
    draft: "This page is a draft. The final text will name who we are and how to reach us.",
    /** confirm: the owner replaces these with the legal terms before launch. */
    sections: [
      {
        title: "The examples on this site",
        text: "The figures in the story, the applications and the outcomes describe an illustrative scenario. They are not results from a client.",
      },
      {
        title: "The free AI audit",
        text: "The audit is free and carries no commitment. Any work after it is agreed in a separate statement of work.",
      },
    ],
  },
} as const;

/* ------------------------------------------------------------------ */
/* Service pages: shared section copy (app/solutions/[slug]); per-area copy is in lib/areas.ts */
/* ------------------------------------------------------------------ */

export const SERVICE = {
  breadcrumb: "Solutions",
  expect: "What to expect",
  apps: (area: string) => `Solutions in ${area}`,
  get: "What you get",
  how: "How it works",
  why: "Why Decignal",
  example: "Illustrative example",
  exampleNote: "Results are measured against your own baseline.",
  faq: "Questions",
  seeApps: (n: number) => (n === 1 ? "See the application" : "See the applications"),
  ctaBand: {
    headline: ["Bring one decision.", "Leave with a plan."] as Headline,
    sub: (area: string) => `Free 30-minute AI audit on your ${area.toLowerCase()} decision. No commitment.`,
    button: CTA.primary,
  },
  /** Page title suffix comes from the root layout template. */
  others: "Other areas",
} as const;

/* ------------------------------------------------------------------ */
/* Text drawn in the 3D world and the evidence drawer. Owners: the 3D lane (faces.ts, buildings.tsx,
/* OperationalScenes.tsx) and the editorial lane (OperationEvidence.tsx). Check fit at DPR 2.           */
/* ------------------------------------------------------------------ */

export const FACES = {
  /** faces.ts decision(): the line under the buttons. No vendor names (D8). */
  decisionFoot: "Creates a transfer order in your ERP",
  /** faces.ts layer k = 3 (Policy) checklist. */
  policyChecks: ["Max 300 units per transfer", "Plant 02 stays at plan", "Planner approval required"],
  /** faces.ts finance function ledger rows: [invoice, amount, held]. */
  ledger: [
    [APP_FACTS.finance.matched[0], inrShort(APP_FACTS.finance.matched[1]), false],
    ...APP_FACTS.finance.held.map(([id, , n]) => [id, inrShort(n), true] as const),
  ] as readonly (readonly [string, string, boolean])[],
  /** faces.ts hand faces: the status every function card in Scale's hand ends on. */
  ready: "Ready for approval",
  /** faces.ts hand art: each card's evidence graphic, headed by a label and its figure (functions in
   *  order, then the glass layer card). */
  art: {
    labels: ["Stock", "Vibration", "Allocation", "Cases", "Invoices", "Functions"],
    figures: [
      `${EXAMPLE.transfer.units} units`,
      APP_FACTS.maintenance.peak,
      `${APP_FACTS.sales.shiftPct}% to ${APP_FACTS.sales.region}`,
      "1 cause",
      `${APP_FACTS.finance.held.length} held`,
      "5",
    ],
    limit: "Limit",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    regions: ["North", "West", "South", "East"],
    layer: "Context · Policy · Approval",
  },
  /** faces.ts glass(): the layer card dealt last onto Scale's hand, over every function. */
  layer: {
    title: "One layer",
    body: "Shared context and controls under every function.",
    foot: "Every function",
  },
  /** faces.ts final(): the lead-magnet face (D1). */
  final: {
    title: "Bring one decision. Leave with a plan.",
    pill: "Free AI audit · 30 minutes",
  },
  /** buildings.tsx bearing crate stencil. */
  crate: APP_FACTS.crate,
} as const;

/** OperationEvidence.tsx and OperationalScenes.tsx labels that carry scenario IDs and figures (COPY-01..03). */
export const EVIDENCE_LABELS = {
  stages: ["Signal detected", "Evidence connected", "Action prepared"],
  safety: "SAFETY STOCK · 175",
  today: `TODAY · ${P1.onHand}`,
  day6With: `DAY 6 · ${P1.day6With} (RESTORED)`,
  day6Without: `DAY 6 · ${P1.day6Without} (SHORTFALL)`,
  productionOrder: `ORDER ${APP_FACTS.production.order}`,
  tooling: `${APP_FACTS.production.order}: TOOLING CHECKED ON LINE 02`,
  workOrder: `WORK ORDER ${APP_FACTS.maintenance.workOrder}`,
  cases: "14 SERVICE CASES",
  /** Ledger rows: [invoice · vendor, amount]. Vendors are numbered, never company names. */
  ledger: APP_FACTS.finance.held.map(([id, vendor, n]) => [`${id} · ${vendor.toUpperCase()}`, inr(n)] as const),
  heldTotal: `${inr(APP_FACTS.finance.heldTotal)} HELD UNTIL GOODS ARRIVE`,
} as const;
