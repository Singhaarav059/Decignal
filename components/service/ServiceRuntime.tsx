"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { landOnHash } from "@/lib/jump";
import { SmoothScroll } from "../SmoothScroll";
import { SERVICE_SECTIONS } from "./sections";

gsap.registerPlugin(ScrollTrigger);

/**
 * What a service page runs in the browser: Lenis and the chrome driver (SmoothScroll), landing on a
 * #hash after a full load or a client navigation, and the editorial reveal (same timing as the home
 * page). No story canvas, Loader or Backdrop: those mount only on the home page.
 */
export function ServiceRuntime() {
  // Child effects run first, so SmoothScroll has registered Lenis by now.
  useEffect(() => {
    void landOnHash();
  }, []);

  // Paragraphs fade and rise into place; headlines rise line by line out of their own masks.
  useEffect(() => {
    const root = document.querySelector("main.svc");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal], .svc-section .section-title-label, .svc-section .section-title-lede").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } },
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) => {
        gsap.fromTo(
          el.querySelectorAll(".line-mask > span"),
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 1.3,
            ease: "expo.out",
            stagger: 0.09,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return <SmoothScroll sections={SERVICE_SECTIONS} />;
}
