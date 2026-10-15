// One photograph per business function: the kind of place its work happens. Stock photography
// (Unsplash License, sources in assets/photos/CREDITS.md), illustrative only, never a customer site.
// Shown as a duotone in the function's colour (AreaPhoto.tsx, editorial.css), never raw, so every place
// sits in the site's palette and flat with the panels.

import type { StaticImageData } from "next/image";
import type { AreaSlug } from "./areas";
import trucks from "@/assets/photos/sys-sup.jpg";
import machining from "@/assets/photos/machining.jpg";
import distributor from "@/assets/photos/distributor.jpg";
import service from "@/assets/photos/service.jpg";
import financeAndRisk from "@/assets/photos/finance-and-risk.jpg";

export const AREA_PHOTO: Record<AreaSlug, { src: StaticImageData; alt: string }> = {
  "supply-chain": { src: trucks, alt: "Trailers parked in a truck yard, seen from above" },
  operations: { src: machining, alt: "A metal shaft being machined on a lathe" },
  commercial: { src: distributor, alt: "Tall racking stocked with boxed industrial supplies in a distributor's warehouse" },
  customer: { src: service, alt: "A technician in a hard hat testing an electrical panel" },
  "finance-and-risk": { src: financeAndRisk, alt: "Figures on a tablet, read with a stylus" },
};
