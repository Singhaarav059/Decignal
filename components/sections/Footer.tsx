"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, CATEGORIES } from "@/lib/content";
import { areaHref, areaOf } from "@/lib/areas";
import { CTA, FOOTER } from "@/lib/copy";
import { CONTACT_EMAIL } from "@/lib/site";

/** The monitored inbox; the address is left out until a real one is supplied (never a .example stand-in). */
const EMAIL = CONTACT_EMAIL;
import { jumpTo } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import { Arrow } from "../ui/Arrow";
import { SectionLink } from "../ui/SectionLink";
import { AuditLink } from "../CtaPill";
import SectionTitle from "../ui/SectionTitle";
import { ArrowUp, ArrowUpRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const STRATA = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];

/**
 * The page's close: a two-line headline and the one CTA, the home sections as ruled links, the five
 * areas linking to their service pages, a legal row and the wordmark. Rendered outside <main> (it is
 * the contentinfo landmark), so it carries its own surface and layer over the story canvas.
 */
export function Footer() {
  const word = useRef<HTMLDivElement>(null);
  const motif = useRef<SVGSVGElement>(null);
  const path = usePathname();

  // The six system threads draw in and meet once the footer is in view.
  useEffect(() => {
    const el = motif.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.classList.add("is-on");
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The wordmark rises letter by letter as the page ends.
  useEffect(() => {
    const el = word.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = gsap.fromTo(
      el.querySelectorAll("[data-letter]"),
      { yPercent: 100 },
      {
        yPercent: 0,
        ease: "expo.out",
        duration: 1.4,
        stagger: 0.05,
        scrollTrigger: { trigger: el, start: "top 95%", once: true },
      },
    );
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, []);

  return (
    <footer className="site-footer">
      <div className="page-wrap footer-grid">
        <div className="footer-lead">
          {/* Six systems, one resolved decision: the story's opening network, closed. */}
          <svg ref={motif} className="footer-motif" viewBox="0 0 220 72" aria-hidden>
            {STRATA.map((c, i) => {
              const y = 6 + i * 12;
              return (
                <g key={c} style={{ ["--i" as string]: i }}>
                  <path
                    d={`M10 ${y} C 90 ${y}, 120 36, 196 36`}
                    className="footer-thread"
                    pathLength={1}
                    fill="none"
                    stroke={`var(--color-${c})`}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                  {/* White-ringed, so the cobalt system still reads on the cobalt footer. */}
                  <circle cx={10} cy={y} r={4} className="footer-dot" fill={`var(--color-${c})`} />
                </g>
              );
            })}
            <g className="footer-motif-node">
              <circle cx={200} cy={36} r={11} fill="var(--color-emerald)" />
              <path d="M195 36.5l3.4 3.4 6.4-7" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
          <SectionTitle lines={[FOOTER.headline[0], FOOTER.headline[1]]} lede={FOOTER.body} tone="ink" className="ed-title" id="footer-title" />
          {/* The same CTA as the nav's: on a page with the form it glides there and focuses the first field. */}
          <AuditLink className="btn btn-primary footer-cta">
            {CTA.primary}
            <Arrow />
          </AuditLink>
        </div>

        <nav aria-label="Footer" className="footer-nav">
          <p className="t-label">{FOOTER.navTitle}</p>
          <ul className="footer-cards">
            {FOOTER.nav.map(({ label, href, blurb }) => (
              <li key={href}>
                <SectionLink href={href} className="footer-card">
                  <strong>{label}</strong>
                  <small>{blurb}</small>
                  <span className="footer-card-go" aria-hidden><ArrowUpRight size={16} strokeWidth={2.2} /></span>
                </SectionLink>
              </li>
            ))}
          </ul>

          <p className="t-label footer-areas-title">{FOOTER.areasTitle}</p>
          {/* Each function opens its solution page. */}
          <ul className="footer-areas">
            {CATEGORIES.map((c) => {
              const area = areaOf(c);
              const n = APPLICATIONS.filter((a) => a.category === c).length;
              const href = areaHref(c);
              return (
                <li key={c}>
                  <SectionLink href={href} className="footer-area" style={toneVars(area.tone)} aria-current={path === href ? "page" : undefined}>
                    <i aria-hidden />
                    {c}
                    <span className="tabular" aria-hidden>{n}</span>
                    <span className="sr-only">, {FOOTER.areaCount(n)}</span>
                  </SectionLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="page-wrap footer-legal">
        <span>
          {FOOTER.positioning} {FOOTER.identity}
          {EMAIL && (
            <>
              {" "}
              · <a href={`mailto:${EMAIL}`}>{FOOTER.contact(EMAIL)}</a>
            </>
          )}
        </span>
        <ul className="footer-legal-links">
          <li>{FOOTER.copyright}</li>
          {FOOTER.company.map((l) => (
            <li key={l.href}>
              <SectionLink href={l.href}>{l.label}</SectionLink>
            </li>
          ))}
          <li>
            <button onClick={() => jumpTo(0, { focus: ".nav-logo" })} className="footer-top">
              {FOOTER.top}
              <span aria-hidden>
                <ArrowUp size={14} strokeWidth={2.2} />
              </span>
            </button>
          </li>
        </ul>
      </div>

      {/* The wordmark, set across the full width */}
      <div ref={word} className="footer-wordmark" aria-hidden>
        <span className="footer-wordmark-word">
          {"decignal".split("").map((ch, i) => (
            <span key={i} data-letter className="inline-block">
              {ch}
            </span>
          ))}
        </span>
      </div>
    </footer>
  );
}
