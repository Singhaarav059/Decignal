"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { STACK_ROWS } from "@/lib/content";
import { BRANDS } from "@/lib/brands";

const SYSTEMS = STACK_ROWS.flat().map((s) => ({ ...s, ...BRANDS[s.name] }));

/** A system's own mark, drawn in its brand colour. */
function BrandMark({ path, className }: { path: string; className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d={path} />
    </svg>
  );
}

/** What the card reads from each system as its tile passes through. */
const READS: Record<string, string> = {
  SAP: "Plant 02 stock 210, safety 175",
  Snowflake: "21-day demand forecast refreshed",
  Databricks: "Supplier lead time model, p90 9 days",
  "Google Cloud": "Shipment events streaming",
  MongoDB: "Order lines for Plant 01 updated",
  PostgreSQL: "Transfer policy: max 300 units",
  HubSpot: "Key account renewal at risk",
  Atlassian: "Line 3 maintenance ticket opened",
  Zendesk: "4 open cases mention late delivery",
};

const COUNT = 18;
const PHONE = "(max-width: 767px)";
const subscribePhone = (fn: () => void) => {
  const m = window.matchMedia(PHONE);
  m.addEventListener("change", fn);
  return () => m.removeEventListener("change", fn);
};
const LOOP_MS = 26000;

