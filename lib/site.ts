// Site-wide constants for metadata, icons, the OG image and JSON-LD.
// ImageResponse, themeColor and the manifest cannot read CSS variables, so the brand hexes live here.
// The words come from the copy deck (lib/copy.ts META and HERO); this file only names them.

import { HERO, META } from "./copy";

const DEFAULT_SITE_URL = "https://decignal.up.railway.app";

/** Absolute origin. Set NEXT_PUBLIC_SITE_URL at build time when the domain changes. A bare host
 *  ("decignal.com") gets https, a path or trailing slash is dropped, and a value that is not a URL at all
 *  falls back to the default instead of failing the build in metadataBase. */
export const SITE_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  try {
    return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
})();
export const SITE_NAME = "Decignal";
export const SITE_TITLE = META.title;
export const SITE_DESCRIPTION = META.description;
/** openGraph and twitter title and description. */
export const SHARE_TITLE = META.shareTitle;
export const SHARE_DESCRIPTION = META.shareDescription;
/** The OG image's line under the headline. */
export const OG_FOOTER = META.ogFooter;

/** Shown in the footer and privacy page only when the owner sets it. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined;

/** The visible hero headline (the page h1); the OG image reads the same lines. */
export const HERO_LINES = HERO.headline;

/** Mirrors the @theme colours in app/styles/tokens.css. Update both together. */
export const BRAND = {
  bg: "#EEF1F7",
  surface: "#FFFFFF",
  sunken: "#EDEFF3",
  ink: "#0F1217",
  inkSoft: "#555D6B",
  cobalt: "#2E5BFF",
  violet: "#7C5CFF",
  emerald: "#0FA874",
  saffron: "#FFB21E",
  tangerine: "#FF7438",
  pink: "#FF5FA2",
  signal: "#F2361F",
} as const;

/** The three plates of the logo mark (components/ui/Logo.tsx) in paint order, bottom plate first, 32 unit box. */
export const LOGO_PLATES = [
  { d: "M16 21.5 4 15.6l12-5.9 12 5.9z", fill: BRAND.cobalt },
  { d: "M16 16.8 4 10.9 16 5l12 5.9z", fill: BRAND.saffron },
  { d: "M16 12.1 4 6.2 16 .3l12 5.9z", fill: BRAND.signal },
] as const;
/** viewBox that centres the mark in a square with a little air. */
export const LOGO_ICON_VIEWBOX = "3 -2.1 26 26";

/** The site's share card, drawn by app/opengraph-image.tsx. */
export const SHARE_IMAGE_ALT = `${SITE_NAME}: ${HERO_LINES.join(" ")} ${OG_FOOTER}`;
/** A page that sets openGraph or twitter drops the layout's objects, the card from app/opengraph-image.tsx
 *  included, so it lists this in both. Not for a route with its own opengraph-image file
 *  (app/solutions/[slug]): an explicit image wins over the file. */
export const SHARE_IMAGES = [{ url: "/opengraph-image", width: 1200, height: 630, alt: SHARE_IMAGE_ALT, type: "image/png" }];

/** Restate these in a page's openGraph/twitter, because Next merges metadata objects shallowly. */
export const OG_BASE = { type: "website" as const, siteName: SITE_NAME };
export const TWITTER_BASE = { card: "summary_large_image" as const };

/** Date the public copy last changed; the sitemap uses it so its output stays deterministic. */
export const CONTENT_UPDATED = "2026-10-12";
