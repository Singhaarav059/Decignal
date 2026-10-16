"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronUp } from "lucide-react";
import { CATEGORY_TONE, FEATURED } from "@/lib/content";
import { APPLICATION_DEMOS } from "@/lib/application-demos";
import { APPLICATIONS_COPY } from "@/lib/copy";
import { jumpTo, onApplication } from "@/lib/jump";
import { accentVars, toneVars } from "@/lib/tone";
import { flow, stepToward, windowPlayed } from "@/lib/flow";
import { store } from "@/lib/story";
import { whenStill } from "@/lib/idle";
import type { Frame } from "../three/ApplicationScene";
import SegmentedControl from "../ui/SegmentedControl";
import { SceneBoundary } from "../three/SceneBoundary";
import { SystemIcon, sourceIcon } from "../ui/SystemIcon";
import { CountUp } from "../ui/CountUp";
import { AreaArt } from "./AreaArt";
import { OperationEvidence } from "./OperationEvidence";
import { STAGE_AT, Swap, headline, stageAt } from "./explorer-parts";

const ApplicationScene = dynamic(() => import("../three/ApplicationScene"), { ssr: false });

/** The nav's bottom edge, which the windows scroll under. */
const NAV = 72;
/** The stages follow the scroll through a short ease (s), and take at least MIN_PLAY (s) to play
 *  through: only a flick ever meets it. */
const EASE = 0.1;
const MIN_PLAY = 1;
/** The focus line (share of the screen's height): the section across it is the application being read. */
const FOCUS = 0.62;
/** The camera's free area in a window: the window is the world's alone, under a band at its top for
 *  the labels (ScreenTag caption), so a label never sits on the world it names. */
const FRAME: Frame = { left: 8, right: 8, top: 62, bottom: 10 };

/** Hides the canvas's element while it moves (it still holds the window it left until it draws again). */
const veil = (el: HTMLElement, on: boolean) => void (el.style.visibility = on ? "hidden" : "");

/**
 * The applications on an upright phone: one section per application in the page's flow (its name and
 * title, the world in its window, then its card), scrolled natively, nothing pinned and no swipe
 * gestures to fight the scroll. One canvas moves into the window most in view; the window it leaves
 * keeps a copy of its last picture. Each application's three stages play as its window passes, eased,
 * and its stage tabs move the stage in place.
 */
