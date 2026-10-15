import { Check } from "lucide-react";
import { appsOf, SHARED_WHY, type Area } from "@/lib/areas";
import { APPLICATIONS_COPY, CTA, FAQ_COPY, HOW, NAV, SCALE, SERVICE } from "@/lib/copy";
import { FAQ } from "@/lib/content";
import { APPLICATION_DEMOS } from "@/lib/application-demos";
import SectionTitle from "../ui/SectionTitle";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { ApplicationExplorer } from "../sections/ApplicationExplorer";
import { FaqList } from "../sections/FaqList";
import { ServiceAppsBoundary } from "./ServiceAppsBoundary";
import { ExpectArt } from "./ExpectArt";
import { WhyArt } from "./WhyArt";


/** "What to expect": three cards, each a small drawing of what it promises, a title and one line. */
export function ServiceExpect({ area }: { area: Area }) {
  return (
    <section id="expect" className="svc-section page-wrap" aria-labelledby="svc-expect">
      <SectionTitle id="svc-expect" lines={[SERVICE.expect]} tone={area.tone} reveal="lines" />
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

/** "Applications in {area}": the explorer with only this area's applications (it mounts its 3D on approach). */
export function ServiceApps({ area }: { area: Area }) {
  return (
    <section id="applications" className="svc-apps-section" aria-labelledby="svc-apps">
      <div className="svc-section page-wrap">
        <SectionTitle id="svc-apps" lines={[SERVICE.apps(area.name)]} tone={area.tone} reveal="lines" />
      </div>
      <ServiceAppsBoundary fallback={<ServiceAppList area={area} />}>
        <ApplicationExplorer apps={appsOf(area).map((a) => a.i)} compact />
      </ServiceAppsBoundary>
    </section>
  );
}

/** The same applications as plain cards (headline, the move, signal, evidence and action) for when 3D cannot run. */
function ServiceAppList({ area }: { area: Area }) {
  return (
    <ol className="svc-section svc-app-list page-wrap">
      {appsOf(area).map((a) => {
        const demo = APPLICATION_DEMOS[a.i];
        const [l1, l2] = demo.headline.split("\n");
        return (
          <li key={a.name} className="card svc-app">
            <p className="t-label">
              <span className="svc-dot" aria-hidden /> {a.name}
            </p>
            <h3 className="t-title-card">
              {l1} <span className="accent">{l2}</span>
            </h3>
            <p className="t-body svc-app-line">{demo.line}</p>
            <dl className="svc-app-steps">
              {demo.steps.map((step, k) => (
                <div key={step}>
                  <dt className="t-label">{APPLICATIONS_COPY.stages[k]}</dt>
                  <dd className="t-small">{step}</dd>
                </div>
              ))}
            </dl>
            <p className="t-small svc-app-foot tabular">
              {SCALE.weeks(a.weeks)} · {SERVICE.example}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/** "What you get": the six deliverables, each with a check. */
export function ServiceGet({ area }: { area: Area }) {
  return (
    <section id="deliverables" className="svc-section svc-split page-wrap" aria-labelledby="svc-get">
      <SectionTitle id="svc-get" lines={[SERVICE.get]} tone={area.tone} reveal="lines" className="svc-split-head" />
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
    </section>
  );
}

/** "How it works": four numbered steps on one track, each with what it hands over. */
export function ServiceProcess({ area }: { area: Area }) {
  return (
    <section id="how" className="svc-section page-wrap" aria-labelledby="svc-how">
      <SectionTitle id="svc-how" lines={[SERVICE.how]} tone={area.tone} reveal="lines" />
      <ol className="svc-steps">
        {area.process.map((s) => (
          <li key={s.n} className="svc-step" data-reveal>
            <span className="svc-step-mark" aria-hidden />
            <p className="svc-step-top">
              <span className="t-num-md t-tone tabular">{s.n}</span>
              <span className="t-label">{s.when}</span>
            </p>
            <h3 className="t-subtitle">{s.title}</h3>
            <p className="t-body svc-step-text">{s.text}</p>
            <p className="t-label svc-step-gets-label">{HOW.youGet}</p>
            <ul className="svc-gets">
              {s.gets.map((g) => (
                <li key={g} className="t-small">
                  <Check size={13} strokeWidth={2.6} aria-hidden />
                  {g}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** "Why Decignal": the area's differentiator beside its illustrative example, then the shared points. */
export function ServiceWhy({ area }: { area: Area }) {
  return (
    <section id="why" className="svc-section page-wrap" aria-labelledby="svc-why">
      <div className="svc-why">
        <SectionTitle
          id="svc-why"
          label={SERVICE.why}
          lines={[area.differentiator.title]}
          lede={area.differentiator.text}
          tone={area.tone}
          reveal="lines"
        />
        <figure className="svc-example card card--panel" data-reveal>
          <figcaption className="t-label">{SERVICE.example}</figcaption>
          <p className="t-num-lg t-tone">{area.example.value}</p>
          <p className="t-body svc-example-text">{area.example.text}</p>
          <p className="t-small svc-example-note">{SERVICE.exampleNote}</p>
        </figure>
      </div>
      {/* One chain across the three points: the systems it reads, the evidence it shows, who approves. */}
      <ol className="svc-points svc-chain">
        {SHARED_WHY.map((w, i) => (
          <li key={w.title} data-reveal style={{ ["--i" as string]: i }}>
            <div className="svc-chain-art">
              <WhyArt slug={area.slug} index={i} />
            </div>
            <div className="svc-chain-copy">
              <h3 className="t-subtitle">{w.title}</h3>
              <p className="t-body">{w.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The area's objections, with a way to every other question on the home page. */
export function ServiceQuestions({ area }: { area: Area }) {
  return (
    <section id="faq" className="svc-section svc-split svc-questions page-wrap" aria-labelledby="svc-faq">
      {/* Phone: the help block follows the list (the head dissolves into the grid, see service.css). */}
      <div className="svc-split-head">
        <div>
          <SectionTitle id="svc-faq" lines={[SERVICE.faq]} tone={area.tone} reveal="lines" />
          <SectionLink href="/#faq" className="svc-text-link t-small" data-cta="svc-faq-all">
            {NAV.faqSide.all(FAQ.length)}
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
