import {
  Database,
  ClipboardList,
  Wrench,
  Sheet,
  FileText,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

type SystemMeta = {
  id: string;
  name: string;
  full: string;
  tone: string;
  Icon: LucideIcon;
  knows: string;
  value: string;
  /** The same fact in a few words, for the island tag on a phone. */
  short: string;
  detail: string;
  /** Opened island: what it holds in the example, the sample's size, and what the application uses from it.
   *  No vendor names as connectors, no live-sync claims (handoff home.systems). */
  product: string;
  records: string;
  /** The kind of input the example assumes: an authorised export or file, never a live connection. */
  sync: string;
  reads: [string, string][];
  /** What this source contributes to the review, in one sentence. */
  role: string;
  /** Two figures side by side: the comparison that makes this source's record matter. */
  compare: { label: string; value: string; f: number; risk?: boolean }[];
};

/** The six kinds of record an application works from. Each keeps its colour everywhere it appears. The
 *  figures are from the illustrative demonstrations (lib/demonstrations.ts), never results. */
export const SYSTEMS: SystemMeta[] = [
  { id: "erp", name: "ERP", full: "ERP and accounting", tone: "cobalt", Icon: Database, knows: "Customer order", value: "40 lines", short: "Order · 40 lines", detail: "Open orders and invoices", product: "Order and invoice records", records: "Orders, invoices, receipts", sync: "Agreed access or export", reads: [["Customer purchase order", "40 lines"], ["Matched to approved references", "27 lines"], ["For the order desk", "13 lines"]], role: "Holds the orders, invoices and receipts the application works from. The system stays the record.", compare: [{ label: "Lines in the order", value: "40", f: 1 }, { label: "Matched with approved references", value: "27", f: 0.675 }] },
  { id: "crm", name: "CRM", full: "CRM and customer records", tone: "violet", Icon: ClipboardList, knows: "Item aliases", value: "Approved", short: "Aliases · approved", detail: "Customer item references", product: "Customer and item masters", records: "Customers, aliases, price lists", sync: "Agreed access or export", reads: [["Customer item code", "Old alias"], ["Pack unit", "To confirm"], ["Price list", "Current"]], role: "Says how each customer names items and units, so an order line can be matched to the catalogue.", compare: [{ label: "Lines needing item confirmation", value: "8", f: 0.2 }, { label: "Lines needing unit clarification", value: "5", f: 0.125, risk: true }] },
  { id: "mes", name: "Service", full: "Inventory and service records", tone: "emerald", Icon: Wrench, knows: "Pump P-07", value: "Seal due", short: "Seal at shutdown", detail: "Asset and service history", product: "Asset and service records", records: "Assets, stock and history", sync: "Agreed access or export", reads: [["Equipment", "Pump P-07"], ["Recommendation", "Mechanical seal"], ["Existing quote", "None found"]], role: "Holds the equipment and its history, so a recommendation reaches the right asset and owner.", compare: [{ label: "Recommendations in the report", value: "1", f: 1 }, { label: "Assigned to an owner", value: "1", f: 1 }] },
  { id: "wms", name: "Sheets", full: "Spreadsheets and trackers", tone: "saffron", Icon: Sheet, knows: "PO tracker", value: "Updated", short: "Tracker · updated", detail: "Purchase-order follow-up sheet", product: "Trackers and price files", records: "Trackers, price files, shift sheets", sync: "Shared file", reads: [["PO line", "100 contactors"], ["Due Friday", "60"], ["Due Wednesday", "40"]], role: "Where many teams keep the current position. The application reads it alongside the system record.", compare: [{ label: "Promised for Friday", value: "100", f: 1 }, { label: "Now due Friday", value: "60", f: 0.6, risk: true }] },
  { id: "sup", name: "Documents", full: "Documents and files", tone: "tangerine", Icon: FileText, knows: "Quotations", value: "3 received", short: "3 quotations", detail: "Supplier quotations", product: "Orders, quotations and reports", records: "PDFs, scans and spreadsheets", sync: "Authorised folder", reads: [["Quotation A", "Per box"], ["Quotation B", "Freight excluded"], ["Quotation C", "Later delivery"]], role: "Where documents arrive. Each is read where it is and linked to the record it belongs to.", compare: [{ label: "Quotations received", value: "3", f: 1 }, { label: "On a comparable basis", value: "1", f: 0.33, risk: true }] },
  { id: "ext", name: "Messages", full: "Business communications", tone: "pink", Icon: MessageSquare, knows: "Supplier email", value: "Date changed", short: "New delivery date", detail: "Approved mailbox", product: "Approved email and messaging", records: "Approved channels only", sync: "Authorised mailbox", reads: [["From", "Supplier"], ["Change", "60 Friday, 40 Wednesday"], ["Purchase-order line", "Proposed link"]], role: "Changes often arrive as messages. Only approved business channels are read, never private chats.", compare: [{ label: "Messages in the workflow", value: "1", f: 1 }, { label: "Linked to a PO line", value: "1", f: 1 }] },
];