export function ApplicationFlow({ list }: { list: number[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [host] = useState(() => (typeof document === "undefined" ? null : Object.assign(document.createElement("div"), { className: "aflow-gl" })));
  const [near, setNear] = useState(false);
  const [at, setAt] = useState(0);
  const [live, setLive] = useState(false);
  const [steps, setSteps] = useState(() => list.map(() => 0));
  const [still, setStill] = useState(false);
  const motion = useRef({ progress: 0, edge: 1 });
  const frame = useRef<Frame>(FRAME);
  const pin = useRef<string | null>(null);
  const snap = useRef<(() => HTMLCanvasElement | null) | null>(null);
  /** Moves an application's stage from a tab: set by the layout effect. */
  const pick = useRef<(n: number, stage: number) => void>(() => {});

  // The world builds as the section nears (and at a pause once the page is up), never at load.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setNear(true);
      io.disconnect();
    }, { rootMargin: "200% 0px" });
    io.observe(el);
    const cancel = whenStill(() => void import("../three/ApplicationScene"), 6000);
    return () => {
      io.disconnect();
      cancel();
    };
  }, []);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !host) return;
    flow.windows++;
    const wins = Array.from(el.querySelectorAll<HTMLElement>("[data-awin]"));
    const secs = Array.from(el.querySelectorAll<HTMLElement>("[data-aflow]"));
    const stills = wins.map((w) => w.querySelector<HTMLCanvasElement>(".pflow-still"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let geo: { top: number; h: number }[] = [];
    let sGeo: { top: number; h: number }[] = [];
    let vh = window.innerHeight;
    const measure = () => {
      const y = window.scrollY;
      vh = window.innerHeight;
      geo = wins.map((w) => {
        const r = w.getBoundingClientRect();
        return { top: r.top + y, h: r.height };
      });
      sGeo = secs.map((s) => {
        const r = s.getBoundingClientRect();
        return { top: r.top + y, h: r.height };
      });
    };
    const played = (k: number, y: number) => {
      const { top, h } = geo[k];
      return windowPlayed(top - y, h, vh, FOCUS, NAV);
    };
    // A stage picked on a card holds while its application is read: the scroll no longer moves it on.
    // (As an offset on the scroll's own position, it was wiped as soon as the next window peeked in.)
    const picked = new Map<number, number>();
    /** The section across the focus line at scroll y: the application being read. */
    const readAt = (y: number) => {
      const line = y + vh * FOCUS;
      let k = -1;
      sGeo.forEach(({ top, h }, n) => {
        if (top <= line && line < top + h + 56) k = n;
      });
      return k;
    };
    // A stage picked on a card above the focus line keeps its application on until the reader scrolls
    // into another section.
    let pin: { n: number; base: number } | null = null;

    let cur = -1;
    let held = -1;
    let moves = 0;
    let shownStep = -1;
    let eased = 0;
    let goal = 0;
    let easing = 0;
    let easeT = 0;
    const apply = () => {
      motion.current.progress = Math.max(0, Math.min(1, (eased - 0.12) / 0.74));
      const step = stageAt(eased);
      if (step !== shownStep && cur >= 0) {
        shownStep = step;
        const k = cur;
        setSteps((p) => (p[k] === step ? p : p.map((v, i) => (i === k ? step : v))));
      }
    };
    const ease = (t: number) => {
      const dt = Math.min((t - easeT) / 1000, 0.05);
      easeT = t;
      eased = stepToward(eased, goal, dt, EASE, 1 / MIN_PLAY);
      store.scrollAt = t;
      apply();
      easing = eased === goal ? 0 : requestAnimationFrame(ease);
    };
    const keep = (k: number) => {
      const c = stills[k];
      const src = snap.current?.();
      if (!c || !src || !src.width) return;
      if (c.width !== src.width || c.height !== src.height) {
        c.width = src.width;
        c.height = src.height;
      }
      c.getContext("2d")?.drawImage(src, 0, 0);
      c.toggleAttribute("data-kept", true);
      wins[k].toggleAttribute("data-kept", true);
    };

    let isLive = false;
    const update = () => {
      const y = window.scrollY;
      // The application being read: the section across the focus line (as the story's PhoneFlow), drawn
      // while its window is on screen.
      const read = readAt(y);
      if (pin && pin.base !== read) pin = null;
      const best = pin ? pin.n : read;
      const g = geo[best];
      const nowLive = !!g && Math.min(g.top + g.h, y + vh) - Math.max(g.top, y + NAV) > 1;
      if (!nowLive) {
        if (isLive && held >= 0) keep(held);
        if (isLive) setLive((isLive = false));
        return;
      }
      if (held >= 0 && held !== best && isLive) keep(held);
      const target = picked.get(best) ?? played(best, y);
      if (best !== cur) {
        // Scrolled down onto an application: it plays from its first stage.
        eased = best > cur && !reduce ? 0 : target;
        goal = target;
        cur = best;
        for (const k of picked.keys()) if (k !== best) picked.delete(k);
        shownStep = -1;
        setAt(best);
      }
      goal = target;
      if (reduce) eased = goal;
      if (held !== best) {
        veil(host, true);
        wins[best].appendChild(host);
        held = best;
        const m = ++moves;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (moves === m) veil(host, false);
        }));
      }
      if (!isLive) setLive((isLive = true));
      apply();
      if (Math.abs(goal - eased) > 1e-4 && !easing) {
        easeT = performance.now();
        easing = requestAnimationFrame(ease);
      }
      wins.forEach((w, k) => {
        if (w.hasAttribute("data-held") !== (k === held)) w.toggleAttribute("data-held", k === held);
        stills[k]?.toggleAttribute("data-under", k === held);
      });
    };

    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };
    measure();
    update();
    // Dev only: the poster bake (scripts/bake-flow-posters.mjs) draws the world through this.
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __appSnap: () => snap.current?.() });
    const ro = new ResizeObserver(() => {
      measure();
      schedule();
    });
    ro.observe(el);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    // A stage tab in a card: the stage moves, the page stays.
    pick.current = (n, stage) => {
      measure();
      const y = window.scrollY;
      picked.set(n, STAGE_AT[stage]);
      const base = readAt(y);
      pin = base === n ? null : { n, base };
      if (n !== cur) schedule();
      else {
        goal = STAGE_AT[stage];
        if (!easing) {
          easeT = performance.now();
          easing = requestAnimationFrame(ease);
        }
      }
    };
    // The page asks for an application by its FEATURED index (nav previews, area rows).
    const offApp = onApplication((i) => {
      const n = list.indexOf(i);
      if (n < 0) return;
      measure();
      void jumpTo(Math.max(0, sGeo[n].top - NAV - 8), { focus: false });
    });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(easing);
      ro.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      offApp();
      host.remove();
      flow.windows--;
    };
  }, [host, list]);

  const kinds = list.map((i) => APPLICATION_DEMOS[i].kind);
  const current = APPLICATION_DEMOS[list[at]];
  return (
    <div ref={root} className="aflow">
      {list.map((i, n) => (
        <AppSection key={i} i={i} n={n} count={list.length} step={steps[n]} onStage={(s) => pick.current(n, s)} />
      ))}
      {near && host && createPortal(
        <SceneBoundary label={`${FEATURED[list[at]].name}. ${current.line}`} fallback={<AreaArt area={FEATURED[list[at]].category} />}>
          <ApplicationScene kind={current.kind} kinds={kinds} step={steps[at]} active={live} still={still} motion={motion} pin={pin} frame={frame} snap={snap} />
        </SceneBoundary>,
        host,
      )}
    </div>
  );
}

