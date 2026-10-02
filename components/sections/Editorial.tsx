"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, CATEGORIES, CATEGORY_TONE, FAQ, OUTCOMES, PATHS, STACK, type Category } from "@/lib/content";
import {
  ClipboardList,
  Factory,
  Headphones,
  Landmark,
  Layers,
  Package,
  RefreshCw,
  Rocket,
  Search,
  ShieldAlert,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Audit } from "./Audit";
import { Footer } from "./Footer";

gsap.registerPlugin(ScrollTrigger);

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Paragraphs come into focus; headlines rise line by line out of their own masks. */
function useReveal() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 24, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          },
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
    }, ref);
    return () => ctx.revert();
  }, []);
  return ref;
}

function Lines({ lines }: { lines: React.ReactNode[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <span key={i} className="line-mask">
          <span>{l}</span>
        </span>
      ))}
    </>
  );
}

function Heading({
  eyebrow,
  tone,
  lines,
  intro,
}: {
  eyebrow: string;
  tone: string;
  lines: React.ReactNode[];
  intro?: string;
}) {
  return (
    <div className="mx-auto max-w-6xl text-center">
      <p data-reveal className="eyebrow inline-flex items-center gap-2.5">
        <span className="diamond" style={{ color: `var(--color-${tone})` }} />
        {eyebrow}
      </p>
      <h2 data-lines className="display mt-5 text-[clamp(38px,5vw,76px)]">
        <Lines lines={lines} />
      </h2>
      {intro && (
        <p data-reveal className="mx-auto mt-8 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
          {intro}
        </p>
      )}
    </div>
  );
}

