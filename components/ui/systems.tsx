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
  detail: string;
  /** Opened island: the product it stands for, its size, freshness and what Decignal reads from it. */
  product: string;
  records: string;
  sync: string;
  reads: [string, string][];
  /** What this system contributes to the decision, in one sentence. */
  role: string;
  /** Two figures side by side: the comparison that makes this system's fact matter. */
  compare: { label: string; value: string; f: number; risk?: boolean }[];
};

/** The six sources in the running example. Each keeps its colour everywhere it appears. */
export const SYSTEMS: SystemMeta[] = [
  { id: "erp", name: "ERP", full: "Enterprise resource planning", tone: "cobalt", Icon: Database, knows: "Stock on hand", value: "410 units", detail: "Bearing X90 · Plant 01", product: "SAP S/4HANA", records: "2.4M records", sync: "2 min ago", reads: [["Stock on hand · Plant 01", "410 units"], ["Safety stock", "175 units"], ["Transfer cost per unit", "INR 158"]], role: "The record of truth for stock. Its on-hand figure is what first falls toward safety stock.", compare: [{ label: "On hand · Plant 01", value: "410 units", f: 0.82 }, { label: "Safety stock", value: "175 units", f: 0.35, risk: true }] },
  { id: "crm", name: "CRM", full: "Customer relationships", tone: "violet", Icon: Users, knows: "Open orders", value: "+18%", detail: "Over the last 3 weeks", product: "Salesforce", records: "86k accounts", sync: "5 min ago", reads: [["Open orders · X90", "+18% in 3 wks"], ["Largest account", "Orbis Motors"], ["Orders due this month", "1,120 units"]], role: "Shows demand before it reaches the plant. A rise in open orders is the evidence the shortage is real.", compare: [{ label: "Open orders, 3 weeks ago", value: "950 units", f: 0.72 }, { label: "Open orders, today", value: "1,120 units", f: 0.85 }] },
  { id: "mes", name: "MES", full: "Manufacturing execution", tone: "emerald", Icon: Factory, knows: "Production plan", value: "1,240 / wk", detail: "Line 02 · Plant 01", product: "Siemens Opcenter", records: "14 lines", sync: "Live", reads: [["Line 02 plan", "1,240 / week"], ["X90 used per unit", "2 bearings"], ["Next changeover", "Thursday"]], role: "Turns demand into consumption. Line 02 uses two X90 bearings per unit it builds.", compare: [{ label: "Line 02 plan", value: "1,240 / wk", f: 0.83 }, { label: "Line 02 capacity", value: "1,500 / wk", f: 1 }] },
  { id: "wms", name: "WMS", full: "Warehouse management", tone: "saffron", Icon: Warehouse, knows: "Surplus at Plant 02", value: "620 units", detail: "Above plan", product: "Manhattan WMS", records: "38k bins", sync: "1 min ago", reads: [["Plant 02 stock", "620 units"], ["Plant 02 plan", "380 units"], ["Dock 3 free", "Today, 14:00"]], role: "Knows where stock physically sits. Plant 02 holds more than its own plan needs.", compare: [{ label: "Plant 02 stock", value: "620 units", f: 0.9 }, { label: "Plant 02 plan", value: "380 units", f: 0.55 }] },
  { id: "sup", name: "Suppliers", full: "Supplier portals", tone: "tangerine", Icon: Truck, knows: "Next delivery", value: "21 days", detail: "Vendor 1140", product: "Supplier portal", records: "212 vendors", sync: "1 hr ago", reads: [["Vendor 1140 next delivery", "21 days"], ["Expedite option", "+INR 92k"], ["On-time rate", "91%"]], role: "Says when relief arrives from outside. Too late here, which rules out waiting.", compare: [{ label: "Shortage in", value: "6 days", f: 0.29, risk: true }, { label: "Next supplier delivery", value: "21 days", f: 1 }] },
  { id: "ext", name: "External", full: "The outside world", tone: "pink", Icon: Globe, knows: "Inter-plant lane", value: "Clear", detail: "Next 14 days", product: "Freight, weather and traffic feeds", records: "6 sources", sync: "15 min ago", reads: [["Plant 02 to 01 lane", "Clear, 2 days"], ["Rain risk on route", "Low"], ["Spot freight rate", "INR 38k"]], role: "Checks the world between plants: the road, the weather and what freight costs today.", compare: [{ label: "Transfer by road", value: "2 days", f: 0.1 }, { label: "Wait for supplier", value: "21 days", f: 1 }] },
];

export const tone = (t: string) => `var(--color-${t})`;
/** A solid, light tint of a palette colour (no gradients). */
export const tint = (t: string, pct = 12) => `color-mix(in srgb, var(--color-${t}) ${pct}%, white)`;

export function IconChip({
  Icon,
  t,
  size = 40,
  solid = false,
}: {
  Icon: LucideIcon;
  t: string;
  size?: number;
  solid?: boolean;
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[30%]"
      style={{
        width: size,
        height: size,
        background: solid ? tone(t) : tint(t),
        color: solid ? "#fff" : tone(t),
      }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.48)} strokeWidth={1.9} />
    </span>
  );
}
