import type { CSSProperties } from "react";
import { toneVars } from "@/lib/tone";

type Shape = { tone: string; x: number; y: number; size: number; d?: number };

/**
 * Flat palette shapes behind a group of glass cards (the wallpaper Apple's Liquid Glass sits on): solid
 * colours, no gradient or glow of their own; the glass over them softens them. They drift and slowly
 * change shape; reduced motion holds them still (liquid-glass.css .liquid). Decoration: hidden from readers.
 */
const PRESETS: Record<string, Shape[]> = {
  bento: [
    { tone: "cobalt", x: 6, y: 8, size: 300 },
    { tone: "saffron", x: 44, y: 58, size: 240, d: -6 },
    { tone: "violet", x: 80, y: 6, size: 320, d: -12 },
    { tone: "emerald", x: 24, y: 86, size: 200, d: -3 },
    { tone: "pink", x: 92, y: 82, size: 200, d: -9 },
  ],
  faq: [
    { tone: "violet", x: 18, y: 30, size: 260 },
    { tone: "emerald", x: 70, y: 18, size: 220, d: -7 },
    { tone: "saffron", x: 88, y: 70, size: 260, d: -4 },
    { tone: "cobalt", x: 48, y: 92, size: 200, d: -11 },
  ],
  outcomes: [
    { tone: "pink", x: 12, y: 20, size: 300 },
    { tone: "cobalt", x: 86, y: 40, size: 320, d: -8 },
    { tone: "saffron", x: 40, y: 88, size: 240, d: -5 },
  ],
};

export function LiquidShapes({ preset, className = "" }: { preset: keyof typeof PRESETS; className?: string }) {
  return (
    <div className={`liquid ${className}`} aria-hidden>
      {PRESETS[preset].map((s, i) => (
        <span
          key={i}
          className="liquid-shape"
          style={{ ...toneVars(s.tone), left: `${s.x}%`, top: `${s.y}%`, ["--s" as string]: `${s.size}px`, ["--d" as string]: `${s.d ?? 0}s`, ["--k" as string]: i } as CSSProperties}
        />
      ))}
    </div>
  );
}
