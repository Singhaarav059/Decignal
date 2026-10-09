"use client";

// The world the whole page happens in, and the one camera that tells it. Nothing switches on or off
// and nothing is glued to a box on the page: there is one island in a calm bay, the far shore and
// the mountain beyond it, one day passing over it (lib/daylight.ts), and the scroll moves one
// camera through it.
//
//   hero      dawn, a wide shot across the bay: both plants, the container quay, the mountain
//   systems   morning, the camera rises over the island: each system is a place on it
//   signal    late morning, down into Plant 01 (roof and front cut away) as its stock runs down
//   decision  afternoon, back along the road to Plant 02's yard: approval, loading, the drive
//   foundation late afternoon, on along the road to the head office, where the decision is recorded
//   yours     golden hour, out over the whole harbour: each business area is a place on it
//   industries golden hour from the quay side: each industry is a place on it
//   outcome   sunset over Plant 01, restocked, and the yard it came from
//   how       dusk, the camera turns out to the bay, the torii and the mountain as the lamps light
//   ask       night over the harbour, for the questions and the footer
//
// The canvas sits fixed behind the page's copy; sections scroll over it and never over each other.
import * as THREE from "three";
import gsap from "gsap";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DECISION, N, S, anchorOf, atSection, decisionU, reel, story } from "@/lib/reel";
import { daylight, stepDaylight } from "@/lib/daylight";
import { canvasQuality, isPhone } from "@/lib/device";
import { FORK, Forklift, SemiTruck, TRUCK } from "../three/vehicles";
import { TINTS } from "../three/palette";
import { LoadedPallet, Tote } from "../three/parts";
import { Person } from "../three/people";
import { Plant, PLANT } from "../three/buildings";
import { DecisionPlate, PLATE, RACK, RACK_SLOTS, RackFrame, rackSlot, skuTote } from "./objects";
import { Contact } from "./sets";
import { PLANT01, PlantFloor } from "./environments";
import { DispatchBoard, Ground, LAND, PALLET_SLOTS, Verges, YARD, bayX, opsScreen } from "./land";
import { Clouds, FarShore, Gulls, SkyDome, SkyLight, stepSkyUniforms } from "./sky";
import { Containers, Crane, FishingBoat, Floodlight, InboundShip, MooredShip, Pier, SITE, SeaWall, WATER_Y, Water, yardSlots } from "./harbour";
import { Islet, Torii } from "./garden";
import { HeadOffice, SalesOffice, ServiceCentre } from "./town";
import { stepGlow } from "./glow";
import { Bake } from "./Bake";

if (typeof performance !== "undefined") performance.mark("world:module");

const smooth = (t: number) => t * t * (3 - 2 * t);
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const span = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
const mix = THREE.MathUtils.lerp;

/* ------------------------------------------------------------------ */
/* Places                                                               */
/* ------------------------------------------------------------------ */

const [P02, P01] = LAND.plants;
/** Plant 01's floor (on top of its plinth) and where the slice of it we look into sits. */
const INSIDE = new THREE.Vector3(P01, 1.2, LAND.plantZ + 0.5);
/** The operations display on Plant 01's wall, in world metres. */
const BOARD = new THREE.Vector3(INSIDE.x + PLANT01.screen.x, INSIDE.y + PLANT01.screen.y, INSIDE.z + PLANT01.wall.z);
/** The partition runs wall to wall inside the plant. */
const INSIDE_SPAN = 16.8;
/** The truck parked at Plant 02's kerb, and where it stops in front of Plant 01. */
const TRUCK_MID = (TRUCK.front + TRUCK.rear) / 2;
const ARRIVE_X = 16 - TRUCK_MID;
/** The torii stands in the water off the islet, out in the bay beyond the moored ship. */
const ISLET = { x: 118, z: -168 };

/* ------------------------------------------------------------------ */
/* Screen frames: where on screen each shot's subject sits              */
/* ------------------------------------------------------------------ */

const view = { w: 1, h: 1 };
type Frame = { cx: number; cy: number; w: number };
const FRAME_KEYS = ["hero", "sys", "plant", "yard", "found", "fn", "ind", "out", "how", "ask"] as const;
type FrameKey = (typeof FRAME_KEYS)[number];
const FRAME_SECTION: Record<FrameKey, number> = { hero: S.hero, sys: S.systems, plant: S.signal, yard: S.decision, found: S.foundation, fn: S.yours, ind: S.industries, out: S.outcome, how: S.how, ask: S.ask };
const frames = Object.fromEntries(FRAME_KEYS.map((k) => [k, { cx: 0, cy: 0, w: 1 }])) as Record<FrameKey, Frame>;
const wide: Frame = { cx: 0, cy: 0, w: 1 };
const anchorEls: Partial<Record<FrameKey, Element | null>> = {};

/**
 * Where an anchor sits on screen once its section has settled (for a pinned section, while it is
 * pinned), wherever the page is scrolled to now. The camera frames its shots on these, so the
 * page's layout decides where the world sits around the copy, at every screen size.
 */
function settle(key: FrameKey) {
  const el = anchorEls[key];
  const out = frames[key];
  if (!el) return;
  const sec = FRAME_SECTION[key];
  const r = el.getBoundingClientRect();
  const y = window.scrollY;
  const top = anchorOf(sec, 0);
  const end = anchorOf(sec, 1);
  const off = y - Math.min(Math.max(y, top), Math.max(end, top));
  out.cx = r.left + r.width / 2;
  out.cy = r.top + r.height / 2 + off;
  out.w = Math.max(r.width, 1);
}

function measureFrames() {
  for (const k of FRAME_KEYS) settle(k);
  wide.cx = view.w / 2;
  wide.cy = view.h * 0.55;
  wide.w = view.w;
}

/* ------------------------------------------------------------------ */
/* Shots and the path between them                                      */
/* ------------------------------------------------------------------ */

/** A camera shot: what it looks at, from which way, how far, with which lens, and where on screen that point sits. */
type Shot = { x: number; y: number; z: number; yaw: number; pitch: number; d: number; fov: number; cx: number; cy: number; span: number };
const shot = (): Shot => ({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, d: 1, fov: 22, cx: 0, cy: 0, span: 1 });

