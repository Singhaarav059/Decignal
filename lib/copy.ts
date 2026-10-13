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
  /** Sticky phone pill or dock. */
  pill: "Book a free AI audit · 30 min",
  href: "#audit",
  /** Secondary text links to the service pages (AreaStack, footer, ScaleApps, apps index). */
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
  /** The same words as one sentence, wherever the h1 needs plain text. */
  h1: "Your operation, seen as a whole.",
  /** The hero StoryCard: label row, one body line, the chips, the CTA. No second headline (D14). */
  card: "Six systems, one shortage. Watch it become one approved decision.",
  scrollCue: "Scroll",
} as const;

export type ChapterCopy = {
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
  /** IslandPanel: "Source 03 / 06". */
  source: (n: number, total = 6) => `Source ${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
  synced: (time: string) => `Synced ${time}`,
  readFor: "Read for this decision",
  close: "Close",
} as const;

/** 08 Industries (Story.tsx headline, IndustryDetail.tsx card). */
export const INDUSTRY = {
  title: (name: string) => ["Built for", `${name}.`] as Headline,
  challenge: "The challenge",
  /** Was "Decisions Decignal makes": Decignal recommends, people decide (COPY-03). */
  decisions: "What Decignal recommends",
  connects: "Connects",
  start: "Typical start",
  startLink: (app: string, weeks: string) => `Typical start: ${app} · ${weeks} weeks`,
  indexAria: "Industries",
} as const;

/** 09 Decide (D1 Option A): the 3D world, the giant headline, one line, the CTA pair and the example card. */
export const FINAL = {
  label: "09 · Decide",
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
  sections: [
    ["applications", "Applications"],
    ["outcomes", "Outcomes"],
    ["how", "How it works"],
    ["faq", "FAQ"],
    ["audit", "Free AI audit"],
  ],
  logoAria: "Decignal, back to top",
  menuOpen: "Open menu",
  menuClose: "Close menu",
  /** NavPeek PEEKS blurbs: the glance side card and the phone menu. */
  blurbs: {
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
  faqSide: {
    label: "Free AI audit",
    blurb: "Three decisions ranked, in 30 minutes. Free.",
    all: (n: number) => `All ${n} questions`,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Editorial sections (Editorial.tsx, SystemsRibbon.tsx, GrowlioSections.tsx) */
/* ------------------------------------------------------------------ */

/** The systems strip (E10, COPY-10, D8): system types from CONNECTS in lib/content.ts. */
export const SYSTEMS_STRIP = {
  eyebrow: "Works with what you run",
  headline: ["Keep your systems.", "We read across them."] as Headline,
  /** The three promises, folded into one line (COPY-10). */
  sub: "Read-only to start. No migration, no new data lake.",
  /** One quiet line after the six coloured types; the neutral list is CONNECTS_MORE. */
  more: "Also reads TMS, CMMS, SCADA, QMS, POS, DMS, service desks, data warehouses and spreadsheets.",
  footnote: "The audit confirms how we connect to the systems you run.",
  /** The example feed card on the ribbon (COPY-01 3): no live counter. */
  card: {
    badge: "Example feed",
    recommended: "Recommended",
    decision: T.text,
    status: "Awaiting approval",
  },
} as const;

/** Applications section and explorer (Editorial.tsx, ApplicationExplorer.tsx). */
export const APPLICATIONS_COPY = {
  eyebrow: "Applications",
  headline: ["Eight applications.", "Five business areas."] as Headline,
  intro: "From the first signal to the right action. Follow the decisions as you scroll.",
  indexAria: "Jump to a business area",
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

/** The facts band under the outcome card (E05 GlanceList). No "0" figure (NAV-15), no readiness claim (COPY-09). */
export const GLANCE = [
  { n: "Read-only", label: "to start", text: "Decignal reads the ERP, MES, CRM and WMS you already run. Nothing is replaced.", tone: "cobalt" },
  { n: "4 to 8", label: "weeks to a first release", text: "From the catalogue. A custom application takes 6 to 12 weeks.", tone: "emerald" },
  { n: "8", label: "applications in the catalogue", text: "Inventory to finance, each fitted to your systems and policies.", tone: "saffron" },
  { n: "5", label: "business areas", text: "Supply chain, operations, commercial, customer, finance and risk.", tone: "violet" },
  { n: "1", label: "named approver per action", text: "Human approval can always be required. You set roles and thresholds.", tone: "tangerine" },
] as const;

/** How it works (Editorial.tsx, GrowlioSections.tsx Roadmap). Routes and steps are PATHS in lib/content.ts. */
export const HOW = {
  eyebrow: "How it works",
  headline: ["One decision first.", "Then build from there."] as Headline,
  intro: "Two routes to production: build around your operation, or start from the catalogue.",
  routeAria: "Route",
  youGet: "You get",
  /** "Days 14 to 30 · 6 to 12 weeks in total" (E07). Takes PATHS[route].total as is and keeps its "N to M weeks". */
  stepLabel: (when: string, total: string) => `${when} · ${total.match(/^\d+ to \d+ weeks/)?.[0] ?? total} in total`,
  /** What each step delivers, index-aligned with PATHS[route].steps (GrowlioSections DELIVERS). */
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
  /** The three steps of the form: progress reads "01 / 03 · About you". */
  steps: ["About you", "Your decision", "Pick your times"],
  progress: (n: number, total = 3) => `0${n} / 0${total}`,
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
  edit: "Edit your answers",
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
    { label: "Applications", href: "#applications", blurb: "Eight applications across five business areas" },
    { label: "Outcomes", href: "#outcomes", blurb: "Three example decisions and what they change" },
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

/** app/not-found.tsx and app/error.tsx (COPY-19). */
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
  error: {
    eyebrow: "Error",
    headline: ["Something went wrong.", "On our side, not yours."] as Headline,
    body: "Try again in a moment. If it keeps happening, reload the page.",
    /** When CONTACT_EMAIL is set. */
    bodyWithEmail: (email: string) => `Try again. If it keeps happening, email ${email}.`,
    retry: "Try again",
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
  apps: (area: string) => `Applications in ${area}`,
  get: "What you get",
  how: "How it works",
  why: "Why Decignal",
  example: "Illustrative example",
  exampleNote: "Results are measured against your own baseline.",
  faq: "Questions",
  seeExample: "See the example",
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
  /** faces.ts customer function face: "14 cases, one cause:" then the part. */
  casesCause: ["cases, one cause:", EXAMPLE.part],
  /** faces.ts finance function ledger rows: [invoice, amount, held]. */
  ledger: [
    [APP_FACTS.finance.matched[0], inrShort(APP_FACTS.finance.matched[1]), false],
    ...APP_FACTS.finance.held.map(([id, , n]) => [id, inrShort(n), true] as const),
  ] as readonly (readonly [string, string, boolean])[],
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
  arrival: "DAY 2 (ARRIVAL)",
  day6With: `DAY 6 · ${P1.day6With} (RESTORED)`,
  day6Without: `DAY 6 · ${P1.day6Without} (SHORTFALL)`,
  productionOrder: `ORDER ${APP_FACTS.production.order}`,
  tooling: `${APP_FACTS.production.order}: TOOLING CHECKED ON LINE 02`,
  workOrder: `WORK ORDER ${APP_FACTS.maintenance.workOrder}`,
  cases: "14 SERVICE CASES",
  casesLink: "One part links all 14 service cases",
  /** Ledger rows: [invoice · vendor, amount]. Vendors are numbered, never company names. */
  ledger: APP_FACTS.finance.held.map(([id, vendor, n]) => [`${id} · ${vendor.toUpperCase()}`, inr(n)] as const),
  heldTotal: `${inr(APP_FACTS.finance.heldTotal)} HELD UNTIL GOODS ARRIVE`,
} as const;
