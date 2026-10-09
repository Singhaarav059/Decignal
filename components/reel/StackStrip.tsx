"use client";

import { useEffect, useState } from "react";
import { READS } from "@/lib/content";
import { STACK_LOGOS } from "@/lib/stack-logos";

function Mark({ name, size = 18 }: { name: string; size?: number }) {
  const l = STACK_LOGOS[name];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={l.hex} aria-hidden>
      <path d={l.path} />
    </svg>
  );
}

/**
 * Hero dock: the systems Decignal reads from, each with its own mark, drifting past a live
 * readout of what is being read right now. Hovering a system pauses the drift and reads it.
 */
export function StackStrip() {
  const [now, setNow] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  const i = held ?? now;
  const r = READS[i];

  useEffect(() => {
    if (held !== null) return;
    const id = window.setInterval(() => setNow((n) => (n + 1) % READS.length), 2600);
    return () => window.clearInterval(id);
  }, [held]);

  return (
    <div className="r-stack">
      <div className="r-stack-read">
        <p className="r-stack-label">
          <i aria-hidden />
          Works with your stack
        </p>
        <p key={i} className="r-stack-now" aria-hidden>
          <Mark name={r.sys} size={14} />
          <b>{r.sys}</b>
          <span>{r.text}</span>
        </p>
      </div>
      <div className="r-stack-track" aria-label={`Works with ${READS.map((x) => x.sys).join(", ")}`} onMouseLeave={() => setHeld(null)}>
        {/* Two copies so the strip loops without a seam */}
        {[0, 1].map((k) => (
          <ul key={k} aria-hidden={k === 1 || undefined}>
            {READS.map((x, j) => (
              <li key={x.sys} data-on={j === i} onMouseEnter={() => setHeld(j)} style={{ "--brand": STACK_LOGOS[x.sys].hex } as React.CSSProperties}>
                <Mark name={x.sys} />
                <strong>{x.sys}</strong>
                <small>{x.role}</small>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
