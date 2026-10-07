import { CHAPTERS, gToProgress } from "@/lib/story";
import { scrollToTarget } from "../SmoothScroll";

/** Chapter accent: the colour of what that chapter is about. */
export const TONE = ["", "signal", "cobalt", "violet", "saffron", "emerald", "tangerine", "pink", ""];

export const toneVar = (i: number) => `var(--color-${TONE[i] || "ink"})`;

/** Scrolls to the point where a chapter has settled, before it starts handing over to the next. */
export function goToChapter(i: number) {
  const el = document.getElementById("story");
  if (!el) return;
  const start = el.getBoundingClientRect().top + window.scrollY;
  const range = el.offsetHeight - window.innerHeight;
  const settle = Math.min(CHAPTERS[i].ts * 0.5, 0.3);
  scrollToTarget(start + gToProgress(i + settle) * range);
}