/** Frames `metres` across the frame's width, centred on the target. */
function aim(out: Shot, x: number, y: number, z: number, yaw: number, pitch: number, metres: number, f: Frame, fov = 22) {
  const tanH = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * (view.w / view.h);
  out.x = x;
  out.y = y;
  out.z = z;
  out.yaw = yaw;
  out.pitch = pitch;
  out.fov = fov;
  out.span = metres;
  out.d = (metres * view.w) / Math.max(f.w, 1) / (2 * tanH);
  out.cx = f.cx;
  out.cy = f.cy;
  return out;
}

/** Truck centre while it drives from Plant 02's kerb to Plant 01, at decision progress u. */
const driveK = (u: number) => smooth(span(u, DECISION.drive[0], DECISION.drive[1]));
const truckX = (u: number) => mix(YARD.truckX, ARRIVE_X, driveK(u));
const atDecision = (u: number) => atSection(S.decision, u);

type Key = { t: number; stop: boolean; at: (out: Shot) => Shot };
const KEYS: Key[] = [
  // 01 Hero, dawn: across the bay to the island, the quay and the mountain, right of the headline
  { t: 0, stop: true, at: (o) => aim(o, 10, 4, -14, 0.03, 0.13, 86, frames.hero, 24) },
  // 02 Systems, morning: up over the island, every place where a system lives in one view
  { t: atSection(S.systems, 0), stop: true, at: (o) => aim(o, 14, 0, -18, 0.06, 0.62, 168, frames.sys, 24) },
  { t: atSection(S.systems, 1), stop: true, at: (o) => aim(o, 15, 0, -18, 0.09, 0.63, 160, frames.sys, 24) },
  // On towards Plant 01
  { t: S.signal - 0.35, stop: false, at: (o) => aim(o, P01, 1.2, -9, 0.2, 0.68, 40, wide, 22) },
  // 03 Signal: inside Plant 01, a slow push in while the rack drains and the facts arrive
  { t: atSection(S.signal, 0), stop: true, at: (o) => aim(o, INSIDE.x, INSIDE.y, INSIDE.z, 0.2, 0.4, 10.5, frames.plant, 20) },
  { t: atSection(S.signal, 0.3), stop: true, at: (o) => aim(o, INSIDE.x, INSIDE.y, INSIDE.z - 0.2, 0.1, 0.37, 9.6, frames.plant, 20) },
  // The facts land on the operations display: the camera walks up to it so it can be read
  { t: atSection(S.signal, 0.42), stop: true, at: (o) => aim(o, BOARD.x, BOARD.y, BOARD.z, 0.04, 0.12, 6.4, frames.plant, 20) },
  { t: atSection(S.signal, 1), stop: true, at: (o) => aim(o, BOARD.x, BOARD.y - 0.05, BOARD.z, 0.02, 0.1, 6, frames.plant, 20) },
  // Out of Plant 01 and back down the road to Plant 02
  { t: S.decision - 0.14, stop: false, at: (o) => aim(o, 0, 0, -1, 0.02, 0.5, 70, wide, 22) },
  // 04 Decision: Plant 02's yard, pushing in a little while it loads
  { t: atDecision(0), stop: true, at: (o) => aim(o, P02 - 1, 1.2, 0.6, 0.04, 0.5, 34, frames.yard, 20) },
  { t: atDecision(DECISION.drive[0]), stop: true, at: (o) => aim(o, P02 - 1.4, 1.2, 0.8, -0.04, 0.48, 31, frames.yard, 20) },
  // The truck drives to Plant 01 and the camera goes with it
  { t: atDecision(DECISION.drive[1]), stop: true, at: (o) => aim(o, P01 + 1.5, 1.2, 0.6, -0.14, 0.46, 33, frames.yard, 20) },
  { t: atDecision(1), stop: true, at: (o) => aim(o, P01 + 1.5, 1.2, 0.4, -0.18, 0.47, 31, frames.yard, 20) },
  // 05 Foundation: on along the road to the head office, where the approval is recorded
  { t: atSection(S.foundation, 0), stop: true, at: (o) => aim(o, LAND.office.x, 5, LAND.office.z, 0.34, 0.2, 44, frames.found, 22) },
  { t: atSection(S.foundation, 1), stop: true, at: (o) => aim(o, LAND.office.x, 5, LAND.office.z - 0.6, 0.27, 0.18, 40, frames.found, 22) },
  // 06 Yours, golden hour: out over the whole harbour
  { t: atSection(S.yours, 0), stop: true, at: (o) => aim(o, 30, 2, -18, 0.08, 0.3, 124, frames.fn, 24) },
  { t: atSection(S.yours, 1), stop: true, at: (o) => aim(o, 31, 2, -18, 0.05, 0.3, 118, frames.fn, 24) },
  // 07 Industries: round to the quay side, the cranes and the ship in view
  { t: atSection(S.industries, 0), stop: true, at: (o) => aim(o, 46, 2, -24, -0.4, 0.34, 150, frames.ind, 24) },
  { t: atSection(S.industries, 1), stop: true, at: (o) => aim(o, 48, 2, -24, -0.34, 0.33, 144, frames.ind, 24) },
  // 08 Outcome, sunset: Plant 01 restocked, Plant 02 down the road, the quay behind
  { t: atSection(S.outcome, 0), stop: true, at: (o) => aim(o, 6, 3, -10, -0.16, 0.2, 100, frames.out, 24) },
  { t: atSection(S.outcome, 1), stop: true, at: (o) => aim(o, 7, 3, -11, -0.19, 0.19, 96, frames.out, 24) },
  // 07 How it works, dusk: out across the bay to the torii and the mountain, the island below
  { t: atSection(S.how, 0), stop: true, at: (o) => aim(o, 70, 10, -150, 0.12, 0.07, 340, frames.how, 26) },
  { t: atSection(S.how, 1), stop: true, at: (o) => aim(o, 72, 10, -152, 0.1, 0.07, 330, frames.how, 26) },
  // 08 Night harbour
  { t: N - 1, stop: true, at: (o) => aim(o, 20, 4, -36, 0.16, 0.13, 210, frames.ask, 26) },
];

