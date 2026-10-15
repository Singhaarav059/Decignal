// The copy deck: every section and chapter string, keyed by slot (handoff revision 3, 15 October 2026,
// §5 to §9). Component lanes wire these in; each slot's comment names the component that renders it.
// Rules for every string here:
// - No em dashes. Curly apostrophes. Indian English.
// - Headlines are [line1, line2]; line 2 is the accent line in the chapter tone.
// - One main action: CTA.primary ("Talk to Decignal"), always to /#audit.
// - Direct service language: we design and build, the application prepares, your team approves.
//   "Application examples" names the catalogue; "Illustrative example" marks a fictional scenario.
//   Figures from the demonstrations stay inside them and never read as results.
// - Product names (SAP, Tally) are prospect context only: no partner or connector claims.
// Data lives elsewhere: applications, industries, approach, delivery, FAQ and record sources in
// lib/content.ts, the five functions in lib/areas.ts, the demonstrations in lib/demonstrations.ts, the
// explorer scenes in lib/application-demos.ts, the island panels in components/ui/systems.tsx, form
// messages in lib/audit.ts (AUDIT_COPY), identity facts in lib/placeholders.ts.

import { APP_FACTS, STORY, inr, inrShort, units } from "./example";
import { ORDER_COUNTS } from "./demonstrations";
import { PLACEHOLDER } from "./placeholders";

export type Headline = readonly [string, string];

/** An address the site may show: never a reserved .example stand-in (handoff §11 acceptance review). */
const publishable = (e?: string) => (e && !/\.example$/i.test(e.trim()) ? e.trim() : undefined);

/** The monitored inboxes, when supplied (NEXT_PUBLIC_CONTACT_EMAIL, else lib/placeholders.ts). Undefined
 *  until a real address exists; the pages then point to the enquiry form instead of printing an address. */
export const CONTACT = (() => {
  const email = publishable(process.env.NEXT_PUBLIC_CONTACT_EMAIL) ?? publishable(PLACEHOLDER.email);
  return { email, privacyEmail: publishable(PLACEHOLDER.privacyEmail) ?? email };
})();
/** How the legal pages say to get in touch: the inbox, or the enquiry form until one is supplied. */
const reach = (e: string | undefined) => (e ? `email ${e}` : "use the enquiry form on this website");

/* ------------------------------------------------------------------ */
/* Calls to action (handoff §5 shared navigation)                       */
/* ------------------------------------------------------------------ */

export const CTA = {
  /** Every primary button: Nav, hero, final chapter, FAQ, footer, function pages. With an arrow. */
  primary: "Talk to Decignal",
  /** Nav under 640px and other tight spaces (handoff: mobile action). */
  compact: "Talk to us",
  href: "/#audit",
  /** Secondary text links to the function pages (footer, ScaleApps, directory). */
  explore: (area: string) => `Explore ${/^[A-Z][a-z]/.test(area) ? area[0].toLowerCase() + area.slice(1) : area}`,
  /** The hero's and the final chapter's secondary button. */
  applications: "Explore applications",
  /** Per-application and function-page call to action. */
  workflow: "Discuss this application",
} as const;

/* ------------------------------------------------------------------ */
/* Metadata (handoff §9). lib/site.ts owns the constants; these are the words. */
/* ------------------------------------------------------------------ */

