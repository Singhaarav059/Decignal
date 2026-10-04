"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { easing } from "maath";
import { CH, INDUSTRIES, blendAt, clamp01, localIn, select, smoothstep, store, weight } from "@/lib/story";
import {
  CARD,
  CARDS,
  CHART_CRATES,
  DAYS,
  DAY_X,
  SAFETY_UNITS,
  STEP_Y,
  dayUnits,
  DECISION_CARD,
  ISLANDS,
  WMS,
  BEATS,
  M,
  PLANT_01,
  PLANT_02,
  PLANT_FRONT,
  ROAD_Z,
  TRUCK_X0,
  cardPose,
  chartPos,
  chartSlot,
  industryF,
  islandPose,
  signalCratePose,
  truckX,
  type Pose,
} from "@/lib/scene";
import { SYSTEMS } from "@/components/ui/systems";
import { COLORS, TINTS } from "./palette";
import { Crate, Island, SYSTEM_MODELS, WHITE, clay } from "./kit";
import { BearingBed, Plant } from "./buildings";
import { FORK, Forklift, SemiTruck, TRUCK } from "./vehicles";
import { LoadedPallet } from "./parts";
import { asphalt, concrete, enamel, fineRibs, plastic } from "./materials";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FACE_H, FACE_W, FUNCTION_TONE, LAYER_TONE, drawFace, faceKey, readFonts, type FaceSpec } from "./faces";

/* ------------------------------------------------------------------ */
/* Actor: blends between its chapter poses; scales in and out of scenes */
/* ------------------------------------------------------------------ */

const backOut = (x: number) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
const euler = new THREE.Euler(0, 0, 0, "YXZ");
const tmpV = new THREE.Vector3();

type Track = (c: number, t: number) => Pose | null;

function useActor(ref: React.RefObject<THREE.Group | null>, track: Track, delay = 0, damp = 0.1) {
  const goal = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 0 }), []);
  const ready = useRef(false);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const { i, j, local, e } = blendAt(store.g);
    const A = track(i, local);
    const B = e > 0 && j !== i ? track(j, 0) : null;
    let rx = 0;
    let ry = 0;
    if (A && B) {
      goal.p.set(...A.p).lerp(tmpV.set(...B.p), e);
      rx = THREE.MathUtils.lerp(A.rx ?? 0, B.rx ?? 0, e);
      ry = THREE.MathUtils.lerp(A.ry ?? 0, B.ry ?? 0, e);
      goal.s = THREE.MathUtils.lerp(A.s ?? 1, B.s ?? 1, e);
    } else if (A) {
      // Leaving: shrink away a little ahead of the next scene.
      const k = clamp01(e / (1 - delay * 0.5));
      goal.p.set(...A.p);
      rx = A.rx ?? 0;
      ry = A.ry ?? 0;
      goal.s = (A.s ?? 1) * (1 - smoothstep(0, 0.7, k));
    } else if (B) {
      // Arriving: rise into place with a small overshoot, staggered.
      const k = clamp01((e - 0.25 - delay) / (0.75 - delay));
      goal.p.set(...B.p);
      goal.p.y -= (1 - k) * 0.35;
      rx = B.rx ?? 0;
      ry = B.ry ?? 0;
      goal.s = (B.s ?? 1) * (k > 0 ? backOut(k) : 0);
    } else {
      goal.s = 0;
    }
    goal.q.setFromEuler(euler.set(rx, ry, 0, "YXZ"));
    const delta = Math.min(dt, 1 / 30);
    if (!ready.current) {
      g.position.copy(goal.p);
      g.quaternion.copy(goal.q);
      g.scale.setScalar(goal.s);
      ready.current = true;
    }
    easing.damp3(g.position, goal.p, damp, delta);
    easing.dampQ(g.quaternion, goal.q, damp, delta);
    const s = THREE.MathUtils.damp(g.scale.x, goal.s, 1 / damp, delta);
    g.scale.setScalar(s);
    g.visible = s > 0.002;
  });
}

function Actor({ track, delay, damp, children }: { track: Track; delay?: number; damp?: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useActor(ref, track, delay, damp);
  return (
    <group ref={ref} visible={false}>
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Tags: small product labels that float beside objects                 */
/* ------------------------------------------------------------------ */

function useCanvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, deps: unknown[]) {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return { canvas, texture };
  }, [w, h]);
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      readFonts();
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, w, h);
      draw(c);
      texture.needsUpdate = true;
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return texture;
}

// Drawn at 3x so labels stay razor sharp on retina screens, even close to the camera.
const TAG_RES = 3;

