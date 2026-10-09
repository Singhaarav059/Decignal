"use client";

// The page: eight sections telling one decision end to end, over one world that never cuts away.
// The island, the bay and the day passing over them are drawn by World.tsx behind the copy; the
// scroll moves one camera through it. Each section holds its copy in a calm part of the frame (sky
// or water) and marks where its shot's subject sits with an empty [data-frame] anchor. Live figures
// are tags pinned over places in the world ([data-pin], positioned by the world every frame).
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Check, Plus } from "lucide-react";
import { measure, reel, S, SECTIONS, update, anchorOf, DECISION, loadedAt, story } from "@/lib/reel";
import { skyCss } from "@/lib/daylight";
import { RECORDS } from "@/lib/records";
import { APPLICATIONS, AREA_COPY, AUDIT_POINTS, CATEGORIES, CONNECT, DELIVERS, FAQ, FAQ_TOPICS, GAPS, GLANCE, INDUSTRIES, OUTCOMES, PATHS, PRINCIPLES, PROMISES, PROOF, STACK, TRACE } from "@/lib/content";
import { scrollToTarget } from "../SmoothScroll";
import { ReelNav } from "./ReelNav";
import { LiveReads, PrincipleDemo, StorySheet } from "./Panels";
import { AuditForm } from "./AuditForm";
import { Logo } from "../ui/Logo";

const World = dynamic(() => import("./World"), { ssr: false });

const tone = (t: string) => `var(--color-${t})`;
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const span = (v: number, a: number, b: number) => Math.min(Math.max((v - a) / (b - a), 0), 1);

/** The six systems, each a place on the island. */
const SYSTEM_PINS = [
  { id: "erp", tone: "cobalt", place: "Head office" },
  { id: "crm", tone: "violet", place: "Sales" },
  { id: "mes", tone: "emerald", place: "Plant 01, Line 2" },
  { id: "wms", tone: "saffron", place: "Plant 02" },
  { id: "sup", tone: "tangerine", place: "Inbound ship" },
  { id: "ext", tone: "pink", place: "Carrier" },
];

const SIGNAL_STEPS = [
  { word: "Signal", title: "Stock runs down", text: "Plant 01 draws down SKU 4471 faster than planned. In six days it falls below safety stock. On its own, that is one more alert." },
  { word: "Context", title: "Six facts arrive", text: "Decignal pulls in what each system knows: orders up 18%, Plant 02 holding 240 above plan, the next delivery on day 21, freight free in two days." },
  { word: "Decision", title: "One recommendation", text: "Together they resolve into one action with its reasons attached: transfer 240 units from Plant 02, arriving two days before the shortfall." },
];

/** Why the transfer, in three facts from three systems. */
const REASONS = [
  { tone: "saffron", sys: "WMS", text: "Plant 02 holds 240 above its plan" },
  { tone: "emerald", sys: "MES", text: "Line 2 needs 175 on hand by Thursday" },
  { tone: "pink", sys: "External", text: "Truck free, two days on the road" },
];

/** The five business areas, each a place on the island. */
const AREAS = [
  { id: "f-sc", name: "Supply Chain", tone: "cobalt" },
  { id: "f-op", name: "Operations", tone: "emerald" },
  { id: "f-co", name: "Commercial", tone: "tangerine" },
  { id: "f-cu", name: "Customer", tone: "pink" },
  { id: "f-fi", name: "Finance & Risk", tone: "violet" },
] as const;

/** The footer's map of the page. */
const EXPLORE = [
  { label: "Applications", blurb: "Eight applications across five business areas", go: () => scrollToTarget(anchorOf(S.yours, 0.1)) },
  { label: "Industries", blurb: "One foundation, configured for six industries", go: () => scrollToTarget(anchorOf(S.industries, 0.05)) },
  { label: "Outcomes", blurb: "What changed, measured against your baseline", go: () => scrollToTarget(anchorOf(S.outcome)) },
  { label: "How it works", blurb: "One decision first, live in weeks", go: () => scrollToTarget(anchorOf(S.how)) },
  { label: "Questions", blurb: "What enterprise teams ask first", go: () => scrollToTarget("#faq") },
];

/** Where each industry sits in the bay, in INDUSTRIES order. */
const INDUSTRY_PINS = ["i-mf", "i-au", "i-re", "i-lo", "i-fs", "i-en"];

const OUTCOME_PINS = [
  { id: "o-time", tone: "emerald", o: OUTCOMES[0] },
  { id: "o-kept", tone: "saffron", o: OUTCOMES[1] },
  { id: "o-cases", tone: "pink", o: OUTCOMES[2] },
];

