import {
  Database,
  Users,
  Factory,
  Warehouse,
  Truck,
  Globe,
  type LucideIcon,
} from "lucide-react";

export type SystemMeta = {
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
  /** Opened island: what it covers in the example, its size, freshness and what Decignal reads from it. No vendor names (D8). */
  product: string;
  records: string;
  sync: string;
  reads: [string, string][];
  /** What this system contributes to the decision, in one sentence. */
  role: string;
  /** Two figures side by side: the comparison that makes this system's fact matter. */
  compare: { label: string; value: string; f: number; risk?: boolean }[];
};

/** The six sources in the running example (lib/example.ts). Each keeps its colour everywhere it appears. */
export const SYSTEMS: SystemMeta[] = [
  { id: "erp", name: "ERP", full: "Enterprise resource planning", tone: "cobalt", Icon: Database, knows: "Stock on hand", value: "410 units", short: "On hand 410", detail: "Bearing X90 · Plant 01", product: "Plants 01 and 02", records: "2.4M records", sync: "2 min ago", reads: [["Stock on hand · Plant 01", "410 units"], ["Safety stock", "175 units"], ["Transfer cost per unit", "INR 158"]], role: "The record of truth for stock. Its on-hand figure is what first falls toward safety stock.", compare: [{ label: "On hand · Plant 01", value: "410 units", f: 0.82 }, { label: "Safety stock", value: "175 units", f: 0.35, risk: true }] },
  { id: "crm", name: "CRM", full: "Customer relationships", tone: "violet", Icon: Users, knows: "Open orders", value: "+18%", short: "Orders +18%", detail: "Over the last 3 weeks", product: "Dealer and account orders", records: "86k accounts", sync: "5 min ago", reads: [["Open orders · X90", "+18% in 3 weeks"], ["Accounts ordering X90", "37"], ["Orders due this month", "1,120 units"]], role: "Shows demand before it reaches the plant. A rise in open orders is the evidence the shortage is real.", compare: [{ label: "Open orders, 3 weeks ago", value: "950 units", f: 0.72 }, { label: "Open orders, today", value: "1,120 units", f: 0.85 }] },
  { id: "mes", name: "MES", full: "Manufacturing execution", tone: "emerald", Icon: Factory, knows: "X90 used", value: "45 / day", short: "X90 · 45 / day", detail: "Line 02 · Plant 01", product: "Plant 01 production lines", records: "14 lines", sync: "1 min ago", reads: [["X90 used per day", "45 units"], ["X90 per unit built", "2 bearings"], ["Next changeover", "Thursday"]], role: "Turns demand into consumption. Line 02 draws 45 X90 bearings a day, two for every unit it builds.", compare: [{ label: "Line 02 plan", value: "157 / week", f: 0.83 }, { label: "Line 02 capacity", value: "190 / week", f: 1 }] },
  { id: "wms", name: "WMS", full: "Warehouse management", tone: "saffron", Icon: Warehouse, knows: "Stock at Plant 02", value: "620 units", short: "Plant 02 · 620", detail: "240 transferable above plan", product: "Plant 02 warehouse", records: "38k bins", sync: "1 min ago", reads: [["Plant 02 stock", "620 units"], ["Plant 02 plan", "380 units"], ["Dock 3 free", "Today, 14:00"]], role: "Knows where stock physically sits. Plant 02 holds more than its own plan needs.", compare: [{ label: "Plant 02 stock", value: "620 units", f: 0.9 }, { label: "Plant 02 plan", value: "380 units", f: 0.55 }] },
  { id: "sup", name: "Suppliers", full: "Supplier portals", tone: "tangerine", Icon: Truck, knows: "Next delivery", value: "21 days", short: "Delivery 21 days", detail: "Vendor 1140", product: "Vendor portals and confirmations", records: "212 vendors", sync: "1 hr ago", reads: [["Vendor 1140 next delivery", "21 days"], ["Expedite option", "+INR 92,000"], ["On-time rate", "91%"]], role: "Says when relief arrives from outside. Too late here, which rules out waiting.", compare: [{ label: "Shortage in", value: "6 days", f: 0.29, risk: true }, { label: "Next supplier delivery", value: "21 days", f: 1 }] },
  { id: "ext", name: "External", full: "The outside world", tone: "pink", Icon: Globe, knows: "Inter-plant lane", value: "Clear", short: "Lane clear", detail: "Next 14 days", product: "Freight, weather and traffic feeds", records: "6 feeds", sync: "15 min ago", reads: [["Lane, Plant 02 to Plant 01", "Clear, 2 days"], ["Rain risk on route", "Low"], ["Freight for 3 pallets", "INR 38,000"]], role: "Checks the world between plants: the road, the weather and what freight costs today.", compare: [{ label: "Transfer by road", value: "2 days", f: 0.1 }, { label: "Wait for supplier", value: "21 days", f: 1 }] },
];

export const tone = (t: string) => `var(--color-${t})`;
