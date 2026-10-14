"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { APPLICATIONS, CATEGORY_TONE } from "@/lib/content";
import { APPLICATION_DEMOS, DEMO_PINS } from "@/lib/application-demos";
import { APPLICATIONS_COPY } from "@/lib/copy";
import { jumpTo, onApplication } from "@/lib/jump";
import { accentVars, toneVars } from "@/lib/tone";
import type { Frame } from "../three/ApplicationScene";
import SegmentedControl from "../ui/SegmentedControl";
import { SceneBoundary } from "../three/SceneBoundary";
import { SystemIcon, sourceIcon } from "../ui/SystemIcon";
import { AreaArt } from "./AreaArt";
import { CountUp } from "../ui/CountUp";
import { OperationEvidence } from "./OperationEvidence";
import { whenStill } from "@/lib/idle";
import { ExplorerStills } from "./ExplorerStills";
import { usePhone } from "@/lib/device";

gsap.registerPlugin(ScrollTrigger);
// Viewport heights per application, by APPLICATIONS index: every stop (signal, evidence, action) gets its
// own stretch of scroll. Inventory keeps the most for its truck.
const CHAPTER_LENGTHS = [1.35, 0.9, 1.1, 1.2, 1.1, 0.9, 0.95, 0.95];
/** Where each stage sits inside its chapter (a click on Signal, Evidence or Action lands here). */
const STAGE_AT = [0.18, 0.48, 0.84];
const ALL = APPLICATIONS.map((_, i) => i);
const ApplicationScene = dynamic(() => import("../three/ApplicationScene"), { ssr: false });
const pad = (n: number) => String(n).padStart(2, "0");

/** Live 3D across all screen sizes. */
function useStills(compact?: boolean) {
  void compact;
  return false;
}

/**
 * Text that changes in place: the old words fade up and out while the new ones rise in (opacity and
 * 8px, --dur-3). Only the words change; nothing around them remounts (E15).
 */
function Swap({ text, render = (t) => t, className }: { text: string; render?: (text: string, live: boolean) => ReactNode; className?: string }) {
  const [now, setNow] = useState(text);
  const [old, setOld] = useState<string | null>(null);
  if (text !== now) {
    setOld(now);
    setNow(text);
  }
  useEffect(() => {
    if (old === null) return;
    const t = window.setTimeout(() => setOld(null), 340);
    return () => window.clearTimeout(t);
  }, [old]);
  return (
    <span className={`swap${className ? ` ${className}` : ""}`}>
      {old !== null && <span key={`o:${old}`} className="swap-out" aria-hidden>{render(old, false)}</span>}
      <span key={`n:${now}`} className="swap-in">{render(now, true)}</span>
    </span>
  );
}

const headline = (t: string) => {
  const [a, b] = t.split("\n");
  return <>{a} <span className="accent">{b}</span></>;
};

type Props = {
  /** APPLICATIONS indices to show, in order. Default: all eight. */
  apps?: number[];
  /** Older name for `apps`. */
  indices?: number[];
  /** Service pages: no chapter stepper for a single application. */
  compact?: boolean;
  /** Scroll length per application, times CHAPTER_LENGTHS. Default 1, and 1.6 for one application. */
  pace?: number;
};

