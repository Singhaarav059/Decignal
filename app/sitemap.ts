import type { MetadataRoute } from "next";
import { AREA_SLUGS } from "@/lib/areas";
import { CONTENT_UPDATED, SITE_URL } from "@/lib/site";

// Home, the solutions index and the five service pages (app/solutions). A constant date keeps the
// output deterministic.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/solutions`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
    ...AREA_SLUGS.map((slug) => ({
      url: `${SITE_URL}/solutions/${slug}`,
      lastModified: CONTENT_UPDATED,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
