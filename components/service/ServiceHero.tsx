import { areaEyebrow, pageApps, type Area } from "@/lib/areas";
import { APPLICATIONS_COPY, CTA, SERVICE } from "@/lib/copy";
import { accentVars, toneVars } from "@/lib/tone";
import { AreaPhoto } from "../sections/AreaPhoto";
import { AreaArt } from "../sections/AreaArt";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { MoveLink } from "./MoveLink";

/**
 * The first screen (handoff #overview): where you are, the two-line heading, the body, who it is for,
 * the review CTA, and the function's card (its place as a duotone, its drawing, the illustrative
 * example and each proposed workflow, labelled as proposed).
 */
export function ServiceHero({ area }: { area: Area }) {
  const apps = pageApps(area);
  return (
    <section id="overview" className="svc-hero page-wrap" aria-labelledby="svc-title">
      <nav className="svc-crumbs t-label" aria-label="Breadcrumb">
        <ol>
          <li>
            <SectionLink href="/solutions">{SERVICE.breadcrumb}</SectionLink>
          </li>
          <li aria-current="page">
            <span className="svc-dot" aria-hidden />
            {area.name}
          </li>
        </ol>
      </nav>

      <p className="t-label svc-eyebrow">{areaEyebrow()}</p>
      <h1 id="svc-title" className="t-display svc-hero-title" style={accentVars(area.tone)}>
        {area.headline[0]} <span className="accent">{area.headline[1]}</span>
      </h1>

      <div className="svc-hero-row">
        <div className="svc-hero-copy">
          <p className="t-lede svc-hero-lede">{area.valueProp}</p>
          <p className="t-body svc-fit">
            <span className="t-label">{SERVICE.fit}</span> {area.fit}
          </p>
          <div className="svc-actions">
            <SectionLink href={CTA.href} className="btn btn-primary" data-cta="svc-hero">
              {CTA.primary}
              <Arrow />
            </SectionLink>
            <SectionLink href="#applications" className="btn btn-ghost" data-cta="svc-hero-apps">
              {SERVICE.secondary}
            </SectionLink>
          </div>
          <p className="t-small svc-status">{SERVICE.status}</p>
        </div>

        {/* The function as it would read in a review: the drawing, the example and each proposed workflow. */}
        <div className="svc-hero-card card card--panel" style={toneVars(area.tone)}>
          <AreaPhoto area={area} sizes="(min-width: 1024px) 520px, 100vw" eager />
          <div className="svc-hero-art" aria-hidden>
            <AreaArt area={area.category} />
          </div>
          <p className="svc-signal">
            <span className="svc-signal-dot" aria-hidden />
            <span className="t-label">{APPLICATIONS_COPY.example}</span>
            <span className="svc-signal-text">{area.signal}</span>
          </p>
          <ul className="svc-moves" aria-label={APPLICATIONS_COPY.stageLabels[2]}>
            {apps.map((a) => (
              <li key={a.name}>
                <MoveLink app={a.i} className="svc-move-link">
                  <span className="svc-move">
                    <span className="t-label">{a.name}</span>
                    <span className="svc-move-text">{a.example.action}</span>
                  </span>
                  <span className="svc-move-weeks t-small">{a.status}</span>
                </MoveLink>
              </li>
            ))}
          </ul>
          <p className="svc-card-note t-small">{SERVICE.exampleNote}</p>
        </div>
      </div>
    </section>
  );
}
