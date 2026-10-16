import type { CSSProperties } from "react";

/** The wordmark: the name alone (the plate mark is retired while the new identity is drawn). Sizes follow --logo. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo inline-flex items-center" style={{ "--logo": `${size}px` } as CSSProperties}>
      <span className="logo-word font-serif leading-none tracking-[-0.019em]">decignal</span>
    </span>
  );
}