/** Growlio-style ribbon: systems flow along one curve, through Decignal, and leave as decisions. */
export function SystemsRibbon() {
  const stage = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const guide = useRef<SVGSVGElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const tiles = useRef<(HTMLLIElement | null)[]>([]);
  const [feed, setFeed] = useState<number[]>([0, 1, 2]);
  const [reads, setReads] = useState(1284);
  // Phones run the curve steeply up a narrow stage: each system rides once, spaced out and upright,
  // so the tiles never touch and their names read level.
  const phone = useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE).matches, () => false);
  const count = phone ? SYSTEMS.length : COUNT;

  useEffect(() => {
    const p = path.current, el = stage.current, svg = guide.current;
    if (!p || !el || !svg) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const copy = el.parentElement?.querySelector<HTMLElement>(".works-with");
    const lastZone = new Array(count).fill(-1);
    const t0 = performance.now();
    let raf = 0, visible = true, len = 1;
    // Where the copy sits over the stage, grown by a tile's reach: no tile may pass through it.
    let keep = { l: 0, t: 0, r: 0, b: 0 };

    // The path is drawn in the stage's own pixels from where the copy and the card actually are, so
    // a tile never crosses the copy and always meets a card edge square on, a full tile clear of the
    // corners: it never rides along an edge half hidden. Beside the copy (wide screens) it runs under
    // the copy and enters the card's left side; when the copy reaches too low for that, it runs on
    // under the card and rises into it through the bottom edge. Stacked, it is one long sweep.
    const shape = () => {
      const box = el.getBoundingClientRect(), c = card.current!.getBoundingClientRect();
      const W = box.width, H = box.height;
      const reach = (tiles.current[0]?.offsetWidth ?? 56) * 0.75 + 12;
      const k = copy?.getBoundingClientRect();
      const cl = c.left - box.left, cr = c.right - box.left, ct = c.top - box.top, cb = c.bottom - box.top;
      const beside = !!k && k.bottom - box.top > 0 && k.right - box.left > 0 && k.right - box.left < cl + 40;
      keep = k
        ? { l: k.left - box.left - reach, t: k.top - box.top - reach, r: k.right - box.left + reach, b: k.bottom - box.top + reach }
        : { l: 0, t: 0, r: 0, b: 0 };
      const x0 = -0.06 * W, y0 = H - 4, end = `${1.06 * W} ${0.095 * H}`;
      const yOut = ct + (cb - ct) * 0.32;
      const exit = `S ${cr - 40} ${yOut}, ${cr} ${yOut} S ${0.86 * W} ${0.143 * H}, ${end}`;
      const yIn = Math.max(keep.b, ct + reach);
      const yLow = Math.max(keep.b, cb + reach);
      let d: string;
      if (beside && yIn <= cb - reach && yIn < y0 - 10) {
        // Side entry: level under the copy, square into the card's left edge.
        d = `M ${x0} ${y0} C ${x0 + (cl - x0) * 0.45} ${y0}, ${cl - (cl - x0) * 0.3} ${yIn}, ${cl} ${yIn} ${exit}`;
      } else if (beside && yLow < y0 - 6) {
        // Bottom entry: level under the copy and the card's corner, then up through the bottom edge.
        const ex = cl + Math.min(90, (cr - cl) * 0.3);
        d = `M ${x0} ${y0} C ${x0 + (ex - x0) * 0.4} ${y0}, ${ex - 160} ${yLow}, ${ex - 70} ${yLow} C ${ex - 20} ${yLow}, ${ex} ${yLow - 20}, ${ex} ${cb - 40} ${exit}`;
      } else {
        d = `M ${x0} ${y0} C ${0.22 * W} ${y0}, ${0.33 * W} ${0.786 * H}, ${0.52 * W} ${0.548 * H} S ${0.86 * W} ${0.143 * H}, ${end}`;
      }
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      p.setAttribute("d", d);
      len = p.getTotalLength();
    };

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const ro = new ResizeObserver(() => {
      shape();
      if (reduced) place(performance.now());
    });
    ro.observe(el);
    if (copy) ro.observe(copy);

    const place = (now: number) => {
      const box = el.getBoundingClientRect(), c = card.current!.getBoundingClientRect();
      // Tiles inside the card's box are behind it; past its right edge they leave as decisions.
      const left = c.left - box.left + 12, right = c.right - box.left - 12;
      const top = c.top - box.top + 12, bottom = c.bottom - box.top - 12;
      const phase = reduced ? 0.013 : ((now - t0) % LOOP_MS) / LOOP_MS;
      for (let i = 0; i < count; i++) {
        const node = tiles.current[i];
        if (!node) continue;
        const u = (i / count + phase) % 1;
        const a = p.getPointAtLength(u * len), b = p.getPointAtLength(Math.min(len, u * len + 4));
        const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        const zone = a.x >= right ? 2 : a.x > left && a.y > top && a.y < bottom ? 1 : 0;
        // Safety net for layouts with no clean path past the copy. The zone is already padded by a
        // tile's reach, so a tile on its edge does not touch the copy; one going deeper fades out
        // over 16px instead of showing through. The paths above keep to the edge or outside it.
        const depth = Math.min(a.x - keep.l, keep.r - a.x, a.y - keep.t, keep.b - a.y);
        const clear = depth <= 0 ? 1 : Math.max(0, 1 - depth / 16);
        node.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -50%) rotate(${phone ? 0 : ang}deg)`;
        node.style.opacity = String(Math.min(1, u / 0.06, (1 - u) / 0.06, clear));
        if (zone !== lastZone[i]) {
          node.dataset.zone = String(zone);
          if (zone === 1 && lastZone[i] === 0) {
            const sys = i % SYSTEMS.length;
            setFeed((f) => [sys, ...f.filter((x) => x !== sys)].slice(0, 3));
            setReads((r) => r + 1);
          }
          lastZone[i] = zone;
        }
      }
    };

    // Runs continuously; it only rests while the section is off screen.
    const tick = (now: number) => {
      if (visible) place(now);
      raf = requestAnimationFrame(tick);
    };
    shape();
    place(t0);
    if (!reduced) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [count, phone]);

  return (
    <div ref={stage} className="ribbon-stage">
      <div className="ribbon-backdrop" aria-hidden />
      <svg ref={guide} className="ribbon-guide" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden>
        <path ref={path} d="M -60 418 C 220 418, 330 330, 520 230 S 860 60, 1060 40" />
      </svg>

      <ul className="ribbon-tiles" aria-label="Systems Decignal reads across">
        {Array.from({ length: count }, (_, i) => {
          const s = SYSTEMS[i % SYSTEMS.length];
          return (
            <li
              key={i}
              ref={(n) => { tiles.current[i] = n; }}
              className="ribbon-tile"
              aria-hidden={i >= SYSTEMS.length || undefined}
              style={{ ["--tone" as string]: s.hex }}
              title={`${s.name} · ${s.role}`}
            >
              <span className="ribbon-mark"><BrandMark path={s.path} className="ribbon-logo" /><small>{s.role}</small></span>
              <span className="ribbon-done" aria-hidden>
                <svg viewBox="0 0 16 16"><path d="M4 8.4l2.6 2.6L12 5.4" /></svg>
              </span>
              <span className="sr-only">{s.name}, {s.role}</span>
            </li>
          );
        })}
      </ul>

      <div ref={card} className="ribbon-card" aria-live="polite">
        <div className="ribbon-card-head">
          <span className="ribbon-badge"><span className="ribbon-pulse" />Reading live</span>
          <span className="ribbon-count tabular">{reads.toLocaleString("en-IN")} reads today</span>
        </div>
        <ol className="ribbon-feed">
          {feed.map((k, j) => {
            const s = SYSTEMS[k];
            return (
              <li key={s.name} style={{ ["--tone" as string]: s.hex, opacity: 1 - j * 0.28 }}>
                <span className="ribbon-feed-mark"><BrandMark path={s.path} className="ribbon-feed-logo" /></span>
                <span>
                  <span className="ribbon-feed-src">{s.name} · {s.role}</span>
                  <span className="ribbon-feed-read">{READS[s.name]}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="ribbon-decision">
          <span className="eyebrow">Recommended</span>
          <p>Transfer 240 units, Plant 02 → Plant 01</p>
          <span className="ribbon-await">Awaiting approval</span>
        </div>
      </div>
    </div>
  );
}
