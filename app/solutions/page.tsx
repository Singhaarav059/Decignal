import type { Metadata } from "next";
import { AREAS, appHref } from "@/lib/areas";
import { AUDIENCE, CATEGORY_TONE, appById } from "@/lib/content";
import { CTA, META, SOLUTIONS_INDEX } from "@/lib/copy";
import { OG_BASE, SHARE_IMAGES, TWITTER_BASE } from "@/lib/site";
import { toneVars } from "@/lib/tone";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/sections/Footer";
import { ServiceRuntime } from "@/components/service/ServiceRuntime";
import { AreaLinks } from "@/components/service/AreaLinks";
import { AppDirectory } from "@/components/service/AppDirectory";
import { AreaPhoto } from "@/components/sections/AreaPhoto";
import { SectionLink } from "@/components/ui/SectionLink";
import { Arrow } from "@/components/ui/Arrow";
import SectionTitle from "@/components/ui/SectionTitle";

const { title, description } = META.solutions;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/solutions" },
  openGraph: { ...OG_BASE, title, description, url: "/solutions", images: SHARE_IMAGES },
  twitter: { ...TWITTER_BASE, title, description, images: SHARE_IMAGES },
};

/**
 * /solutions (handoff §6): the application directory. The offer, the fifteen application examples with
 * function and industry filters, the five functions, then the closing invitation.
 */
export default function SolutionsPage() {
  return (
    <>
      <ServiceRuntime />
      <Nav variant="page" />
      <main id="main" tabIndex={-1} className="svc svc-index">
        <section className="svc-hero page-wrap" aria-labelledby="svc-title">
          <p className="t-label svc-crumbs-label">{SOLUTIONS_INDEX.eyebrow}</p>
          <div className="svc-hero-row">
            <div className="svc-hero-copy">
              <h1 id="svc-title" className="t-display svc-hero-title">
                {SOLUTIONS_INDEX.headline[0]} <span className="accent">{SOLUTIONS_INDEX.headline[1]}</span>
              </h1>
              <p className="t-lede svc-hero-lede">{SOLUTIONS_INDEX.body}</p>
              <p className="t-small svc-status">{SOLUTIONS_INDEX.note}</p>
              <div className="svc-actions">
                <SectionLink href={CTA.href} className="btn btn-primary" data-cta="svc-index">
                  {CTA.primary}
                  <Arrow />
                </SectionLink>
              </div>
            </div>
            {/* The five functions' places, each in its own colour, in a strip under the headline. */}
            <ul className="idx-hero-art" aria-hidden>
              {AREAS.map((a, i) => (
                <li key={a.slug} style={{ ...toneVars(a.tone), ["--i" as string]: i }}>
                  <AreaPhoto area={a} sizes="(min-width: 900px) 20vw, 45vw" eager={i < 2} />
                  <span className="idx-hero-name">{a.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="svc-section page-wrap" aria-labelledby="idx-audience">
          <SectionTitle id="idx-audience" lines={[SOLUTIONS_INDEX.audienceTitle]} lede={SOLUTIONS_INDEX.audienceNote} tone="cobalt" reveal="lines" />
          <ul className="svc-areas idx-audience" data-count={AUDIENCE.length}>
            {AUDIENCE.map((a, i) => (
              <li key={a.name} data-reveal style={{ ["--i" as string]: i }}>
                <div className="svc-area card">
                  <span className="svc-area-body">
                    <SectionLink href={a.href} className="t-subtitle idx-audience-name" data-cta="idx-audience">
                      {a.name}
                    </SectionLink>
                    <span className="t-small svc-area-lead">{a.text}</span>
                    <span className="svc-area-apps">
                      {a.apps.map((id) => {
                        const w = appById(id)!;
                        return (
                          <a key={id} href={appHref(w)} className="t-small" style={toneVars(CATEGORY_TONE[w.category])}>
                            <span className="svc-dot" aria-hidden />
                            {w.name}
                          </a>
                        );
                      })}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="applications" className="svc-section page-wrap" aria-label={SOLUTIONS_INDEX.eyebrow}>
          <AppDirectory />
        </section>

        <section className="svc-section page-wrap" aria-labelledby="idx-functions">
          <SectionTitle id="idx-functions" lines={[SOLUTIONS_INDEX.functionsTitle]} tone="cobalt" reveal="lines" />
          <div className="svc-index-list">
            <AreaLinks areas={AREAS} cta="area-index" art />
          </div>
        </section>

        <section className="svc-section page-wrap" aria-labelledby="idx-close">
          <div className="svc-closing card card--panel" data-reveal>
            <SectionTitle id="idx-close" lines={[SOLUTIONS_INDEX.closingHeading]} lede={SOLUTIONS_INDEX.closingBody} tone="cobalt" reveal="lines" />
            <SectionLink href={CTA.href} className="btn btn-primary" data-cta="idx-close">
              {SOLUTIONS_INDEX.closingButton}
              <Arrow />
            </SectionLink>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
