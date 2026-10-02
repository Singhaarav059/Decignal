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
};

/** The six sources in the running example. Each keeps its colour everywhere it appears. */
export const SYSTEMS: SystemMeta[] = [
  { id: "erp", name: "ERP", full: "Enterprise resource planning", tone: "cobalt", Icon: Database, knows: "Stock on hand", value: "410 units", detail: "Bearing X90 · Plant 01" },
  { id: "crm", name: "CRM", full: "Customer relationships", tone: "violet", Icon: Users, knows: "Open orders", value: "+18%", detail: "Over the last 3 weeks" },
  { id: "mes", name: "MES", full: "Manufacturing execution", tone: "emerald", Icon: Factory, knows: "Production plan", value: "1,240 / wk", detail: "Line 02 · Plant 01" },
  { id: "wms", name: "WMS", full: "Warehouse management", tone: "saffron", Icon: Warehouse, knows: "Surplus at Plant 02", value: "620 units", detail: "Above plan" },
  { id: "sup", name: "Suppliers", full: "Supplier portals", tone: "tangerine", Icon: Truck, knows: "Next delivery", value: "21 days", detail: "Vendor 1140" },
  { id: "ext", name: "External", full: "Freight and weather", tone: "pink", Icon: Globe, knows: "Inter-plant lane", value: "Clear", detail: "Next 14 days" },
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
