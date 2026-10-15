"use client";

import { useEffect, useRef } from "react";
import { Waypoints } from "lucide-react";
import { EXAMPLE_LABEL, TRAIL } from "@/lib/copy";
import { EXAMPLE } from "@/lib/example";
import { pageBox } from "@/lib/offsets";
import { toneVars } from "@/lib/tone";
import SectionTitle from "../ui/SectionTitle";
import { TrailArt } from "./trail/TrailArt";

const N = TRAIL.steps.length;
/** The dial's 84 ticks, a long one on each of the seven steps (from the top), rounded so the server
 *  and the browser write the same numbers. */
const r2 = (n: number) => Math.round(n * 100) / 100;
const TICKS = Array.from({ length: 84 }, (_, k) => {
  const a = (k / 84) * Math.PI * 2 - Math.PI / 2;
  const r0 = k % 12 === 0 ? 86 : 89;
  return [r2(100 + Math.cos(a) * r0), r2(100 + Math.sin(a) * r0), r2(100 + Math.cos(a) * 93), r2(100 + Math.sin(a) * 93)];
});
/** Each step's place on the dial, clockwise from the top. */
const angleOf = (k: number) => -90 + (k * 360) / N;

/**
 * The worked dispatch review in seven steps, as a dial (Orvan's process): the section pins for one
 * screen while its scroll turns the hand from 01 to 07. The step under the hand lights, its drawing
 * draws itself in the dial's face with the scroll (--q, trail/TrailArt.tsx), and the left column reads
 * its number, phase, name and the running example. Below 1024px the steps run as a list, each drawn.
 */
