"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { toneVars, type Tone } from "@/lib/tone";

export type PillItem = { label: ReactNode; tone?: Tone | string; controls?: string };

/**
 * The story card's selector: the shared segmented control's look (ink pill, white text, tone dot),
 * laid out to fit a 440px card. Items wrap onto a second row on wider screens, so every option is in
 * view, and run as one scrolling row on phones. One solid pill slides to the selected item in x and y.
 * Left/Right, Home and End move between items and select (tabs, automatic activation).
 */
export function StoryPills({
  items,
  value,
  onChange,
  onHover,
  label,
  className,
}: {
  items: PillItem[];
  value: number;
  onChange: (i: number) => void;
  /** Pointer or keyboard focus on an item (-1 when it leaves): links the item to the 3D object. */
  onHover?: (i: number) => void;
  label: string;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [glide, setGlide] = useState(false);
  const [roving, setRoving] = useState<number | null>(null);
  const focusable = roving ?? Math.max(value, 0);

  const measure = useCallback(() => {
    const el = value >= 0 ? refs.current[value] : null;
    if (!el) return;
    setBox((b) =>
      b && b.x === el.offsetLeft && b.y === el.offsetTop && b.w === el.offsetWidth && b.h === el.offsetHeight
        ? b
        : { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight },
    );
    // A scrolling row (phones) keeps the selected item in view, without moving the page.
    const row = root.current;
    if (row && row.scrollWidth > row.clientWidth + 1) {
      const left = el.offsetLeft - row.clientWidth / 2 + el.offsetWidth / 2;
      row.scrollTo({ left, behavior: glide && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
    }
  }, [value, glide]);

  useLayoutEffect(measure, [measure, items.length]);

  // Labels change size when the web fonts land and when the card changes width.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [measure]);

  // The first placement jumps; later moves glide.
  useLayoutEffect(() => {
    if (!box || glide) return;
    const raf = requestAnimationFrame(() => setGlide(true));
    return () => cancelAnimationFrame(raf);
  }, [box, glide]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = refs.current.findIndex((el) => el === document.activeElement);
    if (from < 0) return;
    const n = items.length;
    let to = -1;
    if (e.key === "ArrowRight") to = (from + 1) % n;
    else if (e.key === "ArrowLeft") to = (from + n - 1) % n;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = n - 1;
    if (to < 0) return;
    e.preventDefault();
    refs.current[to]?.focus();
    onChange(to);
  };

  return (
    <div
      ref={root}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      className={`seg story-seg${className ? ` ${className}` : ""}`}
      data-variant="selector"
      data-ready={box ? "" : undefined}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setRoving(null);
      }}
    >
      <span
        className="seg-pill"
        aria-hidden
        data-show={box ? "" : undefined}
        data-glide={glide ? "" : undefined}
        style={box ? ({ "--seg-x": `${box.x}px`, "--seg-y": `${box.y}px`, "--seg-w": `${box.w}px`, "--seg-h": `${box.h}px` } as CSSProperties) : undefined}
      />
      {items.map((it, i) => (
        <button
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          aria-selected={i === value}
          aria-controls={it.controls}
          tabIndex={i === focusable ? 0 : -1}
          className="seg-item"
          style={it.tone ? toneVars(it.tone) : undefined}
          onClick={() => onChange(i)}
          onFocus={() => {
            setRoving(i);
            onHover?.(i);
          }}
          onBlur={() => onHover?.(-1)}
          onPointerEnter={onHover ? () => onHover(i) : undefined}
          onPointerLeave={onHover ? () => onHover(-1) : undefined}
        >
          {it.tone && <span className="seg-dot" aria-hidden />}
          {it.label}
        </button>
      ))}
    </div>
  );
}
