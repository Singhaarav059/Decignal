"use client";

import { useSyncExternalStore, type ComponentProps, type MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { SectionLink } from "./ui/SectionLink";
import { useChrome } from "@/lib/chrome";
import { jumpTo } from "@/lib/jump";
import { CTA, NAV } from "@/lib/copy";

/** A plain left click with no modifier: the only click a link should take over. */
export const plainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** html.ready lands when the loader lifts (or at once on pages without one). */
const subscribeReady = (fn: () => void) => {
  const mo = new MutationObserver(fn);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
};
export const useHtmlReady = () =>
  useSyncExternalStore(
    subscribeReady,
    () => document.documentElement.classList.contains("ready"),
    () => false,
  );

/** Where a CTA lands focus: the form's first field ([data-first-field], else its first visible control)
 *  with a fine pointer; on touch the section itself, so no keyboard springs up over the form. */
function auditFocus(): HTMLElement | true {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return true;
  const marked = document.querySelector<HTMLElement>("#audit [data-first-field]");
  if (marked) return marked;
  const fields = document.querySelectorAll<HTMLElement>("#audit form :is(input, select, textarea):not([type=hidden]):not([tabindex='-1'])");
  return Array.from(fields).find((el) => el.offsetParent !== null && !el.closest("[aria-hidden=true]")) ?? true;
}

/** Every "Book a free AI audit" in the chrome: a real link to #audit that jumps there and puts focus in
 *  the form (see auditFocus). Other pages without the form go to the home page's. */
export function AuditLink({ onDone, onClick, ...rest }: Omit<ComponentProps<typeof SectionLink>, "href" | "focus">) {
  return (
    <SectionLink
      href={CTA.href}
      onDone={onDone}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !plainClick(e) || !document.getElementById("audit")) return;
        e.preventDefault();
        onDone?.();
        void jumpTo("#audit", { focus: auditFocus() });
      }}
      {...rest}
    />
  );
}

/** The CTA hand-off at 1024px and up: once the nav has stepped aside past the story and the reader
 *  pauses, the call to action rises at the bottom, only where nothing to read sits under it
 *  (chrome.dock). Never in the story, a pinned stage, a jump, or while the audit form or the footer
 *  (each with its own CTA) is on screen. */
export function CtaPill() {
  const ready = useHtmlReady();
  const show = useChrome((s) => s.dock) && ready;
  return (
    <aside className="cta-pill" data-lens aria-label={NAV.faqSide.label} data-dock data-show={show || undefined} inert={!show}>
      <p>{NAV.faqSide.blurb}</p>
      <AuditLink className="nav-cta">
        {CTA.primary}
        <span className="nav-cta-icon" aria-hidden>
          <ArrowUpRight size={15} strokeWidth={2.4} />
        </span>
      </AuditLink>
    </aside>
  );
}