function Tag({ title, value, tone, width = 1.3, alert = false, grow }: { title: string; value: string; tone: string; width?: number; alert?: boolean; grow?: () => number }) {
  const W = 780;
  const H = 260;
  // When its number changes, the label gives one small pop so the eye catches the update.
  const pop = useRef(0);
  const first = useRef(true);
  const holder = useRef<THREE.Group>(null);
  useEffect(() => {
    if (first.current) first.current = false;
    else pop.current = 1;
  }, [value]);
  useFrame((_, dt) => {
    pop.current = Math.max(0, pop.current - dt * 2.2);
    const k = pop.current;
    // A quick rise and an eased settle: sin over the first half, then a long tail.
    const bump = Math.sin(Math.min(1, (1 - k) * 2) * Math.PI) * k * 0.16;
    holder.current?.scale.setScalar(1 + bump + (grow ? grow() : 0));
  });
  const texture = useCanvasTexture(
    W * TAG_RES,
    H * TAG_RES,
    (c) => {
      c.setTransform(TAG_RES, 0, 0, TAG_RES, 0, 0);
      const sans = getComputedStyle(document.body).fontFamily;
      // A soft lift under the label, and a hairline edge on white ones, like a real UI chip.
      c.save();
      c.shadowColor = alert ? "rgba(242,54,31,0.35)" : "rgba(20,19,15,0.14)";
      c.shadowBlur = 18;
      c.shadowOffsetY = 6;
      c.beginPath();
      c.roundRect(16, 12, W - 32, H - 34, 52);
      c.fillStyle = alert ? tone : "#FFFFFF";
      c.fill();
      c.restore();
      if (!alert) {
        c.strokeStyle = "rgba(20,19,15,0.08)";
        c.lineWidth = 2;
        c.stroke();
      }
      c.fillStyle = alert ? "#FFFFFF" : tone;
      c.beginPath();
      c.arc(72, 96, 18, 0, Math.PI * 2);
      c.fill();
      c.font = `650 54px ${sans}`;
      c.fillStyle = alert ? "#FFFFFF" : COLORS.ink;
      c.fillText(title, 112, 115);
      c.font = `500 46px ${sans}`;
      c.fillStyle = alert ? "rgba(255,255,255,0.88)" : COLORS.inkSoft;
      c.fillText(value, 56, 192);
    },
    [title, value, tone, alert],
  );
  return (
    <Billboard>
      {/* Labels annotate the scene, so they always draw over the models instead of cutting into them. */}
      <group ref={holder}>
        <mesh renderOrder={10}>
          <planeGeometry args={[width, (width * H) / W]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} depthTest={false} />
        </mesh>
      </group>
    </Billboard>
  );
}

/* ------------------------------------------------------------------ */
/* 01 / 02 / 04: the six systems                                        */
/* ------------------------------------------------------------------ */

const TAG_Y = [1.35, 1.05, 1.3, 1.2, 1.05, 1.22];

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

/** Each system rises onto the stage after the loader lifts, then keeps a slow, out-of-step float. */
function Rise({ delay, float = () => 1, children }: { delay: number; float?: () => number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    if (start.current === null) {
      if (!document.documentElement.classList.contains("ready")) {
        g.scale.setScalar(0.0001);
        return;
      }
      start.current = t;
    }
    const k = clamp01((t - start.current - delay) / 1.1);
    g.scale.setScalar(Math.max(backOut(k), 0.0001));
    g.position.y = -(1 - easeOut(k)) * 0.5 + Math.sin(t * 0.8 + delay * 9) * 0.03 * float();
  });
  return <group ref={ref}>{children}</group>;
}

/* Pointing at a system: its island lifts with a little spring, rocks like something with weight,
   and its label comes up to reading size. Clicking opens it: the camera leans in, the other
   islands step back, and the page shows what that system holds. */
const islandRoots: (THREE.Group | null)[] = [];
const islandLift = [0, 0, 0, 0, 0, 0];
const islandVel = [0, 0, 0, 0, 0, 0];
const islandSwing = [0, 0, 0, 0, 0, 0];
const islandSwingV = [0, 0, 0, 0, 0, 0];
const islandBack = [0, 0, 0, 0, 0, 0];
let islandHover = -1;
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const islandsLive = () => Math.max(weight(CH.fragments, store.g), weight(CH.context, store.g)) > 0.9;

/** World position of a system island, for the camera to lean toward. */
export const islandWorld = (i: number, out: THREE.Vector3) => {
  const g = islandRoots[i];
  return g ? g.getWorldPosition(out) : null;
};