const ka = shot();
const kb = shot();
const cam = shot();
/** Hermite blend: eases out of a stop and into the next, runs straight through a pass. */
function ease(u: number, m0: number, m1: number) {
  const u2 = u * u;
  const u3 = u2 * u;
  return 3 * u2 - 2 * u3 + m0 * (u3 - 2 * u2 + u) + m1 * (u3 - u2);
}

/** The shot at story time t. */
function shotAt(t: number, out: Shot) {
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const u = span(t, a.t, b.t);
  const k = ease(u, a.stop ? 0 : 1, b.stop ? 0 : 1);
  a.at(ka);
  b.at(kb);
  out.x = mix(ka.x, kb.x, k);
  out.y = mix(ka.y, kb.y, k);
  out.z = mix(ka.z, kb.z, k);
  out.yaw = mix(ka.yaw, kb.yaw, k);
  out.pitch = mix(ka.pitch, kb.pitch, k);
  out.fov = mix(ka.fov, kb.fov, k);
  out.d = Math.exp(mix(Math.log(ka.d), Math.log(kb.d), k));
  out.span = Math.exp(mix(Math.log(ka.span), Math.log(kb.span), k));
  out.cx = mix(ka.cx, kb.cx, k);
  out.cy = mix(ka.cy, kb.cy, k);
  return out;
}

/**
 * For readers who asked for less motion, the camera does not travel: each section holds its own
 * still shot, and between sections the world dims and comes back on the next one.
 */
function calmTime(): { t: number; dim: number } {
  const i = Math.min(Math.round(reel.s), N - 1);
  const f = reel.s - Math.floor(reel.s);
  const dim = Math.floor(reel.s) < N - 1 ? 1 - smooth(clamp01(Math.abs(f - 0.5) * 5)) : 0;
  return { t: atSection(i, reel.u[i]), dim };
}

let introStart = -1;
let lean = 0;
const lookAt = new THREE.Vector3();

/** Places the camera for this frame: the story's shot, an opening push on load, a lean to the pointer. */
function stepCamera({ camera, clock }: RootState, dt: number, stage: HTMLDivElement | null) {
  const c = camera as THREE.PerspectiveCamera;
  measureFrames();
  const live = story();
  const calm = reel.calm ? calmTime() : null;
  const t = calm ? calm.t : live;
  shotAt(t, cam);
  if (!reel.calm) {
    // The opening shot settles in once the loader lifts, then never quite stops: every held shot
    // drifts very slowly while you read, so the world is never a still picture.
    if (introStart < 0 && document.documentElement.classList.contains("ready")) introStart = clock.elapsedTime;
    const intro = introStart < 0 ? 1 : 1 - smoother(clamp01((clock.elapsedTime - introStart) / 3.2));
    const still = 1 - smooth(span(t, 0, 0.5));
    cam.d *= 1 + 0.08 * intro;
    cam.yaw += 0.05 * intro + Math.sin(clock.elapsedTime * 0.11) * (0.004 + still * 0.008);
    cam.pitch += Math.sin(clock.elapsedTime * 0.07 + 1.3) * 0.0025;
    lean = THREE.MathUtils.damp(lean, reel.pointer.x, 2.5, dt);
    cam.yaw += lean * 0.012;
  }
  stepDaylight(t);

  const cp = Math.cos(cam.pitch);
  c.position.set(cam.x + Math.sin(cam.yaw) * cp * cam.d, cam.y + Math.sin(cam.pitch) * cam.d, cam.z + Math.cos(cam.yaw) * cp * cam.d);
  c.lookAt(lookAt.set(cam.x, cam.y, cam.z));
  c.fov = cam.fov;
  c.near = Math.max(0.5, cam.d * 0.22);
  c.far = 9000;
  // Shift the picture so the target lands on its frame's centre rather than the screen's.
  c.setViewOffset(view.w, view.h, view.w / 2 - cam.cx, view.h / 2 - cam.cy, view.w, view.h);
  c.updateProjectionMatrix();
  c.updateMatrixWorld();
  if (stage) stage.style.opacity = calm ? (1 - calm.dim).toFixed(3) : "1";
}

function CameraRig({ stage }: { stage: React.RefObject<HTMLDivElement | null> }) {
  useFrame((state, dt) => stepCamera(state, dt, stage.current), -2);
  return null;
}

/* ------------------------------------------------------------------ */
/* Light and air                                                        */
/* ------------------------------------------------------------------ */

const keyTarget = new THREE.Object3D();
const lightRight = new THREE.Vector3();
const lightUp = new THREE.Vector3();

/** Sun to sky balance. The sky's own light (SkyLight) adds the rest of the ambient. */
const KEY_GAIN = 1.9;
const FILL_GAIN = 0.4;

/** Fits the key light's shadow to what the camera is looking at, and gives it the hour's colour. */
function stepSun(l: THREE.DirectionalLight | null, hemi: THREE.HemisphereLight | null, map: number) {
  if (!l) return;
  const dir = daylight.keyDir;
  const extent = THREE.MathUtils.clamp(cam.span * 0.62, 7, 80);
  // Snap to the shadow map's texels so its edges hold still while the camera moves.
  const texel = (2 * extent) / map;
  lightRight.crossVectors(THREE.Object3D.DEFAULT_UP, dir).normalize();
  lightUp.crossVectors(dir, lightRight).normalize();
  keyTarget.position.set(cam.x, Math.min(cam.y, 4), cam.z);
  const r = Math.round(keyTarget.position.dot(lightRight) / texel) * texel - keyTarget.position.dot(lightRight);
  const u = Math.round(keyTarget.position.dot(lightUp) / texel) * texel - keyTarget.position.dot(lightUp);
  keyTarget.position.addScaledVector(lightRight, r).addScaledVector(lightUp, u);
  keyTarget.updateMatrixWorld();
  l.position.copy(keyTarget.position).addScaledVector(dir, 120);
  // Bias in shadow-map texels: as the sun lowers and the shadow widens, a fixed bias left the
  // painted floor lines striped with acne that crawled as the scroll moved the sun.
  l.shadow.normalBias = Math.max(0.03, texel * 2.4);
  l.color.copy(daylight.key);
  // Outdoor light is mostly sun: a strong key over a soft sky fill, so shadows read and forms model.
  l.intensity = daylight.keyPower * KEY_GAIN;
  const c = l.shadow.camera;
  if (c.right !== extent) {
    c.left = c.bottom = -extent;
    c.right = c.top = extent;
    c.updateProjectionMatrix();
  }
  if (hemi) {
    hemi.color.copy(daylight.fillSky);
    hemi.groundColor.copy(daylight.fillGround);
    hemi.intensity = daylight.fillPower * FILL_GAIN;
  }
}

