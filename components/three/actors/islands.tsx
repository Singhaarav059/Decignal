"use client";

// 01 / 02 / 04: the six system islands, their hover and click focus, and their pins.
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { CH, SYSTEMS as STORY_SYSTEMS, activePin, localIn, select, smoothstep, store, subscribe, weight } from "@/lib/story";
import { WMS, islandPose, signalCratePose } from "@/lib/scene";
import { SYSTEMS } from "@/components/ui/systems";
import { TINTS } from "../palette";
import { Island, SYSTEM_MODELS } from "../kit";
import { Bake } from "../Bake";
import { useEased, useStoryAccent } from "../accent";
import { ScreenTag } from "../ScreenTag";
import { Actor, Rise } from "./core";
import { portraitWide } from "@/lib/device";

/* ------------------------------------------------------------------ */
/* 01 / 02 / 04: the six systems                                        */
/* ------------------------------------------------------------------ */

/** Pin height over each pad (island units): just above the model, clear of its roof and sign. */
const TAG_Y = [1.32, 0.82, 1.25, 0.92, 0.77, 1.12];
/** Height of each model's hit volume: pointing anywhere over the pad or the model reads it. */
const HIT_H = [1.2, 0.75, 1.05, 0.65, 0.55, 1.1];

/* Pointing at a system: its island lifts with a little spring, rocks like something with weight,
   and its pin opens into a label. Clicking opens it: the camera leans in, the other islands step
   back, and the page shows what that system holds. */
const islandRoots: (THREE.Group | null)[] = [];
/** One plain box per island for the pointer: a ray against six boxes instead of every part of every model. */
const islandHits: (THREE.Mesh | null)[] = [];
const islandLift = [0, 0, 0, 0, 0, 0];
const islandVel = [0, 0, 0, 0, 0, 0];
const islandSwing = [0, 0, 0, 0, 0, 0];
const islandSwingV = [0, 0, 0, 0, 0, 0];
const islandBack = [0, 0, 0, 0, 0, 0];
/** How much colour each island shows right now (0 neutral .. 1 its system colour); Context's
 *  threads follow it, so a thread is coloured only while its system is the one in focus. */
export const islandAccent = [1, 1, 1, 1, 1, 1];
/** How far each island has risen onto the stage after the loader (0..1). */
const islandRisen = [0, 0, 0, 0, 0, 0];
let islandHover = -1;
/** The pointer is over an island's pin or label. */
let tagHover = -1;
/** Touch: the island whose label the first tap opened; a second tap opens its panel. */
let touchPin = -1;
let touch = false;
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const islandsLive = () => Math.max(weight(CH.fragments, store.g), weight(CH.context, store.g)) > 0.9;

/** World position of a system island, for the camera to lean toward. */
const islandWorld = (i: number, out: THREE.Vector3) => {
  const g = islandRoots[i];
  return g ? g.getWorldPosition(out) : null;
};

// Context steps through the evidence in the order the card lists it: stock, supplier timing, route.
const CONTEXT_PINS = [3, 4, 5];
const CONTEXT_VALUE: Record<number, string> = { 3: "620 − 380 = 240 units", 4: "21 days · too late", 5: "2 days · lane clear" };

/** Once the timeline writes store.pin (lib/story pinAt), it is the only source of the chapter's pin. */
let pinSeen = false;
/** The island the open pin names (the page's pinHint, else the timeline's pin: a system id or name,
 *  or "island:N"), -1 for none, or -2 while the timeline has never written a pin. */
function storePin() {
  if (store.pin !== null) pinSeen = true;
  const id = activePin();
  if (!pinSeen) return -2;
  if (id === null) return -1;
  const key = id.toLowerCase();
  const n = /^island[-:]?(\d)$/.exec(key);
  if (n) return +n[1];
  return SYSTEMS.findIndex((sys, s) => sys.id === key || sys.name.toLowerCase() === key || STORY_SYSTEMS[s].toLowerCase() === key);
}

/** The chapter's own pin: the timeline's when it has one, else the Context beats. */
function chapterPin() {
  const p = storePin();
  if (p !== -2) return p;
  if (weight(CH.context, store.g) > 0.5) {
    // The hold (local 0.05 to 0.55) in three equal beats.
    const beat = Math.floor((localIn(CH.context, store.g) - 0.05) / (0.5 / 3));
    return CONTEXT_PINS[THREE.MathUtils.clamp(beat, 0, 2)];
  }
  return -1;
}

/** The one island whose label is open: the one pointed at, else the chapter's pin, else none. */
function islandPin() {
  if (islandHover >= 0) return islandHover === store.selected ? -1 : islandHover;
  if (touchPin >= 0) return touchPin;
  // An open panel already shows its system: no other label competes with it.
  if (store.selected >= 0) return -1;
  return chapterPin();
}

