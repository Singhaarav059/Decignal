import { Check } from "lucide-react";
import { AREA_SHARED, pageApps, type Area } from "@/lib/areas";
import { APPLICATIONS_COPY, CTA, FAQ_COPY, NAV, SERVICE } from "@/lib/copy";
import { APPLICATION_DEMOS } from "@/lib/application-demos";
import SectionTitle from "../ui/SectionTitle";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { ApplicationExplorer } from "../sections/ApplicationExplorer";
import { FaqList } from "../sections/FaqList";
import { ServiceAppsBoundary } from "./ServiceAppsBoundary";
import { ExpectArt } from "./ExpectArt";

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

/** "Workflows to assess": the explorer with only this page's workflows (it mounts its 3D on approach). */
export function ServiceApps({ area }: { area: Area }) {
  return (
    <section id="applications" className="svc-apps-section" aria-labelledby="svc-apps">
      <div className="svc-section page-wrap">
        <SectionTitle id="svc-apps" lines={[SERVICE.apps()]} lede={area.fit} tone={area.tone} reveal="lines" />
      </div>
      <ServiceAppsBoundary fallback={null}>
        <ApplicationExplorer apps={pageApps(area).map((a) => a.i)} compact />
      </ServiceAppsBoundary>
      {/* The shared workflow records in full, readable without the explorer (handoff #applications). */}
      <ServiceAppList area={area} />
    </section>
  );
}

/** Each workflow record as a card: the situation, the source records, what goes for review, and the
 *  fields the handoff asks every workflow to show. Also the fallback when 3D cannot run. */
function ServiceAppList({ area }: { area: Area }) {
  return (
    <ol className="svc-section svc-app-list page-wrap">
      {pageApps(area).map((a) => {
        const demo = APPLICATION_DEMOS[a.i];
        const [l1, l2] = demo.headline.split("\n");
        const fields: [string, string][] = [
          [APPLICATIONS_COPY.labels.fit, a.fit],
          [APPLICATIONS_COPY.labels.data, a.data],
          [APPLICATIONS_COPY.labels.output, a.output],
          [APPLICATIONS_COPY.labels.owner, a.reviewer],
          [APPLICATIONS_COPY.labels.measure, a.measure],
        ];
        return (
          <li key={a.name} id={`workflow-${a.id}`} className="card svc-app">
            <p className="t-label">
              <span className="svc-dot" aria-hidden /> {a.name} · {a.status}
            </p>
            <h3 className="t-title-card">
              {l1} <span className="accent">{l2}</span>
            </h3>
            <p className="t-body svc-app-line">{a.text}</p>
            <dl className="svc-app-steps">
              {[a.example.situation, a.example.evidence, a.example.action].map((step, k) => (
                <div key={step}>
                  <dt className="t-label">{APPLICATIONS_COPY.stages[k]}</dt>
                  <dd className="t-small">{step}</dd>
                </div>
              ))}
            </dl>
            <dl className="svc-app-fields">
              {fields.map(([k, v]) => (
                <div key={k}>
                  <dt className="t-label">{k}</dt>
                  <dd className="t-small">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="t-small svc-app-foot">
              <span className="t-label">{APPLICATIONS_COPY.labels.limitation}</span> {a.example.limitation}
            </p>
            <SectionLink href={CTA.href} className="ed-link svc-app-cta" data-cta="svc-workflow">
              {CTA.workflow}
              <Arrow />
            </SectionLink>
          </li>
        );
      })}
    </ol>
  );
}

/** "What a scoped application would prepare": the outputs, each with a check, then the scope note. */
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
          <span className="t-label">{SERVICE.scope}</span> {area.scope}
        </p>
      </div>
    </section>
  );
}

/** "Start by checking the existing workflow": one short paragraph and the way to the full process. */
export function ServiceProcess({ area }: { area: Area }) {
  return (
    <section id="how" className="svc-section svc-split page-wrap" aria-labelledby="svc-how">
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

/** The worked example for this page and the way to the approach behind it (no advantage claims; the
 *  scope note already follows the outputs). */
export function ServiceWhy({ area }: { area: Area }) {
  return (
    <section id="why" className="svc-section page-wrap" aria-labelledby="svc-why">
      <div className="svc-why">
        <SectionTitle id="svc-why" lines={[SERVICE.example]} lede={area.fit} tone={area.tone} reveal="lines" />
        <figure className="svc-example card card--panel" data-reveal>
          <figcaption className="t-label">{SERVICE.example}</figcaption>
          <p className="t-num-lg t-tone">{area.example.value}</p>
          <p className="t-body svc-example-text">{area.example.text}</p>
          <p className="t-small svc-example-note">{SERVICE.exampleNote}</p>
          <SectionLink href="/#platform" className="ed-link" data-cta="svc-approach">
            {NAV.platformSide.label}
            <Arrow />
          </SectionLink>
        </figure>
      </div>
    </section>
  );
}

/** The workflow's questions, with a way to every other question on the home page. */
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

/** The closing call to action (handoff #audit on solution pages): the working form is on the homepage. */
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
