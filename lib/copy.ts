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

import { APP_FACTS, inr, inrShort } from "./example";
import { ORDER_COUNTS } from "./demonstrations";
import { PLACEHOLDER } from "./placeholders";

export type Headline = readonly [string, string];

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
  /** Two lines, line 2 in the chapter tone. */
  title: Headline;
  /** At most 2 lines in the 440px card (95 characters or fewer). */
  body: string;
};

/**
 * Chapters, index-aligned with CHAPTERS in lib/story.ts (index 0 is the hero, above): the five
 * functions, the four industries and the close.
 */
export const CHAPTER_COPY: (ChapterCopy | null)[] = [
  null,
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
 * None reads as a result: they count the catalogue and the offer.
 */
type ChapterFact = { value: string; unit?: string; label: string; source: string; tone: string; risk?: boolean };
export const CHAPTER_FACTS: (ChapterFact[] | null)[] = [
  null,
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
  title: "The overview in four parts",
  sub: "What we build, across five functions and four industries.",
  chapters: [
    "Custom AI applications for Indian businesses",
    "Applications across five business functions",
    "Examples for four industries",
    "Find the right application for your business",
  ],
  groups: [
    { name: "The offer", from: 0 },
    { name: "Where it applies", from: 1 },
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

/** Systems (handoff §5 systems, #systems). Groups are SOURCE_GROUPS in lib/content.ts. */
export const SYSTEMS_STRIP = {
  eyebrow: "Your systems",
  headline: ["Build around the systems", "you already use"] as Headline,
  intro: "Your ERP, accounting software, CRM and service tools hold important records. Email, spreadsheets and documents often hold the rest. We agree how the application will use those sources and where its output belongs.",
  note: "Tell us the software and versions you use. We confirm access, supported formats and integration scope during discovery.",
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
    lead: `This notice explains how ${PLACEHOLDER.operator} handles personal information submitted through the Decignal website. For questions, contact ${PLACEHOLDER.privacyEmail}.`,
    effective: `Effective ${PLACEHOLDER.effective}`,
    sections: [
      {
        title: "Who operates this website",
        text: `This website is operated by ${PLACEHOLDER.operator}. You can reach us at ${PLACEHOLDER.email}.`,
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
        text: `Questions about these terms can be sent to ${PLACEHOLDER.email}.`,
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
} as const;

/* ------------------------------------------------------------------ */
/* Text drawn in the 3D world and the evidence drawer. Owners: the 3D lane (faces.ts, OperationalScenes.tsx)
/* and the editorial lane (OperationEvidence.tsx). Check fit at DPR 2.                                      */
/* ------------------------------------------------------------------ */

export const FACES = {
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