export function Editorial() {
  const ref = useReveal();
  return (
    <main
      ref={ref as React.RefObject<HTMLElement>}
      className="relative z-30 rounded-t-[36px] bg-bg shadow-[0_-1px_0_rgba(20,19,15,0.06),0_-28px_70px_-36px_rgba(20,19,15,0.22)] md:rounded-t-[56px]"
    >
      <Systems />
      <Applications />
      <KineticBand />
      <Outcomes />
      <HowItWorks />
      <Faq />
      <Audit />
      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------------ */

const SYSTEM_TONES = ["cobalt", "violet", "emerald", "saffron", "tangerine", "pink"];

const APP_ICON: Record<string, LucideIcon> = {
  "Inventory Intelligence": Package,
  "Demand & Replenishment": RefreshCw,
  "Production Intelligence": Factory,
  "Predictive Maintenance": Wrench,
  "Supply Chain Risk": ShieldAlert,
  "Sales & Dealer Intelligence": TrendingUp,
  "Customer Service Intelligence": Headphones,
  "Finance & Risk Operations": Landmark,
};

/** Icon on a light tint of its colour. */
function Chip({ Icon, tone, size = 44, solid = false }: { Icon: LucideIcon; tone: string; size?: number; solid?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[30%]"
      style={{
        width: size,
        height: size,
        background: solid ? `var(--color-${tone})` : `color-mix(in srgb, var(--color-${tone}) 13%, white)`,
        color: solid ? "#fff" : `var(--color-${tone})`,
      }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={1.9} />
    </span>
  );
}

function Systems() {
  const row = (reverse: boolean) => (
    <div className="fade-x overflow-hidden">
      <ul
        className="marquee items-center"
        style={{ ["--marquee-speed" as string]: "48s", animationDirection: reverse ? "reverse" : "normal" }}
      >
        {[...STACK, ...STACK].map((s, i) => (
          <li key={i} className="flex items-center gap-10 pr-10 md:gap-14 md:pr-14">
            <span className="font-serif text-[clamp(28px,3.4vw,48px)] leading-none whitespace-nowrap">
              {s}
            </span>
            <span className="diamond" style={{ color: `var(--color-${SYSTEM_TONES[i % 6]})` }} />
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section className="pt-20 md:pt-24">
      <p data-reveal className="mx-auto max-w-[46ch] px-6 text-center text-[17px] leading-relaxed text-ink-2">
        Decignal works across the systems you already run. No rip-and-replace programme, no perfect data lake.
      </p>
      <div data-reveal className="mt-12 space-y-4 md:mt-16">
        {row(false)}
        <div className="text-ink-soft/80">{row(true)}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Applications() {
  const [cat, setCat] = useState<Category | "All">("All");
  // Rows only animate in after the reader filters; the first view uses the scroll reveal.
  const [filtered, setFiltered] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const rows = APPLICATIONS.filter((a) => cat === "All" || a.category === cat);
  const card = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);

  // A preview card follows the pointer across the list, a little behind it.
  useEffect(() => {
    const el = card.current;
    const ul = list.current;
    if (!el || !ul || !window.matchMedia("(hover: hover)").matches) return;
    const x = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
    const y = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
    const move = (e: PointerEvent) => {
      x(e.clientX + 28);
      y(e.clientY - 120);
    };
    ul.addEventListener("pointermove", move);
    return () => ul.removeEventListener("pointermove", move);
    // The list remounts when the filter changes, so the listener follows it.
  }, [cat]);

  const active = hover !== null ? APPLICATIONS[hover] : null;

  return (
    <section id="applications" className="scroll-mt-24 px-6 pt-24 md:px-10 md:pt-32">
      <Heading
        eyebrow="Applications"
        tone="cobalt"
        lines={[
          "Start with the decision",
          <>
            that <em className="spectrum-text">matters most.</em>
          </>,
        ]}
        intro="Focused applications, each scoped around a real operational outcome and fitted to the systems you already run."
      />

      <div data-reveal className="mx-auto mt-14 flex max-w-6xl flex-wrap justify-center gap-2" role="tablist">
        {(["All", ...CATEGORIES] as const).map((c) => {
          const count = c === "All" ? APPLICATIONS.length : APPLICATIONS.filter((a) => a.category === c).length;
          const on = cat === c;
          const tone = c === "All" ? "ink" : CATEGORY_TONE[c];
          return (
            <button
              key={c}
              role="tab"
              aria-selected={on}
              onClick={() => {
                setCat(c);
                setFiltered(true);
              }}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-[background-color,color,border-color] duration-300 ${
                on ? "text-white" : "border border-line bg-white/50 hover:border-line-strong"
              }`}
              style={on ? { background: `var(--color-${tone})` } : undefined}
            >
              {c !== "All" && (
                <span
                  className="size-2 rounded-full"
                  style={{ background: on ? "#fff" : `var(--color-${tone})` }}
                  aria-hidden
                />
              )}
              {c} <span className={`tabular ${on ? "text-white/70" : "text-ink-soft"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <ol key={cat} ref={list} className="mx-auto mt-12 max-w-6xl border-t border-line" onPointerLeave={() => setHover(null)}>
        {rows.map((a, i) => {
          const n = APPLICATIONS.indexOf(a);
          const tone = CATEGORY_TONE[a.category];
          return (
            <li
              key={a.name}
              data-reveal={filtered ? undefined : ""}
              className="border-b border-line"
              style={filtered ? { animation: `fadeUp 650ms ${i * 60}ms var(--ease-out-quint) backwards` } : undefined}
            >
              <a
                href="#audit"
                onPointerEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(null)}
                className="app-row group relative grid gap-x-8 gap-y-3 px-2 py-8 md:grid-cols-[56px_minmax(0,1.3fr)_minmax(0,1.4fr)_140px_minmax(0,1fr)_40px] md:items-center md:px-4 md:py-9"
                style={{ ["--tone" as string]: `var(--color-${tone})` }}
              >
                <Chip Icon={APP_ICON[a.name]} tone={tone} />
                <span>
                  <span className="block font-serif text-[clamp(22px,2.1vw,30px)] leading-[1.1] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5">
                    {a.name}
                  </span>
                  <span className="eyebrow mt-2 block">
                    {String(n + 1).padStart(2, "0")} · {a.category}
                  </span>
                </span>
                <span className="text-[15px] leading-relaxed text-ink-2">{a.text}</span>
                <span>
                  <span className="eyebrow block">First release</span>
                  <span className="mt-1 block font-serif text-2xl whitespace-nowrap">{a.weeks} wks</span>
                </span>
                <span className="font-mono text-[11.5px] leading-relaxed tracking-[0.06em] text-ink-soft uppercase">
                  {/* Each system stays whole, so no line ever starts with a separator. */}
                  {a.connects.map((c, k) => (
                    <Fragment key={c}>
                      <span className="whitespace-nowrap">
                        {c}
                        {k < a.connects.length - 1 && <span className="pl-1.5 text-line-strong">·</span>}
                      </span>{" "}
                    </Fragment>
                  ))}
                </span>
                <span
                  className="hidden size-10 items-center justify-center rounded-full border border-line-strong text-base transition-[background-color,color,border-color,transform] duration-500 ease-[var(--ease-out-expo)] group-hover:-rotate-45 group-hover:border-transparent group-hover:bg-[var(--tone)] group-hover:text-white md:inline-flex"
                  aria-hidden
                >
                  →
                </span>
              </a>
            </li>
          );
        })}
      </ol>

      {/* Preview: what the application actually hands a planner */}
      <div
        ref={card}
        className="pointer-events-none fixed top-0 left-0 z-50 hidden w-[300px] md:block"
        style={{
          opacity: active ? 1 : 0,
          scale: active ? "1" : "0.85",
          rotate: active ? "-3deg" : "-8deg",
          transition: "opacity 300ms, scale 500ms var(--ease-out-expo), rotate 700ms var(--ease-out-expo)",
        }}
        aria-hidden
      >
        {active && <PreviewCard index={hover!} />}
      </div>

      <style>{`
        .app-row::before {
          content: ""; position: absolute; inset: 0; z-index: -1; border-radius: 20px;
          background: color-mix(in srgb, var(--tone) 9%, transparent);
          transform: scaleX(0); transform-origin: left;
          transition: transform 600ms var(--ease-out-expo);
        }
        @media (hover: hover) { .app-row:hover::before { transform: none; } }
      `}</style>
    </section>
  );
}

function PreviewCard({ index }: { index: number }) {
  const a = APPLICATIONS[index];
  const tone = CATEGORY_TONE[a.category];
  // Seven days of a metric drifting toward its threshold: the moment the application acts.
  const bars = Array.from({ length: 7 }, (_, d) => 0.88 - d * 0.075 - Math.sin(index * 3.1 + d * 1.7) * 0.06);
  return (
    <div
      className="overflow-hidden rounded-[26px] p-5 text-white shadow-[0_30px_70px_-25px_rgba(20,19,15,0.55)]"
      style={{
        background: `var(--color-${tone})`,
      }}
    >
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.12em] uppercase">
        <span className="text-white/75">Recommended action</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5">
          <span className="size-1.5 rounded-full bg-white" />
          Ready
        </span>
      </div>
      <p className="mt-5 font-serif text-[24px] leading-[1.1]">{a.example}</p>
      <svg viewBox="0 0 260 70" className="mt-6 w-full" aria-hidden>
        <line x1="0" x2="260" y1="46" y2="46" stroke="white" strokeOpacity="0.55" strokeDasharray="3 4" />
        {bars.map((h, d) => (
          <rect
            key={d}
            x={d * 38}
            y={70 - h * 70}
            width="26"
            height={h * 70}
            rx="5"
            fill="white"
            fillOpacity={d === 6 ? 1 : 0.3}
          />
        ))}
      </svg>
      <p className="mt-3 font-mono text-[10px] tracking-[0.1em] text-white/75 uppercase">{a.connects.join(" · ")}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const BAND = ["Signal", "Evidence", "Context", "Policy", "Decision", "Approval"];

/** The pipeline, written large, sliding with the scroll. */
function KineticBand() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const rows = ref.current.querySelectorAll<HTMLElement>("[data-band]");
    const ctx = gsap.context(() => {
      rows.forEach((r, i) => {
        gsap.fromTo(
          r,
          { xPercent: i ? -28 : 0 },
          {
            xPercent: i ? 0 : -28,
            ease: "none",
            scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: 0.6 },
          },
        );
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  const words = [...BAND, ...BAND, ...BAND];
  return (
    <section ref={ref} className="overflow-hidden py-20 md:py-28" aria-label="Signal, evidence, context, policy, decision, approval">
      {[0, 1].map((r) => (
        <div key={r} data-band className="flex w-max items-center gap-[4vw] pr-[4vw]" aria-hidden>
          {words.map((w, i) => {
            const k = (i + r * 3) % 6;
            const tone = SYSTEM_TONES[k];
            return (
              <span key={i} className="flex items-center gap-[4vw]">
                <span
                  className="display text-[clamp(56px,9vw,150px)] whitespace-nowrap"
                  style={k % 2 ? { color: `var(--color-${tone})` } : undefined}
                >
                  {w}
                </span>
                <span className="size-[1.6vw] min-h-3 min-w-3 rotate-45" style={{ background: `var(--color-${tone})` }} />
              </span>
            );
          })}
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */

const OUTCOME_FILL = ["var(--color-cobalt)", "var(--color-tangerine)", "var(--color-emerald)"];

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const target = parseInt(value, 10);
  const suffix = value.replace(/^\d+/, "");
  const unit = `<span class="ml-1 align-top text-[0.5em] tracking-[-0.02em]">${suffix}</span>`;
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    const o = { v: 0 };
    el.innerHTML = `0${unit}`;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () =>
        gsap.to(o, {
          v: target,
          duration: 1.8,
          ease: "expo.out",
          onUpdate: () => (el.innerHTML = `${Math.round(o.v)}${unit}`),
        }),
    });
    return () => st.kill();
  }, [target, unit]);
  return <span ref={ref} dangerouslySetInnerHTML={{ __html: `${target}${unit}` }} />;
}

/** Before and after, as two bars: the size of the change at a glance. */
function BeforeAfter({ pct }: { pct: number }) {
  const rows: [string, number][] = [
    ["Before", 100],
    ["With Decignal", 100 - pct],
  ];
  return (
    <div className="mt-7 space-y-2.5" aria-hidden>
      {rows.map(([label, w], i) => (
        <div key={label} className="grid grid-cols-[96px_1fr] items-center gap-3 text-[12px] font-medium text-white/80">
          <span>{label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-white/20">
            <span
              className="outcome-bar block h-full origin-left rounded-full"
              style={{ width: `${w}%`, background: i ? "#fff" : "rgb(255 255 255 / 0.5)" }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function Outcomes() {
  const ref = useRef<HTMLElement>(null);
  // Bars grow from zero alongside the count-up, so the size of the change is felt, not just read.
  useEffect(() => {
    if (!ref.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("figure").forEach((fig) => {
        gsap.fromTo(
          fig.querySelectorAll(".outcome-bar"),
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.6,
            ease: "expo.out",
            stagger: 0.18,
            delay: 0.15,
            scrollTrigger: { trigger: fig, start: "top 80%", once: true },
          },
        );
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return (
    <section ref={ref} id="outcomes" className="scroll-mt-24 px-6 md:px-10">
      <Heading
        eyebrow="Outcomes"
        tone="emerald"
        lines={[
          "Measured in the operation,",
          <>
            not in <em className="spectrum-text">AI activity.</em>
          </>,
        ]}
      />
      <div className="mx-auto mt-16 grid max-w-6xl gap-4 md:grid-cols-3 md:gap-5">
        {OUTCOMES.map((o, i) => (
          <figure
            key={o.sector}
            data-reveal
            className="group relative flex flex-col overflow-hidden rounded-[30px] p-8 text-white shadow-[0_30px_60px_-30px_rgba(20,19,15,0.45)] transition-transform duration-700 ease-[var(--ease-out-expo)] hover:-translate-y-2 md:p-9"
            style={{ background: OUTCOME_FILL[i] }}
          >

            <p className="font-mono text-[11px] tracking-[0.14em] text-white/80 uppercase">{o.sector}</p>
            <p className="mt-10 font-serif text-[clamp(72px,7.5vw,112px)] leading-[0.85] tracking-[-0.05em]">
              <CountUp value={o.value} />
            </p>
            <p className="mt-4 text-[15px] font-medium text-white/90">{o.label}</p>
            <BeforeAfter pct={parseInt(o.value, 10)} />
            <blockquote className="mt-8 flex-1 text-[18px] leading-[1.45] font-medium tracking-[-0.01em]">
              “{o.quote}”
            </blockquote>
            <figcaption className="mt-8 border-t border-white/25 pt-4 font-mono text-[10.5px] tracking-[0.12em] text-white/80 uppercase">
              {o.context}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-[13px] text-ink-soft">
        Illustrative deployment patterns. They will be replaced with verified client outcomes before launch.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const STEP_TONES = ["cobalt", "violet", "tangerine", "emerald"];
const STEP_ICONS = [Search, ClipboardList, Rocket, Layers];

function HowItWorks() {
  const [path, setPath] = useState<keyof typeof PATHS>("custom");
  const keys = Object.keys(PATHS) as (keyof typeof PATHS)[];
  const p = PATHS[path];
  const track = useRef<HTMLDivElement>(null);

  // The route draws itself as the steps come into view.
  useEffect(() => {
    if (!track.current || reduced()) return;
    const t = gsap.fromTo(
      track.current,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { trigger: track.current, start: "top 85%", end: "top 35%", scrub: 0.6 },
      },
    );
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, []);

  return (
    <section id="how" className="scroll-mt-24 px-6 pt-24 md:px-10 md:pt-32">
      <Heading
        eyebrow="How it works"
        tone="violet"
        lines={[
          "Start with your business,",
          <>
            or start with the <em className="spectrum-text">catalogue.</em>
          </>,
        ]}
        intro="Two practical routes to the same outcome: an application working safely inside your operation."
      />
      <div data-reveal className="relative mx-auto mt-14 grid w-fit grid-cols-2 rounded-full border border-line bg-white/60 p-1">
        <span
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-ink transition-transform duration-500 ease-[var(--ease-out-expo)]"
          style={{ transform: path === "catalogue" ? "translateX(100%)" : "none" }}
          aria-hidden
        />
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => setPath(k)}
            aria-pressed={path === k}
            className={`relative min-h-11 rounded-full px-6 text-sm font-medium transition-colors duration-500 ${
              path === k ? "text-white" : "text-ink-2 hover:text-ink"
            }`}
          >
            {PATHS[k].label}
          </button>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-[56ch] text-center text-[16px] leading-relaxed text-ink-2">{p.intro}</p>

      <div className="relative mx-auto mt-16 max-w-6xl">
        <div className="absolute top-[22px] right-[12%] left-[12%] hidden h-px bg-line md:block" aria-hidden />
        <div
          ref={track}
          className="absolute top-[22px] right-[12%] left-[12%] hidden h-[2px] origin-left md:block"
          style={{ background: "var(--spectrum)" }}
          aria-hidden
        />
        <ol key={path} className="relative grid gap-4 md:grid-cols-4 md:gap-5">
          {p.steps.map((s, i) => (
            <li
              key={s.title}
              className="flex flex-col items-center text-center"
              style={{ animation: `fadeUp 700ms ${i * 80}ms var(--ease-out-quint) both` }}
            >
              <span
                className="tabular relative z-10 flex size-11 items-center justify-center rounded-full text-[13px] font-semibold text-white ring-8 ring-bg"
                style={{ background: `var(--color-${STEP_TONES[i]})` }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="mt-6 w-full flex-1 rounded-[24px] border border-line bg-white/70 p-6 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(20,19,15,0.3)]">
                <div className="flex justify-center">
                  <Chip Icon={STEP_ICONS[i]} tone={STEP_TONES[i]} size={48} />
                </div>
                <p className="eyebrow mt-4" style={{ color: `var(--color-${STEP_TONES[i]})` }}>
                  {s.when}
                </p>
                <p className="mt-3 font-serif text-[23px] leading-[1.1]">{s.title}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="mx-auto mt-10 w-fit rounded-full border border-line bg-white/60 px-5 py-2.5 font-mono text-[11.5px] tracking-[0.1em] text-ink uppercase">
        {p.total}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-24 px-6 pt-24 md:px-10 md:pt-32">
      <Heading
        eyebrow="Before you begin"
        tone="tangerine"
        lines={[
          "Questions enterprise",
          <>
            teams <em className="spectrum-text">ask first.</em>
          </>,
        ]}
      />
      <div data-reveal className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2 text-sm text-ink-2">
        {["No rip-and-replace programme", "No perfect data lake required", "Human control stays visible"].map((t, i) => (
          <span key={t} className="inline-flex items-center gap-2 rounded-full border border-line bg-white/60 px-4 py-2">
            <span className="size-1.5 rounded-full" style={{ background: `var(--color-${["cobalt", "saffron", "emerald"][i]})` }} />
            {t}
          </span>
        ))}
      </div>
      <ul className="mx-auto mt-14 max-w-4xl border-t border-line">
        {FAQ.map((f, i) => {
          const on = open === i;
          return (
            <li key={f.q} className="border-b border-line">
              <button
                onClick={() => setOpen(on ? null : i)}
                aria-expanded={on}
                className="group flex w-full items-center gap-6 py-7 text-left"
              >
                <span
                  className="eyebrow tabular w-8 shrink-0 transition-colors duration-300"
                  style={on ? { color: "var(--color-cobalt)" } : undefined}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-serif text-[clamp(18px,1.7vw,23px)] leading-[1.25] tracking-[-0.02em]">
                  {f.q}
                </span>
                <span
                  className={`relative flex size-10 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,transform] duration-500 ease-[var(--ease-out-expo)] ${
                    on ? "rotate-45 border-cobalt bg-cobalt text-white" : "border-line-strong group-hover:border-ink"
                  }`}
                  aria-hidden
                >
                  <span className="absolute h-px w-3.5 bg-current" />
                  <span className="absolute h-3.5 w-px bg-current" />
                </span>
              </button>
              <div
                className="grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out-expo)]"
                style={{ gridTemplateRows: on ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p
                    className="max-w-[62ch] pb-8 pl-14 text-[16px] leading-relaxed text-ink-2 transition-[opacity,transform] duration-500 ease-[var(--ease-out-quint)]"
                    style={{ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(-6px)", transitionDelay: on ? "120ms" : "0ms" }}
                  >
                    {f.a}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
