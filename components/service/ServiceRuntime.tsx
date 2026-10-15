"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { landOnHash } from "@/lib/jump";
import { LEGACY_ANCHORS } from "@/lib/content";
import { SmoothScroll } from "../SmoothScroll";
import { SERVICE_SECTIONS } from "./sections";

gsap.registerPlugin(ScrollTrigger);

/**
 * What a service page runs in the browser: Lenis and the chrome driver (SmoothScroll), landing on a
 * #hash after a full load or a client navigation, and the editorial reveal (same timing as the home
 * page). No story canvas, Loader or Backdrop: those mount only on the home page.
 */
export function ServiceRuntime() {
  // Child effects run first, so SmoothScroll has registered Lenis by now. Old record links
  // (#workflow-{id}, #application-{id}, the earlier workflow ids) land on the record that replaced them.
  useEffect(() => {
    const m = /^#(?:workflow-|application-)?(.+)$/.exec(window.location.hash);
    if (m && !document.getElementById(m[1])) {
      const id = LEGACY_ANCHORS[m[1]] ?? m[1];
      if (document.getElementById(id)) history.replaceState(history.state, "", `#${id}`);
    }
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
        const words = el.querySelectorAll(".word > span");
        gsap.fromTo(
          words.length ? words : el.querySelectorAll(".line-mask > span"),
          { yPercent: 115 },
          {
            yPercent: 0,
            duration: 1.2,
            ease: "expo.out",
            stagger: words.length ? 0.055 : 0.09,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return <SmoothScroll sections={SERVICE_SECTIONS} />;
}
