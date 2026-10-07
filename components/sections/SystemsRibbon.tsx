"use client";

import { useEffect, useRef, useState } from "react";
import { STACK_ROWS } from "@/lib/content";

const TONES = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];
const SYSTEMS = STACK_ROWS.flat().map((s, i) => ({ ...s, tone: TONES[i % 6], mark: s.name.split(" ").map((w) => w[0]).join("").slice(0, 2) }));

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
const LOOP_MS = 26000;

/** Growlio-style ribbon: systems flow along one curve, through Decignal, and leave as decisions. */
export function SystemsRibbon() {
  const stage = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const tiles = useRef<(HTMLLIElement | null)[]>([]);
  const [feed, setFeed] = useState<number[]>([0, 1, 2]);
  const [reads, setReads] = useState(1284);

  useEffect(() => {
    const p = path.current, el = stage.current;
    if (!p || !el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const len = p.getTotalLength();
    const lastZone = new Array(COUNT).fill(-1);
    const t0 = performance.now();
    let raf = 0, visible = true;

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    const place = (now: number) => {
      const box = el.getBoundingClientRect(), c = card.current!.getBoundingClientRect();
      const { width, height } = box;
      // Tiles between the card's edges are behind it; past the right edge they leave as decisions.
      const left = c.left - box.left + 12, right = c.right - box.left - 12;
      const sx = width / 1000, sy = height / 420;
      const phase = reduced ? 0.013 : ((now - t0) % LOOP_MS) / LOOP_MS;
      for (let i = 0; i < COUNT; i++) {
        const node = tiles.current[i];
        if (!node) continue;
        const u = (i / COUNT + phase) % 1;
        const a = p.getPointAtLength(u * len), b = p.getPointAtLength(Math.min(len, u * len + 4));
        const ang = (Math.atan2((b.y - a.y) * sy, (b.x - a.x) * sx) * 180) / Math.PI;
        const x = a.x * sx;
        const zone = x < left ? 0 : x < right ? 1 : 2;
        node.style.transform = `translate(${a.x * sx}px, ${a.y * sy}px) translate(-50%, -50%) rotate(${ang}deg)`;
        node.style.opacity = String(Math.min(1, u / 0.06, (1 - u) / 0.06));
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
    place(t0);
    if (!reduced) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <div ref={stage} className="ribbon-stage">
      <div className="ribbon-backdrop" aria-hidden />
      <svg className="ribbon-guide" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden>
        <path ref={path} d="M -60 418 C 220 418, 330 330, 520 230 S 860 60, 1060 40" />
      </svg>

      <ul className="ribbon-tiles" aria-label="Systems Decignal reads across">
        {Array.from({ length: COUNT }, (_, i) => {
          const s = SYSTEMS[i % SYSTEMS.length];
          return (
            <li
              key={i}
              ref={(n) => { tiles.current[i] = n; }}
              className="ribbon-tile"
              aria-hidden={i >= SYSTEMS.length || undefined}
              style={{ ["--tone" as string]: `var(--color-${s.tone})` }}
              title={`${s.name} · ${s.role}`}
            >
              <span className="ribbon-mark">{s.mark}<small>{s.role}</small></span>
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
              <li key={s.name} style={{ ["--tone" as string]: `var(--color-${s.tone})`, opacity: 1 - j * 0.28 }}>
                <span className="ribbon-feed-mark">{s.mark}</span>
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