function IslandFocus() {
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const lastX = useRef(0);
  const wasLive = useRef(false);

  useEffect(() => {
    const interactive = (t: EventTarget | null) => t instanceof Element && !!t.closest("a, button, input, select, textarea, label, [role=dialog]");
    const onClick = (e: MouseEvent) => {
      if (!islandsLive() || interactive(e.target)) return;
      // A click on an island opens it (or closes it again); a click on empty ground closes.
      select(islandHover >= 0 && islandHover !== store.selected ? islandHover : -1);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && select(-1);
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

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
    if (!live && store.selected >= 0) select(-1);
    const prev = islandHover;
    islandHover = -1;
    if (live && store.pointerIn) {
      ndc.set(store.pointer.x, store.pointer.y);
      ray.setFromCamera(ndc, camera);
      let best = Infinity;
      islandRoots.forEach((g, i) => {
        if (!g) return;
        const hit = ray.intersectObject(g, true)[0];
        if (hit && hit.distance < best) {
          best = hit.distance;
          islandHover = i;
        }
      });
    }
    // Pointing at a system's chip on the page lifts its island too.
    if (islandHover < 0 && live && store.islandHint >= 0) islandHover = store.islandHint;
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
  return (
    <group
      ref={(g) => {
        ref.current = g;
        islandRoots[i] = g;
      }}
    >
      {children}
    </group>
  );
}

export function Islands() {
  return (
    <>
      <IslandFocus />
      {SYSTEMS.map((sys, s) => {
        const Model = SYSTEM_MODELS[s];
        const tone = TINTS[sys.tone as keyof typeof TINTS];
        return (
          <Actor key={sys.id} track={(c) => islandPose(s, c)} delay={s * 0.06}>
            <Rise delay={0.25 + s * 0.09}>
              <Hover i={s}>
                <Island tone={tone}>
                  <Model />
                </Island>
                <group position-y={TAG_Y[s]} rotation-y={-ISLANDS[s][2]}>
                  <Tag title={sys.name} value={`${sys.knows} · ${sys.value}`} tone={tone} width={1.45} grow={() => Math.min(Math.max(0, islandLift[s]), 1) * 0.28 - islandBack[s] * 0.2 } />
                </group>
              </Hover>
            </Rise>
          </Actor>
        );
      })}
    </>
  );
}

/** The one tote that matters: Bearing X90 at Plant 01. */
export function SignalCrate() {
  // Same moulded, ribbed plastic as every other tote; only its colour changes.
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.5, normalMap: fineRibs(), normalScale: new THREE.Vector2(0.6, 0.6) }),
    [],
  );
  const saffron = useMemo(() => new THREE.Color(TINTS.saffron), []);
  const red = useMemo(() => new THREE.Color(COLORS.signal), []);
  const tag = useRef<THREE.Group>(null);
  const hover = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // While it is the subject, it hovers: lifted out of the data, breathing slowly.
    if (hover.current) hover.current.position.y = Math.sin(clock.elapsedTime * 1.3) * 0.035 * weight(CH.signal, store.g);
    // It turns red as the signal is found, then keeps a slow pulse: live, not alarming.
    const r = smoothstep(0.45, 0.95, store.g);
    mat.color.copy(saffron).lerp(red, r);
    mat.emissive.copy(red).multiplyScalar(r * (0.18 + Math.sin(clock.elapsedTime * 2.4) * 0.08));
    if (tag.current) {
      // The label grows in with the chapter instead of popping on.
      const show = smoothstep(0.55, 0.9, Math.max(weight(CH.signal, store.g), weight(CH.context, store.g)));
      tag.current.scale.setScalar(0.42 * show);
      tag.current.visible = show > 0.01;
    }
  });
  return (
    <Actor track={signalCratePose} damp={0.12}>
      {/* Rides in with the warehouse it sits on, and floats with it while it is there. */}
      <Rise delay={0.25 + WMS * 0.09} float={() => weight(CH.fragments, store.g)}>
        <group ref={hover}>
          {/* An open tote of X90 bearings: the part that is about to run short */}
          <Crate material={mat} open>
            <BearingBed />
          </Crate>
          <group ref={tag} position={[0, 0.42, 0]} scale={0.42}>
            <Tag title="Bearing X90 · Plant 01" value="Below safety stock in 6 days" tone={COLORS.signal} width={1.5} alert />
          </group>
        </group>
      </Rise>
    </Actor>
  );
}

