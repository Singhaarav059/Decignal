// The five business functions: one source for the directory and the function pages at /solutions/{slug}
// (handoff revision 3, §4 and §6). No "use client" and no three.js, so server components can import it.
// Each page: hero, three outcome bullets, three application records (lib/content.ts), one worked example
// (lib/demonstrations.ts), two questions and a closing call to action.

import { APPLICATIONS, CATEGORIES, CATEGORY_TONE, type Category } from "./content";
import { DEMOS, PAGE_DEMOS, type Demonstration } from "./demonstrations";
import type { Headline } from "./copy";

export type { Headline };

/** The service routes: app/solutions/[slug] and app/sitemap.ts read these. Fixed: the URLs are kept. */
export const AREA_SLUGS = ["commercial", "supply-chain", "operations", "finance-and-risk", "customer"] as const;
export type AreaSlug = (typeof AREA_SLUGS)[number];

export type Area = {
  slug: AreaSlug;
  /** Display name, the same string as its Category. */
  name: Category;
  category: Category;
  /** System colour name (CATEGORY_TONE): the dot, number and headline accent line. */
  tone: string;
  /** Position in CATEGORIES. */
  index: number;
  /** The function summary (handoff §6 business function summaries). */
  lead: string;
  /** Solution hero: two lines, the second is the accent line. */
  headline: Headline;
  /** The introduction under the headline. */
  valueProp: string;
  /** Page title (used as given) and meta description (handoff §9). */
  meta: { title: string; description: string };
  /** "What changes": three bullets. */
  outcomes: string[];
  /** The application records the page renders (APPLICATIONS ids). */
  workflowIds: string[];
  /** The one worked example, labelled "Illustrative example". */
  demo: Demonstration;
  faq: { q: string; a: string }[];
  /** The closing call to action. */
  closing: { heading: string; body: string };
};

/** Shared function-page copy (handoff §6: identical on every page). */
export const AREA_SHARED = {
  outcomesHeading: "What changes",
  appsHeading: "Application examples",
  exampleNote: "Application examples. Scope and integrations are agreed for each implementation.",
  exampleHeading: "Illustrative example",
  faqHeading: "Questions",
} as const;

const base = (slug: AreaSlug, category: Category) => ({
  slug,
  name: category,
  category,
  tone: CATEGORY_TONE[category],
  index: CATEGORIES.indexOf(category),
});

const demo = (key: Demonstration["key"]) => DEMOS.find((d) => d.key === key)!;

