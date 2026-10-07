"use client";

// People, built in code and modelled in metres like the vehicles (1.76 m tall, facing +x).
// Each body segment is one merged, vertex-coloured mesh, so a person costs about a dozen draw calls.
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Pose = "stand" | "walk" | "sit" | "tablet" | "point" | "wave";

/** Outfits. `vest` is the hi-vis colour (or null), `hat` the hard hat colour (or null for hair). */
export type Look = { skin: string; shirt: string; trousers: string; vest: string | null; hat: string | null; hair: string; boots: string };

const SKIN = ["#8A5A3C", "#C48A62", "#E2B48E", "#5C3A26", "#A86E4A"];
export const LOOKS: Record<string, Look> = {
  crew: { skin: SKIN[0], shirt: "#2F3A4A", trousers: "#262C36", vest: "#D7EE3A", hat: "#F4F2EC", hair: "#1E1A17", boots: "#4A3426" },
  warehouse: { skin: SKIN[1], shirt: "#3D4652", trousers: "#2A2F37", vest: "#FF7A1F", hat: "#F2C230", hair: "#2A211B", boots: "#3B2B20" },
  planner: { skin: SKIN[2], shirt: "#EEF1F5", trousers: "#2E3646", vest: null, hat: null, hair: "#3A2A1E", boots: "#2A2421" },
  driver: { skin: SKIN[3], shirt: "#33495F", trousers: "#272B33", vest: "#D7EE3A", hat: null, hair: "#141210", boots: "#2B231D" },
  engineer: { skin: SKIN[4], shirt: "#24486E", trousers: "#1F2836", vest: null, hat: "#2F6DF6", hair: "#1B1714", boots: "#3A2A1F" },
  shopper: { skin: SKIN[2], shirt: "#B5476A", trousers: "#3B4250", vest: null, hat: null, hair: "#5A3A22", boots: "#E9E6E0" },
};

/* ---------------- Geometry ---------------- */

const tint = new THREE.Color();
function paintGeo(g: THREE.BufferGeometry, color: string) {
  const geo = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(geo.attributes)) if (!["position", "normal"].includes(k)) geo.deleteAttribute(k);
  tint.set(color); // hex is sRGB; Color stores it in the linear working space
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([tint.r, tint.g, tint.b], i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return geo;
}
const fuse = (parts: [THREE.BufferGeometry, string][]) => mergeGeometries(parts.map(([g, c]) => paintGeo(g, c)), false)!;

const rb = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) =>
  new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)).translate(x, y, z);
