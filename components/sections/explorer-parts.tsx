"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Where each stage sits inside an application (a click on Signal, Evidence or Action lands here). */
export const STAGE_AT = [0.18, 0.48, 0.84];

/** The stage at an application's local progress (0..1): the situation, the records, the next step. */
export const stageAt = (local: number) => (local < 0.32 ? 0 : local < 0.62 ? 1 : 2);

/**
 * Text that changes in place: the old words fade up and out while the new ones rise in (opacity and
 * 8px, --dur-3). Only the words change; nothing around them remounts (E15).
 */
export function Swap({ text, render = (t) => t, className }: { text: string; render?: (text: string, live: boolean) => ReactNode; className?: string }) {
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

export const headline = (t: string) => {
  const [a, b] = t.split("\n");
  return <>{a} <span className="accent">{b}</span></>;
};
