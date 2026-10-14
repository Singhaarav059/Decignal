import type { CSSProperties } from "react";

type Shape = { c: string; x: number; y: number; size: number; d?: number };

/**
 * The wallpaper behind a group of glass cards: soft blooms of the glass tones (the CreditKarma
 * references' blurred colour), each a radial field fading to nothing, so the glass over them reads as
 * coloured light. Warm and cool blooms are kept apart (orange never meets slate, which would mix to
 * brown). They drift slowly; reduced motion holds them still (liquid-glass.css .liquid). Decoration:
 * hidden from readers.
 */
const PRESETS: Record<string, Shape[]> = {
  bento: [
    { c: "var(--gl-butter)", x: 18, y: 6, size: 420 },
    { c: "var(--gl-amber)", x: 46, y: 46, size: 380, d: -6 },
    { c: "var(--gl-orange)", x: 30, y: 92, size: 300, d: -12 },
    { c: "var(--gl-sky)", x: 88, y: 14, size: 340, d: -3 },
    { c: "var(--gl-lilac)", x: 90, y: 84, size: 300, d: -9 },
  ],
  faq: [
    { c: "var(--gl-lilac)", x: 14, y: 26, size: 340 },
    { c: "var(--gl-butter)", x: 64, y: 16, size: 360, d: -7 },
    { c: "var(--gl-lime)", x: 90, y: 72, size: 320, d: -4 },
    { c: "var(--gl-sky)", x: 40, y: 94, size: 300, d: -11 },
  ],
  outcomes: [
    { c: "var(--gl-sky)", x: 10, y: 22, size: 400 },
    { c: "var(--gl-lilac)", x: 88, y: 34, size: 380, d: -8 },
    { c: "var(--gl-butter)", x: 46, y: 92, size: 340, d: -5 },
  ],
};

export function LiquidShapes({ preset, className = "" }: { preset: keyof typeof PRESETS; className?: string }) {
  return (
    <div className={`liquid ${className}`} aria-hidden>
      {PRESETS[preset].map((s, i) => (
        <span
          key={i}
          className="liquid-shape"
          style={{ ["--c" as string]: s.c, left: `${s.x}%`, top: `${s.y}%`, ["--s" as string]: `${s.size}px`, ["--d" as string]: `${s.d ?? 0}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}
