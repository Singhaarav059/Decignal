"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ALSO_READS, type WheelItem } from "@/lib/copy";
import { appById, type Application } from "@/lib/content";
import { appHref } from "@/lib/areas";
import { jumpTo } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import { SystemIcon } from "../ui/SystemIcon";

type Item = WheelItem & { phase: number; tone: string; used: Application[] };
const PHASES = ALSO_READS.groups;
const ITEMS: Item[] = PHASES.flatMap((g, k) =>
  g.items.map((it) => ({ ...it, phase: k, tone: g.tone, used: it.apps.map((id) => appById(id)).filter((a): a is Application => !!a) })),
);
const N = ITEMS.length;
/** Degrees between two items on the rim. */
const STEP = 360 / N;
/** Screen heights of scroll per item while the dial holds the screen. */
const PER = 0.3;
const FIRST = PHASES.map((_, k) => ITEMS.findIndex((it) => it.phase === k));

const ItemIcon = ({ item, size }: { item: Item; size: number }) => <SystemIcon id={item.icon} size={size} />;

/** The applications that read a record, as links to their place on the function pages. */
function UsedBy({ item }: { item: Item }) {
  return (
    <>
      {item.used.map((a, i) => (
        <span key={a.id}>
          {i > 0 && ", "}
          <a className="rw-app" href={appHref(a)}>
            {a.name}
          </a>
        </span>
      ))}
    </>
  );
}

/**
 * Also reads, as a dial (adapted from a capability wheel): the kinds of record the applications read
 * (their "Works with"), in four functions, on the rim of a dial that rises from the foot of the page like
 * a horizon. On wide screens the section holds the screen while the scroll turns it; the record at the
 * crown fills the dome with one illustrative read (a figure and two fields or bars from an application's
 * scenario), the card names it and links the applications that use it, and the group tabs follow.
 * Phones read the same items as a list.
 */
