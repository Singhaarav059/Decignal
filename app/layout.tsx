import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import {
  BRAND,
  OG_BASE,
  SHARE_DESCRIPTION,
  SHARE_TITLE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  TWITTER_BASE,
} from "@/lib/site";
import "./globals.css";

// Bricolage Grotesque carries headlines and labels (optical size tightens it at display sizes,
// width lets labels run a touch condensed); Figtree carries everything people read.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

// Canonical URLs are set per page: a canonical here would be inherited by every route.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { ...OG_BASE, title: SHARE_TITLE, description: SHARE_DESCRIPTION },
  twitter: { ...TWITTER_BASE, title: SHARE_TITLE, description: SHARE_DESCRIPTION },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: BRAND.bg,
  colorScheme: "light",
  // env(safe-area-inset-*) resolves on notched phones only with cover (story card and intro bottoms).
  viewportFit: "cover",
};

// Organization and WebSite only: no address, founding date or profiles until the owner supplies them.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon-512.png`,
      description: SITE_DESCRIPTION,
      areaServed: [
        { "@type": "Country", name: "India" },
        { "@type": "Continent", name: "Africa" },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
  ],
};

// Without JavaScript the loader never lifts, html.ready never lands and the story never hides its later
// chapters: drop the loader, show the hero and nav as they look after the intro, and keep only the
// first chapter (data-ch 0) on the story stage, one screen tall so the sections follow. Inert whenever
// scripts run.
const NOSCRIPT_CSS =
  ".loader{display:none!important}.nav-pill{opacity:1!important}" +
  ".intro-line>span,.intro-fade,.intro-stage{opacity:1!important;transform:none!important}" +
  '[data-ch]:not([data-ch="0"]),[data-ind]{visibility:hidden!important}#story{height:100svh!important}';

// Repeat visits in the session skip the intro: mark <html> before the first paint so the server-rendered
// loader never shows (app/styles/infra.css, Loader.tsx reads the same key). The class lands before
// hydration, hence suppressHydrationWarning on <html>.
const INTRO_SEEN_JS =
  'try{if(sessionStorage.getItem("decignal:intro")==="1")document.documentElement.classList.add("intro-seen")}catch(e){}';

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SEEN_JS }} />
        <noscript dangerouslySetInnerHTML={{ __html: `<style>${NOSCRIPT_CSS}</style>` }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
