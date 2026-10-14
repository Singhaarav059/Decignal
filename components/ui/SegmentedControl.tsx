"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { toneVars, type Tone } from "@/lib/tone";

type SegmentedItem<V extends string = string> = {
  value: V;
  label: ReactNode;
  /** Small dot in the item's system colour. */
  tone?: Tone | string;
  disabled?: boolean;
  /** location variant: render the item as a link. */
  href?: string;
  /** selector variant: id of the panel this tab shows. */
  controls?: string;
};

type Props<V extends string> = {
  items: SegmentedItem<V>[];
  /** The selected (selector) or current (location) value; null when none is current. */
  value: V | null;
  onChange?: (value: V) => void;
  /**
   * selector: tabs that switch content (solid ink pill, white text, tone dot), role="tablist".
   * location: nav links and the dock (sunken pill, ink text), role="toolbar" with aria-current.
   */
  variant?: "selector" | "location";
  /** Accessible name of the group. */
  label: string;
  size?: "sm" | "md" | "lg";
  /** location: the pill follows the pointer and returns to the current item. */
  followHover?: boolean;
  /** location: aria-current token for the current item. */
  currentType?: "page" | "location" | "step" | "true";
  className?: string;
  id?: string;
};

/**
 * One segmented control with a sliding solid pill. Left/Right arrows, Home and End move between items
 * with a roving tabindex; in the selector variant they also select (automatic activation, as tabs do).
 */
export default function SegmentedControl<V extends string>({
  items,
  value,
  onChange,
  variant = "selector",
  label,
  size = "md",
  followHover = false,
  currentType = "true",
  className,
  id,
}: Props<V>) {
  const root = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [hover, setHover] = useState<number>(-1);
  // The pill keeps its last place while hidden, so it fades out where it was instead of sliding away.
  const [box, setBox] = useState<{ x: number; w: number; on: boolean } | null>(null);
  const [glide, setGlide] = useState(false);
  // The item that holds focus inside the group (null when focus is outside).
  const [roving, setRoving] = useState<number | null>(null);
  const selector = variant === "selector";
  const active = items.findIndex((it) => it.value === value);
  const target = followHover && hover >= 0 ? hover : active;
  // Roving tabindex: the focused item, else the active one, else the first enabled one.
  const focusable =
    roving !== null && items[roving] && !items[roving].disabled
      ? roving
      : active >= 0
        ? active
        : Math.max(0, items.findIndex((it) => !it.disabled));

  const measure = useCallback(() => {
    const el = target >= 0 ? refs.current[target] : null;
    setBox((b) => (el ? { x: el.offsetLeft, w: el.offsetWidth, on: true } : b && { ...b, on: false }));
  }, [target]);

  useLayoutEffect(measure, [measure, items.length]);

  // Remeasure when the control or its labels change size (web fonts, viewport).
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // The first placement jumps; later moves glide.
  useLayoutEffect(() => {
    if (!box || glide) return;
    const raf = requestAnimationFrame(() => setGlide(true));
    return () => cancelAnimationFrame(raf);
  }, [box, glide]);

  const move = (from: number, step: number) => {
    const n = items.length;
    for (let k = 1; k <= n; k++) {
      const i = (from + step * k + n * n) % n;
      if (!items[i].disabled) return i;
    }
    return from;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const from = refs.current.findIndex((el) => el === document.activeElement);
    if (from < 0) return;
    let to = -1;
    // Horizontal group: Up and Down stay with the page (scrolling).
    if (e.key === "ArrowRight") to = move(from, 1);
    else if (e.key === "ArrowLeft") to = move(from, -1);
    else if (e.key === "Home") to = move(-1, 1);
    else if (e.key === "End") to = move(items.length, -1);
    if (to < 0) return;
    e.preventDefault();
    refs.current[to]?.focus();
    if (selector) onChange?.(items[to].value);
  };

  return (
    <div
      ref={root}
      id={id}
      role={selector ? "tablist" : "toolbar"}
      aria-label={label}
      aria-orientation="horizontal"
      className={`seg${className ? ` ${className}` : ""}`}
      data-variant={variant}
      data-size={size === "md" ? undefined : size}
      data-ready={box?.on || active < 0 ? "" : undefined}
      onKeyDown={onKeyDown}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setRoving(null);
      }}
      onPointerLeave={followHover ? () => setHover(-1) : undefined}
    >
      <span
        className="seg-pill"
        aria-hidden
        data-show={box?.on ? "" : undefined}
        data-glide={glide ? "" : undefined}
        style={box ? ({ "--seg-x": `${box.x}px`, "--seg-w": `${box.w}px` } as CSSProperties) : undefined}
      />
      {items.map((it, i) => {
        const on = i === active;
        const common = {
          className: "seg-item",
          tabIndex: i === focusable ? 0 : -1,
          style: it.tone ? toneVars(it.tone) : undefined,
          onPointerEnter: followHover && !it.disabled ? () => setHover(i) : undefined,
          onFocus: () => setRoving(i),
          onClick: () => !it.disabled && onChange?.(it.value),
        };
        const body = (
          <>
            {it.tone && <span className="seg-dot" aria-hidden />}
            {it.label}
          </>
        );
        if (selector) {
          return (
            <button
              key={it.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={it.controls}
              disabled={it.disabled}
              {...common}
            >
              {body}
            </button>
          );
        }
        if (it.href && !it.disabled) {
          return (
            <a
              key={it.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              href={it.href}
              aria-current={on ? currentType : undefined}
              {...common}
            >
              {body}
            </a>
          );
        }
        return (
          <button
            key={it.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            aria-current={on ? currentType : undefined}
            disabled={it.disabled}
            {...common}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