export const META = {
  /** SITE_TITLE: the homepage's browser and social title. */
  title: "Decignal | Custom AI Applications for Indian Businesses",
  /** SITE_DESCRIPTION. */
  description:
    "Custom AI applications for sales, procurement, operations, finance and service. Built around your business processes and existing systems.",
  /** openGraph and twitter title. */
  shareTitle: "Decignal | Custom AI Applications for Indian Businesses",
  /** SHARE_DESCRIPTION. */
  shareDescription:
    "Custom AI applications for sales, procurement, operations, finance and service. Built around your business processes and existing systems.",
  /** OG image footer line (opengraph-image.tsx); its two headline lines are HERO.headline. */
  ogFooter: "Custom AI applications for Indian businesses.",
  solutions: {
    title: "AI Application Examples | Decignal",
    description:
      "Explore practical AI applications for orders, quotations, supplier updates, operational reviews, payments and service work in Indian businesses.",
  },
  privacy: {
    title: "Privacy Notice | Decignal",
    description: "How Decignal handles personal information submitted through its website and how to contact the team about your information.",
  },
  terms: {
    title: "Website Terms | Decignal",
    description: "Terms for using the Decignal website. Project services are governed by a separately agreed scope and contract.",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Story: hero and chapters (Story.tsx, StoryCard.tsx)                  */
/* ------------------------------------------------------------------ */

/** The quiet label in the StoryCard label row, on chapters that show an example. */
export const EXAMPLE_LABEL = "Illustrative example";

/** The hero (handoff §5 hero). */
export const HERO = {
  /** Story.tsx back layer, above the headline: two halves split by " · ". */
  eyebrow: "Custom AI applications · For Indian businesses",
  /** The page h1. */
  headline: ["AI applications", "built for your business"] as Headline,
  /** Phones: the short line on the hero card, under the heading. */
  audience: "Decignal builds custom AI applications around your processes and the systems your teams already use.",
  /** The hero's right column. */
  lede: "Turn enquiries into draft orders, compare supplier quotations, investigate payment differences and follow up on service work. Decignal builds custom AI applications around your processes and the systems your teams already use.",
  /** The quiet second action beside the CTA. */
  secondary: "Explore applications",
  secondaryHref: "/solutions",
  /** Under the actions (handoff hero support). */
  card: "From the first application to the next, we help you decide what to build and put it to work.",
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

/** The story's running example (STORY, lib/example.ts): the order that falls short and the orders around it. */
const [SO_A, SO_B, SO_C] = STORY.orders;
/** What the orders due by Monday need on Friday: SO-3310 and SO-3318. */
const NEEDED_BY_MONDAY = SO_A.qty + SO_B.qty;

/**
 * Chapters, index-aligned with CHAPTERS in lib/story.ts (index 0 is the hero, above). Chapters 02 to 06
 * follow one illustrative example (handoff revision 3 §5, supplier follow-up): the application prepares,
 * the buyer confirms, sales reviews. Then the five functions, the four industries and the close.
 */
export const CHAPTER_COPY: (ChapterCopy | null)[] = [
  null,
  {
    title: ["A supplier changes", "the promise."],
    body: `${STORY.qty} ${STORY.item.toLowerCase()} were due ${STORY.due}. The supplier now offers ${STORY.first.qty} on ${STORY.first.day}, ${STORY.rest.qty} on ${STORY.rest.day}.`,
    readout: { value: `${STORY.lateDays} days`, label: `Later for ${STORY.rest.qty} of the ${STORY.qty}`, risk: true },
    details: [
      { label: "On the PO line", value: `${STORY.qty} due ${STORY.due}` },
      { label: "Revised", value: `${STORY.first.qty} ${STORY.first.day} · ${STORY.rest.qty} ${STORY.rest.day}`, risk: true },
      { label: "Message", value: STORY.messageAt },
    ],
  },
  {
    title: ["One order", "falls short."],
    body: `Three customer orders are linked to this line. ${STORY.short.order} is due ${SO_B.due}, before the ${STORY.rest.qty} arrive.`,
    readout: { value: units(STORY.short.waiting), label: `Of ${STORY.short.order} wait for ${STORY.rest.day}`, risk: true },
    details: [
      { label: SO_A.id, value: `${SO_A.qty} · ${SO_A.due} · covered` },
      { label: SO_B.id, value: `${SO_B.qty} · ${SO_B.due} · ${STORY.short.covered} covered`, risk: true },
      { label: SO_C.id, value: `${SO_C.qty} · ${SO_C.due} · covered` },
    ],
  },
  {
    title: ["Every record.", "One picture."],
    body: "Message, order line, allocations and tracker, read together. Select one to see it.",
  },
  {
    title: ["One clear", "follow-up."],
    body: `Confirm ${STORY.first.qty} on ${STORY.first.day} and ${STORY.rest.qty} on ${STORY.rest.day}. Sales reviews ${STORY.short.order}, with the original message.`,
    readout: { value: STORY.short.order, label: "The one order for sales to review" },
    details: [
      { label: "Original message", value: STORY.messageAt },
      { label: STORY.owners.confirm, value: "Confirms the schedule" },
      { label: STORY.owners.review, value: `Reviews ${STORY.short.order}` },
    ],
  },
  {
    title: ["You see why.", "You decide."],
    body: "Confirm the revised schedule, ask for more on Friday or decline it. The buyer decides.",
  },
  {
    title: ["Applications across", "your business"],
    body: "Sales, procurement, operations, finance and service: three application examples in each.",
  },
  {
    // Line 2 is the industry name: INDUSTRY.title(name).
    title: ["Built around", "your industry."],
    body: "Examples for manufacturing, distribution, logistics and B2B services.",
  },
  {
    // The final chapter uses the giant display headline and FINAL below.
    title: ["Let’s find the right application", "for your business"],
    body: "Tell us where work slows down. We will help you decide what to build first.",
  },
];

/**
 * The chapter heads on wide screens (ChapterHeads.tsx): three figures beside each chapter's headline.
 * Each names the record it is read from and takes that source's tone; `risk` turns the figure red.
 * Figures in 02 to 06 come from the illustrative example (STORY) and never repeat the card's own readout;
 * the rest count the catalogue and the offer. None reads as a result.
 */
type ChapterFact = { value: string; unit?: string; label: string; source: string; tone: string; risk?: boolean };
export const CHAPTER_FACTS: (ChapterFact[] | null)[] = [
  null,
  [
    { value: `${STORY.qty}`, unit: "pieces", label: `Due ${STORY.due} on ${STORY.po}`, source: "ERP", tone: "cobalt" },
    { value: `${STORY.first.qty}`, unit: "pieces", label: `Now on ${STORY.first.day}`, source: "Messages", tone: "pink" },
    { value: `${STORY.rest.qty}`, unit: "pieces", label: `Moved to ${STORY.rest.day}`, source: "Messages", tone: "signal", risk: true },
  ],
  [
    { value: `${SO_A.qty}`, unit: "pieces", label: `${SO_A.id}, due ${SO_A.due}: covered`, source: "ERP", tone: "cobalt" },
    { value: SO_B.due, label: `${SO_B.id}’s promised date`, source: "CRM", tone: "violet" },
    { value: `${STORY.short.covered}`, unit: `of ${SO_B.qty}`, label: `${SO_B.id} covered by ${SO_B.due}`, source: "ERP", tone: "signal", risk: true },
  ],
  [
    { value: "6", unit: "sources", label: "Read together, nothing changed", source: "All six", tone: "cobalt" },
    { value: "1", unit: "message", label: `Linked to ${STORY.po} line ${STORY.poLine}`, source: "Messages", tone: "pink" },
    { value: `${STORY.orders.length}`, unit: "orders", label: "Verified allocation links only", source: "ERP", tone: "cobalt" },
  ],
  [
    { value: `${STORY.first.qty} + ${STORY.rest.qty}`, label: "Revised commitment", source: "Messages", tone: "pink" },
    { value: `Line ${STORY.poLine}`, label: `Of ${STORY.po}, linked`, source: "ERP", tone: "cobalt" },
    { value: "1", unit: "row", label: "For the buyer to update", source: "Sheets", tone: "saffron" },
  ],
  [
    { value: STORY.owners.confirm, label: "Confirms the schedule", source: "Rules", tone: "violet" },
    { value: STORY.owners.review, label: `Reviews ${STORY.short.order}`, source: "Rules", tone: "emerald" },
    { value: "0", unit: "changes", label: "Until someone decides", source: "Example", tone: "cobalt" },
  ],
  [
    { value: "5", unit: "functions", label: "Sales to service", source: "Library", tone: "emerald" },
    { value: "15", unit: "examples", label: "Application examples, scoped for you", source: "Library", tone: "violet" },
    { value: "1", unit: "to start", label: "Chosen with your team", source: "Approach", tone: "cobalt" },
  ],
  [
    { value: "4", unit: "industries", label: "Where our examples focus", source: "Focus", tone: "cobalt" },
    { value: "Any", label: "Process worth improving", source: "Open", tone: "emerald" },
    { value: "30", unit: "minutes", label: "Free first conversation", source: "Start", tone: "tangerine" },
  ],
  null,
];

/** 02 Signal readout card (StoryCard SignalDetails): its accessible summary. */
export const SIGNAL_ARIA = `Supplier message, ${STORY.messageAt}: ${STORY.first.qty} ${STORY.item.toLowerCase()} on ${STORY.first.day} and ${STORY.rest.qty} on ${STORY.rest.day}, instead of ${STORY.qty} on ${STORY.due}`;

/** 02 Signal: the working days from the message to the second delivery. `mark`: the first part lands;
 *  `risk`: the rest lands, after SO-3318's Monday. */
export const SIGNAL_DAYS: readonly { label: string; mark?: boolean; risk?: boolean }[] = [
  { label: "Wed" },
  { label: "Thu" },
  { label: `Fri · ${STORY.first.qty}`, mark: true },
  { label: "Mon" },
  { label: "Tue" },
  { label: `Wed · ${STORY.rest.qty}`, risk: true },
];

/** 04 Context: the three records, each linked to its island (StoryCard EvidenceChecks). `island` is the
 *  SYSTEMS index and the order matches CONTEXT_PINS in lib/story.ts. */
export const EVIDENCE_CHECKS = {
  aria: "Records behind this follow-up",
  rows: [
    { tone: "pink", label: "Supplier message", value: `${STORY.first.qty} ${STORY.first.day.slice(0, 3)} · ${STORY.rest.qty} ${STORY.rest.day.slice(0, 3)}`, island: 5, system: "Messages" },
    { tone: "cobalt", label: "PO line and orders", value: `Line ${STORY.poLine} · ${STORY.orders.length} linked`, island: 0, system: "ERP" },
    { tone: "saffron", label: "Buyer’s tracker", value: `Was ${STORY.qty} on ${STORY.due}`, island: 3, system: "Sheets" },
  ],
  /** Accessible name per row. */
  rowAria: (label: string, value: string, system: string) => `${label}: ${value}. From ${system}. Open the record.`,
} as const;

/** 05 Follow-up: the steps as the application assembles it (StoryCard Stepper). Short: five share a row. */
export const STEPPER = ["Read", "Linked", "Checked", "Drafted", "With buyer"] as const;

/** 06 Control: the buyer's panel (DecisionControls.tsx). Illustrative: nothing is sent or posted, and a
 *  live setup writes to a system only through an agreed integration. */
export const CONTROL = {
  eyebrow: "Interactive example",
  title: (qty: number) => `${qty} on ${STORY.first.day}`,
  restLeft: (rest: number) => `${rest} on ${STORY.rest.day}`,
  balanceAria: (qty: number, rest: number) => `${qty} ${STORY.item.toLowerCase()} on ${STORY.first.day}, ${rest} on ${STORY.rest.day}`,
  first: "arriving",
  rest: "later",
  /** The marker on the Friday bar: what the orders due by Monday need. */
  needed: NEEDED_BY_MONDAY,
  confirm: "Confirm",
  adjust: "Adjust",
  decline: "Decline",
  /** The supplier's own figure is confirmed; anything more is a request to the supplier. */
  confirmQty: (qty: number) => (qty === STORY.first.qty ? `Confirm ${qty}` : `Ask for ${qty}`),
  cancel: "Cancel",
  /** Under the Friday slider. It runs from the supplier's 60 to the full 100 in steps of 10. */
  note: (qty: number) =>
    qty === STORY.first.qty
      ? `The supplier’s schedule. ${STORY.short.order} gets ${STORY.short.covered} of its ${SO_B.qty} by ${SO_B.due}; sales reviews it.`
      : qty < NEEDED_BY_MONDAY
        ? `${STORY.short.order} would get ${qty - SO_A.qty} of its ${SO_B.qty} by ${SO_B.due}. The supplier has to agree first.`
        : qty < STORY.qty
          ? `Covers every order due by ${SO_B.due}, if the supplier agrees to send it.`
          : "The original promise. The buyer asks the supplier to keep it.",
  declinePrompt: "What goes back to the supplier?",
  reasons: ["Keep the original date", "Confirm in writing first", "Ask another supplier"],
  planLabel: "Example tracker",
  /** The confirmed chip: "60 Fri · 40 Wed · PO-8842". */
  planChip: (qty: number) => `${qty} Fri · ${STORY.qty - qty} Wed · ${STORY.po}`,
  confirmedTitle: (qty: number) =>
    qty === STORY.first.qty
      ? "Confirmed in this example. In a live setup, the buyer records the revised schedule; your purchasing system changes only through an agreed integration."
      : `Request prepared in this example. In a live setup, the buyer asks the supplier for ${qty} on ${STORY.first.day}; nothing changes until they agree.`,
  confirmedMeta: (qty: number) =>
    qty === STORY.first.qty
      ? `Example · ${STORY.owners.confirm} confirms → ${STORY.owners.review.toLowerCase()} reviews ${STORY.short.order}`
      : `Example · ${STORY.owners.confirm} asks → supplier replies → ${STORY.owners.review.toLowerCase()} reviews ${STORY.short.order}`,
  declinedTitle: "Declined. The buyer goes back to the supplier; the order stays as it was.",
  declinedMeta: (reason: string) => `Reason: ${reason}`,
  undo: "Undo",
} as const;

/** Scale: the function card (StoryCard / ScaleApps). */
export const SCALE = {
  apps: (n: number) => `${n} application ${n === 1 ? "example" : "examples"}`,
  /** One application row. */
  appRow: (name: string) => name,
  link: (area: string) => CTA.explore(area),
} as const;

/** Labels and accessible names in the story's DOM (StoryCard, ScaleCard, ScalePhone, IslandPanel). */
export const STORY_UI = {
  details: "Details",
  cardAria: "The story, chapter by chapter",
  functionsAria: "Business functions",
  phoneAria: "Application examples by business function",
  layers: "Cards behind the follow-up",
  qtyAria: `${STORY.item} on ${STORY.first.day}`,
  qtyDown: `Fewer on ${STORY.first.day}`,
  qtyUp: `More on ${STORY.first.day}`,
  stepperAria: `Follow-up for ${STORY.po}`,
  /** IslandPanel: "Source 3 of 6". */
  source: (n: number, total = 6) => `Source ${n} of ${total}`,
  /** IslandPanel: what the source holds for this example (no live-sync claim). */
  sample: "Sample record",
  readFor: "Used by the application",
  close: "Close",
} as const;

/** Industries (Story.tsx headline, IndustryDetail.tsx card). */
export const INDUSTRY = {
  /** Only the first word drops its capital, so "B2B" keeps its own. */
  title: (name: string) => ["Built around", `${name.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())}.`] as Headline,
  decisions: "Application examples",
  startLink: "View examples",
  indexAria: "Industries in focus",
  /** IndustryCallout: the example pinned to the place on wide screens. */
  action: "Illustrative example",
  other: "Working in another industry? Tell us about the process you want to improve.",
} as const;

/** Final: the 3D world, the giant headline, one line, the CTA pair and the card. */
export const FINAL = {
  headline: ["Let’s find the right application", "for your business"] as Headline,
  sub: "Tell us where work slows down. We will help you assess the opportunity and decide what to build first.",
  /** Under the primary CTA. */
  ctaNote: "A free 30-minute conversation to understand the opportunity.",
  secondary: CTA.applications,
  /** The StoryCard in this chapter. */
  cardTitle: "Start a conversation",
  /** Three facts about the offer. */
  outcomes: [
    { value: "5", label: "Business functions", tone: "emerald" },
    { value: "15", label: "Application examples", tone: "violet" },
    { value: "Free", label: "First 30-minute conversation", tone: "tangerine" },
  ],
  chipsAria: "The six kinds of record an application can use",
  /** Before the row of source discs on the card. */
  readFrom: "Built on the records you already have",
} as const;

/** The nav's story glance (NavPeek CHAPTER_INFO and its groups), index-aligned with CHAPTERS. */
export const STORY_PEEK = {
  title: "The story in nine chapters",
  sub: "One supplier follow-up, an illustrative example, then five functions and four industries.",
  chapters: [
    "Custom AI applications for Indian businesses",
    "A supplier changes a delivery promise",
    "One customer order falls short",
    "Every record, read together",
    "One clear follow-up for the buyer",
    "The buyer confirms, sales reviews",
    "Applications across five business functions",
    "Examples for four industries",
    "Find the right application for your business",
  ],
  groups: [
    { name: "The offer", from: 0 },
    { name: "One example", from: 1 },
    { name: "Where it applies", from: 6 },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Nav and glances (Nav.tsx, NavPeek.tsx)                               */
/* ------------------------------------------------------------------ */

export const NAV = {
  /** Nav.tsx links: [id or href, label]. Ids are homepage anchors; a leading "/" is a route. */
  sections: [
    ["/solutions", "Applications"],
    ["who-we-help", "Industries"],
    ["platform", "How we build"],
    ["how", "How we work"],
  ],
  logoAria: "Decignal, back to top",
  menuOpen: "Open menu",
  menuClose: "Close menu",
  /** NavPeek blurbs: the glance side card and the phone menu. */
  blurbs: {
    audience: "Manufacturing, distribution, logistics and B2B services.",
    systems: "The systems and records an application works from.",
    platform: "Your records and business rules shape the application.",
    trail: "Three tasks an application can take on.",
    apps: "Fifteen application examples across five business functions.",
    outcomes: "Manufacturing, distribution, logistics and B2B services.",
    how: "Find the right starting point and build from there.",
    faq: "What teams ask before they start.",
  },
  /** Glance footers: a short fact. No figure that reads as a result. */
  foot: {
    apps: { figure: "15", label: "examples, scoped for each business" },
    outcomes: { figure: "4", label: "industries in our examples" },
    how: { label: "Scope and timing agreed before work begins" },
  },
  outcomesEyebrow: "Who we work with",
  appsCount: (n: number) => `${n} ${n === 1 ? "example" : "examples"}`,
  /** The How we build glance's side card. */
  platformSide: {
    label: "How we build",
    blurb: "We connect the information the application needs, agree how your team interprets it, and build the workflow around those decisions.",
  },
  faqSide: {
    label: "First conversation",
    blurb: "A free 30-minute conversation about the work you want to improve.",
    all: () => "All questions",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Homepage sections (Editorial.tsx and the sections it composes)       */
/* ------------------------------------------------------------------ */

/** Applications (handoff §5 applications, #applications): six featured cards. */
export const APPLICATIONS_COPY = {
  eyebrow: "What we build",
  headline: ["Applications across", "your business"] as Headline,
  intro: "Start with the work your team repeats every day. These examples show what an application can do; each implementation is scoped to your process, data and approval rules.",
  all: "See all application examples",
  /** Each featured card's foot. */
  open: "See the application",
  chaptersAria: "Featured application examples",
  stages: ["Situation", "Records", "Next step"],
  stageLabels: ["Situation", "Records", "Next step"],
  showEvidence: "View the records",
  hideEvidence: "Hide the records",
  sources: "Works with",
  /** The explorer's one honesty label. */
  example: "Illustrative example",
  listAria: "Application examples",
  /** Shared application-record labels (handoff §7). */
  labels: {
    fit: "Who it is for",
    example: "Illustrative example",
    data: "Works with",
    output: "What it produces",
    owner: "Used by",
    measure: "What to measure",
  },
} as const;

/** The problem (handoff §5 problem, #problem). */
export const STATEMENT = {
  eyebrow: "The problem",
  headline: "The work does not stop at the system boundary",
  text: "A customer changes an order by email. A supplier sends a new delivery date. A technician recommends a part in a service report. The record is there, but someone still has to interpret it, find the related information and move the work forward.",
  closing: "We build applications for that work: reading the inputs, applying your rules and helping the next person act.",
} as const;

/** How we build (handoff §5 approach, #platform). Items are APPROACH in lib/content.ts. */
export const APPROACH_COPY = {
  eyebrow: "How we build",
  headline: ["Your records and business rules", "shape the application"] as Headline,
  intro: "We connect the information the application needs, agree how your team interprets it, and build the workflow around those decisions.",
  /** One word per item for the diagram (records, rules, application, ownership). */
  steps: ["Records", "Rules", "Application", "Ownership"],
  tones: ["cobalt", "violet", "emerald", "tangerine"],
  aria: "From your records and rules to an application with an owner",
  functions: "Five business functions",
  functionsText: "Three application examples in each, scoped to your process.",
} as const;

/** Industries (handoff §5 industries, #who-we-help). Cards are AUDIENCE in lib/content.ts. */
export const AUDIENCE_COPY = {
  eyebrow: "Who we work with",
  headline: ["Built around the work", "in your industry"] as Headline,
  intro: "Our application examples focus on manufacturing, distribution, logistics and B2B services. The starting point is the work that needs improving, wherever it sits in the business.",
  closing: "Working in another industry? Tell us about the process you want to improve.",
  closingLink: "Tell us about it",
  listAria: "Industries",
  examples: "Example applications",
  link: "View examples",
} as const;

/** The demonstrations (handoff §5 demonstrations, #example, kept at #trail). Items: lib/demonstrations.ts. */
export const DEMOS_COPY = {
  eyebrow: "Illustrative examples",
  headline: ["See the work an application", "can take on"] as Headline,
  intro: "Three different tasks, with the inputs and next step visible.",
  tabsAria: "Choose an example",
  badge: "Illustrative example",
  labels: { input: "Input", application: "Application", output: "Output", next: "Next step" },
  explore: "Explore this application",
  /** The interface illustration's labels. */
  art: {
    order: {
      aria: `Order of ${ORDER_COUNTS.total} lines: ${ORDER_COUNTS.matched} matched, ${ORDER_COUNTS.item} need item confirmation, ${ORDER_COUNTS.unit} need unit clarification`,
      matched: "Matched",
      item: "Confirm item",
      unit: "Clarify unit",
      queue: "Draft for the order desk",
    },
    supplier: {
      aria: "Supplier commitment of 100 contactors split into 60 on Friday and 40 the following Wednesday",
      before: "Promised",
      after: "Revised",
      check: "Customer orders to check",
    },
    service: {
      aria: "A service report recommendation linked to the equipment and assigned to an owner",
      report: "Service report",
      line: "Replace mechanical seal at next shutdown",
      equipment: "Equipment record",
      quote: "Existing quote",
      none: "None found",
      owner: "Service owner",
      open: "Part and coverage to confirm",
    },
  },
} as const;

/** The worked example as a dial (TrailDial.tsx, #review, kept at #trail): order intake, step by step. */
export const TRAIL = {
  label: "Illustrative review",
  headline: ["A customer order with", "13 lines left to confirm"] as Headline,
  intro: "The order desk receives a 40-line purchase order. The draft has to match the approved item catalogue, the pack units and the customer’s terms before it reaches the order system.",
  /** The dial's last turn: back with the order desk. */
  loop: { k: "Order desk", name: "Your team approves", ex: "The order desk resolves the open lines and approves the draft before it reaches the order system." },
  aria: "How the order moves: customer order, item aliases, catalogue match, pack units, open lines, questions, order desk",
  groups: ["Input", "Application", "Next step"],
  steps: [
    { step: "Customer order", ex: `Purchase order ${APP_FACTS.order.po}: ${ORDER_COUNTS.total} lines, some with old item codes`, tone: "violet", group: 0 },
    { step: "Item aliases", ex: "Line 7 uses an old item code for 20 boxes of switches", tone: "cobalt", group: 0 },
    { step: "Catalogue", ex: `${ORDER_COUNTS.matched} lines matched using approved item mappings`, tone: "emerald", group: 1 },
    { step: "Pack units", ex: `${ORDER_COUNTS.unit} lines with an unclear box or piece unit`, tone: "saffron", group: 1 },
    { step: "Open lines", ex: `${ORDER_COUNTS.item + ORDER_COUNTS.unit} lines kept out of the ready list; none is guessed`, tone: "signal", group: 2 },
    { step: "Questions", ex: `Confirm ${ORDER_COUNTS.item} items and clarify ${ORDER_COUNTS.unit} units with the customer`, tone: "tangerine", group: 2 },
    { step: "Order desk", ex: "A draft order waiting for the order desk to approve", tone: "pink", group: 2 },
  ],
  /** The readable three-row review: order line, what it matched, status. */
  table: {
    aria: "Illustrative order intake",
    head: ["Order line", "Matched to", "Status"],
    rows: [
      { ref: "Line 3 · Switch 16A", doc: "Catalogue item SW-16A", status: "Matched", risk: false },
      { ref: "Line 7 · old item code", doc: "Two possible catalogue items", status: "Confirm item", risk: true },
      { ref: "Line 12 · 20 boxes", doc: "Pack unit not stated", status: "Clarify unit", risk: true },
    ],
  },
  recommendation: `Confirm the ${ORDER_COUNTS.item} items and ${ORDER_COUNTS.unit} units before the draft goes to the order system.`,
  explanation: "The application prepares the draft and keeps uncertain lines visible. The order desk checks them and approves the order.",
  review: "Draft order · not yet approved",
  disclaimer: "Illustrative records. This example shows what an application could prepare, not a completed customer project.",
} as const;

/** What we measure (#outcomes): agreed for the application you choose. */
export const OUTCOMES_COPY = {
  eyebrow: "What we measure",
  headline: ["Agree a baseline", "before anything is built"] as Headline,
  intro: "We agree a baseline for the application you choose: time from receipt to an accepted order, time to a comparable quotation sheet, or time to an assigned service follow-up.",
  note: "Corrections and missed exceptions count as well as speed. Results are measured against your own baseline.",
  measures: [
    { k: "Time", text: "End-to-end time for the complete task, including corrections and finding the records.", tone: "cobalt" },
    { k: "Accuracy", text: "Missed exceptions, wrong matches and questions raised that were not needed.", tone: "emerald" },
    { k: "Rework", text: "Corrections your team makes and information that has to be requested again.", tone: "tangerine" },
  ],
} as const;

/** Systems (handoff §5 systems, #systems). Groups are SOURCE_GROUPS in lib/content.ts. */
export const SYSTEMS_STRIP = {
  eyebrow: "Your systems",
  headline: ["Build around the systems", "you already use"] as Headline,
  intro: "Your ERP, accounting software, CRM and service tools hold important records. Email, spreadsheets and documents often hold the rest. We agree how the application will use those sources and where its output belongs.",
  note: "Tell us the software and versions you use. We confirm access, supported formats and integration scope during discovery.",
} as const;

/**
 * Also reads (components/sections/ReadWheel.tsx, inside #systems): the records the fifteen applications
 * work with (each record's "Works with" in lib/content.ts APPLICATIONS), on a dial. Every example read
 * restates that application's illustrative scenario; no live integration, vendor or result is implied.
 * `apps` are APPLICATIONS ids; a row with `f` draws a bar, a row without one is a field as read.
 */
export type WheelItem = {
  name: string;
  title: string;
  text: string;
  apps: string[];
  fig: string;
  unit?: string;
  caption: string;
  icon: string;
  compare: { label: string; value: string; f?: number; risk?: boolean }[];
};
export const ALSO_READS = {
  label: "Also reads",
  title: "The records your teams already handle.",
  lede: "Orders, challans, delivery records, debit notes and service reports. Each application reads only the records its task needs, with access agreed during discovery.",
  example: "Illustrative example",
  usedBy: "Used by",
  tabsAria: "Records the applications read, by function",
  itemOf: (n: number, total: number) => `${n} of ${total}`,
  groups: [
    {
      id: "supply",
      label: "Sales and supply",
      tone: "cobalt",
      items: [
        {
          name: "Customer orders",
          title: "Purchase orders and order messages",
          text: "Orders in the format each customer sends: item codes, quantities, units and terms, read against your approved item and customer masters.",
          apps: ["sales-order-intake", "operational-exception-brief"],
          fig: "20",
          unit: "boxes",
          caption: "An order for switches under an old item code",
          icon: "erp",
          compare: [
            { label: "Item code", value: "Mapped from old code" },
            { label: "Pack size", value: "Confirm with desk", risk: true },
          ],
        },
        {
          name: "Quotations",
          title: "Supplier offers and price files",
          text: "Quotations, revised price lists and datasheets, put on a comparable basis of unit, freight, terms and delivery.",
          apps: ["purchase-quote-comparison", "supplier-price-updates", "rfq-preparation"],
          fig: "3",
          unit: "quotations",
          caption: "Three suppliers quoting the same purchase request",
          icon: "sup",
          compare: [
            { label: "Unit basis", value: "Per box, converted" },
            { label: "Freight", value: "Excluded by one", risk: true },
          ],
        },
        {
          name: "Supplier confirmations",
          title: "Promised quantities and dates",
          text: "Supplier updates linked to the purchase-order line they change, so revised commitments are not missed.",
          apps: ["supplier-commitment-tracking", "operational-exception-brief"],
          fig: "100",
          unit: "contactors",
          caption: "One commitment split into two deliveries",
          icon: "ext",
          compare: [
            { label: "Friday", value: "60", f: 0.6 },
            { label: "The following Wednesday", value: "40", f: 0.4, risk: true },
          ],
        },
      ],
    },
    {
      id: "ops",
      label: "Operations",
      tone: "emerald",
      items: [
        {
          name: "Challans",
          title: "Job-work movements and returns",
          text: "Challans, supplier statements, returns and approved rejection records, reconciled by challan or batch.",
          apps: ["job-work-reconciliation"],
          fig: "40",
          unit: "pieces",
          caption: "A coating job: 1,000 sent, the balance to reconcile",
          icon: "wms",
          compare: [
            { label: "Documented", value: "960 pcs", f: 0.96 },
            { label: "To reconcile", value: "40 pcs", f: 0.04, risk: true },
          ],
        },
        {
          name: "Shift sheets",
          title: "Production notes on paper or sheets",
          text: "Output, rejections and downtime as recorded on the shift sheet, with the original kept beside the structured record.",
          apps: ["production-record-capture"],
          fig: "1",
          unit: "entry to resolve",
          caption: "A packaging plant’s daily production record",
          icon: "sheet",
          compare: [
            { label: "Original sheet", value: "Kept with record" },
            { label: "Unreadable quantity", value: "To supervisor", risk: true },
          ],
        },
        {
          name: "Lorry receipts and PODs",
          title: "Delivery evidence",
          text: "Lorry receipts, proof of delivery and customer acknowledgements, matched to the shipments they belong to.",
          apps: ["delivery-document-followup", "customer-deduction-investigation"],
          fig: "2",
          unit: "follow-ups",
          caption: "Deliveries to several customer sites",
          icon: "tms",
          compare: [
            { label: "POD without order reference", value: "Link proposed" },
            { label: "Shortage recorded", value: "Separate follow-up", risk: true },
          ],
        },
      ],
    },
    {
      id: "finance",
      label: "Finance",
      tone: "violet",
      items: [
        {
          name: "Debit notes",
          title: "Customer deductions",
          text: "Debit notes read with the invoice, delivery evidence and agreed commercial terms behind them.",
          apps: ["customer-deduction-investigation", "payment-advice-matching"],
          fig: "₹75,000",
          caption: "A deduction against a delivery-shortage claim",
          icon: "pos",
          compare: [
            { label: "Invoice and delivery records", value: "Linked" },
            { label: "Receiver note", value: "Ambiguous", risk: true },
          ],
        },
        {
          name: "Remittance advice",
          title: "Payment details from customers",
          text: "Customer advice read against the bank receipt and open invoices, with any difference kept visible.",
          apps: ["payment-advice-matching"],
          fig: "₹20,000",
          unit: "deduction",
          caption: "One advice covering five invoices",
          icon: "pos",
          compare: [
            { label: "Invoices on the advice", value: "₹5,00,000", f: 1 },
            { label: "Amount received", value: "₹4,80,000", f: 0.96, risk: true },
          ],
        },
        {
          name: "Transporter bills",
          title: "Freight bills and trip records",
          text: "Transporter bills read with agreed rates, trip records and gate timestamps.",
          apps: ["freight-bill-review"],
          fig: "1",
          unit: "charge to review",
          caption: "A detention charge added to a freight bill",
          icon: "tms",
          compare: [
            { label: "Free period", value: "From rate agreement" },
            { label: "Acknowledgement", value: "Missing", risk: true },
          ],
        },
      ],
    },
    {
      id: "service",
      label: "Service",
      tone: "pink",
      items: [
        {
          name: "Service messages",
          title: "Requests from approved channels",
          text: "Customer messages and photos, read with asset, site and service-history records.",
          apps: ["service-case-intake"],
          fig: "3",
          unit: "candidate sites",
          caption: "A photo and a message about a pump",
          icon: "desk",
          compare: [
            { label: "Asset records", value: "Candidates found" },
            { label: "Serial number", value: "Requested", risk: true },
          ],
        },
        {
          name: "Service reports",
          title: "Technician recommendations",
          text: "Recommendations in service reports, linked to the equipment, contract and any open quote.",
          apps: ["service-report-followup"],
          fig: "1",
          unit: "recommendation",
          caption: "Replace a mechanical seal at the next shutdown",
          icon: "cmms",
          compare: [
            { label: "Existing quote", value: "Checked" },
            { label: "Part and coverage", value: "To confirm", risk: true },
          ],
        },
        {
          name: "Manuals",
          title: "Manuals, bulletins and past cases",
          text: "Approved manuals by model and revision, service bulletins and reviewed past resolutions.",
          apps: ["service-knowledge-assistant"],
          fig: "1",
          unit: "manual revision",
          caption: "An error code on a particular drive model",
          icon: "sup",
          compare: [
            { label: "Source", value: "Revision and note" },
            { label: "Model suffix", value: "Asked when needed", risk: true },
          ],
        },
      ],
    },
  ] as { id: string; label: string; tone: string; items: WheelItem[] }[],
} as const;

/** How we work (Editorial.tsx, HowSteps.tsx; handoff §5 delivery). Steps are PATHS in lib/content.ts. */
export const HOW = {
  eyebrow: "How we work",
  headline: ["Find the right starting point", "and build from there"] as Headline,
  intro: "The first conversation can consider several opportunities; the first build is selected by fit.",
  routeAria: "Find the right starting point and build from there",
  /** Each colour sheet's head (HowSteps.tsx): its place in the order, in words rather than numerals. */
  stepWords: ["First.", "Second.", "Third.", "Then."],
  youGet: "Deliverable",
} as const;

/** About (handoff §5 about, #about). */
export const ABOUT = {
  eyebrow: "About Decignal",
  headline: ["Building practical AI", "for Indian businesses"] as Headline,
  body: "Decignal builds custom AI applications for the work that keeps a business running. We work with the people who own the process, use the records already available, and turn a clearly defined problem into an application the team can use.",
  second: "Our ambition is to help businesses put AI to work across departments, with each application grounded in how the company operates.",
  cta: CTA.primary,
  founder: PLACEHOLDER.founder,
  founderLabel: "Founder",
  linkedin: "LinkedIn profile",
} as const;

/** FAQ (Editorial.tsx). Questions are FAQ in lib/content.ts, topics FAQ_TOPICS. */
export const FAQ_COPY = {
  eyebrow: "Questions",
  headline: ["Questions", "before we start"] as Headline,
  helpTitle: "Still have a question?",
  helpText: "Bring it to your free 30-minute conversation.",
  /** The one text link to the enquiry, with an arrow. */
  helpLink: "Ask it on the call",
} as const;

/* ------------------------------------------------------------------ */
/* The enquiry (Audit.tsx; handoff §8). Field messages and request states: lib/audit.ts. */
/* ------------------------------------------------------------------ */

export const AUDIT = {
  eyebrow: "Start a conversation",
  headline: ["What would you like your team", "to spend less time on?"] as Headline,
  intro: "Tell us about the processes you want to improve and the systems involved. We will arrange a free 30-minute conversation to understand the opportunity and discuss a practical next step.",
  helper: "A brief description is enough. Please leave confidential documents out of this form.",
  /** Facts row (dl). */
  facts: [
    { k: "Cost", v: "Free introductory call" },
    { k: "Length", v: "30 minutes" },
    { k: "Format", v: "Video call" },
    { k: "Booking", v: "Arranged by email" },
  ],
  nextTitle: "What happens next",
  next: ["Tell us about the work", "We email you to arrange a time", "Talk it through for 30 minutes", "Agree a practical next step"],
  cardTitle: "Request a call",
  expectTitle: "What to expect",
  expectations: "We will discuss the work, the systems involved and what a useful application would produce. Assessment, implementation and support are scoped separately.",
  fields: {
    name: { label: "Your name", placeholder: "Full name" },
    email: { label: "Work email", placeholder: "you@company.com" },
    company: { label: "Company", placeholder: "Company name" },
    workflow: {
      label: "What would you like to improve?",
      placeholder: "For example, customer order intake, supplier follow-up or service reporting.",
    },
    systems: { label: "Systems you use", placeholder: "Optional" },
  },
  privacyLine: "We will use these details to respond to your enquiry and arrange the call.",
  privacyLink: "Read our privacy notice",
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
  /** Footer display headline (handoff §5 shared footer). */
  headline: ["Let’s find the right application", "for your business"] as Headline,
  body: "Tell us where work slows down. We will help you assess the opportunity and decide what to build first.",
  navTitle: "Explore",
  nav: [
    { label: "Applications", href: "/solutions", blurb: "Fifteen examples across five functions" },
    { label: "Industries", href: "/#who-we-help", blurb: "Manufacturing, distribution, logistics, services" },
    { label: "How we build", href: "/#platform", blurb: "Your records and rules shape the application" },
    { label: "How we work", href: "/#how", blurb: "Find the right starting point" },
  ],
  companyTitle: "Company",
  company: [
    { label: "About Decignal", href: "/#about" },
    { label: "Contact", href: "/#audit" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
  areasTitle: "Business functions",
  areaCount: (n: number) => `${n} application ${n === 1 ? "example" : "examples"}`,
  positioning: "Custom AI applications for Indian businesses.",
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
  positioning: "Custom AI applications for Indian businesses",
  /** The scene indicator's accessible name while the 3D builds. */
  label: "Loading the 3D view",
} as const;

/** app/not-found.tsx and the legal pages (handoff §9). */
export const PAGES = {
  notFound: {
    /** Document title (metadata). */
    title: "Page not found",
    eyebrow: "404",
    headline: ["This page is not here.", "The applications still are."] as Headline,
    body: "The link may be old or mistyped.",
    home: "Back to the start",
    cta: CTA.primary,
  },
  /** Built from the facts in lib/placeholders.ts; replace those before launch. */
  privacy: {
    title: "Privacy notice",
    lead: `This notice explains how ${PLACEHOLDER.operator} handles personal information submitted through the Decignal website. For questions, ${reach(CONTACT.privacyEmail)}.`,
    effective: `Effective ${PLACEHOLDER.effective}`,
    sections: [
      {
        title: "Who operates this website",
        text: `This website is operated by ${PLACEHOLDER.operator}.${CONTACT.email ? ` You can reach us at ${CONTACT.email}.` : ""}`,
      },
      {
        title: "Information collected",
        text: "When you send an enquiry we receive your name, work email, company, the process you describe and, if you add them, the systems you use. Our host keeps standard request logs. A short-lived setting in your browser stops the introduction from playing twice.",
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
        text: `${PLACEHOLDER.privacy.retention} To ask for deletion, ${reach(CONTACT.privacyEmail)}.`,
      },
      {
        title: "Questions and requests",
        text: `To see, correct or delete your details, ${reach(CONTACT.privacyEmail)}. We will confirm when the request is complete.`,
      },
      {
        title: "Changes to this notice",
        text: "We publish any update on this page with a new effective date.",
      },
    ],
  },
  terms: {
    title: "Website terms",
    lead: `These terms cover use of the Decignal website operated by ${PLACEHOLDER.operator}. Project services are governed by a separately agreed scope and contract.`,
    effective: `Effective ${PLACEHOLDER.effective}`,
    sections: [
      {
        title: "What this website presents",
        text: "This website presents Decignal’s custom AI application services. The applications and figures shown are illustrative examples of work we can scope with a business, not products available off the shelf, unless explicitly identified otherwise.",
      },
      {
        title: "No guarantee of availability or outcomes",
        text: "Website examples do not guarantee application availability, integration support, delivery dates or business outcomes.",
      },
      {
        title: "The introductory conversation",
        text: "The introductory conversation is free. Assessment, implementation and ongoing support require a separately agreed scope.",
      },
      {
        title: "Project agreements",
        text: "Project fees, ownership, licences, support and responsibility for business actions are defined in the relevant project agreement.",
      },
      {
        title: "Contact",
        text: `For questions about these terms, ${reach(CONTACT.email)}.`,
      },
    ],
  },
} as const;

/* ------------------------------------------------------------------ */
/* Function pages and the directory: shared copy (app/solutions); per-function copy is in lib/areas.ts */
/* ------------------------------------------------------------------ */

export const SERVICE = {
  breadcrumb: "All applications",
  eyebrow: "Application examples",
  secondary: "Explore the examples",
  secondaryHref: "#applications",
  faq: "Questions",
  allQuestions: "All questions",
  more: "Full record",
  less: "Hide record",
  ctaBand: { button: CTA.primary },
  others: "Other business functions",
} as const;

/** The directory (handoff §6, /solutions). */
export const SOLUTIONS_INDEX = {
  eyebrow: "Application examples",
  headline: ["Find a starting point in", "the work your team does"] as Headline,
  body: "Explore applications across sales, procurement, operations, finance and service. Each example describes a practical task, the records it uses and what the team receives.",
  note: "These are examples of custom applications, not a list of off-the-shelf products. We scope the implementation with your team.",
  filterLabel: "Browse by business function",
  allFilter: "All applications",
  industryLabel: "Show examples for",
  allIndustries: "All industries",
  industries: {
    manufacturing: "Manufacturing",
    distribution: "Distribution and wholesale",
    logistics: "Logistics and transport",
    services: "Equipment and B2B services",
  },
  empty: "No examples match these filters. View all applications or tell us about your process.",
  reset: "View all applications",
  count: (n: number) => `${n} ${n === 1 ? "example" : "examples"}`,
  closingHeading: "Your process does not have to match a card",
  closingBody: "Bring the task you want to improve. We can assess a different application using your systems, rules and records.",
  closingButton: "Discuss your process",
  functionsTitle: "Business functions",
  audienceTitle: "Who the examples are for",
  audienceNote: "Manufacturing, distribution, logistics and B2B services. Each card links to its examples; the process you want to improve can sit anywhere in the business.",
} as const;

/* ------------------------------------------------------------------ */
/* Text drawn in the 3D world and the evidence drawer. Owners: the 3D lane (faces.ts, OperationalScenes.tsx)
/* and the editorial lane (OperationEvidence.tsx). Check fit at DPR 2.                                      */
/* ------------------------------------------------------------------ */

export const FACES = {
  /** faces.ts decision(): the follow-up card's label and its foot line (who acts). */
  decisionLabel: "Follow-up · example",
  decisionFoot: `${STORY.owners.confirm} confirms · ${STORY.owners.review.toLowerCase()} reviews ${STORY.short.order}`,
  /** faces.ts layer(3): the rules the follow-up was prepared under. */
  policyChecks: ["Impact from verified allocations", `${STORY.owners.confirm} confirms the schedule`, `${STORY.owners.review} reviews affected orders`],
  /** faces.ts deduction ledger rows (finance): [record, value, held open]. */
  ledger: [
    [APP_FACTS.deduction.invoice, "Linked", false],
    [APP_FACTS.deduction.ack, "Linked", false],
    [APP_FACTS.deduction.note, "Unclear", true],
    [APP_FACTS.deduction.debit, inrShort(APP_FACTS.deduction.amount), true],
  ] as readonly (readonly [string, string, boolean])[],
  /** faces.ts daily brief rows (operations): [issue, owner, held open]. */
  brief: [
    ["Order book", "Linked", false],
    ["Supplier delay", "Buyer", true],
    ["Allocation", "Stores", true],
    ["Delivery hold", "Dispatch", true],
  ] as readonly (readonly [string, string, boolean])[],
  /** faces.ts hand faces: the status every function card in Scale's hand ends on. */
  ready: "Ready for your team",
  /** faces.ts hand art: each card's graphic, headed by a label and its figure (functions in order,
   *  then the glass layer card). */
  art: {
    labels: ["Order lines", "Supplier update", "Daily brief", "Deduction", "Service report", "Functions"],
    figures: [`${ORDER_COUNTS.matched} of ${ORDER_COUNTS.total}`, `${APP_FACTS.supplier.first} + ${APP_FACTS.supplier.rest}`, "3 open", inrShort(APP_FACTS.deduction.amount), "1 follow-up", "5"],
    /** The order card's legend: matched, then open. */
    legend: [`${ORDER_COUNTS.matched} matched`, `${ORDER_COUNTS.item + ORDER_COUNTS.unit} to confirm`],
    layer: "Records · Rules · Owner",
  },
  /** faces.ts glass(): the layer card dealt last onto Scale's hand, over every function. */
  layer: {
    title: "One way of building",
    body: "Your records, agreed rules and a named owner under every application.",
    foot: "Every function",
  },
  /** faces.ts final(): the ending's board. */
  final: {
    title: "Let’s find the right application for your business.",
    pill: "Free conversation · 30 minutes",
  },
  /** buildings.tsx: the stencil round the tote on the hero's warehouse island. */
  crate: `${APP_FACTS.order.po} · ${APP_FACTS.order.lines} LINES · ORDER INTAKE · `,
} as const;

/** OperationEvidence.tsx labels that carry scenario IDs and figures. */
export const EVIDENCE_LABELS = {
  stages: ["Situation", "Records", "Next step"],
  heldTotal: `${inr(APP_FACTS.deduction.amount)} FOR FINANCE TO REVIEW`,
} as const;
