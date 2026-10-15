// One photograph per business function: the kind of place its work happens. Stock photography
// (Unsplash License, sources in assets/photos/CREDITS.md), illustrative only, never a customer site.
// Shown as a duotone in the function's colour (AreaPhoto.tsx, editorial.css), never raw, so every place
// sits in the site's palette and flat with the panels.

import type { StaticImageData } from "next/image";
import type { AreaSlug } from "./areas";
import trucks from "@/assets/photos/sys-sup.jpg";
import warehouse from "@/assets/photos/supply-chain.jpg";
import reviewing from "@/assets/photos/sys-crm.jpg";
import line from "@/assets/photos/sys-mes.jpg";
import financeAndRisk from "@/assets/photos/finance-and-risk.jpg";

export const AREA_PHOTO: Record<AreaSlug, { src: StaticImageData; alt: string }> = {
  "supply-chain": { src: trucks, alt: "Trailers parked in a truck yard, seen from above" },
  operations: { src: warehouse, alt: "A forklift driving down an aisle of pallet racking ready for dispatch" },
  commercial: { src: reviewing, alt: "Three colleagues reviewing documents together" },
  customer: { src: line, alt: "An automated line of installed industrial equipment" },
  "finance-and-risk": { src: financeAndRisk, alt: "Figures on a tablet, read with a stylus" },
};