/* ------------------------------------------------------------------ */
/* 03 Problem: stock as crates, day by day                             */
/* ------------------------------------------------------------------ */

/* Pointing at a day lifts its column a little and labels it with that day's stock. */
const crateRoots: (THREE.Group | null)[] = [];
const dayLift = DAYS.map(() => 0);
let dayHover = -1;

function ChartFocus({ onDay }: { onDay: (d: number) => void }) {
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const live = useRef(false);
  useFrame(({ camera }, dt) => {
    const on = weight(CH.problem, store.g) > 0.9;
    let hit = -1;
    if (on && store.pointerIn) {
      ndc.set(store.pointer.x, store.pointer.y);
      ray.setFromCamera(ndc, camera);
      const first = ray.intersectObjects(crateRoots.filter((g): g is THREE.Group => !!g), true)[0];
      if (first) {
        let o: THREE.Object3D | null = first.object;
        while (o && !crateRoots.includes(o as THREE.Group)) o = o.parent;
        const k = crateRoots.indexOf(o as THREE.Group);
        if (k >= 0) hit = chartSlot(k).d;
      }
    }
    if (hit !== dayHover) {
      dayHover = hit;
      onDay(hit);
      if (on || live.current) document.body.style.cursor = hit >= 0 ? "pointer" : "";
    }
    live.current = on;
    const d = Math.min(dt, 1 / 30);
    for (let i = 0; i < dayLift.length; i++) dayLift[i] = THREE.MathUtils.damp(dayLift[i], i === dayHover ? 1 : 0, 10, d);
  });
  return null;
}

function ChartCrate({ k }: { k: number }) {
  const ref = useRef<THREE.Group>(null);
  const { d, l } = chartSlot(k);
  useFrame(() => {
    // The column rises as one, each crate a fraction later than the one below.
    if (ref.current) ref.current.position.y = dayLift[d] * (0.06 + l * 0.012);
  });
  return (
    <group
      ref={(g) => {
        ref.current = g;
        crateRoots[k] = g;
      }}
    >
      <Crate color={TINTS.saffron} />
    </group>
  );
}