/** One continuous stage, driven by the same Lenis/GSAP scroll as the lead story. */
export function ApplicationExplorer({ apps, indices, compact = false, pace }: Props) {
  // A new array on every parent render must not rebuild the ScrollTrigger: key the list by its contents.
  const key = (apps ?? indices ?? ALL).join(",");
  const list = useMemo(() => key.split(",").map(Number), [key]);
  const isMobile = usePhone();
  const speed = pace ?? (list.length === 1 ? (isMobile ? 0.8 : 1.6) : isMobile ? 0.28 : 1);
  const lens = useMemo(() => list.map((i) => CHAPTER_LENGTHS[i] * speed), [list, speed]);
  const kinds = useMemo(() => list.map((i) => APPLICATION_DEMOS[i].kind), [list]);

  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const motion = useRef({ progress: 0, edge: 1 });
  /** The scene's free area, measured from the head and the card; read by the camera every frame. */
  const frameBox = useRef<Frame>({ left: 0, top: 0, right: 0, bottom: 0 });
  /** The object the reader points at in the card: its pin opens in the scene. */
  const pin = useRef<string | null>(null);
  const [frame, setFrame] = useState({ chapter: 0, step: 0 });
  const [active, setActive] = useState(false);
  const [near, setNear] = useState(false);
  const [still, setStill] = useState(true);
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const opened = useRef(open);
  const stillsMode = useStills(compact);
  // Stills that cannot load hand the explorer to its live 3D.
  const [stillsFailed, setStillsFailed] = useState(false);
  const failStills = useCallback(() => setStillsFailed(true), []);
  const stills = stillsMode === true && !stillsFailed;
  const ids = useId();
  const drawerId = `${ids}-evidence`;
  const sentenceId = `${ids}-stage`;

  const selected = list[frame.chapter];
  const app = APPLICATIONS[selected];
  const demo = APPLICATION_DEMOS[selected];
  const tone = CATEGORY_TONE[app.category];
  const done = frame.step === 2;
  const count = list.length;

  /** Page y of a point in a chapter (local 0..1). */
  const yAt = useCallback((chapter: number, local: number) => {
    const el = root.current;
    if (!el) return 0;
    const total = lens.reduce((a, b) => a + b, 0);
    const before = lens.slice(0, chapter).reduce((a, b) => a + b, 0);
    return el.getBoundingClientRect().top + window.scrollY + ((el.offsetHeight - window.innerHeight) * (before + lens[chapter] * local)) / total;
  }, [lens]);

  // A glide within reach, a veil cut beyond it, an instant landing under reduced motion (jumpTo, D9).
  const jump = useCallback((chapter: number, local = STAGE_AT[1]) => void jumpTo(yAt(chapter, local)), [yAt]);
  /** Open on a narrow screen, the evidence is a sheet over the scene: no tag opens under it. */
  const sheet = useRef(false);
  const setPin = useCallback((id: string | null) => {
    // "" matches no pin, so pointing away with the sheet up leaves every tag shut.
    pin.current = id ?? (sheet.current ? "" : null);
  }, []);

  // The area panels ask for an application by its APPLICATIONS index.
  useEffect(() => onApplication((i) => {
    const n = list.indexOf(i);
    if (n >= 0) jump(n);
  }), [list, jump]);

  useEffect(() => {
    if (open) return;
    const t = window.setTimeout(() => setDrawer(false), 340);
    return () => window.clearTimeout(t);
  }, [open]);
  useEffect(() => {
    opened.current = open;
    sheet.current = open && window.matchMedia("(max-width: 1023px)").matches;
    if (!pin.current) pin.current = sheet.current ? "" : null;
  }, [open]);

  // The 3D world mounts on approach, never at load, and stays built once mounted. Home looks three screens
  // ahead; service pages (compact) one and a half, since their explorer starts about 2.5 screens down.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setNear(true);
      io.disconnect();
    }, { rootMargin: compact ? "150% 0px" : "300% 0px" });
    io.observe(el);
    // Fetch the scene's code once the loader has lifted and the reader pauses, then build the world in the
    // background at the next pause (its shaders compile off the main thread, Warm), so it is drawn and
    // waiting when the reader arrives, by scroll or by a jump from the nav. Never mid-scroll: the build is a
    // long task that stuttered the story on phones. A canvas out of view draws on demand only.
    const html = document.documentElement;
    let live = true;
    let cancel = () => {};
    const prefetch = () => {
      cancel = whenStill(() => {
        void import("../three/ApplicationScene").then(() => {
          if (live) cancel = whenStill(() => setNear(true));
        });
      });
    };
    let mo: MutationObserver | null = null;
    if (html.classList.contains("ready")) prefetch();
    else {
      mo = new MutationObserver(() => {
        if (!html.classList.contains("ready")) return;
        mo?.disconnect();
        prefetch();
      });
      mo.observe(html, { attributes: true, attributeFilter: ["class"] });
    }
    return () => {
      live = false;
      io.disconnect();
      mo?.disconnect();
      cancel();
    };
  }, [compact]);

  // The free area for the scene: right of the copy column on wide screens, between the head and the
  // card on narrow ones. The card's height is read while the drawer is shut (open, it is a sheet).
  useLayoutEffect(() => {
    const st = stage.current;
    const h = head.current;
    const c = card.current;
    if (!st || !h || !c) return;
    const idx = st.querySelector<HTMLElement>(".application-index");
    const measure = () => {
      const s = st.getBoundingClientRect();
      const hb = h.getBoundingClientRect();
      st.style.setProperty("--head-b", `${Math.round(hb.bottom - s.top)}px`);
      if (opened.current) return;
      const cb = c.getBoundingClientRect();
      frameBox.current = s.width >= 1024
        ? { left: Math.max(hb.right, cb.right) - s.left + 40, top: 96, right: 32, bottom: idx && idx.offsetHeight ? s.bottom - idx.getBoundingClientRect().top + 24 : 40 }
        : { left: 12, right: 12, top: hb.bottom - s.top + 16, bottom: s.bottom - cb.top + 16 };
    };
    measure();
    const ro = new ResizeObserver(measure);
    [st, h, c].forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = root.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(media.matches);
    sync();
    media.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    if (el) observer.observe(el);
    const total = lens.reduce((a, b) => a + b, 0);
    const last = { op: "", tf: "" };
    const apply = (progress: number) => {
      let distance = progress * total;
      let chapter = 0;
      while (chapter < lens.length - 1 && distance > lens[chapter]) {
        distance -= lens[chapter];
        chapter++;
      }
      const local = Math.min(0.9999, distance / lens[chapter]);
      motion.current.progress = Math.max(0, Math.min(1, (local - 0.12) / 0.74));
      const step = local < 0.32 ? 0 : local < 0.62 ? 1 : 2;
      setFrame((p) => (p.chapter === chapter && p.step === step ? p : { chapter, step }));
      // The hand-off lasts a fixed distance (about an eighth of a screen) whatever the chapter's length:
      // the outgoing world slides left and dims to 35%, the incoming one arrives from the right. One
      // transform on the world; its tags close below 60% so no ghost text crosses the copy.
      const len = lens[chapter];
      const inEdge = chapter === 0 ? 1 : Math.min(1, local / (0.125 / len));
      const outEdge = chapter === lens.length - 1 ? 1 : Math.min(1, (1 - local) / (0.11 / len));
      const edge = Math.min(inEdge, outEdge);
      motion.current.edge = edge;
      const w = world.current;
      if (!w) return;
      const shift = media.matches ? 0 : (outEdge < inEdge ? -6 : 6) * (1 - edge);
      const op = (0.35 + 0.65 * edge).toFixed(3);
      const tf = shift ? `translate3d(${shift.toFixed(2)}%, 0, 0)` : "none";
      if (op !== last.op) w.style.opacity = last.op = op;
      if (tf !== last.tf) w.style.transform = last.tf = tf;
    };
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    });
    ScrollTrigger.refresh();
    return () => {
      trigger.kill();
      observer.disconnect();
      media.removeEventListener("change", sync);
    };
  }, [lens, list]);

  // Mobile horizontal swipe: fluidly step between applications without having to scroll
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || opened.current) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1 || opened.current) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const dt = Date.now() - startTime;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
        if (dx < 0 && frame.chapter < count - 1) {
          jump(frame.chapter + 1);
        } else if (dx > 0 && frame.chapter > 0) {
          jump(frame.chapter - 1);
        }
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [frame.chapter, count, jump]);

  const stages = useMemo(
    () => APPLICATIONS_COPY.stages.map((label, i) => ({ value: String(i), label, controls: `${sentenceId} ${drawerId}` })),
    [sentenceId, drawerId],
  );
  const moved = DEMO_PINS[demo.kind].moved;
  const name = (n: number) => APPLICATIONS[list[n]].name;

  return (
    <div
      ref={root}
      className="application-journey"
      data-app={selected}
      style={{ height: `${lens.reduce((total, l) => total + l * 100, 100)}svh`, ...toneVars(tone) }}
    >
      <div ref={stage} className="application-stage" data-step={frame.step} data-count={count} data-compact={compact || undefined} data-open={open || undefined}>
        {/* The stage the world stands on: a pale solid of the application's colour, easing as --tone moves. */}
        <div className="application-floor" aria-hidden />
        <div ref={world} className="application-world" role="img" aria-label={`${app.name}. ${demo.line}`}>
          {near && stills && <ExplorerStills app={selected} step={frame.step} frame={frameBox} onFail={failStills} />}
          {near && stillsMode !== null && !stills && (
            <SceneBoundary label={`${app.name}. ${demo.line}`} fallback={<AreaArt area={app.category} />}>
              <ApplicationScene kind={demo.kind} kinds={kinds} step={frame.step} active={active} still={still} motion={motion} pin={pin} frame={frameBox} />
            </SceneBoundary>
          )}
        </div>

        {/* The copy, marked for the scene's tags (ScreenTag keeps labels off text inside [data-ch]):
            no tag opens over the head or the card. No box of its own. */}
        <div data-ch="0" style={{ display: "contents" }}>
          <div ref={head} className="application-head" style={accentVars(tone)} data-obstacle>
            <div className="application-head-row">
              <p className="application-label t-label">
                <span className="application-dot" aria-hidden />
                <Swap text={`${pad(frame.chapter + 1)} · ${app.name}`} />
              </p>
              {count > 1 && (
                <nav className="application-stepper" aria-label={APPLICATIONS_COPY.chaptersAria}>
                  <button type="button" disabled={frame.chapter === 0} aria-label={frame.chapter > 0 ? `Previous: ${name(frame.chapter - 1)}` : "Previous"} onClick={() => jump(frame.chapter - 1)}>
                    <ChevronLeft size={16} strokeWidth={2} aria-hidden />
                  </button>
                  <span className="application-count" aria-current="step">{pad(frame.chapter + 1)} / {pad(count)}</span>
                  <button type="button" disabled={frame.chapter === count - 1} aria-label={frame.chapter < count - 1 ? `Next: ${name(frame.chapter + 1)}` : "Next"} onClick={() => jump(frame.chapter + 1)}>
                    <ChevronRight size={16} strokeWidth={2} aria-hidden />
                  </button>
                </nav>
              )}
            </div>
            <h3 className="t-title-card application-title">
              <Swap text={demo.headline} render={headline} />
            </h3>
            {/* What this application reads, one chip per source; they rise in turn as the application changes. */}
            <ul key={selected} className="application-reads" aria-label={APPLICATIONS_COPY.sources}>
              {app.connects.map((c, i) => (
                <li key={c} style={{ ["--i" as string]: i }}>
                  <SystemIcon id={sourceIcon(c)} size={16} />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Every application in this section, as an index along the stage's foot (wide screens): the one
              showing is filled in its colour, and any other is one click away. */}
          {count > 1 && (
            <ol className="application-index" aria-label={APPLICATIONS_COPY.chaptersAria} data-obstacle>
              {list.map((k, n) => (
                <li key={k}>
                  <button type="button" aria-current={n === frame.chapter ? "step" : undefined} onClick={() => jump(n)}>
                    <span className="tabular">{pad(n + 1)}</span>
                    {APPLICATIONS[k].name}
                  </button>
                </li>
              ))}
            </ol>
          )}

          <div ref={card} className="card card--story application-card" data-obstacle>
            <SegmentedControl
              label={`${app.name}: ${APPLICATIONS_COPY.stages.join(", ")}`}
              items={stages}
              value={String(frame.step)}
              onChange={(v) => jump(frame.chapter, STAGE_AT[Number(v)])}
              className="application-stages"
            />
            {/* One body that scrolls when it must, between the stage control and the foot: the summary
                (one number, one sentence) and the evidence that replaces it when opened. */}
            <div className="application-body" data-lenis-prevent>
              <div className="application-fold application-summary" data-shut={open || undefined}>
                <div className="application-fold-inner" inert={open}>
                  <p className="application-metric" data-done={done || undefined} onPointerEnter={() => setPin(moved)} onPointerLeave={() => setPin(null)}>
                    <Swap text={demo.metric} className="application-metric-value t-num-lg" render={(t, live) => (live && done ? <CountUp key={`${t}:done`} value={t} duration={700} /> : t)} />
                    <Swap text={demo.metricLabel} className="application-metric-label t-small" />
                  </p>
                  <p id={sentenceId} role="tabpanel" className="application-sentence t-lede">
                    <Swap text={demo.steps[frame.step]} />
                  </p>
                </div>
              </div>
              <div id={drawerId} className="application-fold application-drawer" data-open={open || undefined}>
                <div className="application-fold-inner" inert={!open}>
                  {(open || drawer) && (
                    <>
                      <OperationEvidence kind={demo.kind} step={frame.step} onPin={setPin} />
                      <p className="application-sources t-small">
                        <span className="t-label">{APPLICATIONS_COPY.sources}</span> {app.connects.join(" · ")}
                      </p>
                      <p className="application-asset t-label">{demo.asset}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="application-card-foot">
              <button
                type="button"
                className="application-toggle"
                aria-expanded={open}
                aria-controls={drawerId}
                onClick={() => {
                  setDrawer(true);
                  setOpen((o) => !o);
                }}
              >
                <ChevronUp size={16} strokeWidth={2} aria-hidden />
                {open ? APPLICATIONS_COPY.hideEvidence : APPLICATIONS_COPY.showEvidence}
              </button>
              <span className="application-example t-small">{APPLICATIONS_COPY.example}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
