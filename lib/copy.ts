// The copy deck: every section and chapter string, keyed by slot (handoff 15 October 2026, §3 to §10).
// Component lanes wire these in; each slot's comment names the component that renders it.
// Rules for every string here:
// - No em dashes. Curly apostrophes. Indian English.
// - Headlines are [line1, line2]; line 2 is the accent line in the chapter tone.
// - Body copy runs at most 2 lines on a screen.
// - One booking wording: CTA.primary, always to /#audit.
// - The six applications are proposed workflows. Figures about the worked example come from
//   lib/example.ts and read as illustrative, never as a result. Nothing is approved, sent or posted.
// - Product names (SAP, Tally, Zoho) are prospect context only: no partner or connector claims.
// Data lives elsewhere: workflows, audience, delivery, FAQ and record sources in lib/content.ts, the five
// functions in lib/areas.ts, the explorer scenarios in lib/application-demos.ts, the island panels in
// components/ui/systems.tsx, form messages and request states in lib/audit.ts (AUDIT_COPY), identity
// facts in lib/placeholders.ts.

import { APP_FACTS, EXAMPLE, checklistCounts, inr, inrShort } from "./example";
import { PLACEHOLDER } from "./placeholders";

export type Headline = readonly [string, string];

const L = EXAMPLE.line;
const C = EXAMPLE.cert;
const PC = EXAMPLE.process;
const COUNTS = checklistCounts();
const ITEMS = EXAMPLE.checklist.items.length;

/* ------------------------------------------------------------------ */
/* Calls to action (handoff global)                                     */
/* ------------------------------------------------------------------ */

export const CTA = {
  /** Every primary button: Nav, hero, final chapter, FAQ, footer, service pages. With an arrow. */
  primary: "Book a workflow review",
  /** Nav under 640px and other tight spaces (handoff global.mobile_primary_cta). */
  compact: "Book a call",
  href: "/#audit",
  /** Secondary text links to the service pages (AreaRows, footer, ScaleApps, directory). */
  explore: (area: string) => `Explore ${/^[A-Z][a-z]/.test(area) ? area[0].toLowerCase() + area.slice(1) : area}`,
  /** Final chapter secondary button. */
  applications: "Explore the workflows",
  /** Per-workflow call to action (handoff workflows[].cta). */
  workflow: "Discuss this workflow",
} as const;

/* ------------------------------------------------------------------ */
/* Metadata (handoff §10). lib/site.ts owns the constants; these are the words. */
/* ------------------------------------------------------------------ */