export function ChartCrates() {
  const [day, setDay] = useState(-1);
  // The last day pointed at stays on the label while it shrinks away.
  const [d, setShown] = useState(-1);
  const onDay = (n: number) => {
    setDay(n);
    if (n >= 0) setShown(n);
  };
  const tag = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = tag.current;
    if (!g) return;
    const s = THREE.MathUtils.damp(g.scale.x, day >= 0 ? 1 : 0, 12, Math.min(dt, 1 / 30));
    g.scale.setScalar(s);
    g.visible = s > 0.01;
  });
  const units = d >= 0 ? dayUnits(d) : 0;
  return (
    <>
      <ChartFocus onDay={onDay} />
      {Array.from({ length: CHART_CRATES }, (_, k) => {
        const { d, l } = chartSlot(k);
        return (
          <Actor key={k} track={(c) => (c === CH.problem ? { p: chartPos(k) } : null)} delay={d * 0.05 + l * 0.015}>
            <ChartCrate k={k} />
          </Actor>
        );
      })}
      <group ref={tag} visible={false} position={[DAY_X(Math.max(d, 0)), (DAYS[Math.max(d, 0)] + 0.9) * STEP_Y + 0.18, 0.3]} scale={0}>
        {d >= 0 && (
          <Tag
            title={d === 0 ? "Today" : `Day ${d}`}
            value={`${units} units · ${units < SAFETY_UNITS ? "below safety stock" : `${units - SAFETY_UNITS} above safety`}`}
            tone={units < SAFETY_UNITS ? COLORS.signal : TINTS.saffron}
            width={1.6}
          />
        )}
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 05 Decision: a forklift loads 240 units, the truck takes them across */
/* ------------------------------------------------------------------ */

const inDecision = (p: Pose): Track => (c) => (c === CH.decision ? p : null);
const PALLETS = 3;
const SLOT_X = TRUCK.slots.map((x) => TRUCK_X0 + x * M);
const STAGE_Z = -0.42; // staged pallets wait here in the Plant 02 yard
const PICK_Z = STAGE_Z - FORK.load * M; // forklift origin when its forks are under a staged pallet
const BACK_Z = -0.76; // forklift origin clear of the pallets
const PLACE_Z = 0.05; // forklift origin when the pallet is over the deck
const DECK_Z = (PLACE_Z + FORK.load * M - ROAD_Z) / M; // pallet z on the deck, in truck metres
const PARK: [number, number] = [-3.5, -0.74];
const FACE_Z = -Math.PI / 2; // the forklift model faces +x; this turns it toward the road

type Lift = { x: number; z: number; yaw: number; h: number; trip: number; carry: boolean };

const bez = (a: number, b: number, c: number, d: number, u: number) => {
  const v = 1 - u;
  return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d;
};

/** Where the forklift is, how high its forks are, and which pallet it holds, at decision progress t. */
function liftAt(t: number, out: Lift): Lift {
  const [l0, l1] = BEATS.load;
  const all = clamp01((t - l0) / (l1 - l0)) * PALLETS;
  const k = Math.min(Math.floor(all), PALLETS - 1);
  const u = t >= l1 ? 1 : all - k;
  const x = SLOT_X[k];
  out.trip = t < l0 ? -1 : k;
  out.yaw = FACE_Z;
  out.carry = false;
  if (t < l0) return Object.assign(out, { x: SLOT_X[0], z: BACK_Z, h: 0.06 });
  if (u < 0.12) {
    // Forks slide under the staged pallet
    return Object.assign(out, { x, z: THREE.MathUtils.lerp(BACK_Z, PICK_Z, smoothstep(0, 0.12, u)), h: 0.06 });
  }
  if (u < 0.55) {
    // Lift clear, then drive to the trailer while raising the load over the deck
    out.carry = true;
    const h = u < 0.2 ? THREE.MathUtils.lerp(0.06, 0.2, smoothstep(0.12, 0.2, u)) : THREE.MathUtils.lerp(0.2, 1.72, smoothstep(0.24, 0.5, u));
    return Object.assign(out, { x, z: THREE.MathUtils.lerp(PICK_Z, PLACE_Z, smoothstep(0.2, 0.55, u)), h });
  }
  if (u < 0.64) {
    // Set it down on the deck; the forks drop out of the pallet
    out.carry = u < 0.6;
    return Object.assign(out, { x, z: PLACE_Z, h: THREE.MathUtils.lerp(1.72, 1.44, smoothstep(0.55, 0.63, u)) });
  }
  // Reverse out on a curve to the next pallet's lane (or to park), lowering the forks
  const r = smoothstep(0.64, 1, u);
  const [nx, nz] = k < PALLETS - 1 ? [SLOT_X[k + 1], BACK_Z] : PARK;
  const px = bez(x, x, nx, nx, r);
  const pz = bez(PLACE_Z, PLACE_Z - 0.35, nz + 0.3, nz, r);
  // Heading follows the path: reversing, so the forks point away from the direction of travel.
  const e = 0.01;
  const r2 = Math.min(r + e, 1);
  const r1 = r2 - e;
  const dx = bez(x, x, nx, nx, r2) - bez(x, x, nx, nx, r1);
  const dz = bez(PLACE_Z, PLACE_Z - 0.35, nz + 0.3, nz, r2) - bez(PLACE_Z, PLACE_Z - 0.35, nz + 0.3, nz, r1);
  out.yaw = Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dz, -dx) : FACE_Z;
  return Object.assign(out, { x: px, z: pz, h: THREE.MathUtils.lerp(1.44, 0.06, smoothstep(0.64, 0.9, u)) });
}

/** Where each pallet is: 0 staged in the yard, 1 on the forks, 2 on the trailer. */
function palletStates(t: number, lift: Lift) {
  return Array.from({ length: PALLETS }, (_, i) => {
    if (t >= BEATS.load[1] || i < lift.trip) return 2;
    if (i > lift.trip) return 0;
    if (lift.carry) return 1;
    return lift.h > 1 || lift.z > PICK_Z + 0.05 ? 2 : 0;
  });
}

/** Arrive with a small overshoot as the chapter comes in, staggered; null once it has gone. */
const arrive = (e: number, delay: number) => {
  const k = clamp01((e - 0.25 - delay) / (0.75 - delay));
  return k > 0 ? backOut(k) : 0;
};

