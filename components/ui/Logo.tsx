import type { CSSProperties } from "react";

/** Three stacked plates: the systems, the context, the signal on top. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`logo-mark ${className}`} aria-hidden>
      <path className="lm-3" d="M16 21.5 4 15.6l12-5.9 12 5.9z" fill="var(--color-cobalt)" />
      <path className="lm-2" d="M16 16.8 4 10.9 16 5l12 5.9z" fill="var(--color-saffron)" />
      <path className="lm-1" d="M16 12.1 4 6.2 16 .3l12 5.9z" fill="var(--color-signal)" />
    </svg>
  );
}

/** Mark and wordmark. The wordmark sits in .logo-word so the compact phone nav can fold it away
 *  (app/styles/chrome.css); sizes follow --logo. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo inline-flex items-center" style={{ "--logo": `${size}px` } as CSSProperties}>
      <LogoMark className="shrink-0" />
      <span className="logo-word font-serif leading-none tracking-[-0.019em]">decignal</span>
    </span>
  );
}
