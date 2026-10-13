"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EXAMPLE_LABEL, TRAIL } from "@/lib/copy";
import { EXAMPLE } from "@/lib/example";
import { toneVars } from "@/lib/tone";
import { TrailArt } from "./trail/TrailArt";
import { GlanceList } from "./GlanceList";

gsap.registerPlugin(ScrollTrigger);

/** Below this width the trail runs down the left edge as rows (decor-trail.css uses the same query). */
const ROWS = "(max-width: 767px)";
/** Rows layout: scroll distance, in px, over which a station draws once the rule reaches its dot. */
const DRAW = 160;
/** At most two runs of the rule: one row on desktop, two tiers on tablets, one column on phones. */
const TRACKS = 2;

/**
 * The seven steps every application runs, after the explorer: one instrument panel in three phases
 * (the explorer's Signal, Evidence and Action). Each station draws its own fact from the running
 * example (trail/TrailArt.tsx). As the panel scrolls through the viewport the rule fills from 01 to 07;
 * each dot fills and its drawing draws on as the rule reaches it. The rule's fill is a CSS variable on
 * each run of the rule and each station's progress a variable on its item, so scrolling never
 * re-renders React. Tablets wrap the row into two tiers; phones run it down the left edge, the head
 * following a line near the bottom of the view.
 */
export function Trail() {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = panel.current;
    const ol = box?.querySelector<HTMLOListElement>(".tr");
    if (!box || !ol) return;
    const steps = Array.from(ol.querySelectorAll<HTMLElement>(".tr-step"));
    const dots = steps.map((s) => s.querySelector<HTMLElement>(".tr-dot"));
    const rules = Array.from(box.querySelectorAll<HTMLElement>(".tr-rule"));
    type Track = { s0: number; len: number };
    const geo = { rows: false, y0: 0, total: 1, span: 1, at: [] as number[], tracks: [] as Track[] };

    /**
     * Splits the dots into runs that share a line (a row, a tier or the left column), places one rule
     * per run from its first dot's centre to its last, and lays every dot on one path through the runs.
     * The jump between runs counts as one more station, so the second tier starts after a beat.
     */
    const measure = () => {
      const o = box.getBoundingClientRect();
      const c = dots.map((d) => {
        const r = d?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2 - o.left, y: r.top + r.height / 2 - o.top } : { x: 0, y: 0 };
      });
      const rows = window.matchMedia(ROWS).matches;
      const along = (p: { x: number; y: number }) => (rows ? p.y : p.x);
      const across = (p: { x: number; y: number }) => (rows ? p.x : p.y);
      const runs: number[][] = [];
      c.forEach((p, i) => {
        const run = runs[runs.length - 1];
        if (run && Math.abs(across(c[run[0]]) - across(p)) < 2) run.push(i);
        else runs.push([i]);
      });
      const first = runs[0];
      geo.rows = rows;
      // The trigger is the list, which sits inside the panel's padding: offset from the list's top.
      geo.y0 = c[0].y - (ol.getBoundingClientRect().top - o.top);
      geo.span = rows ? DRAW : first.length > 1 ? along(c[first[1]]) - along(c[first[0]]) : 1;
      geo.at = [];
      geo.tracks = [];
      let s = 0;
      runs.forEach((run, t) => {
        if (t > 0) s += geo.span;
        const a = c[run[0]];
        const len = Math.max(1, along(c[run[run.length - 1]]) - along(a));
        run.forEach((i) => geo.at.push(s + along(c[i]) - along(a)));
        geo.tracks.push({ s0: s, len });
        const el = rules[t];
        if (el) {
          el.dataset.axis = rows ? "y" : "x";
          el.style.setProperty("--x", `${(rows ? a.x - 0.5 : a.x).toFixed(1)}px`);
          el.style.setProperty("--y", `${(rows ? a.y : a.y - 0.5).toFixed(1)}px`);
          el.style.setProperty("--len", `${len.toFixed(1)}px`);
        }
        s += len;
      });
      rules.slice(runs.length).forEach((el) => delete el.dataset.axis);
      geo.total = s + geo.span;
    };

    const written = new Map<HTMLElement, string>();
    const set = (el: HTMLElement, name: string, v: number) => {
      const str = Math.min(1, Math.max(0, v)).toFixed(3);
      if (written.get(el) === str) return;
      written.set(el, str);
      el.style.setProperty(name, str);
    };
    /** The head runs one station past the last dot, so 07 finishes drawing as progress reaches 1. */
    const write = (p: number) => {
      const head = p * geo.total;
      geo.tracks.forEach((t, i) => rules[i] && set(rules[i], "--f", (head - t.s0) / t.len));
      steps.forEach((el, i) => set(el, "--q", (head - geo.at[i]) / geo.span));
    };

    // Reduced motion: the rule and every drawing stay complete (the CSS defaults); only place the rule.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const ro = new ResizeObserver(measure);
      ro.observe(box);
      return () => ro.disconnect();
    }

    const st = ScrollTrigger.create({
      trigger: ol,
      start: () => {
        measure();
        return geo.rows ? `top+=${geo.y0} 80%` : "top 75%";
      },
      end: () => (geo.rows ? `top+=${geo.y0 + geo.total} 80%` : "bottom 75%"),
      onUpdate: (self) => write(self.progress),
      onRefresh: (self) => write(self.progress),
    });
    // Fonts and wrapping can move the dots without a window resize.
    const ro = new ResizeObserver(() => st.refresh());
    ro.observe(box);
    return () => {
      ro.disconnect();
      st.kill();
    };
  }, []);

  return (
    <section className="trail-band" aria-labelledby="trail-title">
      <div className="page-wrap">
        <div className="tr-head">
          <h3 id="trail-title" className="t-label trail-title">{TRAIL.label}</h3>
          <p className="t-label tr-example">
            {EXAMPLE_LABEL} <span aria-hidden>·</span> {EXAMPLE.part}
          </p>
        </div>
        <div ref={panel} className="card card--panel tr-panel">
          {Array.from({ length: TRACKS }, (_, i) => (
            <span key={i} className="tr-rule" aria-hidden>
              <span />
            </span>
          ))}
          <ol className="tr" aria-label={TRAIL.aria}>
            {TRAIL.groups.map((group, g) => {
              const steps = TRAIL.steps.filter((s) => s.group === g);
              return (
                <li key={group} className="tr-group" style={{ ["--span" as string]: steps.length }}>
                  <span className="tr-group-name t-label" aria-hidden>{group}</span>
                  <ol className="tr-steps">
                    {steps.map((s) => {
                      const n = TRAIL.steps.indexOf(s);
                      return (
                        <li key={s.step} className="tr-step" style={{ ...toneVars(s.tone), ["--n" as string]: n }}>
                          <TrailArt index={n} />
                          <span className="tr-dot" aria-hidden />
                          <div className="tr-copy">
                            <span className="tr-n t-label" aria-hidden>{String(n + 1).padStart(2, "0")}</span>
                            <strong className="tr-name">{s.step}</strong>
                            <span className="tr-ex t-small">{s.ex}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </li>
              );
            })}
          </ol>
        </div>
        <GlanceList />
      </div>
    </section>
  );
}
