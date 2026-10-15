"use client";

// The hero's film (lib/hero-video.ts): the world rising in and living, played the moment the page shows,
// placed by the same framing the live camera uses (lib/framing.ts) so each island sits where the live
// one will. The live scene starts at the first pause (Story) and, once warmed up, fades in over the
// film from its very frame; the film then goes. Scrolling on before that, the film fades out and the
// world arrives as it always did.
import { useEffect, useRef } from "react";
import { store, subscribe } from "@/lib/story";
import { filmPlan, filmTransform, hero, heroFraming } from "@/lib/hero-video";
import { mediaWidth } from "@/lib/device";
import { markFilmReady, whenSceneReady } from "@/lib/chrome";

/** The live canvas's fade over the film (app/styles/story.css html.hero-film .intro-stage), ms. */
const HANDOFF = 450;
/** The longest the film waits for the card's rect before showing (ms). */
const CARD_WAIT = 1500;

export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    const plan = filmPlan();
    const html = document.documentElement;
    if (!v || !plan) return;
    const { shape } = plan;
    hero.shape = shape;
    hero.video = v;
    hero.state = "on";
    html.classList.add("hero-film");
    let alive = true;

    const place = () => {
      const host = v.parentElement;
      if (!host) return;
      const vw = host.clientWidth;
      const vh = host.clientHeight;
      const { live, shot } = heroFraming(vw, vh);
      v.style.width = `${shape.crop.w}px`;
      v.style.height = `${shape.crop.h}px`;
      v.style.transform = filmTransform(shape, live, shot, vw, vh);
    };

    const gone = () => {
      if (hero.state === "gone") return;
      hero.state = "gone";
      v.removeAttribute("data-on");
      html.classList.remove("hero-film");
      window.setTimeout(() => {
        // Shown again since (a remount in development): keep it.
        if (hero.state !== "gone") return;
        v.pause();
        v.removeAttribute("src");
        v.load();
      }, HANDOFF + 100);
    };

    // What the hero's framing reads from the page: its size, and the card's rect (StoryCard), which
    // below 1024px is part of the hero's stage and only arrives as the card eases in.
    const cardled = () => mediaWidth(v.parentElement?.clientWidth ?? innerWidth) < 1024;
    const key = () => {
      const r = store.cardRect;
      return `${innerWidth}x${innerHeight} ${cardled() && r ? [r.x, r.y, r.w, r.h].map(Math.round).join(",") : ""}`;
    };
    let placed = "";
    let raf = 0;
    // While the film shows, it follows every change the live camera would follow, frame by frame.
    const follow = () => {
      if (!alive || hero.state !== "on") return;
      const k = key();
      if (k !== placed) {
        placed = k;
        place();
      }
      raf = requestAnimationFrame(follow);
    };
    const start = async () => {
      await document.fonts?.ready;
      // The card's first rect, where it counts (or at most CARD_WAIT ms of guessing it).
      const t = performance.now();
      while (cardled() && !store.cardRect && performance.now() - t < CARD_WAIT) await new Promise((r) => requestAnimationFrame(r));
      if (!alive || hero.state !== "on") return;
      follow();
      // On the element itself: React does not apply `muted` to a server-rendered video as it hydrates,
      // and an unmuted film may not play by itself.
      v.muted = v.defaultMuted = true;
      v.playsInline = true;
      v.src = plan.src;
      v.load();
    };
    void start();

    const onData = () => {
      if (!alive || hero.state !== "on") return;
      v.setAttribute("data-on", "");
      markFilmReady();
      play();
    };
    // Plays once the page is showing (the loader lifted: html.ready), so the islands rise in view.
    const play = () => {
      if (!v.hasAttribute("data-on") || !html.classList.contains("ready") || hero.state !== "on" || !v.paused || v.ended) return;
      // Refused (autoplay off, a phone saving power): the world arrives as it always did. An abort is
      // only a newer load and not a refusal.
      v.play().catch((e: DOMException) => e.name !== "AbortError" && gone());
    };
    const watch = new MutationObserver(play);
    watch.observe(html, { attributes: true, attributeFilter: ["class"] });
    v.addEventListener("loadeddata", onData);
    v.addEventListener("error", gone);

    // The reader moved on before the live world was ready: a film cannot follow the scroll.
    const off = subscribe((g) => {
      if (g > 0.02 && hero.state === "on") gone();
    });
    // The live world has drawn over the film: once it has faded in, the film goes.
    void whenSceneReady().then(() => {
      if (hero.state === "handoff") window.setTimeout(gone, HANDOFF);
      else if (hero.state === "on") gone();
    });
    if (store.g > 0.02) gone();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      watch.disconnect();
      off();
      v.removeEventListener("loadeddata", onData);
      v.removeEventListener("error", gone);
      gone();
    };
  }, []);

  return <video ref={ref} className="hero-film-video" muted playsInline preload="auto" aria-hidden tabIndex={-1} disablePictureInPicture />;
}
