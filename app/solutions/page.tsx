import type { Metadata } from "next";
import { AREAS, areaHref } from "@/lib/areas";
import { APPLICATIONS, AUDIENCE, CATEGORY_TONE } from "@/lib/content";
import { APPLICATIONS_COPY, CTA, META, SOLUTIONS_INDEX } from "@/lib/copy";
import { OG_BASE, SHARE_IMAGES, TWITTER_BASE } from "@/lib/site";
import { toneVars } from "@/lib/tone";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/sections/Footer";
import { ServiceRuntime } from "@/components/service/ServiceRuntime";
import { AreaLinks } from "@/components/service/AreaLinks";
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
 * /solutions (handoff §5): the three audience summaries, the five function cards, then all six proposed
 * workflows (D01, D05 and D06 first, the APPLICATIONS order), each labelled proposed with its customer fit.
 */
export default function SolutionsPage() {
  return (
    <>
      <ServiceRuntime />
      <Nav variant="page" />
      <main id="main" tabIndex={-1} className="svc svc-index">
        <section className="svc-hero page-wrap" aria-labelledby="svc-title">
          <p className="t-label svc-crumbs-label">{SOLUTIONS_INDEX.eyebrow}</p>
          <h1 id="svc-title" className="t-display svc-hero-title">
            {SOLUTIONS_INDEX.headline[0]} <span className="accent">{SOLUTIONS_INDEX.headline[1]}</span>
          </h1>
          <p className="t-lede svc-hero-lede">{SOLUTIONS_INDEX.body}</p>
          <p className="t-small svc-status">{SOLUTIONS_INDEX.status}</p>
          <div className="svc-actions">
            <SectionLink href={CTA.href} className="btn btn-primary" data-cta="svc-index">
              {CTA.primary}
              <Arrow />
            </SectionLink>
          </div>
        </section>

        <section className="svc-section page-wrap" aria-labelledby="idx-audience">
          <SectionTitle id="idx-audience" lines={[SOLUTIONS_INDEX.audienceTitle]} lede={SOLUTIONS_INDEX.audienceNote} tone="cobalt" reveal="lines" />
          <ul className="svc-areas idx-audience" data-count={AUDIENCE.length}>
            {AUDIENCE.map((a, i) => (
              <li key={a.name} data-reveal style={{ ["--i" as string]: i }}>
                <SectionLink href={a.href} className="svc-area card" data-interactive="" data-cta="idx-audience">
                  <span className="svc-area-body">
                    <span className="svc-area-top">
                      <span className="t-label">{a.industries}</span>
                    </span>
                    <strong className="t-subtitle">{a.name}</strong>
                    <span className="t-small svc-area-lead">{a.text}</span>
                    <span className="svc-area-apps">
                      {a.workflows.map((id) => {
                        const w = APPLICATIONS.find((x) => x.id === id)!;
                        return (
                          <span key={id} className="t-small" style={toneVars(CATEGORY_TONE[w.category])}>
                            <span className="svc-dot" aria-hidden />
                            {w.name}
                          </span>
                        );
                      })}
                    </span>
                  </span>
                </SectionLink>
              </li>
            ))}
          </ul>
        </section>

        <section className="svc-section page-wrap" aria-labelledby="idx-functions">
          <SectionTitle id="idx-functions" lines={[SOLUTIONS_INDEX.functionsTitle]} tone="cobalt" reveal="lines" />
          <div className="svc-index-list">
            <AreaLinks areas={AREAS} cta="area-index" art />
          </div>
        </section>

        <section className="svc-section page-wrap" aria-labelledby="idx-workflows">
          <SectionTitle id="idx-workflows" lines={[SOLUTIONS_INDEX.workflowsTitle]} tone="cobalt" reveal="lines" />
          <ol className="svc-app-list idx-workflows">
            {APPLICATIONS.map((a) => (
              <li key={a.id} id={`workflow-${a.id}`} className="card svc-app" style={toneVars(CATEGORY_TONE[a.category])}>
                <p className="t-label">
                  <span className="svc-dot" aria-hidden /> {a.category} · {a.status}
                </p>
                <h2 className="t-title-card">{a.name}</h2>
                <p className="t-body svc-app-line">{a.text}</p>
                <dl className="svc-app-fields">
                  <div>
                    <dt className="t-label">{APPLICATIONS_COPY.labels.fit}</dt>
                    <dd className="t-small">{a.fit}</dd>
                  </div>
                  <div>
                    <dt className="t-label">{APPLICATIONS_COPY.example}</dt>
                    <dd className="t-small">{a.example.situation}</dd>
                  </div>
                </dl>
                <SectionLink href={`${areaHref(a.category)}#applications`} className="ed-link svc-app-cta">
                  {CTA.explore(a.category)}
                  <Arrow />
                </SectionLink>
              </li>
            ))}
          </ol>
        </section>

        <section className="svc-section page-wrap" aria-labelledby="idx-close">
          <div className="svc-closing card card--panel" data-reveal>
            <SectionTitle id="idx-close" lines={[SOLUTIONS_INDEX.closingHeading]} lede={SOLUTIONS_INDEX.closingBody} tone="cobalt" reveal="lines" />
            <SectionLink href={CTA.href} className="btn btn-primary" data-cta="idx-close">
              {CTA.primary}
              <Arrow />
            </SectionLink>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