export function ReadWheel() {
  const track = useRef<HTMLDivElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const item = ITEMS[at];
  const phase = item.phase;

  /** Scrolls to where item k sits at the top of the dial (the middle of its hold). */
  const go = useCallback((k: number) => {
    const el = track.current;
    if (!el || !window.matchMedia("(min-width: 1024px)").matches) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const range = el.offsetHeight - window.innerHeight;
    void jumpTo(top + (Math.min(k, N - 1) / (N - 1)) * range);
  }, []);

  useLayoutEffect(() => {
    const el = track.current;
    const w = wheel.current;
    if (!el || !w) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const ring = w.querySelector<SVGGElement>(".rw-ring");
    const labels = Array.from(w.querySelectorAll<HTMLElement>(".rw-label"));
    let R = 600;
    let raf = 0;
    let last = -1;
    let lastTurn = "";
    let top = 0;
    let range = 1;
    // Hover marks the labels only after the pointer itself moves: the dial turning under a still pointer
    // (the scroll) never lights one up.
    const moved = () => {
      if (!w.hasAttribute("data-moved")) w.setAttribute("data-moved", "");
    };
    w.addEventListener("pointermove", moved, { passive: true });
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // The dome's crown sits a little under the middle of the screen and its rim leaves the screen just
      // past both edges: the radius follows from that chord.
      const crown = Math.max(vh * 0.46, 320);
      const c = vw / 2 + 60;
      const h = vh - crown + 80;
      R = (c * c + h * h) / (2 * h);
      w.style.setProperty("--R", `${R.toFixed(1)}px`);
      w.style.setProperty("--crown", `${crown.toFixed(1)}px`);
      top = el.getBoundingClientRect().top + window.scrollY;
      range = Math.max(1, el.offsetHeight - vh);
    };
    const frame = () => {
      raf = 0;
      if (!wide.matches) return;
      const p = Math.min(Math.max((window.scrollY - top) / range, 0), 1);
      // Detents: each item holds the crown for half its stretch of scroll, then the dial turns to the next.
      const raw = p * (N - 1);
      const base = Math.min(Math.floor(raw), N - 2);
      const u = Math.min(Math.max((raw - base - 0.25) / 0.5, 0), 1);
      const f = base + u * u * (3 - 2 * u);
      const turn = -f * STEP;
      const key = turn.toFixed(2);
      if (key !== lastTurn) {
        lastTurn = key;
        ring?.setAttribute("transform", `rotate(${key})`);
        const r = R + 34;
        labels.forEach((l, k) => {
          const a = ((k * STEP + turn) * Math.PI) / 180;
          const x = Math.sin(a) * r;
          const y = -Math.cos(a) * r;
          // Below the horizon of the screen the labels fade; nothing there to read.
          const vis = Math.max(0, Math.min(1, (Math.cos(a) - 0.25) / 0.2));
          l.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
          l.style.opacity = vis.toFixed(3);
          l.style.visibility = vis < 0.01 ? "hidden" : "visible";
        });
      }
      const k = Math.round(f);
      if (k !== last) {
        last = k;
        setAt(k);
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    measure();
    frame();
    const ro = new ResizeObserver(() => {
      measure();
      lastTurn = "";
      kick();
    });
    ro.observe(document.body);
    // Only near its own stretch of the page: the story's scroll above it costs nothing. Crossing the
    // edge settles the dial on its first or last item.
    let near = false;
    const io = new IntersectionObserver(
      ([e]) => {
        near = e.isIntersecting;
        kick();
      },
      { rootMargin: "50% 0px" },
    );
    io.observe(el);
    const onScroll = () => {
      if (w.hasAttribute("data-moved")) w.removeAttribute("data-moved");
      if (near) kick();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    wide.addEventListener("change", kick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      wide.removeEventListener("change", kick);
      w.removeEventListener("pointermove", moved);
    };
  }, []);

  return (
    <div ref={track} className="rw-track" style={{ ["--rw-len" as string]: `${(N - 1) * PER * 100 + 100}svh` } as CSSProperties}>
      <div className="rw-stage" style={toneVars(item.tone)}>
        <div className="page-wrap rw-top">
          <div className="rw-copy">
            <p className="t-label marquee-label">{ALSO_READS.label}</p>
            <h3 className="rw-title">{ALSO_READS.title}</h3>
            <p className="rw-lede">{ALSO_READS.lede}</p>
            <div className="rw-tabs" role="group" aria-label={ALSO_READS.tabsAria}>
              {PHASES.map((ph, k) => (
                <button
                  key={ph.id}
                  type="button"
                  className="rw-tab"
                  aria-pressed={k === phase}
                  style={toneVars(ph.tone)}
                  onClick={() => go(FIRST[k])}
                >
                  <i aria-hidden />
                  {ph.label}
                  <span className="tabular">{ph.items.length}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rw-card" data-lens aria-live="polite">
            <p className="rw-card-k t-label">
              <span className="rw-card-phase">
                <i aria-hidden />
                {PHASES[phase].label}
              </span>
              <span className="tabular">{ALSO_READS.itemOf(at + 1, N)}</span>
            </p>
            <div key={at} className="rw-swap">
              <p className="rw-card-title">
                <span className="rw-card-icon" aria-hidden>
                  <ItemIcon item={item} size={15} />
                </span>
                {item.name}
                <span className="rw-card-full">{item.title}</span>
              </p>
              <p className="rw-card-text t-small">{item.text}</p>
              <p className="rw-card-app t-small">
                {ALSO_READS.usedBy} <UsedBy item={item} />
              </p>
            </div>
          </div>
        </div>

        {/* The dial: ticks and the group arcs turn as one; the labels ride its rim upright. */}
        <div ref={wheel} className="rw-wheel" aria-hidden>
          <svg className="rw-svg" viewBox="-1000 -1000 2000 2000" preserveAspectRatio="xMidYMid meet">
            <circle className="rw-disc" r="1000" />
          </svg>
          <Ring />
          <span className="rw-pointer" />
          {ITEMS.map((it, k) => (
            <button
              key={it.name}
              type="button"
              tabIndex={-1}
              className="rw-label"
              data-on={k === at || undefined}
              data-phase={it.phase === phase || undefined}
              style={toneVars(it.tone)}
              onClick={() => go(k)}
            >
              <span className="rw-label-in">
                <span className="rw-label-icon">
                  <ItemIcon item={it} size={12} />
                </span>
                {it.name}
              </span>
            </button>
          ))}
          <div className="rw-readout">
            <div key={at} className="rw-swap">
              <p className="rw-read-k t-label">
                <span className="rw-read-icon">
                  <ItemIcon item={item} size={15} />
                </span>
                {ALSO_READS.example} · {item.name}
              </p>
              <p className="rw-fig tabular">
                {item.fig}
                {item.unit && <small>{item.unit}</small>}
              </p>
              <p className="rw-caption">{item.caption}</p>
              <ul className="rw-bars">
                {item.compare.map((c, i) => (
                  <li key={c.label} data-risk={c.risk || undefined} data-field={c.f === undefined || undefined} style={{ ["--f" as string]: c.f, ["--i" as string]: i } as CSSProperties}>
                    <span className="rw-bar-l">{c.label}</span>
                    <span className="rw-bar-v tabular">{c.value}</span>
                    {c.f !== undefined && (
                      <span className="rw-bar">
                        <i />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Phones: the same items, grouped. */}
      <ol className="rw-list" aria-label={ALSO_READS.label}>
        {ITEMS.map((it) => (
          <li key={it.name} style={toneVars(it.tone)}>
            <span className="rw-list-icon" aria-hidden>
              <ItemIcon item={it} size={16} />
            </span>
            <span className="rw-list-body">
              <span className="rw-list-k t-label">{PHASES[it.phase].label}</span>
              <strong>{it.name}</strong>
              <span className="t-small">{it.text}</span>
              <span className="t-small rw-list-app">
                {ALSO_READS.usedBy} <UsedBy item={it} />
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Ticks every three degrees, a longer one at each item, and the three phase arcs in their colours. */
function Ring() {
  const r = 1000;
  const ticks: string[] = [];
  for (let d = 0; d < 360; d += 3) {
    const major = Math.abs(((d + STEP / 2) % STEP) - STEP / 2) < 0.01 || d % STEP === 0;
    const a = (d * Math.PI) / 180;
    const r0 = r - 30;
    const r1 = r - (major ? 66 : 44);
    ticks.push(`M${(Math.sin(a) * r0).toFixed(1)} ${(-Math.cos(a) * r0).toFixed(1)}L${(Math.sin(a) * r1).toFixed(1)} ${(-Math.cos(a) * r1).toFixed(1)}`);
  }
  const arcs = PHASES.map((ph, k) => {
    const ks = ITEMS.map((it, i) => (it.phase === k ? i : -1)).filter((i) => i >= 0);
    const a0 = ((ks[0] * STEP - STEP / 2 + 2) * Math.PI) / 180;
    const a1 = ((ks[ks.length - 1] * STEP + STEP / 2 - 2) * Math.PI) / 180;
    const rr = r - 12;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return { id: ph.id, tone: ph.tone, d: `M${(Math.sin(a0) * rr).toFixed(1)} ${(-Math.cos(a0) * rr).toFixed(1)}A${rr} ${rr} 0 ${large} 1 ${(Math.sin(a1) * rr).toFixed(1)} ${(-Math.cos(a1) * rr).toFixed(1)}` };
  });
  return (
    <svg className="rw-svg rw-ring-svg" viewBox="-1000 -1000 2000 2000">
      <g className="rw-ring">
        <path className="rw-ticks" d={ticks.join("")} />
        {arcs.map((a) => (
          <path key={a.id} className="rw-arc" d={a.d} style={toneVars(a.tone)} />
        ))}
      </g>
    </svg>
  );
}