function Yard() {
  const lines = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    // Road edge lines and a dashed centre line
    for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(16, 0.002, 0.018).translate(0, 0.0165, ROAD_Z + s * 0.33));
    for (let i = 0; i < 30; i++) parts.push(new THREE.BoxGeometry(0.22, 0.002, 0.016).translate(-7.6 + i * 0.52, 0.0165, ROAD_Z));
    return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  }, []);
  const bays = useMemo(() => {
    // Painted bays where the pallets are staged
    const parts: THREE.BufferGeometry[] = [];
    for (const x of SLOT_X) {
      for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(0.008, 0.002, 0.15).translate(x + s * 0.092, 0.0135, STAGE_Z));
      for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(0.19, 0.002, 0.008).translate(x, 0.0135, STAGE_Z + s * 0.072));
    }
    return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.0075, ROAD_Z]} receiveShadow material={asphalt()}>
        <boxGeometry args={[16, 0.015, 0.72]} />
      </mesh>
      <mesh geometry={lines} material={enamel("#F4F1EA", 0.6)} />
      {[PLANT_02, PLANT_01].map((p) => (
        <mesh key={p[0]} position={[p[0], 0.006, (PLANT_FRONT + ROAD_Z - 0.36) / 2]} receiveShadow material={concrete("#E3DFD8")}>
          <boxGeometry args={[2.9, 0.012, ROAD_Z - 0.36 - PLANT_FRONT + 0.02]} />
        </mesh>
      ))}
      <mesh geometry={bays} material={enamel(TINTS.saffron, 0.5)} />
    </group>
  );
}

export function Transfer() {
  const truck = useRef<THREE.Group>(null);
  const fork = useRef<THREE.Group>(null);
  const lift = useMemo<Lift>(() => ({ x: 0, z: 0, yaw: 0, h: 0, trip: -1, carry: false }), []);
  const [states, setStates] = useState<number[]>([0, 0, 0]);
  const [arrived, setArrived] = useState(false);
  const [order, setOrder] = useState("Approved · loading next");
  const tote = useMemo(() => plastic(TINTS.saffron, 0.5, true), []);
  const height = useRef(0.06);

  useFrame(() => {
    const { i, j, e, local } = blendAt(store.g);
    const here = i === CH.decision || j === CH.decision;
    const t = i === CH.decision ? local : 0;
    // Arriving from Context: rise in. Leaving for Control: the truck drives on out of frame.
    const inK = j === CH.decision && i !== CH.decision ? arrive(e, 0.05) : here ? 1 : 0;
    const exit = i === CH.decision ? e : 0;

    liftAt(t, lift);
    height.current = lift.h;
    if (truck.current) {
      truck.current.visible = here && inK > 0.002;
      truck.current.position.set(truckX(t, exit), 0, ROAD_Z);
      truck.current.scale.setScalar(M * inK);
    }
    if (fork.current) {
      const s = inK * (1 - smoothstep(0, 0.6, exit));
      fork.current.visible = here && s > 0.002;
      fork.current.position.set(lift.x, 0, lift.z);
      fork.current.rotation.y = lift.yaw;
      fork.current.scale.setScalar(M * s);
    }
    const next = palletStates(t, lift);
    if (next.some((v, n) => v !== states[n])) setStates(next);
    const done = t > BEATS.drive[1] - 0.02;
    if (done !== arrived) setArrived(done);
    // The truck's own status, in step with the transfer order panel on the page.
    const onDeck = next.filter((v) => v === 2).length;
    const status = done
      ? "Received at Plant 01"
      : t >= BEATS.drive[0]
        ? "In transit · 2 days"
        : t >= BEATS.load[0]
          ? `Loading · ${onDeck} of ${PALLETS} pallets`
          : "Approved · loading next";
    if (status !== order) setOrder(status);
  });

  return (
    <>
      <Actor track={inDecision({ p: PLANT_02, s: M })}>
        <Plant accent={TINTS.saffron} name="PLANT 02" />
        <group position={[0, 8.3, 0]} scale={1 / M}>
          <Tag title="Plant 02" value={states[PALLETS - 1] === 2 ? "380 units · 240 sent" : "620 units · above plan"} tone={TINTS.saffron} width={1.2} />
        </group>
      </Actor>
      <Actor track={inDecision({ p: PLANT_01, s: M })} delay={0.08}>
        <Plant accent={TINTS.cobalt} name="PLANT 01" />
        <group position={[0, 8.3, 0]} scale={1 / M}>
          <Tag title="Plant 01" value={arrived ? "380 units · covered" : "140 units · short in 6 days"} tone={arrived ? TINTS.emerald : TINTS.cobalt} width={1.2} />
        </group>
      </Actor>
      <Actor track={inDecision({ p: [0, 0, 0] })} delay={0.04}>
        <Yard />
        {/* Pallets waiting in the yard */}
        {SLOT_X.map((x, n) =>
          states[n] === 0 ? (
            <group key={n} position={[x, 0, STAGE_Z]} scale={M}>
              <LoadedPallet tote={tote} />
            </group>
          ) : null,
        )}
      </Actor>
      <group ref={truck} visible={false}>
        <group position={[6.4, 5.1, 0]} scale={1 / M}>
          <Tag title="TRF-0240" value={order} tone={TINTS.emerald} width={1.05} />
        </group>
        <SemiTruck accent={TINTS.emerald}>
          {TRUCK.slots.map((x, n) =>
            states[n] === 2 ? (
              <group key={n} position={[x, TRUCK.deckY, DECK_Z]}>
                <LoadedPallet tote={tote} />
              </group>
            ) : null,
          )}
        </SemiTruck>
      </group>
      <group ref={fork} visible={false}>
        <Forklift color={TINTS.saffron} lift={() => height.current}>
          {states.some((v) => v === 1) && (
            <group rotation-y={Math.PI / 2}>
              <LoadedPallet tote={tote} />
            </group>
          )}
        </Forklift>
      </group>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Cards: the decision, its layers, functions and industries           */
/* ------------------------------------------------------------------ */

type Mode = "base" | "industries" | "final";
// The final face goes on as the card starts its last half turn, while that face is still turned away.
const modeAt = (g: number): Mode => (g < CH.industries - 0.4 ? "base" : g < CH.final - 0.1 ? "industries" : "final");

function useFace(spec: FaceSpec, rotate: boolean) {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = FACE_W;
    canvas.height = FACE_H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return { canvas, texture };
  }, []);
  const key = `${faceKey(spec)}-${rotate}`;
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      readFonts();
      drawFace(canvas, spec, rotate);
      texture.needsUpdate = true;
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return texture;
}

