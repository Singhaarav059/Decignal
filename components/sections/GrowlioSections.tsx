"use client";

import { useEffect, useId, useRef, useState } from "react";
import { onStep } from "@/lib/jump";
import { Check, Clock, Database, Factory, FileSearch, Globe, Network, Radar, Scale, ShieldCheck, Sparkles, TrendingUp, Truck, Users, Warehouse } from "lucide-react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, CATEGORY_TONE, PATHS } from "@/lib/content";
import { scrollToTarget } from "../SmoothScroll";
import { AreaArt } from "./AreaArt";

const AREA_COPY: Record<string, { lead: string; signal: string }> = {
  "Supply Chain": { lead: "Stock, demand and suppliers, balanced before service slips.", signal: "Plant 01 below safety stock in 6 days" },
  Operations: { lead: "Lines, assets and quality, acted on while there is time.", signal: "Line 04 bearing vibration rising" },
  Commercial: { lead: "Pricing, pipeline and allocation tied to what you can deliver.", signal: "Key account margin down 3.1 pts" },
  Customer: { lead: "Cases, orders and promises read together, not one ticket at a time.", signal: "14 cases share one part issue" },
  "Finance & Risk": { lead: "Exposure, cash and controls checked before money moves.", signal: "Supplier credit limit at 92%" },
};

/** Asks the application explorer below to cut to one of its chapters. */
const openApplication = (index: number) => window.dispatchEvent(new CustomEvent("application-jump", { detail: index }));

/** Asks the area stack to bring one of its panels to the front. */
export const showArea = (index: number) => window.dispatchEvent(new CustomEvent("area-jump", { detail: index }));