/** How much of its colour island s shows (S4): all six in the hero and the ending; in Context only
 *  the evidence in focus (the chapter's pin, or the island pointed at or opened) keeps it. */
function accentGoal(s: number) {
  const ctx = weight(CH.context, store.g);
  if (ctx <= 0) return 1;
  const focus = s === store.selected || s === islandHover || (store.selected < 0 && islandHover < 0 && s === chapterPin()) ? 1 : 0;
  return 1 - ctx * (1 - focus);
}

function IslandFocus() {
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const lastX = useRef(0);
  const wasLive = useRef(false);
  const get = useThree((s) => s.get);

  /** The nearest island under a point in page coordinates (-1 for none). */
  const pick = useMemo(
    () => (x: number, y: number, camera: THREE.Camera) => {
      ndc.set(x, y);
      ray.setFromCamera(ndc, camera);
      let best = Infinity;
      let at = -1;
      islandHits.forEach((m, i) => {
        if (!m) return;
        const hit = ray.intersectObject(m, false)[0];
        if (hit && hit.distance < best) {
          best = hit.distance;
          at = i;
        }
      });
      return at;
    },
    [ray, ndc],
  );

  useEffect(() => {
    const interactive = (t: EventTarget | null) => t instanceof Element && !!t.closest("a, button, input, select, textarea, label, [role=dialog]");
    const onDown = (e: PointerEvent) => (touch = e.pointerType === "touch");
    const onClick = (e: MouseEvent) => {
      if (!islandsLive() || interactive(e.target)) return;
      // A finger has no hover (a thumb set down to scroll must not open labels): a tap picks where it lands.
      const hit = touch ? (tagHover >= 0 ? tagHover : pick((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1), get().camera)) : islandHover;
      // On a touch screen the first tap on an island reads its label; the second opens it.
      if (touch && hit >= 0 && hit !== store.selected && hit !== touchPin) {
        touchPin = hit;
        return;
      }
      touchPin = -1;
      // A click on an island opens it (or closes it again); a click on empty ground closes.
      select(hit >= 0 && hit !== store.selected ? hit : -1);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(-1);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onDown, { passive: true });
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onDown);
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [get, pick]);

  const proj = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }, dt) => {
    const live = islandsLive();
    if (store.selected >= 0 && islandWorld(store.selected, proj)) {
      // The island's deck, a little above its base, in page pixels.
      proj.y += 0.55;
      proj.project(camera);
      store.anchor.x = (proj.x * 0.5 + 0.5) * size.width;
      store.anchor.y = (-proj.y * 0.5 + 0.5) * size.height;
    }
    // Scrolling on to the next chapter closes whatever was open.
    if (!live) {
      if (store.selected >= 0) select(-1);
      touchPin = -1;
    }
    const prev = islandHover;
    islandHover = -1;
    // Hover is a mouse's: a finger on the glass while it scrolls opened the island under it, which shut
    // the chapter's own label, then let go as the scroll began, leaving labels caught half open.
    if (live && store.pointerIn && !touch) islandHover = pick(store.pointer.x, store.pointer.y, camera);
    // Pointing at an island's own label, or its chip on the page, lifts it too.
    if (islandHover < 0 && live && tagHover >= 0) islandHover = tagHover;
    // The ending's system chips (StoryCard) point at islands too: the island lifts with its thread.
    if (islandHover < 0 && (live || weight(CH.final, store.g) > 0.5) && store.islandHint >= 0) islandHover = store.islandHint;
    if (islandHover !== prev) {
      // Cards own the cursor in their chapters; islands own it here.
      if (live || wasLive.current) document.body.style.cursor = islandHover >= 0 && islandHover !== store.islandHint ? "pointer" : "";
      // Entering an island knocks it, in the direction the pointer came from.
      if (islandHover >= 0 && !reduceMotion()) islandSwingV[islandHover] += Math.sign(store.pointer.x - lastX.current || 1) * 2.2;
    }
    lastX.current = store.pointer.x;
    wasLive.current = live;

    const d = Math.min(dt, 1 / 30);
    const sel = store.selected;
    for (let i = 0; i < islandLift.length; i++) {
      // Lift: an underdamped spring, so it rises a touch past its mark and settles.
      const goal = i === sel ? 1.25 : i === islandHover ? 1 : 0;
      islandVel[i] += ((goal - islandLift[i]) * 170 - islandVel[i] * 15) * d;
      islandLift[i] += islandVel[i] * d;
      // Swing: a pendulum that rocks a few times and comes to rest.
      islandSwingV[i] += (-islandSwing[i] * 90 - islandSwingV[i] * 4.5) * d;
      islandSwing[i] += islandSwingV[i] * d;
      islandBack[i] = THREE.MathUtils.damp(islandBack[i], sel >= 0 && i !== sel ? 1 : 0, 7, d);
    }
  });
  return null;
}

