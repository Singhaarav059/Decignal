"use client";

import { useEffect, useRef, useState } from "react";
import { getLenis, scrollToTarget } from "./SmoothScroll";
import { Logo } from "./ui/Logo";
import { Arrow } from "./ui/Arrow";

const LINKS = [
  ["Applications", "#applications"],
  ["Outcomes", "#outcomes"],
  ["How it works", "#how"],
  ["Questions", "#faq"],
] as const;

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const story = document.getElementById("story");
    let lastY = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      const past = !!story && y > story.offsetHeight - window.innerHeight * 0.5;
      const application = document.querySelector('.application-journey')?.getBoundingClientRect();
      const readingApplication = !!application && application.top < 80 && application.bottom >= window.innerHeight;
      setSolid(past);
      // Past the story the nav steps aside while reading down, and returns on the way up.
      if (Math.abs(y - lastY) > 6) {
        setHidden(past && y > lastY && !readingApplication);
        lastY = y;
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const l = getLenis();
    if (open) l?.stop();
    else l?.start();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (href: string | number) => {
    setOpen(false);
    // Let the menu start closing before the page moves.
    setTimeout(() => scrollToTarget(href), open ? 260 : 0);
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-[var(--ease-out-expo)]"
        style={{ transform: hidden && !open ? "translateY(-110%)" : "none" }}
      >
        {/* Reading progress, in the six system colours */}
        <div
          ref={bar}
          className="absolute inset-x-0 top-0 h-[2px] origin-left"
          style={{ background: "var(--spectrum)", transform: "scaleX(0)" }}
          aria-hidden
        />
        <div
          className={`mx-3 mt-3 grid h-14 grid-cols-[1fr_auto_1fr] items-center rounded-full px-3 transition-[background-color,box-shadow,border-color] duration-500 md:mx-5 md:px-4 ${
            solid || open
              ? "border border-white/70 bg-white/72 shadow-[0_8px_30px_-12px_rgba(20,19,15,0.18)] backdrop-blur-xl"
              : "border border-white/60 bg-bg/80 backdrop-blur-xl"
          }`}
        >
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {LINKS.map(([label, href]) => (
              <button
                key={href}
                onClick={() => go(href)}
                className="min-h-10 rounded-full px-3.5 text-[13.5px] font-medium text-ink-2 transition-colors duration-200 hover:bg-ink/5 hover:text-ink"
              >
                {label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex min-h-10 items-center gap-2.5 justify-self-start rounded-full px-2 text-[13.5px] font-medium lg:hidden"
            aria-expanded={open}
            aria-controls="menu"
          >
            <span className="relative block h-2.5 w-5" aria-hidden>
              <span
                className="absolute inset-x-0 top-0 h-[1.5px] bg-ink transition-transform duration-500 ease-[var(--ease-out-expo)]"
                style={{ transform: open ? "translateY(4.5px) rotate(45deg)" : "none" }}
              />
              <span
                className="absolute inset-x-0 bottom-0 h-[1.5px] bg-ink transition-transform duration-500 ease-[var(--ease-out-expo)]"
                style={{ transform: open ? "translateY(-4.5px) rotate(-45deg)" : "none" }}
              />
            </span>
            <span className="hidden sm:inline">{open ? "Close" : "Menu"}</span>
            <span className="sr-only sm:hidden">{open ? "Close menu" : "Open menu"}</span>
          </button>

          <button onClick={() => go(0)} className="justify-self-center" aria-label="Decignal, back to top">
            <Logo size={23} />
          </button>

          <div className="flex justify-end">
            <button onClick={() => go("#audit")} className="btn btn-primary min-h-10! px-4! text-[13px]! whitespace-nowrap">
              <span className="hidden sm:inline">Book a free AI audit</span>
              <span className="sm:hidden">Audit</span>
              <Arrow />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile and tablet menu */}
      <div
        id="menu"
        className="fixed inset-0 z-40 flex flex-col justify-end bg-bg px-6 pb-10 lg:hidden"
        style={{
          clipPath: open ? "inset(0 0 0 0)" : "inset(0 0 100% 0)",
          transition: "clip-path 700ms var(--ease-in-out-quart), visibility 700ms",
          visibility: open ? "visible" : "hidden",
        }}
        aria-hidden={!open}
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: "var(--spectrum)" }} aria-hidden />
        <ul>
          {LINKS.map(([label, href], i) => (
            <li key={href} className="line-mask border-b border-line">
              <button
                onClick={() => go(href)}
                className="flex w-full items-baseline justify-between py-4 text-left"
                style={{
                  transform: open ? "none" : "translateY(110%)",
                  transition: `transform 900ms var(--ease-out-expo) ${open ? 200 + i * 70 : 0}ms`,
                }}
                tabIndex={open ? 0 : -1}
              >
                <span className="display text-[clamp(44px,11vw,88px)]">{label}</span>
                <span className="eyebrow tabular">0{i + 1}</span>
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => go("#audit")} className="btn btn-primary mt-10 self-start" tabIndex={open ? 0 : -1}>
          Book a free AI audit
          <Arrow />
        </button>
      </div>
    </>
  );
}