/* Reading a card: under the pointer it lifts out of the stack, turns square to the viewer and
   grows enough to read; the others step aside and dim. Its rim lights up in the card's colour. */

const bodies: (THREE.Mesh | null)[] = [];
const readable = () => Math.max(weight(CH.control, store.g), weight(CH.scale, store.g)) > 0.9;
const toneOf = (k: number) => (store.g < CH.scale - 0.5 ? LAYER_TONE[k] : FUNCTION_TONE[k]);

/** Finds the card under the pointer once per frame. */
function CardFocus() {
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const lost = useRef(0);
  useFrame(({ camera }, dt) => {
    let hit = -1;
    if (readable() && store.pointerIn) {
      ndc.set(store.pointer.x, store.pointer.y);
      ray.setFromCamera(ndc, camera);
      const live = bodies.filter((b): b is THREE.Mesh => !!b && b.parent?.parent?.visible !== false);
      const first = ray.intersectObjects(live, false)[0];
      if (first) hit = bodies.indexOf(first.object as THREE.Mesh);
    }
    // Hold focus briefly when the pointer slips into a gap, so a moving card never flickers.
    if (hit >= 0) lost.current = 0;
    else lost.current += dt;
    // Pointing at the approval panel reads the decision card it acts on.
    const hint = readable() && store.focusHint >= 0 ? store.focusHint : -1;
    const next = hit >= 0 ? hit : hint >= 0 ? hint : lost.current > 0.18 || !readable() ? -1 : store.focus;
    if (next !== store.focus) {
      store.focus = next;
      document.body.style.cursor = next >= 0 ? "pointer" : "";
    }
  });
  return null;
}

const axX = new THREE.Vector3();
const axY = new THREE.Vector3();
const toCam = new THREE.Vector3();
// Face colour: #F7F7F7 in linear light, dimmed when another card is being read.
const FACE_BASE = new THREE.Color("#F7F7F7").r;