/** Growlio's service panels: one coloured panel per business area, stacking as you scroll. */
export function AreaStack() {
  const areas = Object.keys(CATEGORY_TONE) as (keyof typeof CATEGORY_TONE)[];
  const stack = useRef<HTMLDivElement>(null);
  // Panels stick one tab lower than the one before, so covered panels stay visible as labelled
  // strips. A strip brings its panel back to the front: scroll to where that panel lands on its sticky line.
  const bringForward = (i: number) => {
    const el = stack.current;
    const panel = el?.children[i] as HTMLElement | undefined;
    if (!el || !panel) return;
    // A stuck panel's own offset is where it is pinned, not where it sits in the flow, so add up the panels before it.
    const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
    const before = [...el.children].slice(0, i).reduce((sum, p) => sum + (p as HTMLElement).offsetHeight + gap, 0);
    // Phones do not stack the panels (top is auto), so leave room for the nav instead.
    const stickTop = parseFloat(getComputedStyle(panel).top);
    scrollToTarget(el.getBoundingClientRect().top + window.scrollY + before - (Number.isNaN(stickTop) ? 96 : stickTop) + 1);
  };
  useEffect(() => {
    const onJump = (e: Event) => bringForward((e as CustomEvent<number>).detail);
    window.addEventListener("area-jump", onJump);
    return () => window.removeEventListener("area-jump", onJump);
  }, []);
  return (
    <div ref={stack} className="area-stack" aria-label="Business areas">
      {areas.map((area, i) => {
        const tone = `var(--color-${CATEGORY_TONE[area]})`;
        const apps = APPLICATIONS.map((a, k) => ({ ...a, k })).filter((a) => a.category === area);
        return (
          <article key={area} className="area-panel" style={{ ["--tone" as string]: tone, ["--i" as string]: i }}>
            <div className="area-copy">
              <button className="area-tab" onClick={() => bringForward(i)} aria-label={`Show ${area}`}>
                <span className="area-index tabular">{String(i + 1).padStart(2, "0")} / {String(areas.length).padStart(2, "0")}</span>
                <span className="area-tab-name">{area}</span>
                <span className="area-tab-count tabular">{apps.length} {apps.length === 1 ? "application" : "applications"}</span>
              </button>
              <AreaArt area={area} />
              <h3>{area}</h3>
              <p>{AREA_COPY[area]?.lead}</p>
              <ul className="area-tags">{apps.map((a) => <li key={a.name}>{a.name}</li>)}</ul>
            </div>
            <div className="area-ui" aria-hidden={apps.length === 0 || undefined}>
              <div className="area-ui-signal">
                <span className="area-ui-dot" />
                <span><span className="area-ui-label">Signal</span>{AREA_COPY[area]?.signal}</span>
              </div>
              {apps.map((a) => (
                <button key={a.name} className="area-ui-app" onClick={() => openApplication(a.k)}>
                  <span>
                    <span className="area-ui-label">{a.name}</span>
                    {a.example}
                  </span>
                  <span className="area-ui-weeks tabular">{a.weeks} wks</span>
                </button>
              ))}
              <div className="area-ui-sources">{[...new Set(apps.flatMap((a) => a.connects))].slice(0, 6).map((c) => <span key={c}>{c}</span>)}</div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const PIPELINE = [
  { Icon: Radar, step: "Signal", ex: "Bearing X90 short at Plant 01", tone: "signal" },
  { Icon: FileSearch, step: "Evidence", ex: "Open orders up 18% in 3 weeks", tone: "violet" },
  { Icon: Network, step: "Context", ex: "Plant 02 holds 240 spare units", tone: "saffron" },
  { Icon: Scale, step: "Policy", ex: "Max 300 units per transfer", tone: "cobalt" },
  { Icon: Sparkles, step: "Decision", ex: "Transfer 240 units today", tone: "emerald" },
  { Icon: ShieldCheck, step: "Approval", ex: "Planner approves at 09:42", tone: "tangerine" },
  { Icon: TrendingUp, step: "Result", ex: "Lands 4 days before the breach", tone: "pink" },
];

/** The pipeline as a moving strip of illustrated steps, each carrying the running example. */
export function PipelineStrip() {
  const row = [...PIPELINE, ...PIPELINE];
  return (
    <section className="pipeline-strip" aria-label="How one decision moves: signal, evidence, context, policy, decision, approval, result">
      <div className="fade-x overflow-hidden py-3">
        <ol className="marquee" style={{ ["--marquee-speed" as string]: "60s" }} aria-hidden>
          {row.map(({ Icon, step, ex, tone }, i) => (
            <li key={i} className="pipe-step" style={{ ["--tone" as string]: `var(--color-${tone})` }}>
              <span className="pipe-icon"><Icon size={20} strokeWidth={2} /></span>
              <span className="pipe-text">
                <span className="pipe-n tabular">{String((i % PIPELINE.length) + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
                <span>{ex}</span>
              </span>
              <span className="pipe-link"><i /></span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** Decignal in figures, each figure with its own small picture and a sentence that explains it.
 *  Rendered as loose tiles so the outcome board can lay them out around the case card. */
export function GlanceCards() {
  return (
    <>
      <article className="glance-card glance-wide g-systems" style={{ ["--tone" as string]: "var(--color-cobalt)" }}>
        <div>
          <strong className="glance-num">0</strong>
          <h3>systems replaced</h3>
          <p>Decignal reads the ERP, MES, CRM and WMS you already run, read-only to start.</p>
        </div>
        <div className="glance-systems" aria-hidden>
          {SYS_ART.map(({ Icon, n, t }, i) => (
            <span key={n} style={{ ["--tone" as string]: `var(--color-${t})`, ["--i" as string]: i }}><Icon size={16} />{n}</span>
          ))}
          <b className="glance-hub"><Sparkles size={18} /></b>
        </div>
      </article>
      <article className="glance-card g-weeks" style={{ ["--tone" as string]: "var(--color-emerald)" }}>
        <strong className="glance-num" aria-label="4 to 8 weeks">4<span className="glance-dash" aria-hidden>–</span>8<small> wks</small></strong>
        <h3>to the first release</h3>
        <div className="glance-timeline" aria-hidden>
          {Array.from({ length: 12 }, (_, w) => <i key={w} data-on={w >= 3 && w < 8 || undefined} />)}
          <span style={{ left: "29%" }}>W4</span><span style={{ left: "62%" }}>W8</span>
        </div>
        <p>From the catalogue. A custom application takes 6 to 12 weeks.</p>
      </article>
      <article className="glance-card g-apps" style={{ ["--tone" as string]: "var(--color-saffron)" }}>
        <strong className="glance-num">8</strong>
        <h3>ready applications</h3>
        <div className="glance-apps" aria-hidden>
          {APPLICATIONS.map((a) => <i key={a.name} title={a.name} style={{ ["--tone" as string]: `var(--color-${CATEGORY_TONE[a.category]})` }}>{a.name.split(" ").filter((w) => /\w/.test(w)).map((w) => w[0]).join("").slice(0, 2)}</i>)}
        </div>
        <p>Inventory to finance, each fitted to your systems and policies.</p>
      </article>
      <article className="glance-card glance-side g-areas" style={{ ["--tone" as string]: "var(--color-violet)" }}>
        <strong className="glance-num">5</strong>
        <h3>business areas</h3>
        <svg className="glance-donut" viewBox="0 0 42 42" aria-hidden>
          {Object.values(CATEGORY_TONE).map((t, i) => (
            <circle key={t} r="15.9" cx="21" cy="21" pathLength={100} style={{ stroke: `var(--color-${t})`, strokeDasharray: "18 82", strokeDashoffset: -i * 20 }} />
          ))}
        </svg>
        <p>Supply chain, operations, commercial, customer, finance and risk.</p>
      </article>
      <article className="glance-card glance-side g-approver" style={{ ["--tone" as string]: "var(--color-tangerine)" }}>
        <strong className="glance-num">1</strong>
        <h3>named approver per action</h3>
        <div className="glance-approve" aria-hidden>
          <span className="glance-avatar">AM</span>
          <span><b>Transfer 240 units</b><small>Waiting for you</small></span>
          <span className="glance-btn"><Check size={13} strokeWidth={3} />Approve</span>
        </div>
        <p>Human approval can always be required. You set roles and thresholds.</p>
      </article>
    </>
  );
}

const SYS_ART = [
  { Icon: Database, n: "ERP", t: "cobalt" },
  { Icon: Users, n: "CRM", t: "violet" },
  { Icon: Factory, n: "MES", t: "emerald" },
  { Icon: Warehouse, n: "WMS", t: "saffron" },
  { Icon: Truck, n: "Suppliers", t: "tangerine" },
  { Icon: Globe, n: "External", t: "pink" },
];

/* ------------------------------------------------------------------ */

const STEP_TONES = ["cobalt", "violet", "tangerine", "emerald"];

/** What each step hands over, per route. */
const DELIVERS: Record<keyof typeof PATHS, string[][]> = {
  custom: [
    ["Decision map", "System inventory", "Constraints and owners"],
    ["Value case", "Scope and controls", "Scorecard to measure"],
    ["Production release", "Trained users", "Live scorecard"],
    ["Next use case", "Reused context layer", "Shared controls"],
  ],
  catalogue: [
    ["Chosen application", "Outcome to measure", "Named owner"],
    ["Read-only connectors", "Mapped definitions", "Data checks"],
    ["Approval rules", "Thresholds set", "Team sign-off"],
    ["Next application", "Reused context layer", "Shared controls"],
  ],
};

/** A small picture for each step, drawn in the step's colour. */
export function StepArt({ index }: { index: number }) {
  const pipe = `sa-pipe-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  if (index === 0)
    return (
      <svg className="step-art" viewBox="0 0 320 120" aria-hidden>
        {["ERP", "CRM", "MES", "WMS", "SUP", "EXT"].map((n, i) => {
          const x = 30 + (i % 3) * 40 + (i > 2 ? 0 : 0), y = i < 3 ? 26 : 94;
          return (
            <g key={n}>
              <path d={`M${x} ${y} C ${x + 60} ${y}, 190 60, 236 60`} className="sa-line" style={{ ["--i" as string]: i }} pathLength={1} />
              <circle cx={x} cy={y} r="13" className="sa-node" />
              <text x={x} y={y + 3} textAnchor="middle">{n}</text>
            </g>
          );
        })}
        <rect x="236" y="40" width="40" height="40" rx="10" transform="rotate(45 256 60)" className="sa-core" />
        <path d="M249 60l5 5 9-10" className="sa-check" />
      </svg>
    );
  if (index === 1)
    return (
      <svg className="step-art" viewBox="0 0 320 120" aria-hidden>
        <rect x="20" y="8" width="180" height="104" rx="10" className="sa-sheet" />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${20 + i * 22.5} 8V112`} className="sa-grid" />)}
        {Array.from({ length: 4 }, (_, i) => <path key={i} d={`M20 ${8 + i * 26}H200`} className="sa-grid" />)}
        <path d="M40 90 L75 70 L110 76 L145 44 L180 30" className="sa-plot" pathLength={1} />
        <circle cx="180" cy="30" r="5" className="sa-dot" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(222 ${22 + i * 30})`}>
            <rect width="16" height="16" rx="5" className="sa-box" />
            <path d="M4 8l3 3 6-6" className="sa-tick" style={{ ["--i" as string]: i }} />
            <rect x="24" y="5" width={60 - i * 12} height="6" rx="3" className="sa-bar" />
          </g>
        ))}
      </svg>
    );
  if (index === 2)
    return (
      <svg className="step-art" viewBox="0 0 320 120" aria-hidden>
        <path id={pipe} d="M30 60H290" className="sa-rail" />
        {["Test", "Validate", "Release"].map((n, i) => (
          <g key={n} transform={`translate(${40 + i * 100} 38)`}>
            <rect width="80" height="44" rx="12" className={i === 2 ? "sa-core" : "sa-sheet"} />
            <text x="40" y="27" textAnchor="middle" className={i === 2 ? "sa-on" : undefined}>{n}</text>
          </g>
        ))}
        <circle r="6" className="sa-dot">
          <animateMotion dur="3.2s" repeatCount="indefinite"><mpath href={`#${pipe}`} /></animateMotion>
        </circle>
      </svg>
    );
  return (
    <svg className="step-art" viewBox="0 0 320 120" aria-hidden>
      <rect x="140" y="40" width="40" height="40" rx="12" className="sa-core" />
      <path d="M152 60l5 5 9-10" className="sa-check" />
      {[[40, 24], [40, 96], [100, 10], [220, 10], [280, 24], [280, 96]].map(([x, y], i) => (
        <g key={i} className="sa-grow" style={{ ["--i" as string]: i }}>
          <path d={`M160 60L${x} ${y}`} className="sa-grid strong" />
          <rect x={x - 16} y={y - 11} width="32" height="22" rx="7" className="sa-sheet" />
        </g>
      ))}
    </svg>
  );
}

/** One product card per step, so each stage of the route has something real to look at. */
function StepCard({ index }: { index: number }) {
  let body: React.ReactNode;
  if (index === 0)
    body = [["Decision", "Stock transfer between plants"], ["Users", "Planner, plant manager"], ["Systems", "SAP, WMS, supplier feed"], ["Constraint", "Max 300 units per move"]].map(([k, v]) => (
      <div key={k} className="road-row"><span>{k}</span><strong>{v}</strong></div>
    ));
  else if (index === 1)
    body = [["Stockout days avoided", 82], ["Planner time saved", 64], ["Approval coverage", 100]].map(([k, v]) => (
      <div key={k} className="road-bar"><span>{k}<b className="tabular">{v}%</b></span><i style={{ ["--w" as string]: `${v}%` }} /></div>
    ));
  else if (index === 2)
    body = ["Read-only connectors live", "Approvals routed to owners", "Validated with real users", "Production release"].map((t, i) => (
      <div key={t} className="road-check" data-done={i < 3 || undefined}><i />{t}</div>
    ));
  else
    body = (
      <div className="road-apps">
        {APPLICATIONS.slice(0, 6).map((a) => (
          <span key={a.name} style={{ ["--tone" as string]: `var(--color-${CATEGORY_TONE[a.category]})` }}>{a.name}</span>
        ))}
      </div>
    );
  return (
    <div className="road-card">
      <StepArt index={index} />
      <p className="road-card-title">{["Operation map", "Blueprint scorecard", "Launch checklist", "Next applications"][index]}</p>
      {body}
    </div>
  );
}

/** Growlio's roadmap: a pinned panel, a step list with a progress rail, one card per step, advanced by scroll. */
export function Roadmap({ path, setPath, head }: { path: keyof typeof PATHS; setPath: (p: keyof typeof PATHS) => void; head?: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [prog, setProg] = useState(0);
  const steps = PATHS[path].steps;
  const keys = Object.keys(PATHS) as (keyof typeof PATHS)[];

  useEffect(() => {
    if (!root.current) return;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (s) => {
        setStep(Math.min(3, Math.floor(s.progress * 4)));
        setProg(s.progress);
      },
    });
    return () => st.kill();
  }, []);

  const go = (i: number) => {
    const el = root.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToTarget(top + (el.offsetHeight - window.innerHeight) * ((i + 0.5) / 4));
  };

  // The nav's How it works preview walks straight to a step. Phones read the steps as a list.
  useEffect(() => onStep((i) => (window.matchMedia("(min-width: 900px)").matches ? go(i) : scrollToTarget("#how"))), []);

  const s = steps[step];
  const tone = `var(--color-${STEP_TONES[step]})`;
  const toggle = (
    <div className="road-toggle" role="group" aria-label="Route">
      <span className="road-toggle-pill" style={{ transform: path === "catalogue" ? "translateX(100%)" : "none" }} aria-hidden />
      {keys.map((k) => (
        <button key={k} onClick={() => setPath(k)} aria-pressed={path === k}>{PATHS[k].label}</button>
      ))}
    </div>
  );
  return (
    <div ref={root} className="roadmap">
      <div className="roadmap-stage">
        {head}
        <div className="roadmap-panel" style={{ ["--tone" as string]: tone }}>
          <div className="roadmap-top">
            {toggle}
            <p key={path} className="road-intro how-swap">{PATHS[path].intro}</p>
            <span className="road-total"><Clock size={14} />{PATHS[path].total}</span>
          </div>
          <div className="roadmap-body">
            <ol className="roadmap-list" style={{ ["--p" as string]: prog }}>
              {steps.map((x, i) => (
                <li key={x.title} data-state={i < step ? "done" : i === step ? "now" : "next"} style={{ ["--tone" as string]: `var(--color-${STEP_TONES[i]})` }}>
                  <button onClick={() => go(i)} aria-current={i === step ? "step" : undefined}>
                    <span className="road-badge tabular">{i < step ? <Check size={13} strokeWidth={3} /> : String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <strong>{x.title}</strong>
                      <small>{x.when}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="roadmap-card" key={`${path}-${step}`}>
              <StepCard index={step} />
            </div>
            <div className="roadmap-copy" key={`copy-${path}-${step}`} aria-live="polite">
              <p className="eyebrow" style={{ color: `color-mix(in oklab, ${tone} 62%, var(--color-ink))` }}>Step {step + 1} · {s.when}</p>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <p className="road-gets">You get</p>
              <ul className="road-deliver">
                {DELIVERS[path][step].map((d) => <li key={d}><Check size={13} strokeWidth={3} />{d}</li>)}
              </ul>
            </div>
          </div>
          <div className="roadmap-progress" aria-hidden><i style={{ transform: `scaleX(${prog})` }} /></div>
        </div>
      </div>
      <div className="roadmap-mobile">
        {toggle}
        <p className="road-total"><Clock size={14} />{PATHS[path].total}</p>
        <ol>
          {steps.map((x, i) => (
            <li key={x.title} style={{ ["--tone" as string]: `var(--color-${STEP_TONES[i]})` }}>
              <span className="road-badge tabular">{String(i + 1).padStart(2, "0")}</span>
              <p className="eyebrow">{x.when}</p>
              <h3>{x.title}</h3>
              <p>{x.text}</p>
              <StepCard index={i} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