export function TrailDial() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const hand = el.querySelector<HTMLElement>(".dial-hand");
    const arc = el.querySelector<SVGElement>(".dial-arc");
    const nodes = Array.from(el.querySelectorAll<HTMLElement>(".dial-node"));
    const faces = Array.from(el.querySelectorAll<HTMLElement>(".dial-face-art"));
    const reads = Array.from(el.querySelectorAll<HTMLElement>(".dial-read"));
    const strip = Array.from(el.querySelectorAll<HTMLElement>(".dial-strip li"));
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = -1;
    // Written only when they move, and the arc's share on the arc itself: set on the section, a custom
    // property restyled all ~400 of its elements on every scroll frame.
    const lastQ: string[] = [];
    let lastP = "";
    let lastHand = "";
    const frame = () => {
      raf = 0;
      if (!wide.matches) return;
      const box = pageBox(el);
      const span = Math.max(1, box.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, (window.scrollY - box.top) / span));
      // The hand rests a beat on each step: eased between whole steps, still at each one. After the
      // seventh it carries on round to the first: the result closes the loop, the arc completes, and
      // the trail is ready for the next signal (on = N, the loop state).
      const f = p * N;
      const k = Math.min(N, Math.floor(f));
      const t = f - k;
      const eased = k >= N ? N : k + (t < 0.35 ? 0 : t > 0.85 ? 1 : (1 - Math.cos(((t - 0.35) / 0.5) * Math.PI)) / 2);
      const on = Math.round(eased);
      const step = on % N;
      const turn = `rotate(${(angleOf(0) + (eased * 360) / N + 90).toFixed(2)}deg)`;
      if (hand && turn !== lastHand) hand.style.transform = lastHand = turn;
      const share = (eased / N).toFixed(4);
      if (arc && share !== lastP) arc.style.setProperty("--dial-p", (lastP = share));
      // The face draws the step under the hand from the moment the hand arrives.
      const q = reduced ? 1 : Math.min(1, Math.max(0, (f - on + 0.35) / 0.55));
      faces.forEach((a, i) => {
        const v = i === step ? (on === N ? "1" : q.toFixed(3)) : "0";
        if (lastQ[i] !== v) a.style.setProperty("--q", (lastQ[i] = v));
      });
      if (on !== last) {
        last = on;
        const loop = on === N;
        el.toggleAttribute("data-loop", loop);
        nodes.forEach((n, i) => {
          n.toggleAttribute("data-on", i === step);
          n.toggleAttribute("data-past", loop || i < on);
        });
        strip.forEach((n, i) => n.toggleAttribute("data-on", loop || i <= on));
        faces.forEach((a, i) => a.toggleAttribute("data-on", i === step));
        // The hand's tip and the arc take the step's colour.
        el.style.setProperty("--dial-tone", reads[step]?.style.getPropertyValue("--tone") ?? "");
        // The left column reads the step; in the loop state, the closing note instead.
        reads.forEach((r, i) => r.toggleAttribute("data-on", loop ? r.hasAttribute("data-loop") : i === on));
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    kick();
    // Only near its own stretch of the page: the story's scroll above it costs nothing. Crossing the
    // edge settles the hand on its first or last step.
    let near = false;
    const io = new IntersectionObserver(
      ([e]) => {
        near = e.isIntersecting;
        kick();
      },
      { rootMargin: "50% 0px" },
    );
    io.observe(el);
    const onScroll = () => near && kick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", kick);
    wide.addEventListener("change", kick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", kick);
      wide.removeEventListener("change", kick);
    };
  }, []);

  return (
    <section id="example" className="dial-section" aria-labelledby="trail-title">
      {/* Old links to the decision trail land on the worked example (handoff §11). */}
      <div ref={root} id="trail" className="dial-band">
      <div className="dial-sticky">
        <div className="page-wrap dial-grid">
          <div className="dial-copy">
            <SectionTitle icon={<Waypoints size={13} strokeWidth={2.2} />} id="trail-title" label={TRAIL.label} lines={[TRAIL.headline[0], TRAIL.headline[1]]} tone="ink" className="ed-title" reveal="lines" />
            <p className="t-small dial-example">
              {EXAMPLE_LABEL} <span aria-hidden>·</span> {EXAMPLE.shipment.id}
            </p>
            <p className="t-body dial-intro">{TRAIL.intro}</p>
            {/* The step under the hand, read large (wide screens). */}
            <div className="dial-reads" aria-hidden>
              {TRAIL.steps.map((s, i) => (
                <div key={s.step} className="dial-read" style={toneVars(s.tone)} data-on={i === 0 || undefined}>
                  <p className="dial-read-k t-label">
                    {TRAIL.groups[s.group]}
                  </p>
                  <p className="dial-read-name">{s.step}</p>
                  <p className="dial-read-ex">{s.ex}</p>
                </div>
              ))}
              <div className="dial-read" data-loop style={toneVars(TRAIL.steps[0].tone)}>
                <p className="dial-read-k t-label">
                  {TRAIL.loop.k}
                </p>
                <p className="dial-read-name">{TRAIL.loop.name}</p>
                <p className="dial-read-ex">{TRAIL.loop.ex}</p>
              </div>
            </div>
            {/* Seven segments, one per step, in the steps' colours: filled up to the step under the hand. */}
            <ol className="dial-strip" aria-hidden>
              {TRAIL.steps.map((s) => (
                <li key={s.step} style={toneVars(s.tone)} />
              ))}
            </ol>
          </div>

          <div className="dial">
            <div className="dial-ring" aria-hidden />
            {/* A clock face of ticks, and an arc that fills behind the hand as the steps pass. */}
            <svg className="dial-ticks" viewBox="0 0 200 200" aria-hidden>
              {TICKS.map((t, k) => (
                <line key={k} x1={t[0]} y1={t[1]} x2={t[2]} y2={t[3]} className={k % 12 === 0 ? "major" : undefined} />
              ))}
              <circle className="dial-arc" cx="100" cy="100" r="96" pathLength={1} transform="rotate(-90 100 100)" />
            </svg>
            <div className="dial-hand" aria-hidden>
              <span />
            </div>
            <div className="dial-face" aria-hidden>
              {TRAIL.steps.map((s, i) => (
                <div key={s.step} className="dial-face-art" style={toneVars(s.tone)} data-on={i === 0 || undefined}>
                  <p className="dial-face-k t-label">{TRAIL.groups[s.group]}</p>
                  <TrailArt index={i} />
                </div>
              ))}
            </div>
            <ol className="dial-nodes" aria-label={TRAIL.aria}>
              {TRAIL.steps.map((s, i) => (
                <li
                  key={s.step}
                  className="dial-node"
                  data-on={i === 0 || undefined}
                  style={{ ...toneVars(s.tone), ["--a" as string]: `${angleOf(i)}deg` }}
                >
                  <span className="dial-node-chip">
                    <span className="dial-node-dot" aria-hidden />
                    <span className="dial-node-name">{s.step}</span>
                  </span>
                  {/* Below 1024px: the list reads each step in full, with its drawing. */}
                  <span className="dial-node-ex t-small">{s.ex}</span>
                  <span className="dial-node-art" aria-hidden>
                    <TrailArt index={i} />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
      </div>
      {/* The review itself, readable without scrolling through the dial (handoff home.example). */}
      <div className="page-wrap dial-review">
        <table className="review-table" aria-label={TRAIL.table.aria}>
          <thead>
            <tr>
              {TRAIL.table.head.map((h) => (
                <th key={h} scope="col" className="t-label">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRAIL.table.rows.map((r) => (
              <tr key={r.doc}>
                <td>{r.ref}</td>
                <td>{r.doc}</td>
                <td>
                  <span className="review-status" data-risk={r.risk || undefined}>
                    <i aria-hidden />
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="review-notes">
          <p className="t-subtitle review-rec">{TRAIL.recommendation}</p>
          <p className="t-body review-expl">{TRAIL.explanation}</p>
          <p className="t-label review-state">{TRAIL.review}</p>
          <p className="t-small review-disclaimer">{TRAIL.disclaimer}</p>
        </div>
      </div>
    </section>
  );
}
