import { CH, CHAPTERS, INDUSTRY_TONE, gToProgress, industryF, localIn, store } from "@/lib/story";
import type { Tone } from "@/lib/tone";
import { jumpTo } from "@/lib/jump";

/**
 * Chapter accent: the colour of what each chapter is about (critic §2, S14). Red only where the
 * chapter states a risk (Signal, Problem). Industries takes the tone of the industry on screen;
 * TONE[7] is its first industry.
 */
export const TONE: Tone[] = ["cobalt", "signal", "signal", "violet", "emerald", "emerald", "tangerine", INDUSTRY_TONE[0], "cobalt"];

/** The industry facing the reader at g (0..5). */
export const industryAt = (g = store.g) => Math.round(industryF(localIn(CH.industries, g)));

/** Scrolls to the point where a chapter has settled, before it starts handing over to the next. */
export function goToChapter(i: number) {
  const el = document.getElementById("story");
  if (!el) return;
  const start = el.getBoundingClientRect().top + window.scrollY;
  const range = el.offsetHeight - window.innerHeight;
  const settle = Math.min(CHAPTERS[i].ts * 0.5, 0.3);
  void jumpTo(start + gToProgress(i + settle) * range, { story: true });
}

/** Scrolls to local progress `local` inside chapter i (a story moment, e.g. one industry's hold). */
export function goToStory(i: number, local: number) {
  const el = document.getElementById("story");
  if (!el) return;
  const start = el.getBoundingClientRect().top + window.scrollY;
  const range = el.offsetHeight - window.innerHeight;
  void jumpTo(start + gToProgress(i + Math.min(Math.max(local, 0), 0.999)) * range, { story: true });
}
