import { appsOf, areaEyebrow, type Area } from "@/lib/areas";
import { APPLICATIONS_COPY, CTA, SCALE, SERVICE } from "@/lib/copy";
import { accentVars, toneVars } from "@/lib/tone";
import { AreaArt } from "../sections/AreaArt";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { MoveLink } from "./MoveLink";

/**
 * The first screen: where you are, the two-line value proposition, the audit CTA, and the area's
 * decision card (its drawing, the live signal and the decisions its applications recommend).
 */
export function ServiceHero({ area }: { area: Area }) {
  const apps = appsOf(area);
  return (
    <section id="overview" className="svc-hero page-wrap" aria-labelledby="svc-title">
      <nav className="svc-crumbs t-label" aria-label="Breadcrumb">
        <ol>
          <li>
            <SectionLink href="/solutions">{SERVICE.breadcrumb}</SectionLink>
          </li>
          <li aria-current="page">
            <span className="svc-dot" aria-hidden />
            {areaEyebrow(area)}
          </li>
        </ol>
      </nav>

      <h1 id="svc-title" className="t-display svc-hero-title" style={accentVars(area.tone)}>
        {area.headline[0]} <span className="accent">{area.headline[1]}</span>
      </h1>

      <div className="svc-hero-row">
        <div className="svc-hero-copy">
          <p className="t-lede svc-hero-lede">{area.valueProp}</p>
          <div className="svc-actions">
            <SectionLink href={CTA.href} className="btn btn-primary" data-cta="svc-hero">
              {CTA.primary}
              <Arrow />
            </SectionLink>
            <SectionLink href="#applications" className="btn btn-ghost" data-cta="svc-hero-apps">
              {SERVICE.seeApps(apps.length)}
            </SectionLink>
          </div>
        </div>

        {/* The area as it reads in the product: the drawing, today's signal and each recommended move. */}
        <div className="svc-hero-card card card--panel" style={toneVars(area.tone)}>
          <AreaArt area={area.name} />
          <p className="svc-signal">
            <span className="svc-signal-dot" aria-hidden />
            <span className="t-label">{APPLICATIONS_COPY.stages[0]}</span>
            <span className="svc-signal-text">{area.signal}</span>
          </p>
          <ul className="svc-moves" aria-label={APPLICATIONS_COPY.stageLabels[2]}>
            {apps.map((a) => (
              <li key={a.name}>
                <MoveLink app={a.i} className="svc-move-link">
                  <span className="svc-move">
                    <span className="t-label">{a.name}</span>
                    <span className="svc-move-text">{a.example}</span>
                  </span>
                  <span className="svc-move-weeks t-small tabular">{SCALE.weeks(a.weeks)}</span>
                </MoveLink>
              </li>
            ))}
          </ul>
          <p className="svc-card-note t-small">{SERVICE.example}</p>
        </div>
      </div>
    </section>
  );
}
