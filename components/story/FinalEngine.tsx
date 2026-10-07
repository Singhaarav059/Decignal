"use client";

import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { SYSTEMS, IconChip, tone, tint } from "../ui/systems";
import { scrollToTarget } from "../SmoothScroll";
import { Arrow } from "../ui/Arrow";

const STEPS = ["Signal", "Evidence", "Context", "Policy"];

const OUTCOMES = [
  { v: "2 days", k: "Transfer lands before the day 6 breach", t: "emerald", f: 0.29 },
  { v: "380", k: "Units Plant 02 keeps for its own plan", t: "saffron", f: 0.61 },
  { v: "14 → 1", k: "Service cases handled as one issue", t: "pink", f: 0.07 },
];

/**
 * 09 Decide: the whole story on one board. Six sources feed one decision, the decision
 * produces three results. Staging reads `--fp` (0..1), which the story sets from scroll.
 */
export function FinalEngine({ ch }: { ch: number }) {
  return (
    <div data-ch={ch} data-final data-interactive className="final-engine">
      <div className="fe-copy">
        <p className="eyebrow inline-flex items-center gap-2">
          <span className="diamond" style={{ color: "var(--color-emerald)" }} />
          09 · Decide
        </p>
        <h2 className="display fe-title">
          Turn information
          <br />
          <em className="spectrum-text">into decisions.</em>
        </h2>
        <p className="fe-lead">
          Everything you just scrolled through, on one board. Six systems feed one context, one action is approved, and the results are measured.
        </p>
        <div className="fe-actions">
          <button onClick={() => scrollToTarget("#audit")} className="btn btn-primary">
            Book a free AI audit
            <Arrow />
          </button>
          <button onClick={() => scrollToTarget("#applications")} className="btn btn-ghost">
            See applications
          </button>
        </div>
      </div>

      <div className="fe-board" aria-label="Six systems feed one decision with three results">
        <svg className="fe-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {SYSTEMS.map((s, i) => {
            const y = ((i + 0.5) / 6) * 100;
            return (
              <g key={s.id} className="fe-link fe-link-in" style={{ ["--tone" as string]: tone(s.tone), ["--d" as string]: i }}>
                <path d={`M30 ${y} C 34 ${y}, 32 50, 36 50`} pathLength={1} />
                <path className="fe-flow" d={`M30 ${y} C 34 ${y}, 32 50, 36 50`} pathLength={1} />
              </g>
            );
          })}
          {OUTCOMES.map((o, j) => {
            const y = ((j + 0.5) / 3) * 100;
            return (
              <g key={o.v} className="fe-link fe-link-out" style={{ ["--tone" as string]: tone(o.t), ["--d" as string]: j }}>
                <path d={`M64 50 C 68 50, 66 ${y}, 70 ${y}`} pathLength={1} />
                <path className="fe-flow" d={`M64 50 C 68 50, 66 ${y}, 70 ${y}`} pathLength={1} />
              </g>
            );
          })}
        </svg>

        <ul className="fe-sources">
          {SYSTEMS.map((s, i) => (
            <li key={s.id} style={{ ["--tone" as string]: tone(s.tone), ["--d" as string]: i }}>
              <IconChip Icon={s.Icon} t={s.tone} size={30} />
              <span className="fe-src-text">
                <span className="fe-src-name">{s.name}</span>
                <span className="fe-src-knows">{s.knows}</span>
              </span>
              <span className="fe-src-value tabular">{s.value}</span>
            </li>
          ))}
        </ul>

        <div className="fe-core">
          <div className="fe-core-head">
            <span className="fe-core-mark"><Sparkles size={14} /></span>
            <span>Decision TRF-0240</span>
            <span className="fe-core-live">Live</span>
          </div>
          <ol className="fe-steps">
            {STEPS.map((s, i) => (
              <li key={s} style={{ ["--d" as string]: i }}>
                <Check size={12} strokeWidth={3} />
                {s}
              </li>
            ))}
          </ol>
          <p className="fe-core-label">Recommended action</p>
          <p className="fe-core-action">Transfer 240 units</p>
          <div className="fe-route">
            <span>Plant 02</span>
            <i aria-hidden><b /></i>
            <span>Plant 01</span>
          </div>
          <div className="fe-approved">
            <ShieldCheck size={15} />
            <span>Approved by the planner · 09:42</span>
          </div>
        </div>

        <ul className="fe-outcomes">
          {OUTCOMES.map((o, j) => (
            <li key={o.v} style={{ ["--tone" as string]: tone(o.t), ["--tint" as string]: tint(o.t, 14), ["--d" as string]: j, ["--f" as string]: o.f }}>
              <strong className="tabular">{o.v}</strong>
              <span>{o.k}</span>
              <i aria-hidden><b /></i>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