/** One application: its name and title, its window, its card. */
function AppSection({ i, n, count, step, onStage }: { i: number; n: number; count: number; step: number; onStage: (stage: number) => void }) {
  const app = FEATURED[i];
  const demo = APPLICATION_DEMOS[i];
  const tone = CATEGORY_TONE[app.category];
  const [open, setOpen] = useState(false);
  const ids = useId();
  const drawerId = `${ids}-evidence`;
  const sentenceId = `${ids}-stage`;
  const done = step === 2;
  const stages = APPLICATIONS_COPY.stages.map((label, k) => ({ value: String(k), label, controls: `${sentenceId} ${drawerId}` }));
  return (
    <section className="aflow-sec" data-aflow={n} style={toneVars(tone)} aria-label={app.name}>
      <div className="aflow-head" style={accentVars(tone)}>
        <p className="application-label t-label">
          <span className="application-dot" aria-hidden />
          <span className="aflow-name">{app.name}</span>
          {count > 1 && <span className="aflow-count">{n + 1} of {count}</span>}
        </p>
        <h3 className="t-title-card application-title">{headline(demo.headline)}</h3>
        <ul className="application-reads" aria-label={APPLICATIONS_COPY.sources}>
          {demo.sources.split(" · ").map((c, k) => (
            <li key={c} style={{ ["--i" as string]: k }}>
              <SystemIcon id={sourceIcon(c)} size={16} />
              {c}
            </li>
          ))}
        </ul>
      </div>
      <div className="aflow-win" data-awin={n} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size poster, served as baked */}
        <img className="pflow-poster" src={`/flow/app-${i}.webp`} alt="" width={780} height={742} loading="lazy" decoding="async" />
        <canvas className="pflow-still" />
      </div>
      <div className="card aflow-card">
        <SegmentedControl label={`${app.name}: ${APPLICATIONS_COPY.stages.join(", ")}`} items={stages} value={String(step)} onChange={(v) => onStage(Number(v))} className="application-stages" />
        <p className="application-metric" data-done={done || undefined}>
          <Swap text={demo.metric} className="application-metric-value t-num-lg" render={(t, on) => (on && done && /^[+₹]?\d[\d,]*( [a-z-]+)?$/.test(t) ? <CountUp key={`${t}:done`} value={t} duration={700} /> : t)} />
          <Swap text={demo.metricLabel} className="application-metric-label t-small" />
        </p>
        <p id={sentenceId} role="tabpanel" className="application-sentence t-lede">
          <Swap text={demo.steps[step]} />
        </p>
        <div id={drawerId} className="application-fold application-drawer" data-open={open || undefined}>
          <div className="application-fold-inner" inert={!open}>
            {open && (
              <>
                <OperationEvidence kind={demo.kind} step={step} />
                <dl className="application-record t-small">
                  {(
                    [
                      [APPLICATIONS_COPY.labels.data, app.data],
                      [APPLICATIONS_COPY.labels.output, app.output],
                      [APPLICATIONS_COPY.labels.owner, app.reviewer],
                      [APPLICATIONS_COPY.labels.measure, app.measure],
                      [APPLICATIONS_COPY.labels.fit, app.fit],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="t-label">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        </div>
        <div className="application-card-foot">
          <button type="button" className="application-toggle" aria-expanded={open} aria-controls={drawerId} onClick={() => setOpen((o) => !o)}>
            <ChevronUp size={16} strokeWidth={2} aria-hidden />
            {open ? APPLICATIONS_COPY.hideEvidence : APPLICATIONS_COPY.showEvidence}
          </button>
          <span className="application-example t-small">{APPLICATIONS_COPY.example}</span>
        </div>
      </div>
    </section>
  );
}
