"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { APPLICATIONS, CATEGORY_TONE } from "@/lib/content";
import { APPLICATION_DEMOS } from "@/lib/application-demos";
import { scrollToTarget } from "../SmoothScroll";
import { TINTS } from "../three/palette";
import { OperationEvidence } from "./OperationEvidence";

gsap.registerPlugin(ScrollTrigger);
const CHAPTER_LENGTHS = [2.2, 1.4, 1.8, 1.9, 1.8, 1.4, 1.5, 1.5];
const CHAPTER_NAMES = ["Inventory", "Demand", "Production", "Maintenance", "Supply risk", "Sales", "Service", "Finance"];
const ApplicationScene = dynamic(() => import("../three/ApplicationScene"), { ssr: false });

/** One continuous stage, driven by the same Lenis/GSAP scroll as the lead story. */
export function ApplicationExplorer({ indices }: { indices: number[] }) {
  const root = useRef<HTMLDivElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const motion = useRef({ progress: 0 });
  const [frame, setFrame] = useState({ chapter: 0, step: 0 });
  const [active, setActive] = useState(false);
  const [still, setStill] = useState(true);
  const selected = indices[frame.chapter];
  const app = APPLICATIONS[selected];
  const demo = APPLICATION_DEMOS[selected];
  const color = TINTS[CATEGORY_TONE[app.category] as keyof typeof TINTS];
  const chapterNav = useRef<HTMLElement>(null);
  const jump = (chapter: number, local = 0.48) => {
    const el = root.current;
    if (!el) return;
    const total = indices.reduce((sum, index) => sum + CHAPTER_LENGTHS[index], 0);
    const before = indices.slice(0, chapter).reduce((sum, index) => sum + CHAPTER_LENGTHS[index], 0);
    scrollToTarget(el.getBoundingClientRect().top + window.scrollY + (el.offsetHeight - window.innerHeight) * (before + CHAPTER_LENGTHS[indices[chapter]] * local) / total);
  };

  useEffect(() => {
    const nav = chapterNav.current;
    const selectedTab = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    if (nav && selectedTab) nav.scrollTo({ left: selectedTab.offsetLeft - nav.clientWidth / 2 + selectedTab.offsetWidth / 2, behavior: still ? "instant" : "smooth" });
  }, [frame.chapter, still]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(media.matches);
    sync(); media.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    const apply = (progress: number) => {
      let distance = progress * indices.reduce((total,i) => total + CHAPTER_LENGTHS[i], 0);
      let chapter = 0;
      while (chapter < indices.length - 1 && distance > CHAPTER_LENGTHS[indices[chapter]]) { distance -= CHAPTER_LENGTHS[indices[chapter]]; chapter++; }
      const local = Math.min(0.9999, distance / CHAPTER_LENGTHS[indices[chapter]]);
      motion.current.progress = Math.max(0, Math.min(1, (local - 0.12) / 0.74));
      const step = local < 0.32 ? 0 : local < 0.62 ? 1 : 2;
      setFrame((previous) => previous.chapter === chapter && previous.step === step ? previous : { chapter, step });
      if (visual.current) {
        const edge = Math.min(1, chapter === 0 ? 1 : local / 0.08, chapter === indices.length - 1 ? 1 : (1 - local) / 0.07);
        visual.current.style.opacity = String(edge);
        visual.current.style.transform = media.matches ? "none" : `translate3d(0, ${(1 - edge) * 22}px,0)`;
      }
    };
    const trigger = ScrollTrigger.create({ trigger: root.current, start: "top top", end: "bottom bottom",
      onUpdate: (self) => apply(self.progress), onRefresh: (self) => apply(self.progress) });
    return () => { trigger.kill(); observer.disconnect(); media.removeEventListener("change", sync); };
  }, [indices]);

  return <div ref={root} className="application-journey" style={{ height: `${indices.reduce((total,i) => total + CHAPTER_LENGTHS[i] * 100, 100)}svh`, ["--tone" as string]: color }}>
    <div className="application-stage" data-step={frame.step}>
      <nav ref={chapterNav} className="application-chapter-bar" aria-label="Application chapters">{indices.map((index,i)=><button key={index} aria-label={`Show ${APPLICATIONS[index].name}`} aria-current={i===frame.chapter?"step":undefined} onClick={()=>jump(i)}><span>{String(i+1).padStart(2,"0")}</span>{CHAPTER_NAMES[index]}<i/></button>)}</nav>
      <div className="application-ghost" aria-hidden>{["STOCK", "DEMAND", "CAPACITY", "HEALTH", "RESILIENCE", "GROWTH", "SERVICE", "CONTROL"][selected]}</div>
      <div className="application-copy" key={selected}>
        <p className="eyebrow"><span className="diamond" style={{color:"var(--tone)"}} />{String(selected + 1).padStart(2, "0")} / {app.category}</p>
        <h3 className="display">{demo.headline.split("\n").map((line,i)=><span key={line} className="block">{i===1?<em style={{color:"var(--tone)"}}>{line}</em>:line}</span>)}</h3>
        <p className="application-summary">{app.name}</p>
        <nav className="application-phase-nav" aria-label={`${app.name} story stages`}>{["Signal", "Evidence", "Action"].map((label,i)=><button key={label} aria-current={i===frame.step?"step":undefined} onClick={()=>jump(frame.chapter,[0.18,0.48,0.84][i])}><span>0{i+1}</span>{label}</button>)}</nav>
        <div className="application-narrative" key={`${selected}-${frame.step}`}>
          <span className="spec-label">{["The signal", "Connected evidence", "Recommended action"][frame.step]}</span>
          <p>{[demo.signal, demo.evidence, demo.action][frame.step]}</p>
          <span className="application-measure">{frame.step === 2 ? demo.result : demo.sources}</span>
        </div>
        <div className="application-sources"><span className="spec-label">Connected sources</span><p>{app.connects.join(" · ")}</p></div>
        {/* The decision trail: the three beats of this workflow, filling as the scroll moves through them. */}
        <div className="application-trail-wrap">
          <ol className="application-trail" aria-label="Decision trail">
            {demo.beats.map((beat, i) => (
              <li key={beat} data-state={i < frame.step ? "done" : i === frame.step ? "now" : "next"}>
                <i aria-hidden />
                <span className="tabular">0{i + 1}</span>
                {beat}
                <em>{i < frame.step ? "Done" : i === frame.step ? "Now" : "Next"}</em>
              </li>
            ))}
          </ol>
          <div className="application-outcome" data-done={frame.step === 2 || undefined}>
            <span className="spec-label">Outcome</span>
            <strong className="tabular">{demo.metric}</strong>
          </div>
        </div>
      </div>
      <div ref={visual} className="application-world" role="img" aria-label={`${app.name}: ${[demo.signal, demo.evidence, demo.result][frame.step]}`}>
        <ApplicationScene kind={demo.kind} step={frame.step} tone={color} active={active} still={still} motion={motion} />

      </div>
      <div className="operation-readout" key={'readout-'+selected}>
        <OperationEvidence kind={demo.kind} step={frame.step} />
      </div>
      <div className="application-progress" aria-label={'Application '+(frame.chapter+1)+' of '+indices.length}>
        <span>{String(frame.chapter + 1).padStart(2, '0')} / {String(indices.length).padStart(2, '0')} · {app.category}</span>
        <span className="application-scroll-note">Scroll to follow the decision <span aria-hidden>↓</span></span>
        <span>{demo.asset}</span>
      </div>
      <span className="application-example">Illustrative workflows</span>
    </div>
  </div>;
}
