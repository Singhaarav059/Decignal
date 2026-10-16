import { Check } from "lucide-react";
import { AREA_SHARED, appRecords, pageApps, type Area } from "@/lib/areas";
import { FEATURED, appById } from "@/lib/content";
import { APPLICATIONS_COPY, CTA, DEMOS_COPY, FAQ_COPY, SERVICE } from "@/lib/copy";
import SectionTitle from "../ui/SectionTitle";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { ApplicationExplorer } from "../sections/ApplicationExplorer";
import { FaqList } from "../sections/FaqList";
import { ServiceAppsBoundary } from "./ServiceAppsBoundary";
import { ExpectArt } from "./ExpectArt";
import { AppRecord } from "./AppRecord";
import { SplitArt } from "./SplitArt";
import { SystemIcon, sourceIcon, sourceTone } from "../ui/SystemIcon";
import { toneVars } from "@/lib/tone";

/** The first record each example works from, then the second of the first: four for the drawing. */
const records = (area: Area) => {
  const lists = pageApps(area).map((a) => appRecords(a.data));
  return [...lists.map((l) => l[0]), lists[0][1]];
};

/** "What changes": the three outcome bullets under the title, beside the records becoming one list. */
export function ServiceOutcomes({ area }: { area: Area }) {
  return (
    <section id="outcomes" className="svc-section svc-split svc-split--art page-wrap" aria-labelledby="svc-outcomes">
      <div className="svc-split-head">
        <SectionTitle id="svc-outcomes" lines={[AREA_SHARED.outcomesHeading]} tone={area.tone} reveal="lines" />
        <Checks items={area.outcomes} />
      </div>
      <div className="svc-split-art" data-reveal>
        <SplitArt kind="changes" records={records(area)} />
      </div>
    </section>
  );
}

function Checks({ items }: { items: string[] }) {
  return (
    <ul className="svc-checks">
      {items.map((d) => (
        <li key={d} data-reveal>
          <span className="svc-check" aria-hidden>
            <Check size={14} strokeWidth={2.6} />
          </span>
          <span className="t-body">{d}</span>
        </li>
      ))}
    </ul>
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

/** "What an application would prepare": the outputs and what stays with your team, beside the draft. */
export function ServiceGet({ area }: { area: Area }) {
  return (
    <section id="deliverables" className="svc-section svc-split svc-split--art page-wrap" aria-labelledby="svc-get">
      <div className="svc-split-head">
        <SectionTitle id="svc-get" lines={[AREA_SHARED.outputHeading]} tone={area.tone} reveal="lines" />
        <div>
          <Checks items={area.deliverables} />
          <p data-reveal className="t-small svc-scope">
            <span className="t-label">{AREA_SHARED.scopeLabel}</span> {area.scope}
          </p>
        </div>
      </div>
      <div className="svc-split-art" data-reveal>
        <SplitArt kind="prepare" rows={area.deliverables.length} />
      </div>
    </section>
  );
}

/** "Start with the work your team does today": one short paragraph and the way to the full process,
 *  beside the example, today's software and what an application adds. */
export function ServiceProcess({ area }: { area: Area }) {
  return (
    <section id="start" className="svc-section svc-split svc-split--art page-wrap" aria-labelledby="svc-how">
      <div className="svc-split-head">
        <SectionTitle id="svc-how" lines={[AREA_SHARED.processHeading]} tone={area.tone} reveal="lines" />
        <div className="svc-process">
          <p data-reveal className="t-lede">
            {AREA_SHARED.processBody}
          </p>
          <SectionLink href={AREA_SHARED.processLink.href} className="ed-link svc-process-link" data-cta="svc-how">
            {AREA_SHARED.processLink.label}
            <Arrow />
          </SectionLink>
        </div>
      </div>
      <div className="svc-split-art" data-reveal>
        <SplitArt kind="start" />
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
            {/* What it works from, each record in its system's colour, flowing into what it prepares. */}
            <div className="svc-app-flow" aria-hidden>
              <span className="svc-app-flow-in">
                {appRecords(a.data).slice(0, 5).map((r) => (
                  <span key={r} className="svc-app-tile" title={r} style={toneVars(sourceTone(r))}>
                    <SystemIcon id={sourceIcon(r)} size={18} />
                  </span>
                ))}
              </span>
              <span className="svc-app-flow-line" />
              <span className="svc-app-tile svc-app-out">
                <SystemIcon id="sup" size={20} />
                <Check size={11} strokeWidth={3} />
              </span>
            </div>
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
  const app = appById(id);
  return (
    <section id="example" className="svc-apps-section" aria-labelledby="svc-example">
      <div className="svc-section page-wrap">
        <div className="svc-why">
          <div className="svc-why-head">
            <SectionTitle id="svc-example" lines={[AREA_SHARED.exampleHeading]} lede={app?.name} tone={area.tone} reveal="lines" />
            {/* Who reads the output and how the team would judge it: the record's own lines. */}
            {app && (
              <dl className="svc-why-facts" data-reveal>
                {(
                  [
                    [APPLICATIONS_COPY.labels.owner, app.reviewer],
                    [APPLICATIONS_COPY.labels.measure, app.measure],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="t-label">{k}</dt>
                    <dd className="t-body">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {app && (
              <div className="svc-split-art svc-why-art" data-reveal>
                <SplitArt
                  kind="example"
                  records={appRecords(app.data)}
                  labels={[DEMOS_COPY.labels.input, DEMOS_COPY.labels.application, DEMOS_COPY.labels.output, DEMOS_COPY.labels.next]}
                />
              </div>
            )}
          </div>
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
