// One photograph per business area: the kind of place its decisions are made. Stock photography
// (Unsplash License, sources in assets/photos/CREDITS.md), illustrative only, never a client site.
// Shown as a duotone in the area's colour (AreaPhoto.tsx, editorial.css), never raw, so every place
// sits in the site's palette and flat with the panels.

import type { StaticImageData } from "next/image";
import type { AreaSlug } from "./areas";
import supplyChain from "@/assets/photos/supply-chain.jpg";
import operations from "@/assets/photos/operations.jpg";
import commercial from "@/assets/photos/commercial.jpg";
import customer from "@/assets/photos/customer.jpg";
import financeAndRisk from "@/assets/photos/finance-and-risk.jpg";

export const AREA_PHOTO: Record<AreaSlug, { src: StaticImageData; alt: string }> = {
  "supply-chain": { src: supplyChain, alt: "A forklift driving down an aisle of pallet racking" },
  operations: { src: operations, alt: "An industrial robot arm on a production line" },
  commercial: { src: commercial, alt: "A dealer showroom floor full of cars" },
  customer: { src: customer, alt: "A service agent with a headset at a computer" },
  "finance-and-risk": { src: financeAndRisk, alt: "Charts on a tablet, read with a stylus" },
};
