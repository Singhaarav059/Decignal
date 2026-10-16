import { AREA_SHARED, appRecords, areaEyebrow, pageApps, type Area } from "@/lib/areas";
import { APPLICATIONS_COPY, CTA, SERVICE } from "@/lib/copy";
import { accentVars, toneVars } from "@/lib/tone";
import { AreaPhoto } from "../sections/AreaPhoto";
import { AreaArt } from "../sections/AreaArt";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { SystemIcon, sourceIcon, sourceTone } from "../ui/SystemIcon";

/**
 * The first screen (handoff §6): where you are, the two-line heading, the introduction, the two
 * actions, and the function's card (its place as a duotone, its drawing and its three application
 * examples, each a link to its record below). Under the actions, what each example works from, so the
 * copy column carries the records beside the card instead of ending at the buttons.
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
          <div className="svc-actions">
            <SectionLink href={CTA.href} className="btn btn-primary" data-cta="svc-hero">
              {CTA.workflow}
              <Arrow />
            </SectionLink>
            <SectionLink href={SERVICE.secondaryHref} className="btn btn-ghost" data-cta="svc-hero-apps">
              {SERVICE.secondary}
            </SectionLink>
          </div>
          {/* What each example works from: its records, each in its system's colour, merging into the
              application (a link to its record below). */}
          <div className="svc-sources">
            <p className="t-label">{APPLICATIONS_COPY.labels.data}</p>
            <ul>
              {apps.map((a) => (
                <li key={a.id} className="svc-source">
                  <ul className="svc-source-chips" aria-label={`${APPLICATIONS_COPY.labels.data}: ${a.name}`}>
                    {appRecords(a.data).map((r) => (
                      <li key={r} className="t-small" style={toneVars(sourceTone(r))}>
                        <SystemIcon id={sourceIcon(r)} size={15} />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <svg className="svc-source-merge" viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden>
                    <path d="M0 18C22 18 18 50 40 50M0 50H40M0 82C22 82 18 50 40 50" />
                  </svg>
                  <SectionLink href={`#${a.id}`} className="svc-source-name t-small" data-cta="svc-hero-source">
                    <span className="svc-dot" aria-hidden />
                    {a.name}
                    <Arrow />
                  </SectionLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The function: its place, its drawing and its three application examples. */}
        <div className="svc-hero-card card card--panel" style={toneVars(area.tone)}>
          <AreaPhoto area={area} sizes="(min-width: 1024px) 520px, 100vw" eager />
          <div className="svc-hero-art" aria-hidden>
            <AreaArt area={area.category} />
          </div>
          <ul className="svc-moves" aria-label={AREA_SHARED.appsHeading}>
            {apps.map((a) => (
              <li key={a.name}>
                <SectionLink href={`#${a.id}`} className="svc-move-link" data-cta="svc-hero-move">
                  <span className="svc-move">
                    <span className="t-label">{a.name}</span>
                    <span className="svc-move-text">{a.text}</span>
                  </span>
                </SectionLink>
              </li>
            ))}
          </ul>
          <p className="svc-card-note t-small">{AREA_SHARED.exampleNote}</p>
        </div>
      </div>
    </section>
  );
}
