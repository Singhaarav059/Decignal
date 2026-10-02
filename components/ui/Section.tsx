"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Everything marked data-reveal rises a few pixels and fades in as it enters.
 * data-delay staggers siblings; children of data-stagger enter one after another.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!ref.current || reducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 1.1,
            delay: Number(el.dataset.delay ?? 0),
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((el) => {
        gsap.fromTo(
          el.children,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "expo.out",
            stagger: 0.07,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          },
        );
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return ref;
}

/** Section header: a coloured kicker, one headline, one supporting line. */
export function Header({
  kicker,
  tone = "cobalt",
  title,
  lede,
  align = "center",
}: {
  kicker: string;
  tone?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "center" | "left";
}) {
  const center = align === "center";
  return (
    <div className={center ? "mx-auto max-w-[860px] text-center" : "max-w-[620px]"}>
      <p data-reveal className="kicker" style={{ color: `var(--color-${tone})` }}>
        {kicker}
      </p>
      <h2 data-reveal data-delay="0.05" className="headline mt-3 text-[clamp(36px,5.2vw,64px)]">
        {title}
      </h2>
      {lede && (
        <p data-reveal data-delay="0.1" className={`lede mt-5 ${center ? "mx-auto max-w-[620px]" : "max-w-[540px]"}`}>
          {lede}
        </p>
      )}
    </div>
  );
}

/** A soft grey stage that holds a section's graphic. */
export function Stage({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`relative overflow-hidden rounded-[32px] bg-bg-2 ${className}`}>{children}</div>;
}
