"use client";

import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { easing } from "maath";
import { CH, INDUSTRIES, blendAt, clamp01, localIn, smoothstep, store, weight } from "@/lib/story";
import {
  CARD,
  CARDS,
  CHART_CRATES,
  CRATE,
  DECISION_CARD,
  ISLANDS,
  WMS,
  PLANT_01,
  PLANT_02,
  ROAD_Z,
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
import { Crate, Island, SYSTEM_MODELS, Truck, WHITE, Warehouse, clay } from "./kit";
import { FACE_H, FACE_W, drawFace, faceKey, readFonts, type FaceSpec } from "./faces";

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

function Tag({ title, value, tone, width = 1.3, alert = false }: { title: string; value: string; tone: string; width?: number; alert?: boolean }) {
  const W = 780;
  const H = 260;
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
      <mesh renderOrder={10}>
        <planeGeometry args={[width, (width * H) / W]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} depthTest={false} />
      </mesh>
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

export function Islands() {
  return (
    <>
      {SYSTEMS.map((sys, s) => {
        const Model = SYSTEM_MODELS[s];
        const tone = TINTS[sys.tone as keyof typeof TINTS];
        return (
          <Actor key={sys.id} track={(c) => islandPose(s, c)} delay={s * 0.06}>
            <Rise delay={0.25 + s * 0.09}>
              <Island tone={tone}>
                <Model />
              </Island>
              <group position-y={TAG_Y[s]} rotation-y={-ISLANDS[s][2]}>
                <Tag title={sys.name} value={`${sys.knows} · ${sys.value}`} tone={tone} width={1.45} />
              </group>
            </Rise>
          </Actor>
        );
      })}
    </>
  );
}

/** The one tote that matters: Bearing X90 at Plant 01. */
export function SignalCrate() {
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 }), []);
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
          <Crate material={mat} />
          {/* Bearings inside the tote */}
          {[-0.16, 0, 0.16].map((x) => (
            <mesh key={x} position={[x, 0.13, 0]} rotation-x={Math.PI / 2} material={clay("#C9CCD3", 0.25)}>
              <torusGeometry args={[0.055, 0.022, 12, 32]} />
            </mesh>
          ))}
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

export function ChartCrates() {
  return (
    <>
      {Array.from({ length: CHART_CRATES }, (_, k) => {
        const { d, l } = chartSlot(k);
        return (
          <Actor key={k} track={(c) => (c === CH.problem ? { p: chartPos(k) } : null)} delay={d * 0.05 + l * 0.015}>
            <Crate color={TINTS.saffron} />
          </Actor>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 05 Decision: Plant 02 sends 240 units to Plant 01                   */
/* ------------------------------------------------------------------ */

const inDecision = (p: Pose): Track => (c) => (c === CH.decision ? p : null);

export function Transfer() {
  const truck = useRef<THREE.Group>(null);
  useFrame(() => {
    if (truck.current) truck.current.position.x = truckX(localIn(CH.decision, store.g));
  });
  const road = useMemo(() => {
    const dashes = Array.from({ length: 11 }, (_, i) => -2.5 + i * 0.5);
    return dashes;
  }, []);
  return (
    <>
      <Actor track={inDecision({ p: PLANT_02, ry: 0.35, s: 1.15 })}>
        <Warehouse accent={TINTS.saffron} />
        <group position={[0, 1.15, 0]}>
          <Tag title="Plant 02" value="620 units · above plan" tone={TINTS.saffron} width={1.15} />
        </group>
      </Actor>
      <Actor track={inDecision({ p: PLANT_01, ry: -0.35, s: 1.15 })} delay={0.08}>
        <Warehouse accent={TINTS.cobalt} crates={false} />
        <group position={[0, 1.15, 0]}>
          <Tag title="Plant 01" value="140 units · short in 6 days" tone={TINTS.cobalt} width={1.15} />
        </group>
      </Actor>
      <Actor track={inDecision({ p: [0, 0, ROAD_Z] })} delay={0.04}>
        <RoundedBox args={[6.2, 0.02, 0.62]} radius={0.01} smoothness={2} position-y={0.01} receiveShadow material={clay("#E7E3DC", 0.7)} />
        {road.map((x) => (
          <mesh key={x} position={[x, 0.022, 0]} material={clay(WHITE, 0.6)}>
            <boxGeometry args={[0.24, 0.004, 0.04]} />
          </mesh>
        ))}
        <group ref={truck} position-z={0}>
          <Truck
            accent={TINTS.emerald}
            cargo={
              <group position={[-0.12, 0.19 + CRATE.h / 2, 0]} scale={0.95}>
                {[-0.32, 0.32].map((x) => (
                  <group key={x} position-x={x * 0.55} rotation-y={Math.PI / 2} scale={0.8}>
                    <Crate color={TINTS.saffron} />
                  </group>
                ))}
              </group>
            }
          />
        </group>
      </Actor>
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

function Card({ k }: { k: number }) {
  const ref = useRef<THREE.Group>(null);
  useActor(ref, (c, t) => cardPose(k, c, t), k * 0.05, 0.11);

  // Which content each face carries depends on where the story is.
  const [faces, setFaces] = useFacesState(k);
  const top = useFace(faces.top, faces.topRotated ?? false);
  const bottom = useFace(faces.bottom, faces.bottomRotated);
  useFrame(() => {
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
  });

  const inset = 0.05;
  return (
    <group ref={ref} visible={false}>
      <RoundedBox args={[CARD.w, CARD.t, CARD.h]} radius={0.022} smoothness={4} castShadow receiveShadow material={clay(WHITE, 0.35)} />
      <mesh position-y={CARD.t / 2 + 0.0012} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[CARD.w - inset, CARD.h - inset]} />
        <meshBasicMaterial map={top} toneMapped={false} color="#F7F7F7" />
      </mesh>
      <mesh position-y={-CARD.t / 2 - 0.0012} rotation-x={Math.PI / 2}>
        <planeGeometry args={[CARD.w - inset, CARD.h - inset]} />
        <meshBasicMaterial map={bottom} toneMapped={false} color="#F7F7F7" />
      </mesh>
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
      {Array.from({ length: CARDS }, (_, k) => (
        <Card key={k} k={k} />
      ))}
    </>
  );
}
