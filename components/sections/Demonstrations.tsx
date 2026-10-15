"use client";

import { useState } from "react";
import { Waypoints } from "lucide-react";
import { DEMOS, ORDER_COUNTS, SUPPLIER_COUNTS, type Demonstration } from "@/lib/demonstrations";
import { DEMOS_COPY } from "@/lib/copy";
import { toneVars } from "@/lib/tone";
import SectionTitle from "../ui/SectionTitle";
import SegmentedControl from "../ui/SegmentedControl";
import { Arrow } from "../ui/Arrow";

/**
 * Three illustrative examples (handoff §5 demonstrations), at #example. All three
 * labels show together; Order intake is open first. Nothing advances on its own and nothing waits on the
 * scroll: each example is its four plain lines and an interface state that draws the same facts.
 */
export function Demonstrations() {
  const [at, setAt] = useState(0);
  const demo = DEMOS[at];
  const panel = "demo-panel";
  return (
    <section id="example" className="demos" aria-labelledby="demos-title">
      <div className="page-wrap">
        <SectionTitle
          icon={<Waypoints size={13} strokeWidth={2.2} />}
          id="demos-title"
          label={DEMOS_COPY.eyebrow}
          lines={[DEMOS_COPY.headline[0], DEMOS_COPY.headline[1]]}
          lede={DEMOS_COPY.intro}
          tone="ink"
          reveal="lines"
          className="ed-title demos-title"
        />
        <SegmentedControl
          label={DEMOS_COPY.tabsAria}
          items={DEMOS.map((d, i) => ({ value: String(i), label: d.tab, tone: d.tone, controls: panel }))}
          value={String(at)}
          onChange={(v) => setAt(Number(v))}
          className="demos-tabs"
        />
        <div id={panel} role="tabpanel" className="demo" style={toneVars(demo.tone)} aria-label={demo.tab}>
          <div className="demo-copy">
            <p className="demo-badge t-label">{DEMOS_COPY.badge}</p>
            <h3 className="t-title-card demo-title">{demo.title}</h3>
            <dl className="demo-rows">
              {(
                [
                  [DEMOS_COPY.labels.input, demo.input],
                  [DEMOS_COPY.labels.application, demo.application],
                  [DEMOS_COPY.labels.output, demo.output],
                  [DEMOS_COPY.labels.next, demo.next],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="t-label">{k}</dt>
                  <dd className="t-body">{v}</dd>
                </div>
              ))}
            </dl>
            <a href={demo.href} className="ed-link demo-link">
              {DEMOS_COPY.explore}
              <Arrow />
            </a>
          </div>
          <div className="demo-art">
            <DemoArt demo={demo} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** The interface state each example ends on, drawn from the same figures as its copy. */
function DemoArt({ demo }: { demo: Demonstration }) {
  if (demo.key === "order") return <OrderArt />;
  if (demo.key === "supplier") return <SupplierArt />;
  return <ServiceArt />;
}

/** The order's 40 lines: 27 matched, 8 items to confirm, 5 units to clarify; the 13 open lines queue for the order desk. */
function OrderArt() {
  const A = DEMOS_COPY.art.order;
  const { total, matched, item, unit } = ORDER_COUNTS;
  const cols = 10;
  const kind = (i: number) => (i < matched ? "ok" : i < matched + item ? "item" : "unit");
  return (
    <figure className="demo-figure" role="img" aria-label={A.aria}>
      <div className="demo-grid" style={{ ["--cols" as string]: cols }}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} data-k={kind(i)} style={{ ["--i" as string]: i }} />
        ))}
      </div>
      <ul className="demo-legend t-small">
        <li data-k="ok">
          <i />
          <b className="tabular">{matched}</b> {A.matched}
        </li>
        <li data-k="item">
          <i />
          <b className="tabular">{item}</b> {A.item}
        </li>
        <li data-k="unit">
          <i />
          <b className="tabular">{unit}</b> {A.unit}
        </li>
      </ul>
      <p className="demo-chip t-small">
        <span className="tabular">{item + unit}</span> {A.queue}
      </p>
    </figure>
  );
}

/** The commitment before and after: 100 on Friday becomes 60 on Friday and 40 the following Wednesday. */
function SupplierArt() {
  const A = DEMOS_COPY.art.supplier;
  const { total, first, firstDay, rest, restDay, item } = SUPPLIER_COUNTS;
  return (
    <figure className="demo-figure" role="img" aria-label={A.aria}>
      <div className="demo-bars">
        <div className="demo-bar-row">
          <span className="t-label">{A.before}</span>
          <div className="demo-bar">
            <span data-k="before" style={{ ["--w" as string]: 1 }}>
              <b className="tabular">{total}</b> {firstDay}
            </span>
          </div>
        </div>
        <div className="demo-bar-row">
          <span className="t-label">{A.after}</span>
          <div className="demo-bar">
            <span data-k="ok" style={{ ["--w" as string]: first / total }}>
              <b className="tabular">{first}</b> {firstDay}
            </span>
            <span data-k="late" style={{ ["--w" as string]: rest / total }}>
              <b className="tabular">{rest}</b> {restDay}
            </span>
          </div>
        </div>
      </div>
      <p className="demo-chip t-small">
        {item[0].toUpperCase() + item.slice(1)} · {A.check}
      </p>
    </figure>
  );
}

/** The report's recommendation, linked to the equipment and assigned to its owner with the open questions. */
function ServiceArt() {
  const A = DEMOS_COPY.art.service;
  return (
    <figure className="demo-figure demo-handover" role="img" aria-label={A.aria}>
      <div className="demo-doc">
        <p className="t-label">{A.report}</p>
        <p className="t-small demo-doc-line">{A.line}</p>
      </div>
      <dl className="demo-checks t-small">
        <div>
          <dt>{A.equipment}</dt>
          <dd data-k="ok">Pump P-07</dd>
        </div>
        <div>
          <dt>{A.quote}</dt>
          <dd>{A.none}</dd>
        </div>
      </dl>
      <div className="demo-task">
        <p className="t-label">{A.owner}</p>
        <p className="t-small">{A.open}</p>
      </div>
    </figure>
  );
}
