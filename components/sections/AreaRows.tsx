"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownRight, Plus } from "lucide-react";
import { AREAS, appsOf, areaHref } from "@/lib/areas";
import { APPLICATION_DEMOS } from "@/lib/application-demos";
import { CTA } from "@/lib/copy";
import { jumpTo, onArea, showApplication } from "@/lib/jump";
import { toneVars } from "@/lib/tone";
import { SectionLink } from "../ui/SectionLink";
import { Arrow } from "../ui/Arrow";
import { AreaPhoto } from "./AreaPhoto";
import { AreaArt } from "./AreaArt";
import { plainClick } from "./AreaStack";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The five business areas as numbered rows on the night band (Orvan's services): number, name, one
 * line, the count of applications and the area's place as a small duotone. One row is open at a time:
 * it grows to the place at full size beside the area's signal (drawn), its applications (each opens in
 * the explorer below) and the link to its service page. The nav's area links and showArea(i) open a
 * row and bring it under the nav.
 */
export function AreaRows() {
  const [open, setOpen] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  const bring = useCallback((i: number) => {
    setOpen(i);
    const row = list.current?.children[i] as HTMLElement | undefined;
    if (!row) return;
    // After the row has opened, so the page measures its final place.
    window.setTimeout(
      () =>
        void jumpTo(row.getBoundingClientRect().top + window.scrollY - 96, {
          focus: row.querySelector("button") ?? false,
        }),
      60,
    );
  }, []);
  useEffect(() => onArea(bring), [bring]);

  // The rows draw in one after another as the list arrives.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        el.setAttribute("data-in", "");
        io.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A preview of the hovered row's place follows the pointer, easing after it (fine pointers only).
  const [hover, setHover] = useState(-1);
  const preview = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const el = preview.current;
    const box = list.current;
    if (
      !el ||
      !box ||
      !window.matchMedia(
        "(hover: hover) and (pointer: fine) and (min-width: 900px)",
      ).matches
    )
      return;
    let raf = 0;
    const at = { x: 0, y: 0 };
    const move = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      target.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const tick = () => {
      at.x += (target.current.x - at.x) * 0.16;
      at.y += (target.current.y - at.y) * 0.16;
      const tilt = Math.max(-8, Math.min(8, (target.current.x - at.x) * 0.06));
      el.style.transform = `translate3d(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
      raf = requestAnimationFrame(tick);
    };
    box.addEventListener("pointermove", move);
    raf = requestAnimationFrame(tick);
    return () => {
      box.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    // An ol holds only rows: the cursor preview sits beside it in the wrapper.
    <div className="area-rows-wrap" onPointerLeave={() => setHover(-1)}>
      <div
        ref={preview}
        className="area-preview"
        data-show={hover >= 0 && hover !== open ? "" : undefined}
        aria-hidden
      >
        {AREAS.map((a, i) => (
          <div
            key={a.slug}
            className="area-preview-item"
            data-on={i === hover || undefined}
            style={toneVars(a.tone)}
          >
            <AreaPhoto area={a} sizes="320px" />
            <span className="area-preview-name">{a.name}</span>
          </div>
        ))}
      </div>
      <ol ref={list} className="area-rows">
        {AREAS.map((area, i) => {
          const apps = appsOf(area);
          const isOpen = open === i;
          const body = `area-${area.slug}-body`;
          return (
            <li
              key={area.slug}
              id={`area-${area.slug}`}
              className="area-row"
              data-open={isOpen || undefined}
              style={{ ...toneVars(area.tone), ["--i" as string]: i }}
              onPointerEnter={() => setHover(i)}
            >
              <h3 className="area-row-h">
                <button
                  type="button"
                  className="area-row-head"
                  aria-expanded={isOpen}
                  aria-controls={body}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span className="area-row-n tabular">{pad(i + 1)}</span>
                  <span className="area-row-name">{area.name}</span>
                  <span className="area-row-lead">{area.lead}</span>
                  <span className="area-row-count tabular">
                    {apps.length}{" "}
                    {apps.length === 1 ? "application" : "applications"}
                  </span>
                  <span className="area-row-thumb" aria-hidden>
                    <AreaPhoto area={area} sizes="160px" />
                  </span>
                  <span className="area-row-plus" aria-hidden>
                    <Plus size={18} strokeWidth={2} />
                  </span>
                </button>
              </h3>
              <div
                id={body}
                className="area-row-body"
                role="region"
                aria-label={area.name}
                inert={!isOpen}
              >
                <div className="area-row-inner">
                  <div className="area-row-grid">
                    <AreaPhoto
                      area={area}
                      sizes="(min-width: 1024px) 560px, 100vw"
                    />
                    <div className="area-row-detail">
                      <div className="area-ui-signal-card">
                        <div className="area-ui-art" aria-hidden>
                          <AreaArt area={area.category} />
                        </div>
                        <p className="area-ui-signal">
                          <span className="area-ui-dot" aria-hidden />
                          <span>
                            <span className="area-ui-label">Signal</span>
                            {area.signal}
                          </span>
                        </p>
                      </div>
                      <ul
                        className="area-ui-apps"
                        aria-label={`${area.name} applications`}
                      >
                        {apps.map((a) => (
                          <li key={a.name}>
                            <a
                              href={`#application-${APPLICATION_DEMOS[a.i].kind}`}
                              className="area-ui-app"
                              onClick={(e) => {
                                if (!plainClick(e)) return;
                                e.preventDefault();
                                showApplication(a.i);
                              }}
                            >
                              <span>
                                <span className="area-ui-label">{a.name}</span>
                                {a.example}
                              </span>
                              <ArrowDownRight
                                size={16}
                                strokeWidth={2}
                                aria-hidden
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                      <SectionLink
                        href={areaHref(area.category)}
                        className="ed-link area-explore"
                      >
                        {CTA.explore(area.name)}
                        <Arrow />
                      </SectionLink>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