/** One light at a time for the whole world: the sun by day, the moon by night. */
function Sun() {
  const light = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const map = isPhone() ? 2048 : 4096;
  useFrame(({ clock }) => {
    stepSun(light.current, hemi.current, map);
    stepSkyUniforms(clock.elapsedTime);
    stepGlow();
  }, -1);
  return (
    <>
      <primitive object={keyTarget} />
      <hemisphereLight ref={hemi} args={["#CFDCF2", "#B2BDCB", 0.7]} />
      <directionalLight
        ref={light}
        target={keyTarget}
        castShadow
        shadow-mapSize={[map, map]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
        shadow-radius={6}
        shadow-blurSamples={16}
        shadow-camera-near={1}
        shadow-camera-far={300}
      />
    </>
  );
}

/** The air between the camera and the far side of the island: it takes the colour of the hour. */
const haze = new THREE.Fog("#DEE7F1", 200, 1200);
function Haze() {
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    setFog(scene, haze);
    return () => setFog(scene, null);
  }, [scene]);
  useFrame(() => {
    haze.color.copy(daylight.haze).lerp(daylight.horizon, 0.5);
    haze.near = cam.d + Math.max(cam.span * 0.25, 30);
    haze.far = cam.d + Math.max(cam.span * 5, 600);
  });
  return null;
}

function setFog(scene: THREE.Scene, fog: THREE.Fog | null) {
  scene.fog = fog;
}

/* ------------------------------------------------------------------ */
/* Plant 01: the cut, the rack, the display, the status light          */
/* ------------------------------------------------------------------ */

/**
 * The section cut through Plant 01: everything above `top` and everything in front of `front` (in
 * the plant's own z) is cut away. Closed, both sit clear of the building; open, the roof and the
 * front wall are gone and you look straight in at the partition, the rack and the display.
 */
const cutTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), 12);
const cutFront = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
const CUT = [cutTop, cutFront];
function stepCut(t: number) {
  const open = smoother(span(t, 1.62, 1.96)) * (1 - smoother(span(t, 2.72, 2.88)));
  cutTop.constant = mix(12, 4.98, open);
  cutFront.constant = LAND.plantZ + mix(7, 2.6, open);
}

/** Totes on hand: 16 at 15 units each is 240; safety stock (175) is just under 12. */
const START_TOTES = RACK_SLOTS;
const END_TOTES = 10;
const SAFETY_TOTES = 175 / 15;
const RACK_Z = PLANT01.wall.z + RACK.depth / 2 + 0.12;
/** When each fact lands on the display, as signal progress. */
const FACT_AT = (i: number) => 0.36 + i * 0.05;

function Inside() {
  const totes = useRef<(THREE.Group | null)[]>([]);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  const contact = useRef<THREE.Group>(null);
  const [slots] = useState(() => Array.from({ length: RACK_SLOTS }, (_, i) => rackSlot(i, new THREE.Vector3())));
  const [ops] = useState(opsScreen);
  useFrame(({ clock }) => {
    const t = story();
    stepCut(t);
    // The floor's contact shadow is only worth drawing while we can see in.
    if (contact.current) contact.current.visible = t > 1.5 && t < 2.95;
    const u = reel.u[S.signal];
    // Stock runs down day by day: Line 2 draws totes from the back of the rack, through the curtain.
    const left = mix(START_TOTES, END_TOTES, smoother(span(u, 0.04, 0.3)));
    totes.current.forEach((g, i) => {
      if (!g) return;
      const out = clamp01(i + 1 - left);
      g.visible = out < 1;
      g.position.copy(slots[i]);
      g.position.z -= smoother(out) * 1.9;
    });
    // The rack's beacon glows and fades slowly once stock is under the safety line.
    if (beacon.current) beacon.current.emissiveIntensity = left < SAFETY_TOTES ? 1.2 + Math.sin(clock.elapsedTime * 1.6) * 0.4 : 0;
    const step = u < 0.32 ? 0 : u < 0.68 ? 1 : 2;
    let facts = 0;
    for (let i = 0; i < 6; i++) if (u >= FACT_AT(i)) facts++;
    ops.update({ step, facts, units: Math.round(240 - 95 * smoother(span(u, 0.04, 0.3))) });
  });
  const { rack, wall, screen, floor } = PLANT01;
  return (
    <group position={INSIDE.toArray()}>
      <PlantFloor screen={ops.texture} span={INSIDE_SPAN} />
      <group position={[rack.x, 0, RACK_Z]}>
        <RackFrame beacon={beacon} />
        {slots.map((_, i) => (
          <group key={i} ref={(g) => void (totes.current[i] = g)}>
            <Tote material={skuTote()} />
          </group>
        ))}
      </group>
      {/* The stock controller: the count falling on her tablet is the first sign */}
      <Person look="warehouse" pose="tablet" seed={0.7} position={[rack.x + 2.25, 0, wall.z + 1.75]} rotation-y={Math.PI + 0.55} />
      {/* The planner, reading the display: the facts arrive there, then the recommendation */}
      <Person look="planner" pose="tablet" seed={2.4} position={[screen.x + screen.w / 2 + 0.7, 0, wall.z + 1.5]} rotation-y={-Math.PI / 2 + 0.5} />
      <group ref={contact} position-y={0.035}>
        <Contact w={floor.w} d={floor.d} far={0.8} blur={2.2} opacity={0.55} position-z={wall.z + floor.d / 2} />
      </group>
    </group>
  );
}

const AMBER = new THREE.Color(TINTS.saffron);
const CORAL = new THREE.Color("#E8573F");
const SAGE = new THREE.Color(TINTS.emerald);
/**
 * Plant 01's status light on its roof, visible from anywhere on the island: amber while stock runs
 * down, coral once it is under safety stock, green when the transfer has arrived. It changes
 * colour slowly and glows; it never flashes.
 */
