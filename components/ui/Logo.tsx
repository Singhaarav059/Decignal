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

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo inline-flex items-center gap-2.5">
      <LogoMark className="shrink-0" />
      <span className="font-serif leading-none tracking-[-0.035em]" style={{ fontSize: size }}>
        decignal
      </span>
      <style>{`
        .logo .logo-mark { width: ${Math.round(size * 0.95)}px; height: ${Math.round(size * 0.95)}px; overflow: visible; transform: translateY(${Math.round(size * 0.12)}px); }
        .logo .logo-mark path { transition: transform 600ms var(--ease-out-expo); }
        @media (hover: hover) {
          .logo:hover .lm-1 { transform: translateY(-3px); }
          .logo:hover .lm-3 { transform: translateY(3px); }
        }
      `}</style>
    </span>
  );
}
