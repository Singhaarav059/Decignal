// The three homepage demonstrations (handoff §5 home.demonstrations) and the worked examples the
// function pages reuse. Illustrative scenarios, never customer results: the counts stay inside the
// labelled example (handoff §11: 27 + 8 + 5 = 40; 60 + 40 = 100).
// No imports beyond types, so server components can read it.

export type Demonstration = {
  key: "order" | "supplier" | "service" | "operations" | "finance";
  /** The tab label. */
  tab: string;
  title: string;
  input: string;
  application: string;
  output: string;
  next: string;
  /** The application anchor it explores. */
  href: string;
  tone: string;
};

export const ORDER_COUNTS = { total: 40, matched: 27, item: 8, unit: 5 } as const;
export const SUPPLIER_COUNTS = { total: 100, first: 60, firstDay: "Friday", rest: 40, restDay: "Wednesday", item: "contactors" } as const;

export const DEMOS: Demonstration[] = [
  {
    key: "order",
    tab: "Order intake",
    title: "A customer order becomes a draft in the order queue",
    input: "A purchase order contains 40 lines, including customer item aliases and uncertain pack units.",
    application: "Match against the approved item catalogue and conversion rules. Keep uncertain matches out of the ready list.",
    output: "27 lines matched using approved references; 8 need item confirmation; 5 need quantity or unit clarification.",
    next: "The order desk resolves the 13 open lines and approves the draft before it reaches the order system.",
    href: "/solutions/commercial#sales-order-intake",
    tone: "tangerine",
  },
  {
    key: "supplier",
    tab: "Supplier follow-up",
    title: "A changed delivery promise becomes a clear follow-up",
    input: "A supplier changes 100 contactors due Friday to 60 on Friday and 40 the following Wednesday.",
    application: "Link the message to the purchase-order line and compare the change with verified customer allocations.",
    output: "A revised commitment, the original message and the customer orders that need checking.",
    next: "The buyer confirms the schedule and the sales team reviews affected customer commitments.",
    href: "/solutions/supply-chain#supplier-commitment-tracking",
    tone: "cobalt",
  },
  {
    key: "service",
    tab: "Service follow-up",
    title: "A recommendation becomes an assigned action",
    input: "A service report recommends a mechanical seal replacement at the next shutdown.",
    application: "Find the equipment record, retrieve the recommendation and check for an existing quote.",
    output: "A follow-up with a named owner, the report reference and the part or coverage questions still open.",
    next: "The service owner confirms the details before sales prepares the customer quotation.",
    href: "/solutions/customer#service-report-followup",
    tone: "pink",
  },
];

/** Worked examples that appear only on their function page (handoff §6). */
export const PAGE_DEMOS: Record<"operations" | "finance", Demonstration> = {
  operations: {
    key: "operations",
    tab: "Daily brief",
    title: "The morning review starts with the open questions",
    input: "The order book lists deliveries due this week. A buyer has a supplier update, and dispatch has placed one order on hold.",
    application: "Apply the agreed exception rules and link each issue to a verified order and the latest available record.",
    output: "An operational brief with the issue, source timestamp, responsible team and the next question to resolve.",
    next: "The operations owner confirms priorities. Missing allocation or status information remains visible.",
    href: "/solutions/operations#operational-exception-brief",
    tone: "emerald",
  },
  finance: {
    key: "finance",
    tab: "Deduction",
    title: "A short payment becomes a case finance can work through",
    input: "A ₹75,000 deduction is recorded against a reported delivery shortage.",
    application: "Link the debit note, invoice and available acknowledgement to the same transaction.",
    output: "A case containing the supporting records and an unresolved receiver note.",
    next: "Finance checks the evidence and decides whether to accept the deduction or respond.",
    href: "/solutions/finance-and-risk#customer-deduction-investigation",
    tone: "violet",
  },
};