const status = {
  lamp: new THREE.MeshStandardMaterial({ color: "#E8EBF0", emissive: AMBER.clone(), emissiveIntensity: 1.4, roughness: 0.3 }),
  halo: new THREE.MeshBasicMaterial({ color: AMBER.clone(), transparent: true, opacity: 0.22, depthWrite: false, fog: false }),
  mast: new THREE.MeshStandardMaterial({ color: "#5A6476", roughness: 0.5, metalness: 0.5 }),
  want: new THREE.Color(),
};
function stepStatus(dt: number) {
  const t = story();
  const u = reel.u[S.signal];
  const short = (t > 2 && u > 0.2) || t >= 3;
  const arrived = decisionU() >= DECISION.drive[1] - 0.01;
  status.want.copy(arrived ? SAGE : short ? CORAL : AMBER);
  status.lamp.emissive.lerp(status.want, 1 - Math.exp(-dt * 2.5));
  status.halo.color.copy(status.lamp.emissive);
  status.lamp.emissiveIntensity = 1.2 + daylight.lamps * 1.4;
  // Close up (inside the plant) the halo would fill the frame: it only shows from a distance.
  status.halo.opacity = (0.14 + daylight.lamps * 0.3) * span(cam.d, 70, 140);
}
function StatusLight() {
  useFrame((_, dt) => stepStatus(dt));
  return (
    <group position={[P01 + PLANT.W / 2 - 1.6, PLANT.H + 0.1, LAND.plantZ + PLANT.D / 2 - 1.2]}>
      <mesh position-y={1.1} material={status.mast}>
        <cylinderGeometry args={[0.06, 0.08, 2.2, 8]} />
      </mesh>
      <mesh position-y={2.4} material={status.lamp}>
        <sphereGeometry args={[0.32, 16, 12]} />
      </mesh>
      <mesh position-y={2.4} material={status.halo}>
        <sphereGeometry args={[0.9, 16, 12]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Plant 02's yard: the forklift loads, the truck drives to Plant 01    */
/* ------------------------------------------------------------------ */

const DECK_Z = -0.72;
const BAY_Z = YARD.bayZ;
const TRUCK_Z = YARD.truckZ;
const WAIT_Z = BAY_Z - FORK.load - 1.0;
const PICK_Z = BAY_Z - FORK.load;
const PLACE_Z = TRUCK_Z + DECK_Z - FORK.load;
const FACE = -Math.PI / 2; // the forklift model faces +x; this turns it to face the trailer (+z)
const PARK: [number, number] = [bayX(5) + 2.4, WAIT_Z - 0.3];

type Lift = { x: number; z: number; yaw: number; h: number; active: number; v: number };
const bez = (a: number, b: number, c: number, d: number, u: number) => {
  const w = 1 - u;
  return w * w * w * a + 3 * w * w * u * b + 3 * w * u * u * c + u * u * u * d;
};

/** Where the forklift is and how high its forks are, at decision progress u. */
function liftAt(u: number, out: Lift): Lift {
  const all = (u - DECISION.load) / DECISION.each;
  if (all < 0) return Object.assign(out, { x: bayX(0), z: WAIT_Z, yaw: FACE, h: 0.06, active: -1, v: 0 });
  if (all >= 6) return Object.assign(out, { x: PARK[0], z: PARK[1], yaw: FACE, h: 0.06, active: 6, v: 0 });
  const k = Math.floor(all);
  const v = all - k;
  const x = bayX(k);
  out.active = k;
  out.v = v;
  out.yaw = FACE;
  if (v < 0.14) return Object.assign(out, { x, z: mix(WAIT_Z, PICK_Z, smoother(v / 0.14)), h: 0.06 });
  if (v < 0.22) return Object.assign(out, { x, z: PICK_Z, h: mix(0.06, 0.3, smoother((v - 0.14) / 0.08)) });
  if (v < 0.58) return Object.assign(out, { x, z: mix(PICK_Z, PLACE_Z, smoother((v - 0.22) / 0.36)), h: mix(0.3, 1.78, smoother(span(v, 0.26, 0.5))) });
  if (v < 0.68) return Object.assign(out, { x, z: PLACE_Z, h: mix(1.78, 1.42, smoother((v - 0.58) / 0.1)) });
  // Reverse out on a curve to the next bay (or to park), lowering the forks.
  const r = smoother((v - 0.68) / 0.32);
  const [nx, nz] = k < 5 ? [bayX(k + 1), WAIT_Z] : PARK;
  const z0 = PLACE_Z,
    z1 = PLACE_Z - 1.4,
    z2 = nz + 0.6,
    z3 = nz;
  const px = bez(x, x, nx, nx, r);
  const pz = bez(z0, z1, z2, z3, r);
  const r2 = Math.min(r + 0.01, 1);
  const r1 = r2 - 0.01;
  const dx = bez(x, x, nx, nx, r2) - bez(x, x, nx, nx, r1);
  const dz = bez(z0, z1, z2, z3, r2) - bez(z0, z1, z2, z3, r1);
  // Reversing: the forks point against the direction of travel.
  out.yaw = Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dz, -dx) : FACE;
  return Object.assign(out, { x: px, z: pz, h: mix(1.42, 0.06, smoother(span(r, 0, 0.6))) });
}

/** Each pallet: 0 staged in its bay, 1 on the forks, 2 on the trailer. */
function palletState(n: number, lift: Lift) {
  if (n < lift.active) return 2;
  if (n > lift.active) return 0;
  return lift.v < 0.17 ? 0 : lift.v < 0.64 ? 1 : 2;
}

function Yard() {
  const truck = useRef<THREE.Group>(null);
  const driver = useRef<THREE.Group>(null);
  const fork = useRef<THREE.Group>(null);
  const staged = useRef<(THREE.Group | null)[]>([]);
  const loaded = useRef<(THREE.Group | null)[]>([]);
  const carried = useRef<THREE.Group>(null);
  const lift = useMemo<Lift>(() => ({ x: 0, z: 0, yaw: FACE, h: 0.06, active: -1, v: 0 }), []);
  const height = useRef(0.06);

  useFrame(() => {
    const u = decisionU();
    liftAt(u, lift);
    height.current = lift.h;
    if (fork.current) {
      fork.current.position.set(lift.x, 0.01, lift.z);
      fork.current.rotation.y = lift.yaw;
    }
    for (let n = 0; n < 6; n++) {
      const st = palletState(n, lift);
      if (staged.current[n]) staged.current[n]!.visible = st === 0;
      if (loaded.current[n]) loaded.current[n]!.visible = st === 2;
    }
    if (carried.current) carried.current.visible = lift.active >= 0 && lift.active < 6 && palletState(lift.active, lift) === 1;
    if (truck.current) truck.current.position.x = truckX(u);
    // The driver waits by the cab until loading is done, then is in it for the drive.
    if (driver.current) driver.current.visible = u < DECISION.drive[0] - 0.02;
  });

  return (
    <group>
      {PALLET_SLOTS.map((_, n) => (
        <group key={n} ref={(g) => void (staged.current[n] = g)} position={[bayX(n), 0.01, BAY_Z]} rotation-y={Math.PI / 2}>
          <LoadedPallet tote={skuTote()} />
        </group>
      ))}
      <group ref={truck} position={[YARD.truckX, 0.01, TRUCK_Z]}>
        <SemiTruck cab="#2B3346" accent={TINTS.cobalt}>
          {PALLET_SLOTS.map((x, n) => (
            <group key={n} ref={(g) => void (loaded.current[n] = g)} position={[x, TRUCK.deckY, DECK_Z]} rotation-y={Math.PI / 2} visible={false}>
              <LoadedPallet tote={skuTote()} />
            </group>
          ))}
        </SemiTruck>
      </group>
      <group ref={driver}>
        <Person look="driver" pose="stand" seed={3.3} position={[YARD.truckX + TRUCK.front - 0.6, 0.01, TRUCK_Z + 1.9]} rotation-y={-0.4} />
      </group>
      <group ref={fork}>
        <Forklift color={TINTS.saffron} lift={() => height.current}>
          <group ref={carried} rotation-y={Math.PI / 2} visible={false}>
            <LoadedPallet tote={skuTote()} />
          </group>
        </Forklift>
      </group>
      <DispatchBoard>
        <BoardPlate />
      </DispatchBoard>
      {/* The planner who approves it, at the dispatch board */}
      <Person look="planner" pose="tablet" seed={1.1} position={[YARD.board.x + 2.3, 0.01, YARD.board.z + 1.2]} rotation-y={Math.PI - 0.2} />
    </group>
  );
}

/** The decision, posted on the dispatch board. On approval it turns over, like a card, to show it approved. */
function BoardPlate() {
  const pending = useRef<THREE.Group>(null);
  const approved = useRef<THREE.Group>(null);
  const flip = useRef(0);
  useFrame((_, dt) => {
    flip.current = THREE.MathUtils.damp(flip.current, reel.approved ? 1 : 0, 5, dt);
    const f = flip.current;
    if (pending.current) pending.current.scale.x = Math.max(1 - f * 2, 1e-3);
    if (approved.current) approved.current.scale.x = Math.max(f * 2 - 1, 1e-3);
  });
  return (
    <group position-z={0.09} rotation-x={Math.PI / 2} scale={2.5 / PLATE.w}>
      <group ref={pending}>
        <DecisionPlate />
      </group>
      <group ref={approved} scale-x={1e-3}>
        <DecisionPlate approved />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The harbour and its people                                           */
/* ------------------------------------------------------------------ */

function Harbour() {
  const slots = useMemo(() => yardSlots(), []);
  const [c0, c1] = SITE.quay.cranes;
  const q = SITE.quay;
  return (
    <group>
      <SeaWall />
      <Crane position={[c0, 0, q.seaLegs]} trolley={-16} hoist={9} />
      <Crane position={[c1, 0, q.seaLegs]} trolley={-6} hoist={4} />
      <Containers slots={slots} />
      <MooredShip />
      <InboundShip />
      <Pier />
      <FishingBoat position={[SITE.pier.x1 + 6, 0, SITE.pier.z + 5.2]} rotation-y={0.15} />
      {[-30, 16, 60, 120].map((x) => (
        <Floodlight key={x} position={[x, 0, -42.5]} />
      ))}
      {/* The dock manager on the quay with the berth plan, and two lashers by the ship */}
      <Person look="engineer" pose="tablet" seed={4.2} position={[c0 + 9, 0, q.seaLegs + 4]} rotation-y={Math.PI * 0.85} />
      <Person look="crew" pose="point" seed={5.1} position={[c1 - 9, 0, q.seaLegs + 1.6]} rotation-y={Math.PI} />
      <Person look="crew" pose="stand" seed={6.4} position={[c1 - 7.5, 0, q.seaLegs + 2.4]} rotation-y={Math.PI * 1.1} />
      {/* Someone fishing off the end of the pier at dawn */}
      <Person look="driver" pose="stand" seed={7.7} position={[SITE.pier.x1 + 2, 0.24, SITE.pier.z - 1]} rotation-y={-Math.PI / 2} />
      <group position={[ISLET.x, WATER_Y, ISLET.z]}>
        <Islet />
        <Torii position={[0, -0.4, 16]} rotation-y={0.08} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Pins: live figures on the page, pinned over places in the world      */
/* ------------------------------------------------------------------ */

const pinAt = new THREE.Vector3();
const camDir = new THREE.Vector3();
/**
 * Each tag card's size, kept up to date by a ResizeObserver, so the frame loop never reads layout
 * (reading offsetWidth after moving a tag forced the whole page to lay out again, every tag, every frame).
 * A card hidden by CSS (display: none on phones) measures 0 and is skipped.
 */
const cardSize = new WeakMap<Element, { w: number; h: number }>();
const sizer =
  typeof window !== "undefined"
    ? new ResizeObserver((entries) => {
        for (const e of entries) {
          const b = e.borderBoxSize?.[0];
          cardSize.set(e.target, b ? { w: b.inlineSize, h: b.blockSize } : { w: (e.target as HTMLElement).offsetWidth, h: (e.target as HTMLElement).offsetHeight });
        }
      })
    : null;
/** Places a DOM tag at a point in the world, in screen pixels. */
function pin(el: HTMLElement | null, x: number, y: number, z: number, on: boolean, camera: THREE.Camera) {
  if (!el) return;
  // A tag that is off and already hidden costs nothing.
  if (!on && el.dataset.on === "false") return;
  pinAt.set(x, y, z);
  // Behind the camera: hide it rather than mirror it onto the screen.
  camera.getWorldDirection(camDir);
  const ahead = pinAt.clone().sub(camera.position).dot(camDir) > 0;
  pinAt.project(camera);
  const px = ((pinAt.x + 1) / 2) * view.w;
  const py = ((1 - pinAt.y) / 2) * view.h;
  pinAt.set(px, py, 0);
  el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
  // Keep the tag's card on screen; its stem still points at the place.
  const card = el.firstElementChild as HTMLElement | null;
  if (card) {
    const half = (cardSize.get(card)?.w ?? 0) / 2;
    const dx = Math.min(Math.max(px, half + 12), view.w - half - 12) - px;
    card.style.setProperty("--dx", `${dx.toFixed(1)}px`);
  }
  // A tag whose place sits up under the nav would be cut off: it waits until its place is lower.
  const want = String(on && ahead && py > 150);
  if (el.dataset.on !== want) el.dataset.on = want;
}

const roof = PLANT.H + 1.6;
/** True while a held section's shot is on screen (from just before it settles to just after its pin lets go). */
const during = (i: number, t: number) => t > i - 0.015 && t < atSection(i, 1) + 0.02;
type PinSpec = { at: () => [number, number, number]; on: (t: number) => boolean };
/** Every tag in the world, by id: where it points and when it shows. */
const PINS: Record<string, PinSpec> = {
  // Hero
  p02: { at: () => [P02 - 5, roof + 1.5, LAND.plantZ - 2], on: (t) => t < 0.12 },
  p01: { at: () => [P01 + 3, roof, LAND.plantZ], on: (t) => t < 0.12 },
  trf: { at: () => [truckX(decisionU()) + TRUCK.front - 1, 4.2, TRUCK_Z], on: (t) => t < 0.12 },
  // Systems: each system is a place on the island
  erp: { at: () => [LAND.office.x, 14.5, LAND.office.z], on: (t) => during(S.systems, t) },
  crm: { at: () => [LAND.sales.x, 8.5, LAND.sales.z], on: (t) => during(S.systems, t) },
  mes: { at: () => [P01 + 4, roof, LAND.plantZ], on: (t) => during(S.systems, t) },
  wms: { at: () => [P02 - 2, roof, LAND.plantZ], on: (t) => during(S.systems, t) },
  sup: { at: () => [SITE.inbound.x0 + (SITE.inbound.x1 - SITE.inbound.x0) * Math.min(story() / 7, 1), 16, SITE.inbound.z], on: (t) => during(S.systems, t) },
  ext: { at: () => [YARD.truckX + TRUCK_MID, 5, TRUCK_Z], on: (t) => during(S.systems, t) },
  // The decision delivered
  arr: { at: () => [P01 + 3, roof, LAND.plantZ], on: (t) => decisionU() > DECISION.drive[1] - 0.01 && t > S.decision + 0.5 && t < S.decision + 0.9 },
  // Yours: each business area is a place on the island
  "f-sc": { at: () => [83, 9, -30], on: (t) => during(S.yours, t) },
  "f-op": { at: () => [P01, roof, LAND.plantZ], on: (t) => during(S.yours, t) },
  "f-co": { at: () => [LAND.sales.x + 2, 8, LAND.sales.z + 2], on: (t) => during(S.yours, t) },
  "f-cu": { at: () => [LAND.service.x + 3, 15, LAND.service.z], on: (t) => during(S.yours, t) },
  "f-fi": { at: () => [LAND.office.x, 14.5, LAND.office.z], on: (t) => during(S.yours, t) },
  // Industries: each is a place in the bay
  "i-mf": { at: () => [P01 + 2, roof, LAND.plantZ], on: (t) => during(S.industries, t) },
  "i-au": { at: () => [ARRIVE_X + TRUCK_MID, 5, TRUCK_Z], on: (t) => during(S.industries, t) },
  "i-re": { at: () => [P02, roof, LAND.plantZ], on: (t) => during(S.industries, t) },
  "i-lo": { at: () => [SITE.quay.ship.x, 22, SITE.quay.ship.z], on: (t) => during(S.industries, t) },
  "i-fs": { at: () => [LAND.office.x, 14.5, LAND.office.z], on: (t) => during(S.industries, t) },
  "i-en": { at: () => [60, 19.5, -42.5], on: (t) => during(S.industries, t) },
  // Outcome
  "o-time": { at: () => [ARRIVE_X + TRUCK_MID, 5.4, TRUCK_Z], on: (t) => during(S.outcome, t) },
  "o-kept": { at: () => [P02 - 2, roof, LAND.plantZ], on: (t) => during(S.outcome, t) },
  "o-cases": { at: () => [LAND.service.x, 8.5, LAND.service.z], on: (t) => during(S.outcome, t) },
};

type Placed = { x: number; top: number; bottom: number; w: number };
const lift = new WeakMap<HTMLElement, number>();

/**
 * Tags never cover each other: the lowest tag on screen stays on its place, and any tag that would
 * overlap one already placed is lifted on a longer stem until it clears, easing into position.
 */
function declutter(items: { el: HTMLElement; x: number; y: number }[], dt: number) {
  items.sort((a, b) => b.y - a.y);
  const placed: Placed[] = [];
  for (const it of items) {
    const card = it.el.firstElementChild as HTMLElement | null;
    if (!card) continue;
    const size = cardSize.get(card);
    if (!size) continue;
    const { w, h } = size;
    const dx = parseFloat(card.style.getPropertyValue("--dx") || "0");
    const cx = it.x + dx;
    let want = 0;
    for (let guard = 0; guard < 8; guard++) {
      const bottom = it.y - 14 - want;
      const top = bottom - h;
      const hit = placed.find((p) => Math.abs(p.x - cx) < (p.w + w) / 2 + 6 && top < p.bottom + 6 && bottom > p.top - 6);
      if (!hit) break;
      want += bottom - (hit.top - 6);
    }
    want = Math.min(want, 160);
    const prev = lift.get(it.el) ?? want;
    const dy = THREE.MathUtils.damp(prev, want, 10, dt);
    lift.set(it.el, dy);
    card.style.setProperty("--dy", `${dy.toFixed(1)}px`);
    const bottom = it.y - 14 - want;
    placed.push({ x: cx, top: bottom - h, bottom, w });
  }
}

function Pins() {
  const els = useRef<[HTMLElement, PinSpec][]>([]);
  useLayoutEffect(() => {
    els.current = Object.entries(PINS)
      .map(([id, spec]) => [document.querySelector<HTMLElement>(`[data-pin='${id}']`), spec] as [HTMLElement | null, PinSpec])
      .filter((e): e is [HTMLElement, PinSpec] => !!e[0]);
    for (const [el] of els.current) if (el.firstElementChild) sizer?.observe(el.firstElementChild);
    return () => els.current.forEach(([el]) => el.firstElementChild && sizer?.unobserve(el.firstElementChild));
  }, []);
  useFrame(({ camera }, dt) => {
    const t = reel.calm ? calmTime().t : story();
    const shown: { el: HTMLElement; x: number; y: number }[] = [];
    for (const [el, spec] of els.current) {
      const [x, y, z] = spec.at();
      pin(el, x, y, z, spec.on(t), camera);
      const card = el.firstElementChild;
      if (el.dataset.on === "true" && card && (cardSize.get(card)?.w ?? 0) > 0) shown.push({ el, x: pinAt.x, y: pinAt.y });
    }
    declutter(shown, dt);
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Frame loop                                                           */
/* ------------------------------------------------------------------ */

function Viewport() {
  useFrame(({ size }) => {
    view.w = size.width;
    view.h = size.height;
  }, -3);
  return null;
}

function Renderer() {
  const told = useRef(false);
  const ready = useRef(false);
  const shadow = useRef({ t: NaN, n: 0 });
  const get = useThree((s) => s.get);
  useLayoutEffect(() => {
    const { gl, scene, camera } = get();
    // Compile every shader before the first frame, in parallel where the GPU driver allows
    // (KHR_parallel_shader_compile), instead of stalling the first render for seconds.
    gl.shadowMap.autoUpdate = false;
    let alive = true;
    gl.compileAsync(scene, camera)
      .catch(() => {})
      .then(() => alive && (ready.current = true));
    return () => {
      alive = false;
    };
  }, [get]);
  useFrame(({ gl, scene, camera }) => {
    if (!ready.current) return;
    if (!told.current) performance.mark("world:first-render-start");
    // The sun's shadow map is redrawn when the story moves (camera, sun or truck), and a few times
    // a second otherwise for the people and boats idling in place.
    const t = story();
    const s = shadow.current;
    if (t !== s.t || ++s.n % 6 === 0) gl.shadowMap.needsUpdate = true;
    s.t = t;
    gl.render(scene, camera);
    // The loader waits for the first drawn frame, so its curtain always lifts onto the bay.
    if (!told.current) {
      told.current = true;
      performance.mark("world:drawn");
      document.documentElement.dataset.world = "drawn";
      window.dispatchEvent(new Event("world-drawn"));
    }
  }, 1);
  return null;
}

/** Draws each frame right after the smooth scroll has moved the page, on the same ticker. */
function ScrollSync() {
  const advance = useThree((s) => s.advance);
  useLayoutEffect(() => {
    // With frameloop "never", R3F takes this as its clock in seconds: pass seconds since mount.
    const start = performance.now();
    const tick = () => advance((performance.now() - start) / 1000);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance]);
  return null;
}

function Scene({ stage }: { stage: React.RefObject<HTMLDivElement | null> }) {
  if (!performance.getEntriesByName("world:scene").length) performance.mark("world:scene");
  useLayoutEffect(() => {
    for (const k of FRAME_KEYS) anchorEls[k] = document.querySelector(`[data-frame='${k}']`);
  }, []);
  return (
    <>
      <ScrollSync />
      <Viewport />
      <CameraRig stage={stage} />
      <SkyLight intensity={0.8} />
      <Sun />
      <Haze />
      <SkyDome />
      <Clouds />
      <FarShore />
      <Gulls />
      <Water />
      <Ground />
      {/* Everything that never moves is merged into a few meshes per material (see Bake) */}
      <Bake>
        <Verges />
        <Harbour />
        <group position={[P02, 0, LAND.plantZ]}>
          <Plant accent={TINTS.saffron} name="PLANT 02" />
        </group>
        <group position={[P01, 0, LAND.plantZ]}>
          <Plant accent={TINTS.cobalt} name="PLANT 01" cut={CUT} />
        </group>
        <HeadOffice position={[LAND.office.x, 0, LAND.office.z]} />
        <SalesOffice position={[LAND.sales.x, 0, LAND.sales.z]} />
        <ServiceCentre position={[LAND.service.x, 0, LAND.service.z]} />
      </Bake>
      <StatusLight />
      <Inside />
      <Yard />
      <Contact w={100} d={66} far={0.7} blur={1.7} opacity={0.55} position={[14, 0.01, -19]} res={1536} color="#1A2440" />
      <Pins />
      <Renderer />
    </>
  );
}

export default function World() {
  const [q] = useState(canvasQuality);
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} className="reel-world" aria-hidden>
      <Canvas
        shadows="percentage"
        frameloop="never"
        dpr={q.dpr}
        camera={{ fov: 22, near: 1, far: 9000, position: [0, 30, 260] }}
        gl={{ antialias: q.antialias, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          performance.mark("world:created");
          performance.mark("world:gl");
          // ?perf exposes the renderer for measuring load and frame cost, in any build.
          if (location.search.includes("perf")) (window as unknown as { __three: object }).__three = { gl, scene };
          gl.localClippingEnabled = true;
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <Suspense fallback={null}>
          <Scene stage={stage} />
        </Suspense>
      </Canvas>
    </div>
  );
}
