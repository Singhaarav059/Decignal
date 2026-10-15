import { Check } from "lucide-react";
import { AREA_SHARED, pageApps, type Area } from "@/lib/areas";
import { FEATURED, appById } from "@/lib/content";
import { CTA, DEMOS_COPY, FAQ_COPY, SERVICE } from "@/lib/copy";
import SectionTitle from "../ui/SectionTitle";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { ApplicationExplorer } from "../sections/ApplicationExplorer";
import { FaqList } from "../sections/FaqList";
import { ServiceAppsBoundary } from "./ServiceAppsBoundary";
import { ExpectArt } from "./ExpectArt";
import { AppRecord } from "./AppRecord";

/** "What changes": the three outcome bullets, each with a check. */
export function ServiceOutcomes({ area }: { area: Area }) {
  return (
    <section id="outcomes" className="svc-section svc-split page-wrap" aria-labelledby="svc-outcomes">
      <SectionTitle id="svc-outcomes" lines={[AREA_SHARED.outcomesHeading]} tone={area.tone} reveal="lines" className="svc-split-head" />
      <ul className="svc-checks">
        {area.outcomes.map((d) => (
          <li key={d} data-reveal>
            <span className="svc-check" aria-hidden>
              <Check size={14} strokeWidth={2.6} />
            </span>
            <span className="t-body">{d}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Where the manual work remains": three cards, each a small drawing of the problem, a title and one line. */
export function ServiceExpect({ area }: { area: Area }) {
  return (
    <section id="expect" className="svc-section page-wrap" aria-labelledby="svc-expect">
      <SectionTitle id="svc-expect" lines={[AREA_SHARED.problemHeading]} tone={area.tone} reveal="lines" />
      <ol className="svc-expect">
        {area.expect.map((e, i) => (
          <li key={e.title} className="card svc-expect-card" data-reveal style={{ ["--i" as string]: i }}>
            <div className="svc-expect-art">
              <ExpectArt slug={area.slug} index={i} />
            </div>
            <div className="svc-expect-copy">
              <h3 className="t-subtitle">{e.title}</h3>
              <p className="t-body">{e.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** "What an application would prepare": the outputs, each with a check, then what stays with your team. */
export function ServiceGet({ area }: { area: Area }) {
  return (
    <section id="deliverables" className="svc-section svc-split page-wrap" aria-labelledby="svc-get">
      <SectionTitle id="svc-get" lines={[AREA_SHARED.outputHeading]} tone={area.tone} reveal="lines" className="svc-split-head" />
      <div>
        <ul className="svc-checks">
          {area.deliverables.map((d) => (
            <li key={d} data-reveal>
              <span className="svc-check" aria-hidden>
                <Check size={14} strokeWidth={2.6} />
              </span>
              <span className="t-body">{d}</span>
            </li>
          ))}
        </ul>
        <p data-reveal className="t-small svc-scope">
          <span className="t-label">{AREA_SHARED.scopeLabel}</span> {area.scope}
        </p>
      </div>
    </section>
  );
}

/** "Start with the work your team does today": one short paragraph and the way to the full process. */
export function ServiceProcess({ area }: { area: Area }) {
  return (
    <section id="start" className="svc-section svc-split page-wrap" aria-labelledby="svc-how">
      <SectionTitle id="svc-how" lines={[AREA_SHARED.processHeading]} tone={area.tone} reveal="lines" className="svc-split-head" />
      <div className="svc-process">
        <p data-reveal className="t-lede">
          {AREA_SHARED.processBody}
        </p>
        <SectionLink href={AREA_SHARED.processLink.href} className="ed-link svc-process-link" data-cta="svc-how">
          {AREA_SHARED.processLink.label}
          <Arrow />
        </SectionLink>
      </div>
    </section>
  );
}

/** The page's three application examples (handoff §6 and §7), each with its full record. */
export function ServiceApps({ area }: { area: Area }) {
  return (
    <section id="applications" className="svc-section page-wrap" aria-labelledby="svc-apps">
      <SectionTitle id="svc-apps" lines={[AREA_SHARED.appsHeading]} lede={AREA_SHARED.exampleNote} tone={area.tone} reveal="lines" />
      <ol className="svc-app-list">
        {pageApps(area).map((a) => (
          <li key={a.id} id={a.id} tabIndex={-1} className="card svc-app">
            <AppRecord app={a} label={area.name} />
            <SectionLink href={CTA.href} className="ed-link svc-app-cta" data-cta="svc-workflow">
              {CTA.workflow}
              <Arrow />
            </SectionLink>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The page's one worked example, labelled as illustrative: its four lines, then the same application in
 * 3D (the explorer, compact, mounted on approach) when it is one of the six the homepage features.
 */
export function ServiceExample({ area }: { area: Area }) {
  const d = area.demo;
  const id = d.href.split("#")[1];
  const featured = FEATURED.findIndex((a) => a.id === id);
  return (
    <section id="example" className="svc-apps-section" aria-labelledby="svc-example">
      <div className="svc-section page-wrap">
        <div className="svc-why">
          <SectionTitle id="svc-example" lines={[AREA_SHARED.exampleHeading]} lede={appById(id)?.name} tone={area.tone} reveal="lines" />
          <figure className="svc-example card card--panel" data-reveal>
            <figcaption className="t-label">{DEMOS_COPY.badge}</figcaption>
            <h3 className="t-title-card">{d.title}</h3>
            <dl className="demo-rows">
              {(
                [
                  [DEMOS_COPY.labels.input, d.input],
                  [DEMOS_COPY.labels.application, d.application],
                  [DEMOS_COPY.labels.output, d.output],
                  [DEMOS_COPY.labels.next, d.next],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="t-label">{k}</dt>
                  <dd className="t-body">{v}</dd>
                </div>
              ))}
            </dl>
          </figure>
        </div>
      </div>
      {featured >= 0 && (
        <ServiceAppsBoundary fallback={null}>
          <ApplicationExplorer apps={[featured]} compact />
        </ServiceAppsBoundary>
      )}
    </section>
  );
}

/** The page's two questions, with a way to every other question on the home page. */
export function ServiceQuestions({ area }: { area: Area }) {
  return (
    <section id="faq" className="svc-section svc-split svc-questions page-wrap" aria-labelledby="svc-faq">
      {/* Phone: the help block follows the list (the head dissolves into the grid, see service.css). */}
      <div className="svc-split-head">
        <div>
          <SectionTitle id="svc-faq" lines={[SERVICE.faq]} tone={area.tone} reveal="lines" />
          <SectionLink href="/#faq" className="svc-text-link t-small" data-cta="svc-faq-all">
            {SERVICE.allQuestions}
            <span aria-hidden>→</span>
          </SectionLink>
        </div>
        <div className="svc-faq-help">
          <p className="t-subtitle">{FAQ_COPY.helpTitle}</p>
          <p className="t-body">{FAQ_COPY.helpText}</p>
          <SectionLink href={CTA.href} className="btn btn-primary" data-cta="svc-faq">
            {FAQ_COPY.helpLink}
            <Arrow />
          </SectionLink>
        </div>
      </div>
      <FaqList items={area.faq} idPrefix="svc-faq" tone={area.tone} />
    </section>
  );
}

/** The closing call to action (handoff §6 closing): the working form is on the homepage. */
export function ServiceClosing({ area }: { area: Area }) {
  return (
    <section id="audit" className="svc-section page-wrap" aria-labelledby="svc-close">
      <div className="svc-closing card card--panel" data-reveal>
        <SectionTitle id="svc-close" label={SERVICE.ctaBand.button} lines={[area.closing.heading]} lede={area.closing.body} tone={area.tone} reveal="lines" />
        <SectionLink href={CTA.href} className="btn btn-primary" data-cta="svc-close">
          {CTA.primary}
          <Arrow />
        </SectionLink>
      </div>
    </section>
  );
}
