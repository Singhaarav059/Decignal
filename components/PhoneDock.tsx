"use client";

import type { MouseEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import SegmentedControl from "./ui/SegmentedControl";
import { AuditLink, plainClick, useHtmlReady } from "./CtaPill";
import { HOME_SECTIONS, useChrome, type ChromeSection } from "@/lib/chrome";
import { jumpTo } from "@/lib/jump";
import { CTA } from "@/lib/copy";

/** Phones and tablets (below 1024px): once the nav steps aside past the story, a bottom dock carries
 *  the sections and the CTA. It follows the same hand-off as the desktop pill (chrome.dock): it rises
 *  when the reader pauses with nothing to read under it, and never in the story (where the StoryCard
 *  owns the bottom of the screen), a pinned stage, a jump or an open menu. */
export function PhoneDock({ sections = HOME_SECTIONS }: { sections?: ChromeSection[] }) {
  const ready = useHtmlReady();
  const show = useChrome((s) => s.dock) && ready;
  const current = useChrome((s) => s.section);
  const items = sections
    .filter((s) => s.id !== "audit" && s.dock !== false)
    .slice(0, 4)
    .map((s) => ({ value: s.id, label: s.short ?? s.label, href: `#${s.id}` }));

  // The dock's links are real anchors; a plain click glides or cuts there instead of the browser's jump.
  const onClick = (e: MouseEvent<HTMLElement>) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>(".seg-item[href]");
    if (!a || !plainClick(e)) return;
    const hash = a.getAttribute("href")!;
    if (!document.getElementById(hash.slice(1))) return;
    e.preventDefault();
    void jumpTo(hash);
  };

  return (
    <nav className="phone-dock" data-lens aria-label="Sections" data-dock data-show={show || undefined} inert={!show} onClick={onClick}>
      <SegmentedControl
        variant="location"
        label="Sections"
        items={items}
        value={items.some((it) => it.value === current) ? current : null}
        className="phone-dock-seg"
      />
      <AuditLink className="phone-dock-cta" aria-label={CTA.primary}>
        {sections.find((s) => s.id === "audit")?.short ?? CTA.compact}
        <ArrowUpRight size={14} strokeWidth={2.4} aria-hidden />
      </AuditLink>
    </nav>
  );
}
