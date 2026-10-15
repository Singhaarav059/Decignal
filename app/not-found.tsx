import type { Metadata } from "next";
import Link from "next/link";
import { AREAS } from "@/lib/areas";
import { CTA, PAGES } from "@/lib/copy";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/sections/Footer";
import { ServiceRuntime } from "@/components/service/ServiceRuntime";
import { AreaLinks } from "@/components/service/AreaLinks";
import { SectionLink } from "@/components/ui/SectionLink";
import { Arrow } from "@/components/ui/Arrow";

// Next adds its own noindex here; restating it overrides the layout's "index, follow".
export const metadata: Metadata = { title: PAGES.notFound.title, robots: { index: false, follow: true } };

const copy = PAGES.notFound;

/** Every unknown URL, including /solutions/<unknown>: the way back is one of the five areas or the start. */
export default function NotFound() {
  return (
    <>
      <ServiceRuntime />
      <Nav variant="page" />
      <main id="main" tabIndex={-1} className="svc svc-404">
        <section className="svc-hero page-wrap" aria-labelledby="svc-title">
          <p className="t-label svc-crumbs-label">{copy.eyebrow}</p>
          <h1 id="svc-title" className="t-display svc-hero-title">
            {copy.headline[0]} <span className="accent">{copy.headline[1]}</span>
          </h1>
          <p className="t-lede svc-hero-lede">{copy.body}</p>
          <div className="svc-actions">
            <SectionLink href={CTA.href} className="btn btn-primary" data-cta="404">
              {copy.cta}
              <Arrow />
            </SectionLink>
            <Link href="/" className="btn btn-ghost">
              {copy.home}
            </Link>
          </div>
          <div className="svc-index-list">
            <AreaLinks areas={AREAS} cta="area-404" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