/** Limb segment hanging down from its joint: tapered from r1 at the top to r2 at the bottom. */
const limb = (r1: number, r2: number, len: number, y0 = 0) => new THREE.CylinderGeometry(r2, r1, len, 14).translate(0, y0 - len / 2, 0);
const ball = (r: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => new THREE.SphereGeometry(r, 18, 14).scale(sx, sy, sz).translate(x, y, z);

const L = { hip: 0.95, hipW: 0.095, thigh: 0.43, shin: 0.4, shoulderY: 0.47, shoulderW: 0.205, upper: 0.29, fore: 0.26, neck: 0.6 };

const geoCache = new Map<string, Record<string, THREE.BufferGeometry>>();
function bodyParts(look: Look) {
  const key = JSON.stringify(look);
  const hit = geoCache.get(key);
  if (hit) return hit;
  const { skin, shirt, trousers, vest, hat, hair, boots } = look;
  const parts: Record<string, THREE.BufferGeometry> = {};

  parts.pelvis = fuse([
    [rb(0.2, 0.15, 0.31, 0.065, 0, -0.03, 0), trousers],
    [rb(0.205, 0.035, 0.315, 0.015, 0, 0.035, 0), "#1C1E22"], // belt
  ]);
  parts.thigh = fuse([[limb(0.085, 0.066, L.thigh), trousers], [ball(0.07, 0, -L.thigh, 0), trousers]]);
  parts.shin = fuse([
    [limb(0.064, 0.05, L.shin - 0.05), trousers],
    [rb(0.27, 0.1, 0.115, 0.04, 0.05, -L.shin + 0.0, 0), boots], // boot
    [rb(0.28, 0.025, 0.12, 0.01, 0.05, -L.shin - 0.045, 0), "#191A1C"], // sole
  ]);

  const torso: [THREE.BufferGeometry, string][] = [
    [rb(0.22, 0.56, 0.36, 0.1, 0, 0.27, 0), shirt],
    [ball(0.06, 0, L.shoulderY - 0.01, L.shoulderW - 0.02, 1, 0.85, 1), shirt],
    [ball(0.06, 0, L.shoulderY - 0.01, -(L.shoulderW - 0.02), 1, 0.85, 1), shirt],
    [limb(0.052, 0.05, 0.08, L.neck), skin], // neck
    [rb(0.2, 0.05, 0.2, 0.025, 0.0, 0.54, 0), shirt], // collar
  ];
  if (vest) {
    torso.push([rb(0.235, 0.42, 0.372, 0.09, 0, 0.25, 0), vest]);
    for (const y of [0.13, 0.29]) torso.push([rb(0.24, 0.035, 0.377, 0.015, 0, y, 0), "#D9DCE0"]); // reflective bands
    torso.push([rb(0.012, 0.36, 0.02, 0.005, 0.124, 0.26, 0), "#55601A"]); // zip
  } else {
    torso.push([rb(0.012, 0.42, 0.016, 0.005, 0.117, 0.28, 0.0), "#C9CED6"]); // placket
    torso.push([rb(0.01, 0.2, 0.012, 0.004, 0.118, 0.37, 0.05), "#2F6DF6"]); // lanyard
    torso.push([rb(0.012, 0.06, 0.045, 0.006, 0.122, 0.25, 0.05), "#FFFFFF"]); // badge
  }
  parts.torso = fuse(torso);

  const head: [THREE.BufferGeometry, string][] = [
    [ball(0.098, 0, 0.1, 0, 1, 1.16, 0.92), skin],
    [ball(0.018, 0.09, 0.09, 0, 1, 1.3, 1), skin], // nose
    [ball(0.022, 0, 0.1, 0.09, 0.6, 1, 0.6), skin], // ears
    [ball(0.022, 0, 0.1, -0.09, 0.6, 1, 0.6), skin],
    [ball(0.011, 0.082, 0.125, 0.035), "#1A1614"], // eyes
    [ball(0.011, 0.082, 0.125, -0.035), "#1A1614"],
    [rb(0.012, 0.007, 0.04, 0.003, 0.09, 0.055, 0), "#7A4636"], // mouth
  ];
  if (hat) {
    head.push([new THREE.SphereGeometry(0.122, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.06, 0.92, 1).translate(0, 0.145, 0), hat]);
    head.push([new THREE.CylinderGeometry(0.13, 0.132, 0.014, 24).scale(1.14, 1, 1).translate(0.02, 0.148, 0), hat]); // brim
    head.push([rb(0.2, 0.022, 0.028, 0.011, 0, 0.255, 0), hat]); // ridge
  } else {
    head.push([new THREE.SphereGeometry(0.103, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(1, 1.12, 0.96).translate(-0.01, 0.112, 0), hair]);
    head.push([ball(0.1, -0.025, 0.09, 0, 0.9, 1.05, 0.95), hair]); // back of the head
  }
  parts.head = fuse(head);

  parts.upper = fuse([[limb(0.056, 0.047, L.upper), shirt], [ball(0.05, 0, -L.upper, 0), shirt]]);
  parts.fore = fuse([
    [limb(0.047, 0.04, L.fore - 0.06), shirt],
    [limb(0.036, 0.034, 0.06, -(L.fore - 0.06)), skin], // wrist
    [rb(0.05, 0.095, 0.03, 0.014, 0.005, -L.fore - 0.04, 0), vest ? "#3A3D42" : skin], // gloved / bare hand
  ]);
  geoCache.set(key, parts);
  return parts;
}

let mat: THREE.MeshStandardMaterial | null = null;
const skinMat = () => (mat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 }));

const tabletGeo = () => fuse([[rb(0.02, 0.17, 0.25, 0.012), "#1E2126"], [rb(0.004, 0.145, 0.22, 0.004, 0.011, 0, 0), "#7FA6FF"]]);
let tabletCache: THREE.BufferGeometry | null = null;

/* ---------------- Person ---------------- */

type PersonProps = React.ComponentProps<"group"> & {
  look?: keyof typeof LOOKS | Look;
  pose?: Pose;
  /** Seconds offset so a crew never moves in step. */
  seed?: number;
  /** Walking speed in m/s, used to time the stride when `pose` is walk. */
  speed?: number;
};