export const META = {
  /** SITE_TITLE: the homepage's browser and social title. */
  title: "Decignal | AI for Manufacturing Distribution and Service",
  /** SITE_DESCRIPTION. */
  description:
    "Custom AI applications for Indian manufacturers, industrial distributors and equipment service businesses. Start with a review of your existing workflow.",
  /** openGraph and twitter title. */
  shareTitle: "Decignal | AI for Manufacturing Distribution and Service",
  /** SHARE_DESCRIPTION. */
  shareDescription:
    "Custom AI applications for Indian manufacturers, industrial distributors and equipment service businesses. Start with a review of your existing workflow.",
  /** OG image footer line (opengraph-image.tsx); its two headline lines are HERO.headline. */
  ogFooter: "For Indian manufacturers, industrial distributors and equipment service businesses.",
  solutions: {
    title: "Operational Workflows to Assess | Decignal",
    description:
      "Explore proposed workflows for manufacturing, industrial distribution and equipment service, with customer fit and existing-software checks.",
  },
  privacy: {
    title: "Privacy Notice | Decignal",
    description: "Read how the Decignal website handles enquiry information and how to contact the operator with privacy questions.",
  },
  terms: {
    title: "Website Terms | Decignal",
    description: "Read the terms for using the Decignal website and how proposed workflows relate to separately scoped project services.",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Story: hero and chapters (Story.tsx, StoryCard.tsx)                  */
/* ------------------------------------------------------------------ */

/** The quiet label in the StoryCard label row, on every chapter. */
export const EXAMPLE_LABEL = EXAMPLE.label;

/** 01: the hero (handoff home.hero). */
export const HERO = {
  /** Story.tsx back layer, above the headline: two halves split by " · ". */
  eyebrow: "For Indian industrial businesses · Manufacturing, distribution, service",
  /** The page h1. Suggested break: AI applications / for industrial operations. */
  headline: ["AI applications", "for industrial operations"] as Headline,
  /** Phones: the audience sentence on the hero card, under the heading (handoff: on desktop and mobile). */
  audience: "For Indian manufacturers, industrial distributors and equipment service businesses.",
  /** The hero's right column: the full audience sentence. */
  lede: "For Indian manufacturers, industrial distributors and equipment service businesses. We build around the supplier updates, sales enquiries, dispatch documents and service follow-ups your team still handles manually.",
  /** The quiet second action beside the CTA. */
  secondary: "Explore the workflows",
  secondaryHref: "/solutions",
  /** Under the actions: the offer, then the scroll cue. */
  card: "A free 30-minute conversation about one workflow.",
  /** The caption under the world on the first screen (handoff home.hero visual caption). */
  caption: "Illustrative dispatch review · source records and questions for your team",
  scrollCue: "Scroll",
} as const;

type ChapterCopy = {
  /** Two lines, line 2 in the chapter tone; red only when the line states a conflict. */
  title: Headline;
  /** At most 2 lines in the 440px card (95 characters or fewer). */
  body: string;
  /** The one readout under the body: a figure and what it counts. */
  readout?: { value: string; label: string; risk?: boolean };
  /** Rows revealed by the card's "Details" disclosure. */
  details?: { label: string; value: string; risk?: boolean }[];
};

/**
 * Chapters 02 to 09, index-aligned with CHAPTERS in lib/story.ts (index 0 is the hero, above). The
 * story is one illustrative dispatch review (handoff home.example), then the same approach across
 * the five functions and the industries in focus.
 */
export const CHAPTER_COPY: (ChapterCopy | null)[] = [
  null,
  {
    title: ["A shipment is ready.", "One pack to check."],
    body: `${EXAMPLE.shipment.id} has ${EXAMPLE.shipment.lines} delivery lines. Line ${L.n} is recorded against heat ${L.heat}.`,
    readout: { value: `${ITEMS} documents`, label: `Required by checklist ${EXAMPLE.checklist.rev}` },
    details: [
      { label: "Shipment", value: EXAMPLE.shipment.id },
      { label: `Line ${L.n}`, value: `${L.item} · ${L.pieces} pieces` },
      { label: "Heat on record", value: L.heat },
    ],
  },
  {
    title: ["Two records disagree.", "One is missing."],
    body: `The certificate supplied says heat ${C.heat}. The ${PC.kind.toLowerCase()} is not in the supplied files.`,
    readout: { value: `${L.heat} ≠ ${C.heat}`, label: "Conflicting reference", risk: true },
    details: [
      { label: "Delivery line", value: L.heat },
      { label: C.kind, value: C.heat, risk: true },
      { label: PC.kind, value: "Not found", risk: true },
    ],
  },
  {
    title: ["Every record.", "One review."],
    body: "Six sources, checked against the customer’s checklist. Select one to see the record it adds.",
  },
  {
    title: ["Flag the mismatch.", "Change nothing."],
    body: `Request the correct certificate. Line ${L.n} stays marked for review; neither heat number is edited.`,
    readout: { value: `${EXAMPLE.questions.length} questions`, label: "For the quality reviewer" },
    details: [
      { label: "Supported", value: `${COUNTS.supported} of ${ITEMS}` },
      { label: "Conflicting", value: `${COUNTS.conflicting}`, risk: true },
      { label: "Missing", value: `${COUNTS.missing}`, risk: true },
    ],
  },
  {
    title: ["Your reviewer", "decides."],
    body: "Check each source, request what is missing or record why it is not an issue. Dispatch stays with your team.",
  },
  {
    title: ["Same approach.", "Five functions."],
    body: "Supplier updates, dispatch documents, RFQs, service follow-ups and deductions: each a proposed workflow.",
  },
  {
    // Line 2 is the industry name: INDUSTRY.title(name).
    title: ["Built for", "your industry."],
    body: "Proposed workflows for manufacturers, industrial distributors and equipment service businesses.",
  },
  {
    // 09 uses the giant display headline and FINAL below.
    title: ["Tell us which workflow", "needs attention."],
    body: "We check how it is handled today and whether your existing software can address it.",
  },
];

/**
 * The chapter heads on wide screens (ChapterHeads.tsx): three figures beside each chapter's headline.
 * Each names the record source it comes from and takes that source's tone; `risk` turns it red.
 * Sources match CONNECTS (lib/content.ts): ERP cobalt, Customer violet, Quality emerald, Job work saffron,
 * Suppliers tangerine, Files pink.
 */
type ChapterFact = { value: string; unit?: string; label: string; source: string; tone: string; risk?: boolean };
export const CHAPTER_FACTS: (ChapterFact[] | null)[] = [
  null,
  [
    { value: `${EXAMPLE.shipment.lines}`, unit: "lines", label: `Shipment ${EXAMPLE.shipment.id}`, source: "ERP", tone: "cobalt" },
    { value: L.heat, label: `Heat recorded on line ${L.n}`, source: "ERP", tone: "cobalt" },
    { value: `${ITEMS}`, unit: "documents", label: `Checklist ${EXAMPLE.checklist.rev}`, source: "Customer", tone: "violet" },
  ],
  [
    { value: C.heat, label: `On the ${C.kind.toLowerCase()}`, source: "Suppliers", tone: "signal", risk: true },
    { value: "Not found", label: PC.kind, source: "Job work", tone: "signal", risk: true },
    { value: `${EXAMPLE.files}`, unit: "files", label: "In the shipment folder", source: "Files", tone: "pink" },
  ],
  [
    { value: "6", unit: "sources", label: "Read from authorised exports", source: "All six", tone: "cobalt" },
    { value: `${COUNTS.supported}`, unit: `of ${ITEMS}`, label: "Checklist items supported", source: "Quality", tone: "emerald" },
    { value: `${COUNTS.conflicting + COUNTS.missing}`, unit: "items", label: "Missing or conflicting", source: "Customer", tone: "signal", risk: true },
  ],
  [
    { value: `${COUNTS.conflicting}`, unit: "conflict", label: `Line ${L.n}, ${L.heat} against ${C.heat}`, source: "Suppliers", tone: "tangerine" },
    { value: `${COUNTS.missing}`, unit: "missing", label: PC.kind, source: "Job work", tone: "saffron" },
    { value: "0", unit: "edits", label: "Neither record is changed", source: "Example", tone: "cobalt" },
  ],
  [
    { value: "1", unit: "reviewer", label: "Owns the pack", source: "Quality", tone: "emerald" },
    { value: `${EXAMPLE.questions.length}`, unit: "questions", label: "Left open for the reviewer", source: "Example", tone: "violet" },
    { value: "Draft", label: "Dispatch has not been approved", source: "Example", tone: "cobalt" },
  ],
  [
    { value: "5", unit: "functions", label: "Supplier to service", source: "Proposed", tone: "emerald" },
    { value: "6", unit: "workflows", label: "Proposed, not yet products", source: "Proposed", tone: "violet" },
    { value: "1", unit: "check", label: "Your current software first", source: "Approach", tone: "cobalt" },
  ],
  [
    { value: "3", unit: "segments", label: "Manufacturing, distribution, service", source: "Focus", tone: "cobalt" },
    { value: "1", unit: "workflow", label: "To start with, in any of them", source: "Review", tone: "emerald" },
    { value: "30", unit: "minutes", label: "Free first conversation", source: "Review", tone: "tangerine" },
  ],
  null,
];

/** 02 Signal readout card (Story.tsx SignalReadout): its accessible summary. */
export const SIGNAL_ARIA = `Shipment ${EXAMPLE.shipment.id}, line ${L.n}: recorded against heat ${L.heat}; ${ITEMS} documents required by the customer checklist`;

/** 04 Context: the three checks, each linked to its island (Story.tsx EvidenceChecks). `island` is the SYSTEMS index. */
export const EVIDENCE_CHECKS = {
  aria: "Records behind this review",
  rows: [
    { tone: "saffron", label: PC.kind, value: "Not found", island: 3, system: "Job work" },
    { tone: "tangerine", label: C.kind, value: `Heat ${C.heat} · conflicting`, island: 4, system: "Suppliers" },
    { tone: "pink", label: "Shipment folder", value: `${EXAMPLE.files} files supplied`, island: 5, system: "Files" },
  ],
  /** Accessible name per row. */
  rowAria: (label: string, value: string, system: string) => `${label}: ${value}. From ${system}. Open its record.`,
} as const;

/** 05 Decision: the review's progress (Story.tsx Stepper). Ends with the reviewer, never "approved". */
export const STEPPER = ["Assembled", "Matched", "Flagged", "Questions", "Reviewer"] as const;

/** 06 Control: the reviewer's panel (DecisionControls.tsx). Nothing is approved; the reviewer decides. */
export const CONTROL = {
  eyebrow: "Interactive example",
  title: `Line ${L.n} · heat ${L.heat}`,
  side: `Checklist ${EXAMPLE.checklist.rev}`,
  balanceAria: (ok: number, open: number) => `${ok} checklist items supported; ${open} left for review`,
  supported: "Supported",
  open: "For review",
  ofItems: `of ${ITEMS}`,
  /** The three choices. */
  request: "Request certificate",
  note: "Add a question",
  dismiss: "Not an issue",
  /** The question choices under "Add a question". */
  notePrompt: "Which question should go with the pack?",
  notes: [`Ask ${C.source} for the heat ${L.heat} certificate`, `Ask ${PC.source} for the ${PC.kind.toLowerCase()}`, "Ask stores to confirm the heat on line 12"],
  cancel: "Cancel",
  dismissPrompt: "Why not? Pick the reason that fits.",
  reasons: ["The ERP entry is wrong", "The customer waived this document", "Another certificate covers it"],
  planLabel: "Review pack",
  /** The chip that travels into the review pack. */
  planChip: (what: string) => what,
  requestChip: `Request · heat ${L.heat} certificate`,
  requestedTitle: `Request drafted for ${C.source}. Line ${L.n} stays marked for review.`,
  notedTitle: (q: string) => `Question added: ${q}.`,
  requestedMeta: `${EXAMPLE.label} · ${EXAMPLE.status}`,
  dismissedTitle: "Recorded as resolved by the reviewer. The reason stays with the pack.",
  dismissedMeta: (reason: string) => `Reason: ${reason}`,
  undo: "Undo",
} as const;

/** 07 Scale: the function card (StoryCard / ScaleApps). */
export const SCALE = {
  apps: (n: number) => `${n} proposed ${n === 1 ? "workflow" : "workflows"}`,
  /** One workflow row: name · status. */
  appRow: (name: string, status: string) => `${name} · ${status}`,
  link: (area: string) => CTA.explore(area),
} as const;

/** Labels and accessible names in the story's DOM (StoryCard, ScaleCard, LayerReadout, ScalePhone,
 *  DecisionControls, IslandPanel). */
export const STORY_UI = {
  details: "Details",
  cardAria: "The story, chapter by chapter",
  functionsAria: "Business functions",
  layers: "Layers behind the review",
  phoneAria: "Proposed workflows by business function",
  /** IslandPanel: "Source 3 of 6". */
  source: (n: number, total = 6) => `Source ${n} of ${total}`,
  /** IslandPanel: what the source holds for this example (no live-sync claim). */
  sample: "Sample record",
  readFor: "Used in this review",
  close: "Close",
} as const;

/** 08 Industries (Story.tsx headline, IndustryDetail.tsx card). */
export const INDUSTRY = {
  title: (name: string) => ["Built for", `${name.toLowerCase()}.`] as Headline,
  decisions: "Where a workflow could help",
  startLink: (app: string) => `Proposed start: ${app}`,
  indexAria: "Industries in focus",
  /** IndustryCallout: the example pinned to the place on wide screens. */
  action: "Illustrative example",
} as const;

/** 09 Final: the 3D world, the giant headline, one line, the CTA pair and the example card. */
export const FINAL = {
  headline: ["Tell us which workflow", "needs attention."] as Headline,
  sub: "Bring a recurring supplier, sales, dispatch, payment or service issue. We will check how it is handled today and whether your existing software can address it.",
  /** Under the primary CTA. */
  ctaNote: "A free 30-minute conversation about one workflow.",
  secondary: CTA.applications,
  /** The StoryCard in this chapter. */
  cardTitle: `${EXAMPLE.label} · ${EXAMPLE.shipment.id}`,
  /** Three facts of the same review. Tone = the source the figure comes from. */
  outcomes: [
    { value: `${COUNTS.supported} of ${ITEMS}`, label: "Checklist items supported", tone: "emerald" },
    { value: `${EXAMPLE.questions.length} questions`, label: "Left for the quality reviewer", tone: "tangerine" },
    { value: "Draft", label: "Dispatch has not been approved", tone: "cobalt" },
  ],
  chipsAria: "The six record sources behind this review",
  /** Before the row of source discs on the card. */
  readFrom: "Records from six sources",
} as const;

/** The nav's story glance (NavPeek CHAPTER_INFO and its groups), index-aligned with CHAPTERS. */
export const STORY_PEEK = {
  title: "The story in nine chapters",
  sub: "One illustrative dispatch review, from a shipment ready to check to questions for the reviewer.",
  chapters: [
    "Records spread across six sources",
    "A shipment ready for review",
    "Two records disagree, one is missing",
    "Every record, checked in one view",
    "The mismatch flagged, nothing changed",
    "The reviewer decides",
    "The same approach, five functions",
    "The industries in focus",
    "Tell us which workflow needs attention",
  ],
  groups: [
    { name: "The problem", from: 0 },
    { name: "The review", from: 3 },
    { name: "Where it applies", from: 6 },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Nav and glances (Nav.tsx, NavPeek.tsx)                               */
/* ------------------------------------------------------------------ */

export const NAV = {
  /** Nav.tsx links: [id or href, label]. Ids are homepage anchors; a leading "/" is a route. */
  sections: [
    ["/solutions", "Workflows"],
    ["who-we-help", "Who we help"],
    ["platform", "Approach"],
    ["how", "How we work"],
  ],
  logoAria: "Decignal, back to top",
  menuOpen: "Open menu",
  menuClose: "Close menu",
  /** NavPeek blurbs: the glance side card and the phone menu. */
  blurbs: {
    audience: "Manufacturers, industrial distributors and equipment service businesses.",
    systems: "The records the proposed workflows use, from authorised exports.",
    platform: "Check what your current software can solve first.",
    trail: "One illustrative dispatch review, line by line.",
    apps: "Six proposed workflows across five business functions.",
    outcomes: "What we measure, agreed against your own baseline.",
    how: "From a real exception to a tested workflow.",
    faq: "What teams ask before they start.",
  },
  /** Glance footers: a short fact. No figure that reads as a result. */
  foot: {
    apps: { figure: "Proposed", label: "workflows, confirmed before a build" },
    outcomes: { figure: "Baseline", label: "agreed for each workflow" },
    how: { label: "Timing confirmed after the review" },
  },
  outcomesEyebrow: "What we measure",
  appsCount: (n: number) => `${n} ${n === 1 ? "workflow" : "workflows"}`,
  /** The Approach glance's side card. */
  platformSide: {
    label: "Our approach",
    blurb: "Your ERP, quality system or specialist software may already support the task. We review that option first.",
  },
  faqSide: {
    label: "Workflow review",
    blurb: "A free 30-minute conversation about one workflow.",
    all: () => "All questions",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Homepage sections (Editorial.tsx and the sections it composes)       */
/* ------------------------------------------------------------------ */

/** Who we help (handoff home.audience): three segment cards. Items are AUDIENCE in lib/content.ts. */
export const AUDIENCE_COPY = {
  eyebrow: "Who we help",
  headline: ["Who we are", "building for"] as Headline,
  intro: "Our initial focus is engineering components, metal products, industrial machinery, electrical equipment and industrial supplies. The right application depends on the records, requirements and existing software in your business.",
  listAria: "Customer segments",
  workflows: "Proposed workflows",
  link: "See the workflows",
  photoAlt: [
    "A machinist checking a machined part on a shop floor",
    "Racks of boxed industrial components in a distributor’s warehouse",
    "A service technician working on an industrial pump",
  ],
} as const;

/** The problem (handoff home.problem): Statement.tsx, the sentence that sharpens as it scrolls. */
export const STATEMENT = {
  eyebrow: "The problem",
  headline: "A recorded transaction can still leave work unfinished",
  text: "A shipment needs certificates from several suppliers. A distributor finds different specifications in a customer enquiry and supplier offer. A service recommendation remains in a report without an owner.",
  closing: "The task is to gather the records and resolve what still needs attention. We look for a recurring problem with a clear owner and a practical way to measure improvement.",
  reviewerAlt: "A quality reviewer checking documents at a desk",
  /** The review card's trail (Statement.tsx bento): the worked example, minute by minute. */
  log: [
    { t: "09:41", text: "Pack assembled from 11 files", tone: "cobalt" },
    { t: "09:42", text: `Line ${L.n}: ${L.heat} against ${C.heat} flagged`, tone: "signal" },
    { t: "09:44", text: "Two questions sent to the reviewer", tone: "emerald" },
  ],
} as const;

/** Our approach (handoff home.approach, #platform): the bento under the problem. */
export const APPROACH = {
  eyebrow: "Our approach",
  headline: ["Check what your current", "software can solve first"] as Headline,
  intro: "Your ERP, quality system or specialist software may already support the task. We review that option before proposing another application.",
  items: [
    { k: "Look", title: "Look at a real example", text: "Follow the records, the exception and the work needed to resolve it. Identify where the existing workflow falls short.", tone: "cobalt" },
    { k: "Define", title: "Define the application around the gap", text: "Agree the inputs, output, customer requirements and reviewer. Keep transaction records in the systems that already own them.", tone: "emerald" },
    { k: "Test", title: "Test against the current process", text: "Compare complete tasks, including corrections and review time. Use source references so your team can check each result.", tone: "saffron" },
    { k: "Agree", title: "Agree responsibility after launch", text: "Set who handles changing document formats, business rules and support before the application goes live.", tone: "violet" },
  ],
  functions: "Five business functions",
  functionsText: "Where the proposed workflows operate. Customer fit is shown on each one.",
} as const;

/** The directory (handoff §5, /solutions). */
export const SOLUTIONS_INDEX = {
  eyebrow: "What we build",
  headline: ["Workflows to assess against", "your current setup"] as Headline,
  body: "Explore proposed workflows for manufacturers, industrial distributors and equipment service businesses. Select a recurring task, check the relevant records and compare the proposed application with what your existing software can do.",
  status: "Proposed workflows for assessment. No availability or outcome is implied.",
  audienceTitle: "Who each workflow is for",
  functionsTitle: "Business functions",
  workflowsTitle: "All six proposed workflows",
  audienceNote: "Supplier coordination, dispatch, RFQ review, service follow-up and deduction review are business functions. Customer fit is shown on each workflow; job-work reconciliation is specific to manufacturers using external processing.",
  closingHeading: "Start with evidence of the problem",
  closingBody: "Bring a recent example, explain what your existing system does and show what still has to happen outside it.",
} as const;

/** Record sources (handoff home.systems, #systems): the ring of six sources from CONNECTS. */
export const SYSTEMS_STRIP = {
  eyebrow: "Your existing setup",
  headline: ["Use the relevant records", "from your existing setup"] as Headline,
  /** The three notes as chips in the glass panel (SystemsRing). */
  promises: ["Authorised exports first", "Sample documents to start", "Access confirmed before any connection"],
  footnote: "A first assessment can use authorised exports and sample documents. We confirm the access method and integration work before promising a live connection.",
  /** The three record groups (handoff home.systems.groups). */
  groups: [
    {
      name: "ERP and accounting records",
      text: "Delivery lines, material movements, purchase orders, invoices and receipts. Tell us the product, version and modules you use, including SAP or TallyPrime where relevant.",
      tone: "cobalt",
    },
    {
      name: "Quality and supplier documents",
      text: "Customer checklists, material certificates, process certificates, job-work challans and supplier statements.",
      tone: "emerald",
    },
    {
      name: "Commercial and service records",
      text: "Customer enquiries, supplier offers and datasheets, deduction advices and authorised service reports, together with the order, equipment and contract records needed to review them.",
      tone: "violet",
    },
  ],
  note: "System names describe inputs we can assess. They do not imply a native connector or partnership.",
} as const;

/** Workflows section and explorer (Editorial.tsx, ApplicationExplorer.tsx; handoff home.examples_intro). */
export const APPLICATIONS_COPY = {
  eyebrow: "Workflows to assess",
  headline: ["Examples from dispatch,", "distribution and service"] as Headline,
  intro: "Explore a dispatch document review, a distributor’s RFQ clarification and a service-report handover. Each proposed application starts with sample records and a check against your existing software.",
  note: "Proposed workflows. Scope and availability are confirmed before a build.",
  all: "See all six proposed workflows",
  chaptersAria: "Proposed workflows",
  stages: ["Situation", "Source records", "For review"],
  stageLabels: ["Situation", "Source records", "For review"],
  showEvidence: "View source records",
  hideEvidence: "Hide source records",
  sources: "Records needed",
  /** The explorer's one honesty label. */
  example: "Illustrative example",
  /** The full list of workflows (Editorial.tsx). */
  listAria: "All six proposed workflows",
  /** Shared workflow-card labels (handoff global.shared_labels). */
  labels: {
    data: "Data needed",
    output: "Proposed output",
    owner: "Who reviews it",
    measure: "What to measure",
    fit: "Customer fit",
    limitation: "Scope note",
  },
} as const;

/** The worked example (handoff home.example, #example, kept at #trail): the review, step by step. */
export const TRAIL = {
  label: "Illustrative review",
  headline: ["A dispatch pack with", "one mismatch left to resolve"] as Headline,
  intro: "A quality reviewer is preparing the documents for a shipment. The pack needs to match the customer’s approved checklist and the actual delivery lines.",
  /** The dial's last turn: back with the reviewer. */
  loop: { k: "Reviewer", name: "Your team decides", ex: "The quality team checks the documents and decides whether the pack is acceptable." },
  aria: "How the review moves: checklist, delivery line, certificate, process certificate, conflict, questions, reviewer",
  groups: ["Situation", "Source records", "For review"],
  steps: [
    { step: "Checklist", ex: `Customer checklist ${EXAMPLE.checklist.rev}: ${ITEMS} documents per shipment`, tone: "violet", group: 0 },
    { step: "Delivery line", ex: `Line ${L.n}: material recorded against heat ${L.heat}`, tone: "cobalt", group: 0 },
    { step: "Certificate", ex: `Certificate supplied: heat ${C.heat}`, tone: "tangerine", group: 1 },
    { step: "Process", ex: `${PC.kind}: not found in the supplied files`, tone: "saffron", group: 1 },
    { step: "Conflict", ex: `${L.heat} and ${C.heat} kept side by side; neither is corrected`, tone: "signal", group: 2 },
    { step: "Questions", ex: "Request the correct certificate and the missing process certificate", tone: "emerald", group: 2 },
    { step: "Reviewer", ex: EXAMPLE.status, tone: "pink", group: 2 },
  ],
  /** The readable three-row review (handoff: delivery reference, supplied document, status). */
  table: {
    aria: "Illustrative dispatch review",
    head: ["Delivery reference", "Supplied document", "Status"],
    rows: [
      { ref: `Line ${L.n} · heat ${L.heat}`, doc: `${C.kind} · heat ${C.heat}`, status: "Conflicting reference", risk: true },
      { ref: `Line ${L.n} · heat ${L.heat}`, doc: PC.kind, status: "Document not found", risk: true },
      { ref: `Line ${L.n} · ${L.item}`, doc: "Dimensional report", status: "Supported", risk: false },
    ],
  },
  recommendation: "Review the heat-number mismatch and request the missing process certificate before approving the document pack.",
  explanation: "The application would prepare the evidence index and highlight what needs attention. The quality team checks the documents and decides whether the pack is acceptable.",
  review: EXAMPLE.status,
  disclaimer: "Illustrative records. This example shows the proposed output, not a completed customer project.",
} as const;

/** What we measure (handoff home.delivery.measurement, kept at #outcomes). */
export const OUTCOMES_COPY = {
  eyebrow: "What we measure",
  headline: ["Agree a baseline", "before anything is built"] as Headline,
  intro: "Agree a baseline for the selected workflow: time to prepare a dispatch pack, clarify an RFQ, reconcile a job-work difference, review a deduction or assign a service follow-up.",
  note: "Measure corrections and missed requirements as well as speed. Publish customer results only after they are verified.",
  measures: [
    { k: "Time", text: "Preparation and review time for the complete task, including corrections and source retrieval.", tone: "cobalt" },
    { k: "Accuracy", text: "Missed requirements, critical mismatches found and unnecessary flags for the reviewer.", tone: "emerald" },
    { k: "Rework", text: "Corrections the reviewer makes and documents that have to be requested again.", tone: "tangerine" },
  ],
} as const;

/** How we work (Editorial.tsx, HowSteps.tsx; handoff home.delivery). Steps are PATHS in lib/content.ts. */
export const HOW = {
  eyebrow: "How we work",
  headline: ["From a real exception", "to a tested workflow"] as Headline,
  intro: "One sequence: review, scope, test and launch with an owner.",
  routeAria: "From a real exception to a tested workflow",
  /** Each colour sheet's head (HowSteps.tsx): its place in the order, in words rather than numerals. */
  stepWords: ["First.", "Second.", "Third.", "Then."],
  youGet: "Deliverable",
} as const;

/** About (handoff home.about, #about). Founder details are placeholders until supplied. */
export const ABOUT = {
  eyebrow: "About Decignal",
  headline: ["Built for the work", "around your systems"] as Headline,
  body: "We are building Decignal for Indian manufacturers, industrial distributors and equipment service businesses. Our focus is the operational work that still requires people to gather documents and resolve exceptions around their existing systems.",
  second: "We start with a real workflow and the software already in place. A custom application is useful only when it improves a task that matters to the business.",
  cta: "Talk to us about your workflow",
  founder: PLACEHOLDER.founder,
  founderLabel: "Founder",
  linkedin: "LinkedIn profile",
} as const;

/** FAQ (Editorial.tsx). Questions are FAQ in lib/content.ts, topics FAQ_TOPICS. */
export const FAQ_COPY = {
  eyebrow: "Questions",
  headline: ["Questions", "before you start"] as Headline,
  helpTitle: "Still have a question?",
  helpText: "Bring it to your free 30-minute workflow review.",
  /** The one text link to the enquiry, with an arrow. */
  helpLink: "Ask it on the call",
} as const;

/* ------------------------------------------------------------------ */
/* The enquiry (Audit.tsx; handoff §8). Field messages and request states: lib/audit.ts. */
/* ------------------------------------------------------------------ */

export const AUDIT = {
  eyebrow: "Start with a conversation",
  headline: ["Talk through one workflow", "with us"] as Headline,
  intro: "Tell us about one recurring workflow, the records involved and what your current software already does. We will use a 30-minute call to assess whether there is a gap worth investigating.",
  /** Facts row (dl). */
  facts: [
    { k: "Cost", v: "Free introductory call" },
    { k: "Length", v: "30 minutes" },
    { k: "Format", v: "Video call" },
    { k: "Booking", v: "Confirmed by email" },
  ],
  nextTitle: "What happens next",
  next: ["Tell us about one workflow", "We email you to arrange a time", "Talk it through for 30 minutes", "A proposal only once the scope is clear"],
  cardTitle: "Request a call",
  expectTitle: "What to expect",
  expectations: "We will discuss the task, the existing software and the evidence needed for a useful assessment. If configuration or an established product appears to fit, we will say so. A build proposal follows only after the scope is understood.",
  fields: {
    name: { label: "Your name", placeholder: "Full name" },
    email: { label: "Work email", placeholder: "you@company.com" },
    company: { label: "Company", placeholder: "Company name" },
    workflow: {
      label: "What would you like to improve",
      placeholder: "For example, checking dispatch certificates, clarifying a supplier offer against a customer enquiry, or following up on a service report.",
    },
    systems: { label: "Systems you use (optional)", placeholder: "For example, TallyPrime, SAP, Zoho, Excel or a custom system." },
  },
  privacyLine: "We will use these details to respond to your enquiry and arrange the call. Read our",
  privacyLink: "Privacy notice",
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
  /** Footer display headline (handoff global.footer). */
  headline: ["Tell us which workflow", "needs attention."] as Headline,
  body: "Bring a recurring supplier, sales, dispatch, payment or service issue. We will check how it is handled today and whether your existing software can address it.",
  navTitle: "Explore",
  /** Explore links (handoff global.footer.groups). */
  nav: [
    { label: "What we build", href: "/solutions", blurb: "Six proposed workflows across five functions" },
    { label: "Who we help", href: "/#who-we-help", blurb: "Manufacturers, distributors and service businesses" },
    { label: "Our approach", href: "/#platform", blurb: "Check your current software first" },
    { label: "How we work", href: "/#how", blurb: "From a real exception to a tested workflow" },
    { label: "Questions", href: "/#faq", blurb: "What teams ask before they start" },
  ],
  companyTitle: "Company",
  company: [
    { label: "About Decignal", href: "/#about" },
    { label: "Contact", href: "/#audit" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
  areasTitle: "Business functions",
  areaCount: (n: number) => `${n} proposed ${n === 1 ? "workflow" : "workflows"}`,
  positioning: "Custom AI applications for Indian manufacturers, industrial distributors and equipment service businesses.",
  identity: PLACEHOLDER.operator,
  copyright: `© 2026 ${PLACEHOLDER.rightsHolder}. All rights reserved.`,
  privacy: "Privacy",
  terms: "Terms",
  contact: (email: string) => email,
  top: "Back to top",
  /** The large decorative wordmark's accessible description. */
  wordmarkAria: "Decignal",
} as const;

/** Loader.tsx positioning line. */
export const LOADER = {
  positioning: "Custom AI applications for industrial operations",
} as const;

/** app/not-found.tsx and the legal pages (handoff §9). */
export const PAGES = {
  notFound: {
    /** Document title (metadata). */
    title: "Page not found",
    eyebrow: "404",
    headline: ["This page is not here.", "Your workflow still is."] as Headline,
    body: "The link may be old or mistyped.",
    home: "Back to the start",
    cta: CTA.primary,
  },
  /** Built from the facts in lib/placeholders.ts; replace those before launch. */
  privacy: {
    title: "Privacy notice",
    lead: `This notice explains how ${PLACEHOLDER.operator} handles personal information submitted through the Decignal website. For questions, contact ${PLACEHOLDER.privacyEmail}.`,
    effective: `Effective ${PLACEHOLDER.effective}`,
    sections: [
      {
        title: "Who operates this website",
        text: `This website is operated by ${PLACEHOLDER.operator}. You can reach us at ${PLACEHOLDER.email}.`,
      },
      {
        title: "Information collected",
        text: "When you send an enquiry we receive your name, work email, company, the workflow you describe and, if you add them, the systems you use. Our host keeps standard request logs. A short-lived setting in your browser stops the introduction from playing twice.",
      },
      {
        title: "How information is used",
        text: "To reply to your enquiry, arrange the call and prepare for it. We do not use enquiry details for anything else and we do not sell them.",
      },
      {
        title: "Services that handle information",
        text: `Enquiries are stored in ${PLACEHOLDER.privacy.formDestination}. The site is hosted on ${PLACEHOLDER.privacy.hosting}. We reply through ${PLACEHOLDER.privacy.email}. ${PLACEHOLDER.privacy.analytics}`,
      },
      {
        title: "Retention and deletion",
        text: `${PLACEHOLDER.privacy.retention} Email ${PLACEHOLDER.privacyEmail} to ask for deletion.`,
      },
      {
        title: "Questions and requests",
        text: `You can ask to see, correct or delete your details by emailing ${PLACEHOLDER.privacyEmail}. We will confirm when the request is complete.`,
      },
      {
        title: "Changes to this notice",
        text: "We publish any update on this page with a new effective date.",
      },
    ],
  },
  terms: {
    title: "Website terms",
    lead: `These terms cover use of the Decignal website operated by ${PLACEHOLDER.operator}. Project services are governed by a separate agreement.`,
    effective: `Effective ${PLACEHOLDER.effective}`,
    sections: [
      {
        title: "Examples on this website",
        text: "The workflows and figures shown on this website are illustrative unless explicitly identified as verified customer results.",
      },
      {
        title: "No guarantee of availability or outcomes",
        text: "Website examples do not guarantee application availability, integration support, delivery dates or business outcomes.",
      },
      {
        title: "The workflow review",
        text: "The introductory workflow review is free. Assessment, implementation and ongoing support require a separately agreed scope.",
      },
      {
        title: "Project agreements",
        text: "Project fees, ownership, licences, support and responsibility for business actions are defined in the relevant project agreement.",
      },
      {
        title: "Contact",
        text: `Questions about these terms can be sent to ${PLACEHOLDER.email}.`,
      },
    ],
  },
} as const;

/* ------------------------------------------------------------------ */
/* Service pages: shared section copy (app/solutions/[slug]); per-function copy is in lib/areas.ts */
/* ------------------------------------------------------------------ */

export const SERVICE = {
  breadcrumb: "All solutions",
  eyebrow: "Proposed workflows",
  fit: "Customer fit",
  status: "Scope and availability are confirmed after reviewing your current software and sample records.",
  secondary: "Explore the examples",
  apps: () => "Workflows to assess",
  scope: "Scope note",
  example: "Illustrative example",
  exampleNote: "Illustrative records, not a customer result.",
  faq: "Questions about this workflow",
  allQuestions: "All questions",
  seeApps: (n: number) => (n === 1 ? "See the workflow" : "See the workflows"),
  ctaBand: { button: CTA.primary },
  others: "Other workflows",
} as const;

/* ------------------------------------------------------------------ */
/* Text drawn in the 3D world and the evidence drawer. Owners: the 3D lane (faces.ts, buildings.tsx,
/* OperationalScenes.tsx) and the editorial lane (OperationEvidence.tsx). Check fit at DPR 2.           */
/* ------------------------------------------------------------------ */

export const FACES = {
  /** faces.ts decision(): the line under the buttons. */
  decisionFoot: "Your quality reviewer decides",
  /** faces.ts layer k = 3 checklist. */
  policyChecks: ["Exact heat numbers only", "No record is edited", "Reviewer signs off"],
  /** faces.ts deduction function ledger rows: [document, value, flagged]. */
  ledger: [
    [APP_FACTS.deduction.invoice, "Linked", false],
    [APP_FACTS.deduction.ack, "Linked", false],
    [APP_FACTS.deduction.note, "Unclear", true],
    [APP_FACTS.deduction.debit, inrShort(APP_FACTS.deduction.amount), true],
  ] as readonly (readonly [string, string, boolean])[],
  /** faces.ts hand faces: the status every function card in Scale's hand ends on. */
  ready: "Ready for review",
  /** faces.ts hand art: each card's graphic, headed by a label and its figure (functions in order,
   *  then the glass layer card). */
  art: {
    labels: ["Supplier update", "Dispatch pack", "RFQ", "Service report", "Deduction", "Functions"],
    figures: [
      `${APP_FACTS.supplier.first} + ${APP_FACTS.supplier.rest}`,
      `${L.heat} ≠ ${C.heat}`,
      `${APP_FACTS.rfq.required} ≠ ${APP_FACTS.rfq.offered}`,
      "1 follow-up",
      inrShort(APP_FACTS.deduction.amount),
      "5",
    ],
    limit: "Checklist",
    days: ["Mat", "Dim", "Test", "Pack", "Cert", "Heat"],
    regions: ["Material", "Size", "Pressure", "Ends"],
    layer: "Sources · Rules · Reviewer",
  },
  /** faces.ts glass(): the layer card dealt last onto Scale's hand, over every function. */
  layer: {
    title: "One approach",
    body: "Source records, explicit rules and a named reviewer under every workflow.",
    foot: "Every function",
  },
  /** faces.ts final(): the lead-magnet face. */
  final: {
    title: "Tell us which workflow needs attention.",
    pill: "Free workflow review · 30 minutes",
  },
  /** buildings.tsx shipment crate stencil. */
  crate: APP_FACTS.crate,
} as const;

/** OperationEvidence.tsx and OperationalScenes.tsx labels that carry scenario IDs and figures. */
export const EVIDENCE_LABELS = {
  stages: ["Situation", "Source records", "For review"],
  safety: `CHECKLIST ${EXAMPLE.checklist.rev.toUpperCase()}`,
  today: `LINE ${L.n} · ${L.heat}`,
  day6With: `CERTIFICATE · ${C.heat}`,
  day6Without: "PROCESS CERTIFICATE · NOT FOUND",
  productionOrder: `CHALLAN ${APP_FACTS.jobwork.challan}`,
  tooling: `${APP_FACTS.jobwork.challan}: ${APP_FACTS.jobwork.open} PIECES FOR REVIEW`,
  workOrder: `REPORT ${APP_FACTS.service.report}`,
  cases: "SERVICE REPORT",
  /** Ledger rows: [document, figure]. */
  ledger: [
    [`${APP_FACTS.deduction.debit} · DEBIT NOTE`, inr(APP_FACTS.deduction.amount)],
    [`${APP_FACTS.deduction.invoice} · INVOICE`, "Linked"],
    [`${APP_FACTS.deduction.ack} · ACKNOWLEDGEMENT`, "Linked"],
  ] as readonly (readonly [string, string])[],
  heldTotal: `${inr(APP_FACTS.deduction.amount)} PENDING FINANCE REVIEW`,
} as const;
