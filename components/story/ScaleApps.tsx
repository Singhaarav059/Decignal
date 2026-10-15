"use client";

import { useLayoutEffect, useState } from "react";
import { CH, FUNCTIONS, localIn, scaleBeat, scaleSettle, setPinHint, store, subscribe, weight } from "@/lib/story";
import { APPLICATION_DEMOS } from "@/lib/application-demos";
import { APPLICATIONS, CATEGORY_TONE, type Category } from "@/lib/content";
import { areaHref, areaOf } from "@/lib/areas";
import { SCALE, STORY_UI } from "@/lib/copy";
import { goToStory } from "./chapters";
import { StoryPills } from "./StoryPills";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";

/** Scrolls to step k's hold (the functions, then the glass layer): the 3D hand, the pills and the phone hand all follow the scroll. */
export const goToFunction = (k: number) => goToStory(CH.scale, scaleSettle(k));

const FN = FUNCTIONS.map((f) => {
  const category = f.name as Category;
  const apps = APPLICATIONS.filter((a) => a.category === category);
  return {
    name: f.name,
    category,
    tone: CATEGORY_TONE[category],
    apps,
    systems: [...new Set(apps.flatMap((a) => APPLICATION_DEMOS[APPLICATIONS.indexOf(a)].sources.split(" · ")))].slice(0, 4),
    area: areaOf(category),
  };
});

/**
 * 07 Scale, inside the story card: the five functions as one selector, then the proposed workflows in
 * the selected one. The selection is the 3D card being read: the card under the pointer,
 * else the one the scroll brings forward. Pointing at a pill brings its card forward; clicking scrolls to it.
 */
export function ScaleCard() {
  const [at, setAt] = useState(0);

  useLayoutEffect(() => {
    let raf = 0;
    let last = -1;
    const read = () => {
      const g = store.g;
      const v = store.focus >= 0 && store.focus < FN.length ? store.focus : scaleBeat(localIn(CH.scale, g));
      if (v === last) return;
      last = v;
      setAt(v);
    };
    // The 3D card under the pointer changes without a scroll: poll while the chapter is on screen.
    const loop = () => {
      read();
      raf = weight(CH.scale, store.g) > 0 ? requestAnimationFrame(loop) : 0;
    };
    const off = subscribe((g) => {
      if (weight(CH.scale, g) > 0 && !raf) raf = requestAnimationFrame(loop);
      read();
    });
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, []);

  const hover = (k: number) => {
    store.focusHint = k;
    setPinHint(k >= 0 ? `fn:${k}` : null);
  };

  return (
    <div className="scale-card">
      <StoryPills
        label={STORY_UI.functionsAria}
        items={FN.map((f, k) => ({ label: f.name, tone: f.tone, controls: `scale-fn-${k}` }))}
        value={at}
        onChange={goToFunction}
        onHover={hover}
      />
      <div className="story-stack">
        {FN.map((f, k) => {
          const link = SCALE.link(f.area.name);
          return (
            <div key={f.name} id={`scale-fn-${k}`} role="tabpanel" className="story-stack-item scale-fn" data-on={k === at || undefined}>
              <p className="t-label">{SCALE.apps(f.apps.length)}</p>
              <ul className="story-rows scale-rows">
                {f.apps.map((a) => {
                  const [name, status] = SCALE.appRow(a.name, a.status).split(" · ");
                  return (
                    <li key={a.name}>
                      <span className="scale-app">{name}</span>
                      <span>{status}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="t-small scale-systems">{f.systems.join(" · ")}</p>
              <SectionLink href={areaHref(f.category)} className="story-link t-small">
                {link}
                <Arrow />
              </SectionLink>
            </div>
          );
        })}
      </div>
    </div>
  );
}
