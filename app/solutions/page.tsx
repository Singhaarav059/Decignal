import type { Metadata } from "next";
import { AREAS } from "@/lib/areas";
import { APPLICATIONS_COPY, CTA, NAV, SERVICE } from "@/lib/copy";
import { OG_BASE, SITE_NAME, TWITTER_BASE } from "@/lib/site";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/sections/Footer";
import { ServiceRuntime } from "@/components/service/ServiceRuntime";
import { AreaLinks } from "@/components/service/AreaLinks";
import { SectionLink } from "@/components/ui/SectionLink";
import { Arrow } from "@/components/ui/Arrow";

const title = SERVICE.breadcrumb;
const description = NAV.blurbs.apps;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/solutions" },
  openGraph: { ...OG_BASE, title: `${title} · ${SITE_NAME}`, description, url: "/solutions" },
  twitter: { ...TWITTER_BASE, title: `${title} · ${SITE_NAME}`, description },
};

/** /solutions: the five business areas, each linking to its page (the breadcrumb's middle step). */
export default function SolutionsPage() {
  return (
    <>
      <ServiceRuntime />
      <Nav variant="page" />
      <main id="main" tabIndex={-1} className="svc svc-index">
        <section className="svc-hero page-wrap" aria-labelledby="svc-title">
          <p className="t-label svc-crumbs-label">{SERVICE.breadcrumb}</p>
          <h1 id="svc-title" className="t-display svc-hero-title">
            {APPLICATIONS_COPY.headline[0]} <span className="accent">{APPLICATIONS_COPY.headline[1]}</span>
          </h1>
          <div className="svc-actions">
            <SectionLink href={`/${CTA.href}`} className="btn btn-primary" data-cta="svc-index">
              {CTA.primary}
              <Arrow />
            </SectionLink>
          </div>
          <div className="svc-index-list">
            <AreaLinks areas={AREAS} cta="area-index" art />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
