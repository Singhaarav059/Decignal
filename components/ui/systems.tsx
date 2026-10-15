import {
  Database,
  ClipboardList,
  ShieldCheck,
  Factory,
  Truck,
  FolderOpen,
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
  /** Opened island: what it holds in the example, the sample's size, and what the review uses from it.
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

/** The six record sources in the worked example (lib/example.ts). Each keeps its colour everywhere it appears. */
export const SYSTEMS: SystemMeta[] = [
  { id: "erp", name: "ERP", full: "ERP and accounting", tone: "cobalt", Icon: Database, knows: "Line 12 heat", value: "H241", short: "Line 12 · H241", detail: "Shipment SHP-0612", product: "Delivery-line export", records: "14 delivery lines", sync: "Authorised export", reads: [["Line 12 · Flange F-80", "40 pieces"], ["Heat on record", "H241"], ["Shipment", "SHP-0612"]], role: "The record of what is being shipped. Line 12’s heat number is what every certificate must match.", compare: [{ label: "Heat on the delivery line", value: "H241", f: 0.8 }, { label: "Heat on the certificate", value: "H214", f: 0.8, risk: true }] },
  { id: "crm", name: "Customer", full: "Customer requirements", tone: "violet", Icon: ClipboardList, knows: "Checklist", value: "Rev C", short: "Checklist Rev C", detail: "Six documents per shipment", product: "Approved customer checklist", records: "6 required documents", sync: "Approved file", reads: [["Checklist revision", "Rev C"], ["Documents per shipment", "6"], ["Heat traceability", "Required"]], role: "Says what the customer requires. Every document in the pack is checked against this revision.", compare: [{ label: "Required by the checklist", value: "6 documents", f: 1 }, { label: "Supported so far", value: "4 documents", f: 0.67 }] },
  { id: "mes", name: "Quality", full: "Quality records", tone: "emerald", Icon: ShieldCheck, knows: "Line 12 reports", value: "2 found", short: "2 reports found", detail: "Dimensional and test reports", product: "Inspection and test reports", records: "Reports for 14 lines", sync: "Authorised export", reads: [["Dimensional report · line 12", "Supported"], ["Test report · line 12", "Supported"], ["Reviewer", "Quality"]], role: "Holds the internal evidence. The reports for line 12 are present and match the delivery record.", compare: [{ label: "Internal reports needed", value: "2", f: 1 }, { label: "Found for line 12", value: "2", f: 1 }] },
  { id: "wms", name: "Job work", full: "Job workers and processors", tone: "saffron", Icon: Factory, knows: "Heat treatment", value: "Not found", short: "Not found", detail: "Job worker 03", product: "Process certificates and challans", records: "3 job workers", sync: "Supplied files", reads: [["Heat-treatment certificate", "Not found"], ["Processor", "Job worker 03"], ["Challan for line 12", "JW-0412"]], role: "Holds external-process evidence. The certificate the checklist needs is not in the supplied files.", compare: [{ label: "Process certificates required", value: "1", f: 1 }, { label: "Process certificates found", value: "0", f: 0.04, risk: true }] },
  { id: "sup", name: "Suppliers", full: "Supplier documents", tone: "tangerine", Icon: Truck, knows: "Certificate heat", value: "H214", short: "Certificate · H214", detail: "Supplier 07", product: "Material certificates", records: "9 certificates", sync: "Supplied files", reads: [["Material certificate", "Heat H214"], ["Supplier", "Supplier 07"], ["Linked to line", "12 (proposed)"]], role: "Supplies the material evidence. Its heat number does not match the delivery line, so the link stays open.", compare: [{ label: "Heat on the delivery line", value: "H241", f: 0.8 }, { label: "Heat on the certificate", value: "H214", f: 0.8, risk: true }] },
  { id: "ext", name: "Files", full: "Authorised email and folders", tone: "pink", Icon: FolderOpen, knows: "Shipment folder", value: "11 files", short: "11 files", detail: "Scans and attachments", product: "Shared shipment folder", records: "11 files", sync: "Authorised folder", reads: [["Files supplied", "11"], ["Scans", "4"], ["Unreadable pages", "0"]], role: "Where documents actually arrive. Every file is read where it is; nothing is assumed from chats or portals.", compare: [{ label: "Files supplied", value: "11", f: 1 }, { label: "Linked to a checklist item", value: "9", f: 0.82 }] },
];
