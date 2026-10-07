"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { easing } from "maath";
import { CH, INDUSTRIES, blendAt, clamp01, localIn, select, smootherstep, smoothstep, store, weight } from "@/lib/story";
import {
  CARD,
  CARDS,
  CHART_CRATES,
  DAYS,
  DAY_X,
  SAFETY_UNITS,
  STEP_Y,
  dayUnits,
  crateFill,
  DECISION_CARD,
  ISLANDS,
  WMS,
  BEATS,
  M,
  PLANT_01,
  PLANT_02,
  PLANT_FRONT,
  ROAD_Z,
  cardPose,
  chartPos,
  chartSlot,
  industryF,
  islandPose,
  signalCratePose,
  truckX,
  type Pose,
  type Vec3,
} from "@/lib/scene";
import { SYSTEMS } from "@/components/ui/systems";
import { COLORS, TINTS } from "./palette";
import { Crate, Island, SYSTEM_MODELS, WHITE, clay } from "./kit";
import { BearingBed, Plant } from "./buildings";
import { Forklift, SemiTruck, TRUCK } from "./vehicles";
import { LoadedPallet, box, cylX, cylY, cylZ, rbox, merge } from "./parts";
import { PALLETS, SLOT_X, STAGE_Z, DECK_Z, liftAt, palletStates, type Lift } from "./transfer-motion";
import { aluminium, asphalt, concrete, enamel, fineRibs, plastic, steel } from "./materials";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FACE_H, FACE_W, FUNCTION_TONE, LAYER_TONE, drawFace, faceKey, readFonts, type FaceSpec } from "./faces";

/* ------------------------------------------------------------------ */
/* Actor: blends between its chapter poses; scales in and out of scenes */
/* ------------------------------------------------------------------ */