const PINS_HERO = [
  { id: "p02", tone: "saffron", title: "Plant 02 · 620 on hand", note: "240 above plan" },
  { id: "trf", tone: "cobalt", title: "Truck · at Plant 02", note: "Free in two days" },
  { id: "p01", tone: "signal", title: "Plant 01 · 240 on hand", note: "SKU 4471 drawing down fast" },
  { id: "arr", tone: "emerald", title: "Plant 01 · 385 on hand", note: "TRF-0240 delivered · covered to day 21" },
];

export function Reel() {
  const root = useRef<HTMLDivElement>(null);
  const onHand = useRef<HTMLElement>(null);
  const loaded = useRef<HTMLElement>(null);
  const [signalStep, setSignalStep] = useState(0);
  const [sysStep, setSysStep] = useState(0);
  const [areaIdx, setAreaIdx] = useState(0);
  const [principle, setPrinciple] = useState(0);
  const [industry, setIndustry] = useState(0);
  const [sheet, setSheet] = useState<number | null>(null);
  const [short, setShort] = useState(false);
  const [section, setSection] = useState(0);
  const [approved, setApproved] = useState(false);
  const [phase, setPhase] = useState<"load" | "road" | "done">("load");
  const [path, setPath] = useState<keyof typeof PATHS>("custom");
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    reel.calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    measure();
    update(window.scrollY);
    let raf = 0;
    let last = { step: -1, sys: -1, area: -1, pr: -1, ind: -1, section: -1, short: false, phase: "", sky: "" };
    const secs = SECTIONS.map((k) => document.querySelector<HTMLElement>(`[data-reel="${k}"]`));
    const tick = () => {
      update(window.scrollY);
      // Each section's copy is fully there only while its shot holds: it fades out as the camera
      // leaves and fades in as the next shot settles, so copy never drags across the moving world.
      const y = window.scrollY;
      const vh = window.innerHeight;
      secs.forEach((el, i) => {
        if (!el) return;
        const top = anchorOf(i, 0);
        const end = anchorOf(i, 1);
        const away = y < top ? (top - y) / vh : i < SECTIONS.length - 1 && y > end ? (y - end) / vh : 0;
        const k = 1 - smooth(span(away, 0.06, 0.34));
        el.style.setProperty("--in", k.toFixed(3));
        const gone = String(k < 0.02);
        if (el.dataset.away !== gone) el.dataset.away = gone;
      });
      const u = reel.u[S.signal];
      // The rack's count, as the world drains it: 240 down to 145 by day 6.
      const units = Math.round(240 - 95 * smooth(span(u, 0.04, 0.3)));
      if (onHand.current) onHand.current.textContent = String(units);
      const du = reel.s >= S.decision ? reel.u[S.decision] : 0;
      const pallets = reel.s > S.decision ? 6 : loadedAt(du);
      if (loaded.current) loaded.current.textContent = String(pallets * 40);
      const step = u < 0.32 ? 0 : u < 0.68 ? 1 : 2;
      const sys = reel.u[S.systems] < 0.5 ? 0 : 1;
      const area = Math.min(Math.floor(reel.u[S.yours] * AREAS.length), AREAS.length - 1);
      if (sys !== last.sys) setSysStep(sys);
      if (area !== last.area) setAreaIdx(area);
      const pr = Math.min(Math.floor(reel.u[S.foundation] * PRINCIPLES.length), PRINCIPLES.length - 1);
      const ind = Math.min(Math.floor(reel.u[S.industries] * INDUSTRIES.length), INDUSTRIES.length - 1);
      if (pr !== last.pr) setPrinciple(pr);
      if (ind !== last.ind) setIndustry(ind);
      const ok = reel.s > S.decision + 0.001 || du >= DECISION.approve;
      const ph = reel.s > S.decision + 0.001 || du >= DECISION.drive[1] ? "done" : du >= DECISION.drive[0] ? "road" : "load";
      if (ph !== last.phase) setPhase(ph);
      if (ok !== reel.approved) {
        reel.approved = ok;
        setApproved(ok);
      }
      const below = units < 175;
      // The section filling the top of the screen, where the nav sits.
      const sec = Math.min(Math.floor(reel.s + 0.08), SECTIONS.length - 1);
      if (step !== last.step) setSignalStep(step);
      if (below !== last.short) setShort(below);
      if (sec !== last.section) {
        setSection(sec);
        document.documentElement.dataset.reelAt = SECTIONS[sec];
      }
      // The page behind the canvas follows the sky, so nothing ever flashes a different colour.
      const sky = skyCss(story());
      if (sky !== last.sky) document.documentElement.style.setProperty("--sky", sky);
      last = { step, sys, area, pr, ind, section: sec, short: below, phase: ph, sky };
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => measure();
    const onPointer = (e: PointerEvent) => {
      reel.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      reel.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    // Fonts and the accordion change heights after first paint.
    const t = window.setTimeout(measure, 600);
    const ro = new ResizeObserver(() => measure());
    if (root.current) ro.observe(root.current);
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __reelState: typeof reel }).__reelState = reel;
      (window as unknown as { __reel: (i: number, u?: number) => void }).__reel = (i, u = 0) => {
        measure();
        scrollToTarget(anchorOf(i, u), true);
      };
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      delete document.documentElement.dataset.reelAt;
    };
  }, []);

  const go = (i: number, u = 0) => scrollToTarget(anchorOf(i, u));
  // Approving moves the story on to loading; the scroll position is the one source of truth.
  const approve = () => go(S.decision, DECISION.approve + 0.02);
  // Picking an area scrolls to its stretch of the applications section, so the scroll stays the one source of truth.
  const pickArea = (i: number) => go(S.yours, (i + 0.5) / AREAS.length);
  const pickPrinciple = (i: number) => go(S.foundation, (i + 0.5) / PRINCIPLES.length);
  const pickIndustry = (i: number) => go(S.industries, (i + 0.5) / INDUSTRIES.length);
  const steps = PATHS[path].steps;

  return (
    <div ref={root} id="story" className="reel">
      <ReelNav section={section} />
      {sheet !== null && <StorySheet i={sheet} onPick={setSheet} onClose={() => setSheet(null)} />}
      <World />

      {/* Live figures, pinned by the world over the places they describe */}
      <div className="r-pins" aria-hidden>
        {PINS_HERO.map((p) => (
          <Tag key={p.id} id={p.id} tone={p.tone} title={p.title} note={p.note} />
        ))}
        {SYSTEM_PINS.map((p, i) => (
          <Tag key={p.id} id={p.id} tone={p.tone} title={`${RECORDS[i].sys} · ${RECORDS[i].field}`} value={RECORDS[i].value} note={p.place} />
        ))}
      </div>
      {/* The business areas are links: each tag opens its applications in the catalogue. */}
      <div className="r-pins r-pins-live">
        {AREAS.map((a, i) => {
          const n = APPLICATIONS.filter((x) => x.category === a.name).length;
          return (
            <span key={a.id} className="r-pin-tag r-area" data-pin={a.id} data-on="false" data-sel={i === areaIdx} style={{ "--tone": tone(a.tone) } as React.CSSProperties}>
              <button className="r-pin-card" onClick={() => pickArea(i)} aria-label={`${a.name}, ${n} applications`} aria-pressed={i === areaIdx}>
                <b>
                  <i />
                  {a.name}
                  <em>{n}</em>
                </b>
              </button>
            </span>
          );
        })}
        {INDUSTRIES.map((x, i) => (
          <span key={x.name} className="r-pin-tag r-area" data-pin={INDUSTRY_PINS[i]} data-on="false" data-sel={i === industry} style={{ "--tone": tone(x.tone) } as React.CSSProperties}>
            <button className="r-pin-card" onClick={() => pickIndustry(i)} aria-label={x.name} aria-pressed={i === industry}>
              <b>
                <i />
                {x.name}
              </b>
            </button>
          </span>
        ))}
        {OUTCOME_PINS.map((p) => (
          <span key={p.id} className="r-pin-tag r-pin-big r-outcome" data-pin={p.id} data-on="false" style={{ "--tone": tone(p.tone) } as React.CSSProperties}>
            <span className="r-pin-card" tabIndex={0}>
              <strong>{p.o.value}</strong>
              <b>
                <i />
                {p.o.label}
              </b>
              <span>{p.o.sector}</span>
              <span className="r-outcome-more">
                <span>
                  <q>{p.o.quote}</q>
                  <small>{p.o.context}</small>
                </span>
              </span>
            </span>
          </span>
        ))}
      </div>

      {/* ---------------- 01 Hero: dawn over the bay ---------------- */}
      <section data-reel="hero" className="r-sec r-hero" aria-labelledby="hero-title">
        <div className="r-hero-copy">
          <p className="r-eyebrow">Decision intelligence · India &amp; Africa</p>
          <h1 id="hero-title" className="r-display r-hero-title">
            Turn information into decisions.
          </h1>
          <p className="r-lede">Decignal connects the systems you already run and turns what they know into clear, explainable decisions your teams approve.</p>
          <div className="r-actions">
            <button className="r-btn r-btn-dark" onClick={() => scrollToTarget("#ask")}>
              Book an audit
            </button>
            <button className="r-btn r-btn-ghost" onClick={() => go(S.systems)}>
              See how <ArrowDown size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="r-frame r-frame-hero" data-frame="hero" aria-hidden />
        <div className="r-stack">
          <p className="r-stack-label">Works with your stack</p>
          <div className="r-stack-track" aria-label={`Works with ${STACK.join(", ")}`}>
            {/* Two copies so the strip loops without a seam */}
            {[0, 1].map((k) => (
              <ul key={k} aria-hidden={k === 1 || undefined}>
                {STACK.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 02 The problem: six systems, six places ---------------- */}
      <section data-reel="systems" className="r-sec r-held" style={{ height: "230vh" }} aria-labelledby="sys-title">
        <div className="r-pin">
          <header className="r-head r-head-swap">
            <p className="r-eyebrow">02 · {sysStep === 0 ? "The problem" : "Works with what you run"}</p>
            <h2 id="sys-title" className="r-display r-title r-swap" aria-live="polite">
              <span data-on={sysStep === 0}>Six systems. No answer.</span>
              <span data-on={sysStep === 1}>Decignal reads all six.</span>
            </h2>
            <div className="r-swap-block">
              <div data-on={sysStep === 0}>
                <p className="r-sub">Each place on the site holds one fact about the same problem. None of them can see the others, so none of them can tell you what to do.</p>
                <ol className="r-trio" aria-label="Why decisions stall">
                  {GAPS.map((g, i) => (
                    <li key={g.title}>
                      <span>0{i + 1}</span>
                      <strong>{g.title}</strong>
                      <em>{g.text}</em>
                    </li>
                  ))}
                </ol>
              </div>
              <div data-on={sysStep === 1}>
                <p className="r-sub">It joins what each system knows into one live picture, without replacing any of them.</p>
                <ol className="r-trio r-trio-on" aria-label="How Decignal connects">
                  {CONNECT.map((g, i) => (
                    <li key={g.title}>
                      <span>0{i + 1}</span>
                      <strong>{g.title}</strong>
                      <em>{g.text}</em>
                    </li>
                  ))}
                </ol>
                <LiveReads on={sysStep === 1} />
                <ul className="r-promises">
                  {PROMISES.map((p) => (
                    <li key={p}>
                      <Check size={13} strokeWidth={2.6} aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </header>
          <div className="r-frame r-frame-sys" data-frame="sys" aria-hidden />
          {/* The same six facts for screen readers, and as a list on phones where tags would crowd */}
          <ul className="r-facts" aria-label="What each system knows">
            {RECORDS.map((r, i) => (
              <li key={r.sys} style={{ "--tone": tone(SYSTEM_PINS[i].tone) } as React.CSSProperties}>
                <i />
                <b>{r.sys}</b> {r.field} <strong>{r.value}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- 03 Signal (pinned): Plant 01 runs short ---------------- */}
      <section data-reel="signal" className="r-sec" style={{ height: "330vh" }} aria-labelledby="signal-title">
        <div className="r-pin">
          <header className="r-head r-head-left">
            <p className="r-eyebrow">03 · Plant 01, SKU 4471</p>
            <h2 id="signal-title" className="r-display r-title r-swap" aria-live="polite">
              {SIGNAL_STEPS.map((s, i) => (
                <span key={s.word} data-on={i === signalStep}>
                  {s.word}
                </span>
              ))}
            </h2>
            <div className="r-swap-block">
              {SIGNAL_STEPS.map((s, i) => (
                <div key={s.title} data-on={i === signalStep}>
                  <h3 className="r-step-title">{s.title}</h3>
                  <p className="r-sub">{s.text}</p>
                </div>
              ))}
            </div>
            <Steps count={3} active={signalStep} onPick={(i) => go(S.signal, [0.16, 0.5, 0.86][i])} />
          </header>

          <div className="r-frame r-frame-plant" data-frame="plant" aria-hidden />

          <dl className="r-panel r-stock" aria-label="Plant 01 stock">
            <div className="r-stock-top">
              <span className={`r-pill ${short ? "r-pill-risk" : ""}`}>{short ? "Below safety stock" : "Plant 01 · WMS"}</span>
              <p className="r-stock-big">
                <b ref={onHand}>240</b> on hand
              </p>
              <StockChart step={signalStep} />
            </div>
            <div>
              <dt>Safety stock</dt>
              <dd>175</dd>
            </div>
            <div data-on={short}>
              <dt>Runs short</dt>
              <dd>Day 6</dd>
            </div>
            <div data-on={signalStep > 0}>
              <dt>Facts gathered</dt>
              <dd>{signalStep > 0 ? "6 of 6" : "0 of 6"}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------- 04 Decision (pinned): approve, load, deliver ---------------- */}
      <section data-reel="decision" className="r-sec" style={{ height: "400vh" }} aria-labelledby="decision-title">
        <div className="r-pin">
          <header className="r-head r-head-left">
            <p className="r-eyebrow">04 · The decision</p>
            <h2 id="decision-title" className="r-display r-title">
              Move 240 units.
            </h2>
            <p className="r-kicker">
              {phase === "load" ? (
                <>
                  Plant 02 to Plant 01 · <b ref={loaded}>0</b> of 240 loaded
                </>
              ) : phase === "road" ? (
                "240 loaded · on the road to Plant 01"
              ) : (
                "Delivered to Plant 01 · two days before the shortfall"
              )}
            </p>
            <ul className="r-reasons" aria-label="Why">
              {REASONS.map((r) => (
                <li key={r.sys} style={{ "--tone": tone(r.tone) } as React.CSSProperties}>
                  <i />
                  <span>{r.text}</span>
                  <em>{r.sys}</em>
                </li>
              ))}
            </ul>
            <div className="r-approve">
              <button className={`r-btn ${approved ? "r-btn-ok" : "r-btn-dark"}`} onClick={approve} aria-pressed={approved} disabled={approved}>
                {approved ? (
                  <>
                    <Check size={16} strokeWidth={2.4} /> Approved
                  </>
                ) : (
                  "Approve transfer"
                )}
              </button>
              <span className="r-approve-note">{approved ? "Signed off by the planner, as policy requires" : "Planner approval required by policy"}</span>
            </div>
          </header>
          <div className="r-frame r-frame-yard" data-frame="yard" aria-hidden />
          <div className="r-trace r-panel">
            <p className="r-trace-id">
              TRF-0240 <span>· SKU 4471 · decision record</span>
            </p>
            <ol aria-label="Decision record">
              {TRACE.map((t, i) => {
                const done = approved ? (phase === "done" ? 7 : 6) : 5;
                return (
                  <li key={t.step} data-state={i < done ? "done" : i === done ? "now" : "next"}>
                    <span>
                      {String(i + 1).padStart(2, "0")} {t.step}
                    </span>
                    {t.text}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------- 05 Foundation (pinned): the head office, where the decision is recorded ---------------- */}
      <section id="platform" data-reel="foundation" className="r-sec" style={{ height: "330vh" }} aria-labelledby="found-title">
        <div className="r-pin">
          <header className="r-head r-head-left r-catalogue r-found">
            <p className="r-eyebrow">05 · The foundation</p>
            <h2 id="found-title" className="r-display r-title">
              Enterprise-grade underneath.
            </h2>
            <p className="r-cat-count">Effortless on the surface: one trusted layer for the context, controls and reliability every application needs.</p>
            <div className="r-cat-tabs" role="tablist" aria-label="Principles">
              {PRINCIPLES.map((x, i) => (
                <button key={x.name} role="tab" aria-selected={i === principle} onClick={() => pickPrinciple(i)}>
                  <span>0{i + 1}</span>
                  {x.name}
                </button>
              ))}
            </div>
            <div className="r-swap-block r-found-panes">
              {PRINCIPLES.map((x, i) => (
                <div key={x.name} data-on={i === principle} role="tabpanel" aria-label={x.name} inert={i !== principle}>
                  <h3 className="r-found-title">{x.title}</h3>
                  <p className="r-cat-lead">{x.text}</p>
                  <p className="r-found-badge">
                    <Check size={13} strokeWidth={2.6} aria-hidden />
                    {x.badge}
                  </p>
                </div>
              ))}
            </div>
            <div className="r-cat-foot">
              <span>
                {String(principle + 1).padStart(2, "0")} / {String(PRINCIPLES.length).padStart(2, "0")}
              </span>
            </div>
          </header>
          <div className="r-frame r-frame-found" data-frame="found" aria-hidden />
          <div className="r-demo r-panel">
            {PRINCIPLES.map((x, i) => (
              <div key={x.name} data-on={i === principle} aria-hidden={i !== principle}>
                <PrincipleDemo i={i} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 06 Make it yours: golden hour over the harbour ---------------- */}
      <section id="applications" data-reel="yours" className="r-sec" style={{ height: "360vh" }} aria-labelledby="yours-title">
        <div className="r-pin">
          <header className="r-head r-head-left r-catalogue">
            <p className="r-eyebrow">06 · Applications</p>
            <h2 id="yours-title" className="r-display r-title">
              Built for your operation.
            </h2>
            <p className="r-cat-count">
              {APPLICATIONS.length} applications · {CATEGORIES.length} business areas · live in weeks
            </p>
            <div className="r-cat-tabs" role="tablist" aria-label="Business areas">
              {AREAS.map((a, i) => (
                <button key={a.id} role="tab" aria-selected={i === areaIdx} onClick={() => pickArea(i)} style={{ "--tone": tone(a.tone) } as React.CSSProperties}>
                  <i />
                  {a.name}
                </button>
              ))}
            </div>
            <div className="r-swap-block r-cat-panes">
              {AREAS.map((a, i) => {
                const apps = APPLICATIONS.filter((x) => x.category === a.name);
                const copy = AREA_COPY[a.name];
                return (
                  <div key={a.id} data-on={i === areaIdx} role="tabpanel" aria-label={a.name} inert={i !== areaIdx} style={{ "--tone": tone(a.tone) } as React.CSSProperties}>
                    <p className="r-cat-lead">{copy.lead}</p>
                    <p className="r-cat-signal">
                      <span>Signal</span>
                      {copy.signal}
                    </p>
                    <ul className="r-cat-apps">
                      {apps.map((x) => (
                        <li key={x.name}>
                          <div className="r-cat-app-top">
                            <button className="r-cat-open" onClick={() => setSheet(APPLICATIONS.indexOf(x))} aria-haspopup="dialog">
                              {x.name}
                            </button>
                            <em>{x.weeks} wks</em>
                          </div>
                          <p className="r-cat-text">{x.text}</p>
                          <p className="r-cat-action">
                            <ArrowRight size={13} strokeWidth={2.4} aria-hidden />
                            {x.example}
                          </p>
                          <p className="r-cat-sys">
                            {x.connects.join(" · ")}
                            <span className="r-cat-more">
                              See it decide <ArrowRight size={12} strokeWidth={2.4} aria-hidden />
                            </span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <div className="r-cat-foot">
              <span>
                {String(areaIdx + 1).padStart(2, "0")} / {String(AREAS.length).padStart(2, "0")}
              </span>
              <button className="r-link" onClick={() => scrollToTarget("#audit")}>
                Discuss an application <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          </header>
          <div className="r-frame r-frame-fn" data-frame="fn" aria-hidden />
        </div>
      </section>

      {/* ---------------- 07 Industries (pinned): the bay from the quay side ---------------- */}
      <section id="industries" data-reel="industries" className="r-sec" style={{ height: "360vh" }} aria-labelledby="ind-title">
        <div className="r-pin">
          <header className="r-head r-head-left r-catalogue">
            <p className="r-eyebrow">07 · Industries</p>
            <h2 id="ind-title" className="r-display r-title">
              Shaped around your industry.
            </h2>
            <p className="r-cat-count">The same foundation, configured around the systems and decisions of six industries.</p>
            <div className="r-cat-tabs" role="tablist" aria-label="Industries">
              {INDUSTRIES.map((x, i) => (
                <button key={x.name} role="tab" aria-selected={i === industry} onClick={() => pickIndustry(i)} style={{ "--tone": tone(x.tone) } as React.CSSProperties}>
                  <i />
                  {x.name}
                </button>
              ))}
            </div>
            <div className="r-swap-block r-cat-panes">
              {INDUSTRIES.map((x, i) => (
                <div key={x.name} data-on={i === industry} role="tabpanel" aria-label={x.name} inert={i !== industry} style={{ "--tone": tone(x.tone) } as React.CSSProperties}>
                  <h3 className="r-found-title">{x.title}</h3>
                  <p className="r-cat-lead">{x.text}</p>
                  <ul className="r-ind-caps">
                    {x.caps.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                  <div className="r-ind-signal">
                    <div>
                      <span>Operational signal</span>
                      <b>{x.signal}</b>
                      <em>{x.where}</em>
                    </div>
                    <p>
                      <strong>{x.metric}</strong>
                      {x.metricLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="r-cat-foot">
              <span>
                {String(industry + 1).padStart(2, "0")} / {String(INDUSTRIES.length).padStart(2, "0")}
              </span>
              <button className="r-link" onClick={() => pickArea(CATEGORIES.indexOf(INDUSTRIES[industry].area))}>
                {INDUSTRIES[industry].area} applications <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          </header>
          <div className="r-frame r-frame-ind" data-frame="ind" aria-hidden />
        </div>
      </section>

      {/* ---------------- 08 Outcome: sunset, the stock is back ---------------- */}
      <section id="outcomes" data-reel="outcome" className="r-sec r-held" style={{ height: "160vh" }} aria-labelledby="outcome-title">
        <div className="r-pin">
          <header className="r-head">
            <p className="r-eyebrow">08 · The outcome</p>
            <h2 id="outcome-title" className="r-display r-title">
              Know what changed.
            </h2>
            <p className="r-sub">Every recommendation ends in an operating result you can check against your own baseline.</p>
          </header>
          <div className="r-frame r-frame-out" data-frame="out" aria-hidden />
          <ul className="r-facts r-outcomes-list" aria-label="Outcomes">
            {OUTCOMES.map((o) => (
              <li key={o.sector}>
                <strong>{o.value}</strong> {o.label}
              </li>
            ))}
          </ul>
          <p className="r-note">Illustrative decisions from the story above.</p>
        </div>
      </section>

      {/* ---------------- 07 How it works: dusk over the bay ---------------- */}
      <section id="how" data-reel="how" className="r-sec r-held r-dark" style={{ height: "160vh" }} aria-labelledby="how-title">
        <div className="r-pin">
          <header className="r-head">
            <p className="r-eyebrow">09 · How it works</p>
            <h2 id="how-title" className="r-display r-title">
              One decision first.
            </h2>
            <p className="r-sub">{PATHS[path].intro}</p>
            <div className="r-switch" role="tablist" aria-label="Route">
              {(Object.keys(PATHS) as (keyof typeof PATHS)[]).map((k) => (
                <button key={k} role="tab" aria-selected={path === k} onClick={() => setPath(k)}>
                  {PATHS[k].label}
                </button>
              ))}
            </div>
          </header>
          <ol className="r-route" aria-label={PATHS[path].total}>
            {steps.map((s, i) => (
              <li key={`${path}-${s.title}`} style={{ "--i": i } as React.CSSProperties}>
                <span className="r-route-when">{s.when}</span>
                <strong>{s.title}</strong>
                <span>{s.text}</span>
                <ul className="r-route-gets" aria-label="You get">
                  {DELIVERS[path][i].map((d) => (
                    <li key={d}>
                      <Check size={12} strokeWidth={2.8} aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <p className="r-note r-route-total">{PATHS[path].total}</p>
          <div className="r-frame r-frame-how" data-frame="how" aria-hidden />
        </div>
      </section>

      {/* ---------------- 08 Questions and the audit: night harbour ---------------- */}
      <section id="ask" data-reel="ask" className="r-sec r-dark r-ask" aria-labelledby="ask-title">
        <div className="r-frame r-frame-ask" data-frame="ask" aria-hidden />
        <div className="r-ask-body">
          <section className="r-glance" aria-labelledby="glance-title">
            <div className="r-glance-head">
              <p className="r-eyebrow">At a glance</p>
              <h2 id="glance-title" className="r-display r-glance-title">
                What working with Decignal looks like.
              </h2>
            </div>
            <ul>
              {GLANCE.map((g) => (
                <li key={g.label}>
                  <strong>{g.value}</strong>
                  <b>{g.label}</b>
                  <span>{g.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="r-proof" aria-labelledby="proof-title">
            <div className="r-proof-head">
              <p className="r-eyebrow">Representative outcomes</p>
              <h2 id="proof-title" className="r-display r-glance-title">
                Value measured in the operation, not in AI activity.
              </h2>
              <p className="r-note">Illustrative deployment patterns, to be replaced with verified client results.</p>
            </div>
            <ul>
              {PROOF.map((p) => (
                <li key={p.title} style={{ "--tone": tone(p.tone) } as React.CSSProperties}>
                  <p className="r-proof-sector">
                    <i />
                    {p.sector}
                  </p>
                  <b>{p.title}</b>
                  <q>{p.quote}</q>
                  <p className="r-proof-num">
                    <strong>{p.value}</strong>
                    {p.label}
                  </p>
                  <small>{p.context}</small>
                </li>
              ))}
            </ul>
          </section>

          <div className="r-ask-grid">
            <div id="faq" className="r-faq">
              <p className="r-eyebrow">10 · Before you begin</p>
              <h2 id="ask-title" className="r-display r-title">
                Questions teams ask first.
              </h2>
              <ul className="r-faq-list">
                {FAQ.map((f, i) => {
                  const on = open === i;
                  return (
                    <li key={f.q} data-open={on}>
                      <button id={`faq-q-${i}`} aria-expanded={on} aria-controls={`faq-a-${i}`} onClick={() => setOpen(on ? null : i)}>
                        <span>
                          <small>{FAQ_TOPICS[i]}</small>
                          {f.q}
                        </span>
                        <Plus size={16} strokeWidth={2} aria-hidden />
                      </button>
                      <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} inert={!on} className="r-faq-a">
                        <div>
                          <p>{f.a}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="r-faq-help">
                <p>
                  <b>Still have a question?</b> Bring it to the free 30-minute audit.
                </p>
                <button
                  className="r-link"
                  onClick={() => {
                    scrollToTarget("#audit");
                    // Beside the form, the quickest help is to start it.
                    window.setTimeout(() => document.querySelector<HTMLInputElement>("#audit input")?.focus({ preventScroll: true }), 900);
                  }}
                >
                  Book a free AI audit <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            </div>
            <div id="audit" className="r-audit">
              <p className="r-eyebrow">Free AI audit</p>
              <h2 className="r-display r-audit-title">Bring us the decision that should move faster.</h2>
              <p className="r-sub">30 minutes on one workflow: the systems behind it and the outcome worth solving first.</p>
              <ul className="r-audit-points">
                {AUDIT_POINTS.map((p, i) => (
                  <li key={p.title}>
                    <span>0{i + 1}</span>
                    <b>{p.title}</b>
                    {p.text}
                  </li>
                ))}
              </ul>
              <AuditForm />
            </div>
          </div>

          <div className="r-close">
            <h2 className="r-display r-close-title">
              Bring us one decision.
              <br />
              We will show you the rest.
            </h2>
            <button className="r-btn r-btn-light" onClick={() => scrollToTarget("#audit")}>
              Book a free AI audit <ArrowRight size={16} strokeWidth={2} />
            </button>
          </div>

          <footer className="r-footer">
            <div className="r-footer-cols">
              <div className="r-footer-brand">
                <Logo size={22} />
                <p>Decision intelligence for enterprises across India and Africa.</p>
                <button className="r-link" onClick={() => scrollToTarget("#audit")}>
                  Free AI audit <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
              <nav aria-label="Footer">
                <p className="r-eyebrow">Explore</p>
                <ul>
                  {EXPLORE.map((l, i) => (
                    <li key={l.label}>
                      <button onClick={l.go}>
                        <span>0{i + 1}</span>
                        <b>{l.label}</b>
                        {l.blurb}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
              <div>
                <p className="r-eyebrow">Where Decignal works</p>
                <ul className="r-footer-areas">
                  {AREAS.map((a, i) => (
                    <li key={a.id} style={{ "--tone": tone(a.tone) } as React.CSSProperties}>
                      <button onClick={() => pickArea(i)}>
                        <i />
                        {a.name}
                        <em>{APPLICATIONS.filter((x) => x.category === a.name).length}</em>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="r-footer-row">
              <p>© 2026 Decignal</p>
              <button className="r-top" onClick={() => scrollToTarget(0)}>
                Back to top <ArrowUp size={14} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <p className="r-wordmark" aria-hidden>
              decignal
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}

function Tag({ id, tone: t, title, note, value, big }: { id: string; tone: string; title: string; note?: string; value?: string; big?: boolean }) {
  return (
    <span className={`r-pin-tag ${big ? "r-pin-big" : ""}`} data-pin={id} data-on="false" style={{ "--tone": tone(t) } as React.CSSProperties}>
      <span className="r-pin-card">
        {value && <strong>{value}</strong>}
        <b>
          <i />
          {title}
        </b>
        {note && <span>{note}</span>}
      </span>
    </span>
  );
}

function Steps({ count, active, onPick }: { count: number; active: number; onPick: (i: number) => void }) {
  return (
    <div className="r-steps" role="tablist" aria-label="Steps">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} role="tab" aria-selected={i === active} aria-label={`Step ${i + 1}: ${SIGNAL_STEPS[i].word}`} onClick={() => onPick(i)} data-on={i === active}>
          <span>{String(i + 1).padStart(2, "0")}</span>
          {SIGNAL_STEPS[i].word}
        </button>
      ))}
    </div>
  );
}


/** Plant 01's projected stock for the next six days: it crosses safety stock on day 6; the transfer lands on day 2. */
const PROJECTED = [240, 235, 227, 216, 200, 180, 145];
function StockChart({ step }: { step: number }) {
  const W = 192;
  const H = 62;
  const x = (d: number) => 4 + (d / 6) * (W - 8);
  const y = (v: number) => 6 + ((250 - v) / 120) * (H - 18);
  const line = PROJECTED.map((v, d) => `${d ? "L" : "M"}${x(d).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <figure className="r-chart" data-step={step}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Projected stock falls from 240 to 145 by day 6, below the safety stock of 175. A transfer can land on day 2.">
        <line className="r-chart-safety" x1={0} x2={W} y1={y(175)} y2={y(175)} />
        <path className="r-chart-line" d={line} />
        <g className="r-chart-land">
          <line x1={x(2)} x2={x(2)} y1={4} y2={H - 12} />
          <circle cx={x(2)} cy={y(227)} r={3.2} />
        </g>
        <circle className="r-chart-short" cx={x(6)} cy={y(145)} r={3.4} />
        <text x={x(0)} y={H - 1}>Today</text>
        <text x={x(2)} y={H - 1} textAnchor="middle" className="r-chart-land">Transfer lands</text>
        <text x={x(6)} y={H - 1} textAnchor="end">Day 6</text>
      </svg>
      <figcaption>Projected stock · safety 175</figcaption>
    </figure>
  );
}