export const AREAS: Area[] = [
  {
    ...base("commercial", "Sales and order management"),
    lead: "Prepare enquiries, customer orders and supplier price updates for the people responsible for sales.",
    headline: ["Give your sales team", "a better starting point"],
    valueProp:
      "Customer enquiries, order messages and supplier price files arrive in different formats. We build applications that turn them into structured work for your sales team, with the relevant records and unresolved questions together.",
    meta: {
      title: "AI for Sales and Order Management | Decignal",
      description:
        "Explore customer order intake, RFQ preparation and supplier price list updates, scoped around your sales process and existing software.",
    },
    outcomes: [
      "Prepare enquiry and order details without repeatedly copying them between files.",
      "Keep item, unit, price and revision questions visible before a customer commitment.",
      "Pass approved work into the systems your team already uses.",
    ],
    workflowIds: ["sales-order-intake", "rfq-preparation", "supplier-price-updates"],
    demo: demo("order"),
    faq: [
      {
        q: "Will an application price a quote or choose a substitute?",
        a: "It can use approved pricing rules and catalogue references within the agreed scope. Technical suitability, exceptions and customer commitments follow your approval process.",
      },
      {
        q: "Can it handle customer item codes and pack sizes?",
        a: "We build against reviewed aliases and conversion rules. Unknown or conflicting references are returned to the order desk for confirmation.",
      },
    ],
    closing: {
      heading: "Where does your sales team lose time before an order is ready?",
      body: "Bring an example of the enquiry, order or price update. We will discuss the process and what a useful application would produce.",
    },
  },
  {
    ...base("supply-chain", "Procurement and supply chain"),
    lead: "Compare quotations, track supplier commitments and reconcile job-work records.",
    headline: ["Keep purchasing work moving", "as the details change"],
    valueProp:
      "Supplier quotations, revised commitments and external processing records can leave buyers piecing together the current position. We build applications that organise those inputs and turn them into clear comparisons and follow-ups.",
    meta: {
      title: "AI for Procurement and Supply Chain | Decignal",
      description:
        "Explore supplier quotation comparison, commitment tracking and job-work reconciliation with the records your purchasing team uses.",
    },
    outcomes: [
      "Compare quotations with the commercial differences visible.",
      "Capture revised quantities and dates against the right purchase-order lines.",
      "Reconcile external processing records with the evidence attached.",
    ],
    workflowIds: ["purchase-quote-comparison", "supplier-commitment-tracking", "job-work-reconciliation"],
    demo: demo("supplier"),
    faq: [
      {
        q: "Does this replace our procurement or planning system?",
        a: "The application is scoped around a specific process and its existing systems. Purchasing records, planning logic and approvals remain where they belong.",
      },
      {
        q: "Can it show which customer orders a supplier delay affects?",
        a: "Where reliable allocation or requirement links exist, the application can use them. If those links are missing, it flags the information needed instead of inventing an impact.",
      },
    ],
    closing: {
      heading: "Which purchasing task needs more attention than it should?",
      body: "Show us a quotation comparison, supplier update or reconciliation that your team handles repeatedly.",
    },
  },
  {
    ...base("operations", "Operations and delivery"),
    lead: "Prepare operational briefs, capture production records and follow up on delivery evidence.",
    headline: ["Bring the next operational", "decision into view"],
    valueProp:
      "A daily review can involve an order book, several trackers, shift records and delivery updates. We build applications that bring the relevant information together, capture records and organise the work that needs attention.",
    meta: {
      title: "AI for Operations and Delivery | Decignal",
      description:
        "Explore daily operational briefs, production record capture and delivery follow-up built around your team’s records and decisions.",
    },
    outcomes: [
      "Prepare a daily view of exceptions with sources and owners.",
      "Capture production information without hiding missing or uncertain entries.",
      "Keep delivery evidence and outstanding follow-ups linked to the shipment.",
    ],
    workflowIds: ["operational-exception-brief", "production-record-capture", "delivery-document-followup"],
    demo: PAGE_DEMOS.operations,
    faq: [
      {
        q: "Is this a production planning or transport management system?",
        a: "The examples focus on specific information and coordination tasks. We assess existing ERP, MES, WMS and transport tools before deciding what to build.",
      },
      {
        q: "Can dispatch checks include customer-specific documents?",
        a: "Yes, a scoped workflow can include a customer checklist and supporting documents where required. Quality and dispatch approvals stay with the responsible team.",
      },
    ],
    closing: {
      heading: "What does your team have to assemble before the daily review?",
      body: "Bring the reports, messages and questions that slow down coordination. We will help identify a useful starting point.",
    },
  },
  {
    ...base("finance-and-risk", "Finance and receivables"),
    lead: "Investigate deductions, review freight bills and match payment advice to invoices.",
    headline: ["Give finance the context", "behind the difference"],
    valueProp:
      "A short payment, an extra freight charge or an unclear remittance can trigger a search across several teams. We build applications that link the records, explain what is documented and prepare the unresolved items for finance.",
    meta: {
      title: "AI for Finance and Receivables | Decignal",
      description:
        "Explore applications for customer deductions, freight bill review and payment advice matching, with supporting records ready for finance.",
    },
    outcomes: [
      "Bring deductions and supporting evidence into one case.",
      "Review charges against the relevant agreement and operational records.",
      "Prepare payment allocations with unmatched amounts kept visible.",
    ],
    workflowIds: ["customer-deduction-investigation", "freight-bill-review", "payment-advice-matching"],
    demo: PAGE_DEMOS.finance,
    faq: [
      {
        q: "Will an application post entries or approve a payment?",
        a: "Write-back and approvals are defined in the project scope. The examples begin with preparation and review; accounting decisions follow your controls.",
      },
      {
        q: "Will it guarantee recovery of deductions or savings?",
        a: "No. We measure the preparation effort and reviewed findings. Recoveries and savings depend on the underlying facts and the decisions that follow.",
      },
    ],
    closing: {
      heading: "Which differences take too long to investigate?",
      body: "Tell us about a recurring deduction, freight-charge question or remittance problem and how your team resolves it today.",
    },
  },
  {
    ...base("customer", "Service and support"),
    lead: "Prepare service cases, act on report recommendations and find approved technical information.",
    headline: ["Carry customer requests", "through to the next step"],
    valueProp:
      "A customer message, a technician’s report and a technical manual often belong to the same service job. We build applications that connect this information and help the right person respond or follow up.",
    meta: {
      title: "AI for Service and Support | Decignal",
      description:
        "Explore service request intake, report follow-up and source-linked technical knowledge for equipment and B2B service teams.",
    },
    outcomes: [
      "Prepare a complete service case with the right asset and history.",
      "Give recommendations in reports a clear owner and next step.",
      "Retrieve approved technical information for the right model and revision.",
    ],
    workflowIds: ["service-case-intake", "service-report-followup", "service-knowledge-assistant"],
    demo: demo("service"),
    faq: [
      {
        q: "Can it work with our service or helpdesk software?",
        a: "We review the existing workflow and available access, then define where the application fits. A configuration change may be enough for some tasks.",
      },
      {
        q: "Can it decide warranty coverage or recommend repairs?",
        a: "It can retrieve relevant records and approved guidance within scope. Qualified staff confirm diagnosis, part compatibility, coverage and safety-critical actions.",
      },
    ],
    closing: {
      heading: "Where does a customer request or recommendation lose momentum?",
      body: "Bring a recent service case or report. We will work through the information, handover and next action with you.",
    },
  },
];

export const areaBySlug = (slug: string) => AREAS.find((a) => a.slug === slug);
export const areaOf = (category: Category) => AREAS.find((a) => a.category === category)!;
export const areaHref = (category: Category) => `/solutions/${areaOf(category).slug}`;
/** An application's anchor on its function page. */
export const appHref = (app: { id: string; category: Category }) => `${areaHref(app.category)}#${app.id}`;

/** The function's applications with their index in APPLICATIONS. */
export const appsOf = (area: Area) => APPLICATIONS.map((x, i) => ({ ...x, i })).filter((x) => x.category === area.category);

/** The applications a page renders, in its workflowIds order, with their index in APPLICATIONS. */
export const pageApps = (area: Area) =>
  area.workflowIds.map((id) => {
    const i = APPLICATIONS.findIndex((a) => a.id === id);
    return { ...APPLICATIONS[i], i };
  });

/** The function-page hero eyebrow. */
export const areaEyebrow = () => "Application examples";
