"use client";

// The nav's glances: hover a link and a panel drops under the nav with that part of the page at a
// glance, live. One panel morphs between them (its width and height follow the open glance, the
// content slides in from the side the pointer came from, a notch tracks the link), and everything
// in it is a way in: each scene, step, area, industry and question jumps straight to its place.
//
// The story glance is the day itself: ten scenes from dawn to night, each tile painted with its
// hour's sky, a sun (then the moon) travelling the arc above them as you scroll, and the scene
// you are in filling as it plays.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRight, Bot, CalendarClock, Check, Database, Layers, Lock, type LucideIcon } from "lucide-react";
import { APPLICATIONS, AREA_COPY, CATEGORIES, CATEGORY_TONE, FAQ, FAQ_TOPICS, INDUSTRIES, PATHS, PRINCIPLES } from "@/lib/content";
import { N, S, atSection, story } from "@/lib/reel";
import { skyAt } from "@/lib/daylight";

export type GlanceId = "story" | "platform" | "apps" | "how" | "faq";
export const GLANCE_ORDER: GlanceId[] = ["story", "platform", "apps", "how", "faq"];
const WIDTH: Record<GlanceId, number> = { story: 920, platform: 800, apps: 820, how: 780, faq: 760 };

export type GlanceActions = {
  /** Scroll to section i, a share u of the way through its pin. */
  go: (i: number, u?: number) => void;
  area: (i: number) => void;
  industry: (i: number) => void;
  principle: (i: number) => void;
  question: (i: number) => void;
  audit: () => void;
};

/** The ten scenes, in page order: what each is and the hour it plays at. */
export const SCENES = [
  { name: "Turn information into decisions", hour: "Dawn", line: "One island, one bay, one decision" },
  { name: "Six systems, no answer", hour: "Morning", line: "Each system holds one fact" },
  { name: "The signal", hour: "Late morning", line: "Plant 01 short in six days" },
  { name: "Move 240 units", hour: "Afternoon", line: "Approved, loaded, delivered" },
  { name: "The foundation", hour: "Late afternoon", line: "Five principles under every app" },
  { name: "Applications", hour: "Golden hour", line: "Eight apps, five business areas" },
  { name: "Industries", hour: "Golden hour", line: "One foundation, six industries" },
  { name: "The outcome", hour: "Sunset", line: "Measured against your baseline" },
  { name: "How it works", hour: "Dusk", line: "Live in four to twelve weeks" },
  { name: "Questions and audit", hour: "Night", line: "What teams ask first" },
];

/** Each scene's sky at the moment its shot holds, as two flat bands. */
export const sceneSky = () => SCENES.map((_, i) => skyAt(atSection(i, 0.5)));

const ACTS = [
  { name: "The problem", from: 0, to: 3 },
  { name: "The answer", from: 3, to: 5 },
  { name: "At scale", from: 5, to: 8 },
  { name: "Getting started", from: 8, to: 10 },
];

const FAQ_PICK: [number, LucideIcon, string][] = [
  [0, Layers, "cobalt"],
  [1, Database, "saffron"],
  [2, Lock, "violet"],
  [3, Bot, "emerald"],
  [7, CalendarClock, "emerald"],
];

const tone = (t: string) => `var(--color-${t})`;
const count = (c: string) => APPLICATIONS.filter((a) => a.category === c).length;