function Card({ k }: { k: number }) {
  const ref = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  useActor(ref, (c, t) => cardPose(k, c, t), k * 0.05, 0.11);
  const anim = useRef({ me: 0, other: 0, side: 0 });
  const rim = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const rimRef = useRef<THREE.Mesh>(null);
  const topMat = useRef<THREE.MeshBasicMaterial>(null);
  const bottomMat = useRef<THREE.MeshBasicMaterial>(null);

  // Which content each face carries depends on where the story is.
  const [faces, setFaces] = useFacesState(k);
  const top = useFace(faces.top, faces.topRotated ?? false);
  const bottom = useFace(faces.bottom, faces.bottomRotated);
  useFrame(({ camera }, dt) => {
    const mode = modeAt(store.g);
    let next: FaceState;
    if (k !== DECISION_CARD || mode === "base") next = baseFaces(k);
    else if (mode === "final")
      next = { top: { kind: "final" }, topRotated: true, bottom: { kind: "industry", k: INDUSTRIES.length - 1 }, bottomRotated: true };
    else {
      const f = industryF(localIn(CH.industries, store.g));
      const front = Math.min(2 * Math.round(f / 2), INDUSTRIES.length - 1);
      const back = Math.min(2 * Math.round((f - 1) / 2) + 1, INDUSTRIES.length - 1);
      next = { top: { kind: "industry", k: front }, bottom: { kind: "industry", k: back }, bottomRotated: true };
    }
    if (
      faceKey(next.top) !== faceKey(faces.top) ||
      faceKey(next.bottom) !== faceKey(faces.bottom) ||
      next.bottomRotated !== faces.bottomRotated ||
      !!next.topRotated !== !!faces.topRotated
    )
      setFaces(next);

    // Focus: spring toward the state the pointer asks for.
    const f = store.focus;
    const a = anim.current;
    const d = Math.min(dt, 1 / 30);
    a.me = THREE.MathUtils.damp(a.me, f === k ? 1 : 0, 9, d);
    a.other = THREE.MathUtils.damp(a.other, f >= 0 && f !== k ? 1 : 0, 7, d);
    if (f >= 0 && f !== k) a.side = Math.sign(k - f);
    const g = ref.current;
    const n = inner.current;
    if (!g || !n) return;
    // Which way the readable face points (stood up for layers, flipped for functions), and the
    // card's turn about the vertical. Read from axes, not Euler angles: cards stand at exactly 90°.
    axX.set(1, 0, 0).applyQuaternion(g.quaternion);
    axY.set(0, 1, 0).applyQuaternion(g.quaternion);
    const s = axY.dot(toCam.subVectors(camera.position, g.position)) >= 0 ? 1 : -1;
    const ry = Math.atan2(-axX.z, axX.x);
    // Lift toward the viewer along the card's normal, square up to the camera, grow to reading size.
    // Edge cards also drift toward the middle of the stack, clear of the copy and the screen edge.
    // Cards to the left only shift a little: the copy column sits on that side.
    const aside = a.side > 0 ? 0.62 : 0.26;
    n.position.set(a.side * a.other * aside + (2 - k) * 0.3 * a.me, s * (a.me * 0.62 - a.other * 0.06), 0);
    n.rotation.set(0, 0, s * ry * a.me);
    n.scale.setScalar(1 + a.me * 0.2 - a.other * 0.03);
    rim.color.set(toneOf(k));
    // The rim grows out from behind the card's edge rather than fading: no transparency to sort.
    if (rimRef.current) {
      rimRef.current.visible = a.me > 0.02;
      rimRef.current.scale.set(1 + a.me * 0.011, 1, 1 + a.me * 0.018);
    }
    const dim = FACE_BASE * (1 - a.other * 0.14);
    topMat.current?.color.setScalar(dim);
    bottomMat.current?.color.setScalar(dim);
  });

  const inset = 0.05;
  return (
    <group ref={ref} visible={false}>
      <group ref={inner}>
        <RoundedBox
          ref={(m: THREE.Mesh | null) => {
            bodies[k] = m;
          }}
          args={[CARD.w, CARD.t, CARD.h]}
          radius={0.022}
          smoothness={4}
          castShadow
          receiveShadow
          material={clay(WHITE, 0.35)}
        />
        {/* Coloured rim: a hairline of the card's tone, lit while it is being read */}
        <RoundedBox ref={rimRef} args={[CARD.w, CARD.t * 0.7, CARD.h]} radius={0.014} smoothness={4} material={rim} visible={false} />
        <mesh position-y={CARD.t / 2 + 0.0012} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[CARD.w - inset, CARD.h - inset]} />
          <meshBasicMaterial ref={topMat} map={top} toneMapped={false} color="#F7F7F7" />
        </mesh>
        <mesh position-y={-CARD.t / 2 - 0.0012} rotation-x={Math.PI / 2}>
          <planeGeometry args={[CARD.w - inset, CARD.h - inset]} />
          <meshBasicMaterial ref={bottomMat} map={bottom} toneMapped={false} color="#F7F7F7" />
        </mesh>
      </group>
    </group>
  );
}

type FaceState = { top: FaceSpec; topRotated?: boolean; bottom: FaceSpec; bottomRotated: boolean };
const baseFaces = (k: number): FaceState => ({
  top: k === DECISION_CARD ? { kind: "decision" } : { kind: "layer", k },
  bottom: { kind: "function", k },
  bottomRotated: false,
});

function useFacesState(k: number) {
  return useState<FaceState>(() => baseFaces(k));
}

export function Cards() {
  return (
    <>
      <CardFocus />
      {Array.from({ length: CARDS }, (_, k) => (
        <Card key={k} k={k} />
      ))}
    </>
  );
}