const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), SC = new THREE.Vector3();
const INV = new THREE.Matrix4(), M4 = new THREE.Matrix4();

const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** One person. Joints are groups; the pose drives them each frame, with breathing and small glances. */
export function Person({ look = "crew", pose = "stand", seed = 0, speed = 1.3, ...props }: PersonProps) {
  const l = typeof look === "string" ? LOOKS[look] : look;
  const g = bodyParts(l);
  const pelvisJ = useRef<THREE.Group>(null), torsoJ = useRef<THREE.Group>(null), headJ = useRef<THREE.Group>(null);
  const thighLJ = useRef<THREE.Group>(null), thighRJ = useRef<THREE.Group>(null), shinLJ = useRef<THREE.Group>(null), shinRJ = useRef<THREE.Group>(null);
  const upLJ = useRef<THREE.Group>(null), upRJ = useRef<THREE.Group>(null), foLJ = useRef<THREE.Group>(null), foRJ = useRef<THREE.Group>(null);
  const calm = useMemo(() => still(), []);
  const rootJ = useRef<THREE.Group>(null);
  const statueJ = useRef<THREE.Mesh>(null);
  useEffect(() => () => statueJ.current?.geometry.dispose(), []);

  useFrame(({ clock, camera, size }) => {
    // Distance LOD: small on screen, the person is one merged mesh in their last pose (one draw call).
    const root = rootJ.current, statue = statueJ.current;
    let far = false;
    if (root && statue) {
      root.getWorldPosition(P0);
      root.getWorldScale(SC);
      P1.copy(P0);
      P1.y += 1.76 * SC.y;
      P0.project(camera);
      P1.project(camera);
      const px = (Math.abs(P1.y - P0.y) * size.height) / 2;
      far = px < (pose === "walk" ? 16 : 30);
      if (far && statue.userData.ready) {
        statue.visible = true;
        if (pelvisJ.current) pelvisJ.current.visible = false;
        return;
      }
      statue.visible = false;
      if (pelvisJ.current) pelvisJ.current.visible = true;
    }
    const j = { pelvis: pelvisJ.current, torso: torsoJ.current, head: headJ.current, thighL: thighLJ.current, thighR: thighRJ.current, shinL: shinLJ.current, shinR: shinRJ.current, upL: upLJ.current, upR: upRJ.current, foL: foLJ.current, foR: foRJ.current };
    if (!j.pelvis) return;
    const t = calm ? seed : clock.elapsedTime + seed;
    const breathe = Math.sin(t * 1.7) * 0.012;
    // Defaults: standing, arms relaxed, slight weight shift.
    let thighL = 0, thighR = 0, shinL = 0, shinR = 0, upL = 0.04, upR = 0.04, foL = 0.12, foR = 0.12, spread = 0.07;
    let lean = 0, headPitch = 0, headYaw = Math.sin(t * 0.37) * 0.35 * Math.max(0, Math.sin(t * 0.21)), bob = 0, sway = Math.sin(t * 0.5) * 0.015;
    if (pose === "walk") {
      const f = t * speed * 4.6;
      const s = Math.sin(f);
      thighL = 0.42 * s;
      thighR = -0.42 * s;
      shinL = -0.1 - 0.75 * Math.max(0, Math.sin(f - 1.2));
      shinR = -0.1 - 0.75 * Math.max(0, Math.sin(f - 1.2 + Math.PI));
      upL = -0.34 * s;
      upR = 0.34 * s;
      foL = 0.3 + 0.15 * Math.max(0, -s);
      foR = 0.3 + 0.15 * Math.max(0, s);
      bob = Math.abs(Math.cos(f)) * 0.025 - 0.02;
      lean = -0.05;
      headYaw *= 0.3;
      sway = Math.sin(f) * 0.02;
    } else if (pose === "sit") {
      thighL = thighR = Math.PI / 2 - 0.08;
      shinL = shinR = -Math.PI / 2 + 0.1;
      upL = upR = 0.62;
      foL = foR = 0.85;
      spread = 0.1;
      lean = 0.06;
      sway = 0;
    } else if (pose === "tablet") {
      upL = upR = 0.32;
      foL = foR = 1.2;
      spread = 0.04;
      headPitch = -0.38 + Math.max(0, Math.sin(t * 0.4)) * 0.35;
      headYaw *= 0.4;
    } else if (pose === "point") {
      upR = 1.35 + Math.sin(t * 1.3) * 0.05;
      foR = 0.12;
      headYaw = 0.1;
    } else if (pose === "wave") {
      upR = Math.PI - 0.5;
      foR = 0.5 + Math.sin(t * 6) * 0.35;
    }
    j.pelvis.position.y = (pose === "sit" ? 0 : L.hip) + bob;
    j.pelvis.rotation.x = sway;
    j.torso!.rotation.z = -lean;
    j.torso!.scale.set(1, 1 + breathe, 1 + breathe);
    j.head!.rotation.set(0, headYaw, headPitch);
    j.thighL!.rotation.z = thighL;
    j.thighR!.rotation.z = thighR;
    j.shinL!.rotation.z = shinL;
    j.shinR!.rotation.z = shinR;
    j.upL!.rotation.set(spread, 0, upL);
    j.upR!.rotation.set(-spread, 0, upR);
    j.foL!.rotation.z = foL;
    j.foR!.rotation.z = foR;
    if (far && root && statue && !statue.userData.ready) {
      root.updateMatrixWorld(true);
      INV.copy(root.matrixWorld).invert();
      const parts: THREE.BufferGeometry[] = [];
      j.pelvis.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) parts.push((o as THREE.Mesh).geometry.clone().applyMatrix4(M4.multiplyMatrices(INV, o.matrixWorld)));
      });
      statue.geometry = mergeGeometries(parts, false)!;
      parts.forEach((p) => p.dispose());
      statue.userData.ready = true;
    }
  });

  const m = skinMat();
  const side = (s: 1 | -1, k: "L" | "R") => (
    <group key={k}>
      <group ref={k === "L" ? thighLJ : thighRJ} position={[0, -0.04, s * L.hipW]}>
        <mesh geometry={g.thigh} material={m} castShadow />
        <group ref={k === "L" ? shinLJ : shinRJ} position-y={-L.thigh}>
          <mesh geometry={g.shin} material={m} castShadow />
        </group>
      </group>
    </group>
  );
  const arm = (s: 1 | -1, k: "L" | "R") => (
    <group key={k} ref={k === "L" ? upLJ : upRJ} position={[0, L.shoulderY - 0.02, s * (L.shoulderW + 0.015)]}>
      <mesh geometry={g.upper} material={m} castShadow />
      <group ref={k === "L" ? foLJ : foRJ} position-y={-L.upper}>
        <mesh geometry={g.fore} material={m} castShadow />
      </group>
    </group>
  );
  return (
    <group ref={rootJ} {...props}>
      <mesh ref={statueJ} material={m} visible={false} castShadow />
      <group ref={pelvisJ} position-y={L.hip}>
        <mesh geometry={g.pelvis} material={m} castShadow />
        {side(-1, "L")}
        {side(1, "R")}
        <group ref={torsoJ} position-y={0.04}>
          <mesh geometry={g.torso} material={m} castShadow />
          <group ref={headJ} position-y={L.neck + 0.02}>
            <mesh geometry={g.head} material={m} castShadow />
          </group>
          {arm(-1, "L")}
          {arm(1, "R")}
          {pose === "tablet" && (
            <mesh geometry={(tabletCache ??= tabletGeo())} material={m} position={[0.3, 0.18, 0]} rotation-z={0.9} castShadow />
          )}
        </group>
      </group>
    </group>
  );
}

/** A person walking a closed loop of [x, z] points at a steady pace, turning to face the way they go. */
export function Walker({ path, speed = 1.2, offset = 0, ...p }: Omit<PersonProps, "pose"> & { path: [number, number][]; offset?: number }) {
  const root = useRef<THREE.Group>(null);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(path.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, "centripetal"), [path]);
  const len = useMemo(() => curve.getLength(), [curve]);
  const calm = useMemo(() => still(), []);
  const tan = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    if (!root.current) return;
    const u = (((calm ? 0 : clock.elapsedTime) * speed) / len + offset) % 1;
    const at = curve.getPointAt(u);
    curve.getTangentAt(u, tan);
    root.current.position.set(at.x, 0, at.z);
    root.current.rotation.y = Math.atan2(-tan.z, tan.x);
  });
  return (
    <group ref={root}>
      <Person {...p} pose={calm ? "stand" : "walk"} speed={speed} />
    </group>
  );
}