export function NavGlance({
  open,
  caret,
  section,
  actions,
  onEnter,
  onLeave,
  onDone,
}: {
  open: GlanceId | null;
  /** The hovered link's centre, in viewport pixels. */
  caret: number;
  section: number;
  actions: GlanceActions;
  onEnter: () => void;
  onLeave: () => void;
  onDone: () => void;
}) {
  const panes = useRef<Partial<Record<GlanceId, HTMLDivElement | null>>>({});
  const [h, setH] = useState(0);
  const [last, setLast] = useState<GlanceId>("story");
  const [dir, setDir] = useState(1);
  // Counts openings, so each glance's entrance replays every time the panel opens.
  const [epoch, setEpoch] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  if (!!open !== wasOpen) {
    setWasOpen(!!open);
    if (open) setEpoch((n) => n + 1);
  }
  if (open && open !== last) {
    setDir(GLANCE_ORDER.indexOf(open) > GLANCE_ORDER.indexOf(last) ? 1 : -1);
    setLast(open);
  }
  const shown = open ?? last;

  useLayoutEffect(() => {
    const el = panes.current[shown];
    if (!el) return;
    const measure = () => setH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shown]);

  const [vw, setVw] = useState(1440);
  useLayoutEffect(() => {
    const m = () => setVw(document.documentElement.clientWidth);
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);
  const w = Math.min(WIDTH[shown], vw - 32);
  const left = (vw - w) / 2;

  const act = (fn: () => void) => () => {
    onDone();
    fn();
  };

  return (
    <div
      id="r-peek"
      className="r-peek"
      data-open={open ? "" : undefined}
      style={{ left, ["--w" as string]: `${w}px`, ["--h" as string]: `${h}px`, ["--caret" as string]: `${Math.min(Math.max(caret - left, 28), w - 28)}px` }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onKeyDown={(e) => e.key === "Escape" && onDone()}
      inert={!open}
      aria-label="Section glance"
      role="region"
    >
      <i className="r-peek-caret" aria-hidden />
      <div className="r-peek-body">
        {GLANCE_ORDER.map((id) => (
          <div
            key={id}
            ref={(n) => {
              panes.current[id] = n;
            }}
            className="r-peek-pane"
            data-on={id === shown || undefined}
            data-from={id === shown ? undefined : GLANCE_ORDER.indexOf(id) < GLANCE_ORDER.indexOf(shown) ? "left" : "right"}
            style={{ ["--dir" as string]: dir }}
            aria-hidden={id !== shown}
          >
            <div key={id === shown ? `${id}-${epoch}` : id} className="r-peek-in">
              {id === "story" && <StoryGlance act={act} actions={actions} section={section} live={open === "story"} />}
              {id === "platform" && <PlatformGlance act={act} actions={actions} section={section} />}
              {id === "apps" && <AppsGlance act={act} actions={actions} />}
              {id === "how" && <HowGlance act={act} actions={actions} />}
              {id === "faq" && <FaqGlance act={act} actions={actions} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Act = (fn: () => void) => () => void;

/** Live story progress while a glance shows it: the scene you are in, how far it has played, the sun's place on its arc. */
function useStoryClock(root: React.RefObject<HTMLElement | null>, live: boolean) {
  useEffect(() => {
    const el = root.current;
    if (!el || !live) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>("[data-scene]"));
    const sun = el.querySelector<SVGGElement>("[data-sun]");
    const pct = el.querySelector<HTMLElement>("[data-pct]");
    let lastT = -1;
    const tick = () => {
      const t = story();
      if (Math.abs(t - lastT) < 1e-4) return;
      lastT = t;
      const here = Math.min(Math.floor(t + 1e-4), N - 1);
      tiles.forEach((tile, i) => {
        tile.style.setProperty("--fill", String(Math.min(Math.max(t - i, 0), 1)));
        tile.toggleAttribute("data-here", here === i);
        tile.toggleAttribute("data-read", i < here);
      });
      const p = Math.min(Math.max(t / (N - 1), 0), 1);
      if (pct) pct.textContent = `${Math.round(p * 100)}%`;
      if (sun) {
        // Dawn at the left end of the arc, night at the right; the sun gives way to the moon at dusk.
        const a = Math.PI * (1 - p);
        sun.setAttribute("transform", `translate(${(120 + Math.cos(a) * 104).toFixed(1)} ${(64 - Math.sin(a) * 52).toFixed(1)})`);
        sun.toggleAttribute("data-moon", p > 0.86);
      }
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [root, live]);
}

function StoryGlance({ act, actions, section, live }: { act: Act; actions: GlanceActions; section: number; live: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const skies = useMemo(() => sceneSky(), []);
  useStoryClock(root, live);
  return (
    <div ref={root} className="r-peek-story">
      <div className="r-peek-head" style={{ ["--k" as string]: 0 }}>
        <div>
          <p className="r-peek-kicker">The story · one decision, dawn to night</p>
          <p className="r-peek-lead">One stock shortage at Plant 01, followed from the first signal to a delivered transfer, while a day passes over the bay.</p>
        </div>
        <div className="r-peek-arc" aria-hidden>
          <svg viewBox="0 0 240 72" width="168" height="50">
            <path d="M16 64 A104 52 0 0 1 224 64" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" />
            <line x1="6" y1="64" x2="234" y2="64" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
            <g data-sun transform="translate(16 64)">
              <circle r="7" className="r-peek-sun" />
            </g>
          </svg>
          <span data-pct className="r-peek-pct">0%</span>
        </div>
      </div>
      <div className="r-peek-acts">
        {ACTS.map((a, ai) => (
          <section key={a.name} aria-label={a.name} style={{ ["--k" as string]: ai + 1 }}>
            <p className="r-peek-act">{a.name}</p>
            <ol>
              {SCENES.slice(a.from, a.to).map((sc, j) => {
                const i = a.from + j;
                return (
                  <li key={sc.name}>
                    <button data-scene aria-current={section === i ? "step" : undefined} onClick={act(() => actions.go(i, i === S.signal ? 0.05 : 0))} style={{ ["--top" as string]: skies[i].top, ["--hz" as string]: skies[i].horizon }}>
                      <span className="r-peek-sky" data-dark={skies[i].dark || undefined} aria-hidden>
                        <em>{sc.hour}</em>
                      </span>
                      <span className="r-peek-scene">
                        <small className="tabular">{String(i + 1).padStart(2, "0")}</small>
                        <b>{sc.name}</b>
                        <span>{sc.line}</span>
                      </span>
                      <span className="r-peek-bar" aria-hidden>
                        <span />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

const PROJECTED = [240, 235, 227, 216, 200, 180, 145];

function PlatformGlance({ act, actions, section }: { act: Act; actions: GlanceActions; section: number }) {
  const x = (i: number) => 8 + i * 30;
  const y = (v: number) => 8 + ((250 - v) / 120) * 52;
  return (
    <div className="r-peek-grid r-peek-platform">
      <button className="r-peek-card" data-here={section === S.signal || undefined} onClick={act(() => actions.go(S.signal, 0.05))} style={{ ["--tone" as string]: tone("signal"), ["--k" as string]: 0 }}>
        <span className="r-peek-art" aria-hidden>
          <svg viewBox="0 0 196 70">
            <line x1="4" x2="192" y1={y(175)} y2={y(175)} stroke="var(--color-signal)" strokeWidth="1.5" strokeDasharray="4 4" />
            <polyline points={PROJECTED.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" className="r-peek-draw" />
            <circle cx={x(6)} cy={y(145)} r="4" fill="var(--color-signal)" />
            <text x="4" y={y(175) + 12}>safety 175</text>
          </svg>
        </span>
        <small>03 · The signal</small>
        <b>Plant 01 runs short in six days</b>
        <span>Orders up 18%, stock heading under safety by day six.</span>
      </button>
      <button className="r-peek-card" data-here={section === S.decision || undefined} onClick={act(() => actions.go(S.decision))} style={{ ["--tone" as string]: tone("cobalt"), ["--k" as string]: 1 }}>
        <span className="r-peek-art" aria-hidden>
          <svg viewBox="0 0 196 70">
            <rect x="6" y="20" width="34" height="30" rx="5" fill="var(--color-saffron)" />
            <rect x="156" y="20" width="34" height="30" rx="5" fill="var(--color-cobalt)" />
            <line x1="44" x2="152" y1="35" y2="35" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" />
            <g className="r-peek-truck">
              <rect x="-11" y="-6" width="16" height="11" rx="2" fill="currentColor" />
              <rect x="6" y="-4" width="7" height="9" rx="2" fill="currentColor" />
            </g>
            <text x="23" y="64" textAnchor="middle">P02</text>
            <text x="173" y="64" textAnchor="middle">P01</text>
          </svg>
        </span>
        <small>04 · The decision</small>
        <b>Transfer 240 units</b>
        <span>Approved by the planner, lands two days early.</span>
      </button>
      <div className="r-peek-card r-peek-list" style={{ ["--tone" as string]: tone("violet"), ["--k" as string]: 2 }}>
        <small>05 · The foundation</small>
        <ul>
          {PRINCIPLES.map((p, i) => (
            <li key={p.name}>
              <button onClick={act(() => actions.principle(i))}>
                <Check size={13} strokeWidth={2.6} aria-hidden />
                <b>{p.name}</b>
                <span>{p.badge}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AppsGlance({ act, actions }: { act: Act; actions: GlanceActions }) {
  return (
    <div className="r-peek-grid r-peek-apps">
      <div style={{ ["--k" as string]: 0 }}>
        <p className="r-peek-kicker">
          {APPLICATIONS.length} applications · {CATEGORIES.length} business areas
        </p>
        <ul className="r-peek-rows">
          {CATEGORIES.map((c, i) => (
            <li key={c} style={{ ["--tone" as string]: tone(CATEGORY_TONE[c]), ["--d" as string]: i }}>
              <button onClick={act(() => actions.area(i))}>
                <i aria-hidden />
                <b>{c}</b>
                <span>{AREA_COPY[c].lead}</span>
                <em className="tabular">{count(c)}</em>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ ["--k" as string]: 1 }}>
        <p className="r-peek-kicker">Configured for your industry</p>
        <ul className="r-peek-chips">
          {INDUSTRIES.map((x, i) => (
            <li key={x.name} style={{ ["--tone" as string]: tone(x.tone), ["--d" as string]: i }}>
              <button onClick={act(() => actions.industry(i))}>
                <i aria-hidden />
                {x.name}
              </button>
            </li>
          ))}
        </ul>
        <button className="r-peek-go" onClick={act(() => actions.go(S.yours, 0.1))}>
          Open the catalogue <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function HowGlance({ act, actions }: { act: Act; actions: GlanceActions }) {
  const steps = PATHS.custom.steps;
  return (
    <div className="r-peek-how">
      <ol className="r-peek-route">
        {steps.map((s, i) => (
          <li key={s.title} style={{ ["--k" as string]: i, ["--tone" as string]: tone(["cobalt", "violet", "tangerine", "emerald"][i]) }}>
            <button onClick={act(() => actions.go(S.how))}>
              <i aria-hidden />
              <small>{s.when}</small>
              <b>{s.title}</b>
              <span>{s.text}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="r-peek-foot" style={{ ["--k" as string]: 4 }}>
        <span>
          <b>From the catalogue</b> {PATHS.catalogue.total.replace(" to the first production release", "")}
        </span>
        <span>
          <b>Custom</b> {PATHS.custom.total.replace(" to the first production release", "")}
        </span>
        <button className="r-peek-go" onClick={act(actions.audit)}>
          Start with the audit <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function FaqGlance({ act, actions }: { act: Act; actions: GlanceActions }) {
  return (
    <div className="r-peek-grid r-peek-faq">
      <ul className="r-peek-rows" style={{ ["--k" as string]: 0 }}>
        {FAQ_PICK.map(([q, Icon, t], k) => (
          <li key={q} style={{ ["--tone" as string]: tone(t), ["--d" as string]: k }}>
            <button onClick={act(() => actions.question(q))}>
              <span className="r-peek-ico" aria-hidden>
                <Icon size={15} strokeWidth={2} />
              </span>
              <b>{FAQ[q].q}</b>
              <span>{FAQ_TOPICS[q]}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="r-peek-card r-peek-audit" style={{ ["--k" as string]: 1, ["--tone" as string]: tone("cobalt") }}>
        <small>Free AI audit</small>
        <b>Bring us the decision that should move faster.</b>
        <span>30 minutes on one workflow. No commitment.</span>
        <button className="r-btn r-btn-dark r-btn-sm" onClick={act(actions.audit)}>
          Book the audit
        </button>
        <button className="r-peek-go" onClick={act(() => actions.go(S.ask))}>
          All {FAQ.length} questions <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
