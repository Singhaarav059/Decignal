"use client";

import { useEffect, useState, type ReactNode } from "react";
import { jumpTo, onQuestion } from "@/lib/jump";
import { toneVars } from "@/lib/tone";

type FaqItem = { q: string; a: string; topic?: string; tone?: string };

/**
 * Questions as a ruled list that opens one answer at a time. Answers stay in the DOM (inert while
 * closed), so they are crawlable. `jump` listens for the nav's FAQ glance (showQuestion); `idPrefix`
 * keeps ids unique when a page holds more than one list (service pages pass "svc-faq").
 * Optional hooks for a figure beside the list (the home FAQ): `onOpenChange` reports the open answer,
 * `onPreview` the question under the pointer or keyboard focus (null when it leaves the list), `shown`
 * marks the question the figure is showing, and `answerExtra` renders extra content under an answer.
 */
export function FaqList({
  items,
  idPrefix = "faq",
  jump = false,
  tone,
  shown,
  onOpenChange,
  onPreview,
  answerExtra,
}: {
  items: FaqItem[];
  idPrefix?: string;
  jump?: boolean;
  tone?: string;
  shown?: number | null;
  onOpenChange?: (i: number | null) => void;
  onPreview?: (i: number | null, via: "pointer" | "focus") => void;
  answerExtra?: (i: number, open: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  useEffect(() => {
    if (!jump) return;
    return onQuestion((i) => {
      setOpen(i);
      void jumpTo(`#${idPrefix}-q-${i}`);
    });
  }, [jump, idPrefix]);
  return (
    <ul
      className="faq-list"
      style={tone ? toneVars(tone) : undefined}
      onPointerLeave={onPreview && (() => onPreview(null, "pointer"))}
      onBlur={onPreview && ((e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onPreview(null, "focus"); })}
    >
      {items.map((f, i) => {
        const on = open === i;
        const q = `${idPrefix}-q-${i}`;
        const a = `${idPrefix}-a-${i}`;
        return (
          <li
            key={f.q}
            className="faq-item"
            data-open={on || undefined}
            data-shown={shown === i || undefined}
            style={f.tone ? toneVars(f.tone) : undefined}
            onPointerEnter={onPreview && (() => onPreview(i, "pointer"))}
          >
            <h3 className="faq-h">
              <button id={q} onClick={() => setOpen(on ? null : i)} onFocus={onPreview && (() => onPreview(i, "focus"))} aria-expanded={on} aria-controls={a} className="faq-q">
                <span className="faq-n tabular" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <span className="faq-q-text">
                  {f.topic && <span className="sr-only">{f.topic}: </span>}
                  <span className="faq-q-title">{f.q}</span>
                </span>
                <span className="faq-plus" aria-hidden><i /><i /></span>
              </button>
            </h3>
            <div id={a} role="region" aria-labelledby={q} inert={!on} className="faq-a" style={{ gridTemplateRows: on ? "1fr" : "0fr" }}>
              <div className="min-h-0 overflow-hidden">
                <p>{f.a}</p>
                {answerExtra?.(i, on)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