const backOut = (x: number) => {
  const c = 0.65;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
const euler = new THREE.Euler(0, 0, 0, "YXZ");
const tmpV = new THREE.Vector3();

type Track = (c: number, t: number) => Pose | null;
/** Where an actor travels to as it leaves chapter c, instead of shrinking in place. */
type Exit = (c: number) => Vec3 | null;

function useActor(ref: React.RefObject<THREE.Group | null>, track: Track, delay = 0, damp = 0.1, exit?: Exit) {
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
      const to = exit?.(i);
      goal.p.set(...A.p);
      rx = A.rx ?? 0;
      ry = A.ry ?? 0;
      if (to) {
        // Converging: travel to the target and fold into it, so the hand-off reads as cause and effect.
        goal.p.lerp(tmpV.set(...to), smootherstep(0, 0.85, k));
        goal.s = (A.s ?? 1) * (1 - smoothstep(0.35, 0.9, k));
      } else goal.s = (A.s ?? 1) * (1 - smoothstep(0, 0.7, k));
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

function Actor({ track, delay, damp, exit, children }: { track: Track; delay?: number; damp?: number; exit?: Exit; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useActor(ref, track, delay, damp, exit);
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

/** Island labels step out first when the islands leave, so the converging models stay legible. */
function IslandTag({ y, ry, children }: { y: number; ry: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const k = smoothstep(0.8, 1, Math.max(weight(CH.fragments, store.g), weight(CH.context, store.g)));
    if (!ref.current) return;
    ref.current.scale.setScalar(k);
    ref.current.visible = k > 0.01;
  });
  return (
    <group ref={ref} position-y={y} rotation-y={ry}>
      {children}
    </group>
  );
}

export function Islands() {
  const portrait = useThree((state) => state.size.width < 768 || (state.size.width < 1024 && state.size.height > state.size.width * 1.15));
  return (
    <>
      <IslandFocus />
      {SYSTEMS.map((sys, s) => {
        const Model = SYSTEM_MODELS[s];
        const tone = TINTS[sys.tone as keyof typeof TINTS];
        return (
          <Actor key={sys.id} track={(c) => islandPose(s, c, portrait)} delay={s * 0.06} exit={(c) => (c === CH.fragments ? signalCratePose(CH.signal, 0, portrait)?.p ?? null : null)}>
            <Rise delay={0.25 + s * 0.09}>
              <Hover i={s}>
                <Island tone={tone}>
                  <Model />
                </Island>
                <IslandTag y={TAG_Y[s]} ry={-ISLANDS[s][2]}>
                  <Tag title={sys.name} value={`${sys.knows} · ${sys.value}`} tone={tone} width={1.45} grow={() => Math.min(Math.max(0, islandLift[s]), 1) * 0.28 - islandBack[s] * 0.2 + (portrait ? .45 * Math.max(weight(CH.fragments, store.g), weight(CH.context, store.g)) : 0) } />
                </IslandTag>
              </Hover>
            </Rise>
          </Actor>
        );
      })}
    </>
  );
}

let oledTexCache: THREE.CanvasTexture | null = null;
function useCameraOledTexture() {
  return useMemo(() => {
    if (oledTexCache) return oledTexCache;
    const w = 256;
    const h = 128;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#0C0E12";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(242, 54, 31, 0.4)";
    c.lineWidth = 3;
    c.strokeRect(6, 6, w - 12, h - 12);

    c.font = "bold 20px monospace";
    c.fillStyle = "#27C97E";
    c.fillText("● OPTIC-SCAN V4", 18, 34);

    c.font = "bold 24px monospace";
    c.fillStyle = "#FFFFFF";
    c.fillText("BEARING X90", 18, 70);

    c.font = "18px monospace";
    c.fillStyle = "#F2361F";
    c.fillText("DEFICIT: DAY 6", 18, 102);

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 16;
    oledTexCache = tex;
    return tex;
  }, []);
}

/**
 * Precision Industrial Machine Vision Optical Inspection Station:
 * Articulated robotic mounting stanchion, CNC telecentric camera housing,
 * coaxial optical LED ring illuminator, structured laser sweep, and spatial calipers.
 */
function InspectionScanner({ active }: { active: boolean }) {
  const oled = useCameraOledTexture();
  const sweepRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Group>(null);

  const armGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    // Rigid mounting block clamped to rear rail of crate staging
    parts.push(rbox(0.046, 0.04, 0.046, 0.006, -0.26, 0.08, -0.16));
    // Upright stanchion mast column
    parts.push(cylY(0.011, 0.26, -0.26, 0.21, -0.16, 16));
    // Shoulder swivel turret
    parts.push(cylX(0.016, 0.038, -0.26, 0.34, -0.16, 16));
    parts.push(cylX(0.021, 0.008, -0.26 - 0.02, 0.34, -0.16, 16)); // knurled lock dial
    // Forward cantilever boom reaching from [-0.26, 0.34, -0.16] to [0, 0.32, 0]
    const p1 = new THREE.Vector3(-0.26, 0.34, -0.16);
    const p2 = new THREE.Vector3(0, 0.32, 0);
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const boom = new THREE.CylinderGeometry(0.009, 0.009, len, 16);
    boom.rotateX(Math.PI / 2);
    boom.lookAt(dir);
    boom.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2);
    parts.push(boom);
    // Wrist gimbal at boom tip
    parts.push(rbox(0.032, 0.03, 0.032, 0.005, 0, 0.32, 0));
    return merge(parts);
  }, []);

  const cameraGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    // Camera main body
    parts.push(rbox(0.12, 0.06, 0.10, 0.008, 0, 0.28, 0));
    // Heat dissipation fins
    for (let i = -2; i <= 2; i++) {
      parts.push(box(0.09, 0.008, 0.01, 0, 0.315, i * 0.018));
    }
    // Telecentric lens barrel extending downward
    parts.push(cylY(0.028, 0.036, 0, 0.235, 0, 24));
    // Dual structured laser diode pods
    parts.push(cylY(0.009, 0.024, -0.065, 0.26, 0, 12));
    parts.push(cylY(0.009, 0.024, 0.065, 0.26, 0, 12));
    return merge(parts);
  }, []);

  // Coaxial LED Ring Illuminator Bezel
  const ringBezelGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const ro = 0.088;
    const ri = 0.058;
    const h = 0.014;
    const ringPts = [
      [ri, -h / 2],
      [ro, -h / 2],
      [ro, h / 2],
      [ri, h / 2],
      [ri, -h / 2],
    ].map(([a, b]) => new THREE.Vector2(a, b));
    parts.push(new THREE.LatheGeometry(ringPts, 48).translate(0, 0.218, 0));
    return merge(parts);
  }, []);

  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    if (sweepRef.current) {
      sweepRef.current.position.x = Math.sin(t * 2.2) * 0.18;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y = t * 0.12;
    }
  });

  return (
    <group>
      {/* Articulated mounting arm */}
      <mesh geometry={armGeo} material={steel("#22252A", 0.4)} castShadow />

      {/* Camera body */}
      <mesh geometry={cameraGeo} material={steel("#282C34", 0.35)} castShadow />

      {/* Front status OLED display */}
      <mesh position={[0, 0.28, 0.052]}>
        <planeGeometry args={[0.08, 0.04]} />
        <meshBasicMaterial map={oled} />
      </mesh>

      {/* Sapphire camera objective lens */}
      <mesh position={[0, 0.216, 0]} rotation-x={Math.PI / 2}>
        <circleGeometry args={[0.025, 24]} />
        <meshPhysicalMaterial color="#0A0E14" roughness={0.02} metalness={0.9} clearcoat={1} clearcoatRoughness={0.02} />
      </mesh>

      {/* Circular LED Ring Illuminator Aluminum Bezel */}
      <mesh geometry={ringBezelGeo} material={aluminium(0.25)} castShadow />

      {/* Frosted Optical Diffuser Ring */}
      <mesh position={[0, 0.211, 0]} rotation-x={Math.PI / 2}>
        <ringGeometry args={[0.062, 0.084, 48]} />
        <meshStandardMaterial
          color="#FFF6E8"
          emissive="#FFE6C4"
          emissiveIntensity={1.3}
          roughness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 16 Micro-LED Diodes */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.073, 0.21, Math.sin(a) * 0.073]}>
            <cylinderGeometry args={[0.002, 0.002, 0.002, 8]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        );
      })}

      {/* Soft Downward Coaxial Light Cone */}
      <mesh position={[0, 0.13, 0]}>
        <cylinderGeometry args={[0.08, 0.18, 0.17, 32, 1, true]} />
        <meshBasicMaterial color="#FFF5E6" transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Dual Downward Structured Laser Scanning Sheets */}
      {[-0.065, 0.065].map((lx, i) => (
        <mesh key={i} position={[lx, 0.175, 0]}>
          <coneGeometry args={[0.09, 0.17, 16, 1, true]} />
          <meshBasicMaterial color={COLORS.signal} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}

      {/* Active Panning Laser Sweep Line */}
      <group ref={sweepRef} position={[0, 0.138, 0]}>
        <mesh>
          <boxGeometry args={[0.0035, 0.002, 0.32]} />
          <meshBasicMaterial color={COLORS.signal} />
        </mesh>
        {/* Soft laser fringe illumination */}
        <mesh>
          <planeGeometry args={[0.03, 0.32]} />
          <meshBasicMaterial color={COLORS.signal} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      {/* Holographic Dimensional Calipers directly over the inspected bearing */}
      <group position={[0, 0.139, -0.08]} rotation-x={-Math.PI / 2} ref={ringRef}>
        {/* Outer diameter caliper */}
        <mesh>
          <ringGeometry args={[0.0605, 0.062, 48]} />
          <meshBasicMaterial color={COLORS.signal} opacity={0.45} transparent depthWrite={false} />
        </mesh>
        {/* Inner bore caliper */}
        <mesh>
          <ringGeometry args={[0.019, 0.0205, 32]} />
          <meshBasicMaterial color={COLORS.signal} opacity={0.45} transparent depthWrite={false} />
        </mesh>
        {/* Cardinal crosshairs */}
        <mesh>
          <planeGeometry args={[0.16, 0.0015]} />
          <meshBasicMaterial color={COLORS.signal} opacity={0.35} transparent depthWrite={false} />
        </mesh>
        <mesh>
          <planeGeometry args={[0.0015, 0.16]} />
          <meshBasicMaterial color={COLORS.signal} opacity={0.35} transparent depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/** The one tote that matters: Bearing X90 at Plant 01, with optical scan probe and spatial telemetry nodes. */
export function SignalCrate() {
  const portrait = useThree((state) => state.size.width < 768 || (state.size.width < 1024 && state.size.height > state.size.width * 1.15));
  // Same moulded, ribbed plastic as every other tote; only its colour changes.
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.5, normalMap: fineRibs(), normalScale: new THREE.Vector2(0.6, 0.6) }),
    [],
  );
  const saffron = useMemo(() => new THREE.Color(TINTS.saffron), []);
  const red = useMemo(() => new THREE.Color(COLORS.signal), []);
  const approved = useMemo(() => new THREE.Color(TINTS.emerald), []);
  const tag = useRef<THREE.Group>(null);
  const hover = useRef<THREE.Group>(null);
  const scannerGroup = useRef<THREE.Group>(null);

  const hint = useRef(0);
  useFrame(({ clock }, dt) => {
    const sigWeight = weight(CH.signal, store.g);
    // While it is the subject, it hovers: lifted out of the data, breathing slowly.
    // Pointing at its readout on the page lifts it a little more, linking the numbers to the object.
    hint.current = THREE.MathUtils.damp(hint.current, store.signalHint ? 1 : 0, 9, Math.min(dt, 1 / 30));
    if (hover.current) hover.current.position.y = (Math.sin(clock.elapsedTime * 1.3) * 0.025 + hint.current * 0.08) * sigWeight;
    // It turns red as the signal is found, then keeps a slow pulse: live, not alarming.
    const r = smoothstep(0.45, 0.95, store.g);
    // Back on its island at the end, the same tote reads approved: the shortage is resolved.
    const ok = smoothstep(0.4, 0.95, weight(CH.final, store.g));
    mat.color.copy(saffron).lerp(red, r).lerp(approved, ok);
    mat.emissive.copy(red).multiplyScalar(r * (1 - ok) * (0.18 + Math.sin(clock.elapsedTime * 2.4) * 0.08 + hint.current * 0.14));

    if (tag.current) {
      // In the Signal chapter the page carries these facts at reading size; the tag returns for Context.
      const show = smoothstep(0.55, 0.9, weight(CH.context, store.g));
      tag.current.scale.setScalar(0.36 * show);
      tag.current.visible = show > 0.01;
    }


    if (scannerGroup.current) {
      const showScan = smoothstep(0.5, 0.95, sigWeight);
      scannerGroup.current.scale.setScalar(showScan);
      scannerGroup.current.visible = showScan > 0.01;
    }
  });

  return (
    <Actor track={(c, t) => signalCratePose(c, t, portrait)} damp={0.12}>
      {/* Rides in with the warehouse it sits on, and floats with it while it is there. */}
      <Rise delay={0.25 + WMS * 0.09} float={() => weight(CH.fragments, store.g)}>
        <group ref={hover}>
          {/* An open tote of X90 bearings: the part that is about to run short */}
          <Crate material={mat} open>
            <BearingBed />
          </Crate>

          {/* Primary Signal Tag */}
          <group ref={tag} position={[0, 0.38, 0]} scale={0.36}>
            <Tag title="Bearing X90 · Plant 01" value="Below safety stock in 6 days" tone={COLORS.signal} width={1.45} alert />
          </group>

          {/* Precision Industrial Machine Vision Optical Inspection Station */}
          <group ref={scannerGroup}>
            <InspectionScanner active />
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
      <group scale-y={crateFill(d, l)}><Crate color={TINTS.saffron} /></group>
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
/** Arrive with a small overshoot as the chapter comes in, staggered; null once it has gone. */
const arrive = (e: number, delay: number) => {
  const k = clamp01((e - 0.25 - delay) / (0.75 - delay));
  return k > 0 ? backOut(k) : 0;
};

export function Yard({ roadLength = 16 }: { roadLength?: number }) {
  const lines = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    // Road edge lines and a dashed centre line
    for (const s of [-1, 1]) parts.push(new THREE.BoxGeometry(roadLength, 0.002, 0.018).translate(0, 0.0165, ROAD_Z + s * 0.33));
    for (let i = 0; i < Math.floor(roadLength / 0.52); i++) parts.push(new THREE.BoxGeometry(0.22, 0.002, 0.016).translate(-roadLength / 2 + 0.3 + i * 0.52, 0.0165, ROAD_Z));
    return mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  }, [roadLength]);
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
        <boxGeometry args={[roadLength, 0.015, 0.72]} />
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
  const lift = useMemo<Lift>(() => ({ x: 0, z: 0, yaw: 0, h: 0, trip: -1, carry: false, pitch: 0, roll: 0 }), []);
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
      fork.current.rotation.x = lift.pitch;
      fork.current.rotation.z = lift.roll;
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
          <Tag title="Plant 02" value={`${620 - states.filter((v) => v === 2).length * 80} units · ${states.filter((v) => v === 2).length * 80} sent`} tone={TINTS.saffron} width={1.2} />
        </group>
      </Actor>
      <Actor track={inDecision({ p: PLANT_01, s: M })} delay={0.08}>
        <Plant accent={TINTS.cobalt} name="PLANT 01" />
        <group position={[0, 8.3, 0]} scale={1 / M}>
          <Tag title="Plant 01" value={arrived ? "Day 6 · 380 projected" : "Day 6 · 140 projected"} tone={arrived ? TINTS.emerald : TINTS.cobalt} width={1.2} />
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