/** The model lifts, rocks and steps back; its pad stays on the ground. */
function Hover({ i, children }: { i: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const k = islandLift[i];
    const back = islandBack[i];
    const g = ref.current;
    if (!g) return;
    g.position.y = k * 0.09 - back * 0.05;
    g.scale.setScalar(1 + k * 0.035 - back * 0.05);
    g.rotation.z = islandSwing[i] * 0.22;
    g.rotation.x = islandSwing[i] * 0.08;
  });
  return <group ref={ref}>{children}</group>;
}

/** Pins step out first when the islands leave, so the converging models stay legible. */
const pinShown = (s: number) =>
  smoothstep(0.8, 1, Math.max(weight(CH.fragments, store.g), weight(CH.context, store.g))) * smoothstep(0.6, 1, islandRisen[s]);

/**
 * An island's pin: in Context it carries the evidence row it stands for, elsewhere what the system knows.
 * It follows the story on its own, so the swap re-renders one label rather than the island's models.
 */
function IslandTag({ s, tone }: { s: number; tone: string }) {
  const sys = SYSTEMS[s];
  const [ring, setRing] = useState(false);
  useEffect(() => {
    let last = false;
    return subscribe((g) => {
      const on = weight(CH.context, g) > 0.5;
      if (on === last) return;
      last = on;
      setRing(on);
    });
  }, []);
  return (
    <ScreenTag
      title={sys.name}
      value={ring && CONTEXT_VALUE[s] ? CONTEXT_VALUE[s] : `${sys.knows} · ${sys.value}`}
      tone={tone}
      show={() => pinShown(s)}
      open={() => islandPin() === s}
      onHover={(on) => {
        if (on) tagHover = s;
        else if (tagHover === s) tagHover = -1;
      }}
    />
  );
}

/** One system: its pad, its model (lifted on hover) and its pin. The model's colour follows the chapter. */
function SystemIsland({ s }: { s: number }) {
  const sys = SYSTEMS[s];
  const Model = SYSTEM_MODELS[s];
  const tone = TINTS[sys.tone as keyof typeof TINTS];
  const root = useRef<THREE.Group>(null);
  const k = useEased(() => accentGoal(s), 5);
  useStoryAccent(root, tone, () => (islandAccent[s] = k.current));
  return (
    <group
      ref={(g) => {
        root.current = g;
        islandRoots[s] = g;
      }}
    >
      <Island>
        <Hover i={s}>
          <Bake>
            <Model />
          </Bake>
        </Hover>
        {/* The pin stands still while its model lifts and rocks: riding the knock, the dot swung out
            from under the pointer, the island dropped, the dot swung back and knocked it again. */}
        <group position-y={TAG_Y[s]}>
          <IslandTag s={s} tone={tone} />
        </group>
      </Island>
      <mesh
        ref={(m) => {
          islandHits[s] = m;
        }}
        position-y={HIT_H[s] / 2}
        visible={false}
      >
        <boxGeometry args={[1.8, HIT_H[s], 1.5]} />
      </mesh>
    </group>
  );
}

/* Problem to Context: the warehouse rises first, so the week's stock has somewhere to fold into, and
   the ring builds on round from it while the chart is still leaving: never an empty frame between
   them. It goes the far way round, so the island beside the card comes last, once the camera is there. */
const RING_ENTER = SYSTEMS.map((_, s) => {
  const order = (WMS - s + 6) % 6;
  const a = 0.03 + order * 0.075;
  return [a, a + 0.46] as const;
});
const ENTERS = RING_ENTER.map((w) => (c: number) => (c === CH.context ? w : null));

export function Islands() {
  const portrait = useThree((state) => portraitWide(state.size.width, state.size.height));
  return (
    <>
      <IslandFocus />
      {SYSTEMS.map((sys, s) => (
        <Actor key={sys.id} track={(c) => islandPose(s, c, portrait)} delay={s * 0.06} enter={ENTERS[s]} exit={(c) => (c === CH.fragments ? signalCratePose(CH.signal, 0, portrait)?.p ?? null : null)}>
          {/* Pads stand on the ground: they rise in once after the loader and never float. */}
          <Rise delay={0.25 + s * 0.09} float={() => 0} onRise={(k) => (islandRisen[s] = k)}>
            <SystemIsland s={s} />
          </Rise>
        </Actor>
      ))}
    </>
  );
}
