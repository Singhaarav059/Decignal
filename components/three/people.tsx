"use client";

// People, built in code and modelled in metres like the vehicles (about 1.76 m tall, facing +x).
// Bodies are lathed from anatomical profiles (chest, waist, calves, biceps), heads have a jaw, nose,
// eyes, brows and ears, and clothing is layered on top. Each body segment is one merged mesh with
// per-vertex colour and roughness, so skin, fabric, hard hats and reflective tape each read as what
// they are while a person still costs about a dozen draw calls (one when far away).
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Pose = "stand" | "walk" | "sit" | "tablet" | "point" | "wave";

type Hair = "short" | "crop" | "ponytail" | "bun" | "long";
type Headwear = { kind: "hardhat" | "cap"; color: string } | null;

/** An outfit and a body. `vest` is the hi-vis colour (or null). */
export type Look = {
  skin: string;
  shirt: string;
  trousers: string;
  vest: string | null;
  hat: string | null;
  hair: string;
  boots: string;
  body?: "m" | "f";
  hairStyle?: Hair;
  headwear?: Headwear;
  beard?: boolean;
  glasses?: boolean;
  /** Overall height, 1 = 1.76 m. */
  height?: number;
};

const SKIN = ["#8A5A3C", "#C48A62", "#E2B48E", "#5C3A26", "#A86E4A", "#D6A17A"];
export const LOOKS: Record<string, Look> = {
  crew: { skin: SKIN[0], shirt: "#2F3A4A", trousers: "#262C36", vest: "#D7EE3A", hat: "#EEEFF2", hair: "#181A1D", boots: "#2C3544", body: "m", hairStyle: "crop", beard: true, height: 1.02 },
  warehouse: { skin: SKIN[1], shirt: "#3D4652", trousers: "#2A2F37", vest: "#FF7A1F", hat: "#F2C230", hair: "#1D2128", boots: "#242B37", body: "f", hairStyle: "ponytail", height: 0.96 },
  planner: { skin: SKIN[2], shirt: "#EEF1F5", trousers: "#2E3646", vest: null, hat: null, hair: "#222936", boots: "#222429", body: "f", hairStyle: "bun", glasses: true, height: 0.97 },
  driver: { skin: SKIN[3], shirt: "#33495F", trousers: "#272B33", vest: "#D7EE3A", hat: null, hair: "#101214", boots: "#1F2329", body: "m", hairStyle: "short", headwear: { kind: "cap", color: "#22344A" }, beard: true, height: 1.0 },
  engineer: { skin: SKIN[4], shirt: "#24486E", trousers: "#1F2836", vest: null, hat: "#2F6DF6", hair: "#15171A", boots: "#232A36", body: "m", hairStyle: "short", height: 1.04 },
  shopper: { skin: SKIN[5], shirt: "#B5476A", trousers: "#3B4F70", vest: null, hat: null, hair: "#303A4C", boots: "#E2E4E7", body: "f", hairStyle: "long", height: 0.95 },
};

/* ---------------- Geometry ---------------- */

/** Surface finishes, as roughness: matte fabric, satin skin, glossy plastics. */
const R = { fabric: 0.88, denim: 0.8, skin: 0.5, hair: 0.62, gloss: 0.28, tape: 0.32, shoe: 0.42, glass: 0.12, eye: 0.2 };

const tint = new THREE.Color();
function finish(g: THREE.BufferGeometry, color: string, rough: number) {
  const geo = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(geo.attributes)) if (!["position", "normal"].includes(k)) geo.deleteAttribute(k);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  tint.set(color); // hex is sRGB; Color stores it in the linear working space
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  const r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    c[i * 3] = tint.r;
    c[i * 3 + 1] = tint.g;
    c[i * 3 + 2] = tint.b;
    r[i] = rough;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  geo.setAttribute("rough", new THREE.BufferAttribute(r, 1));
  return geo;
}
type Part = [THREE.BufferGeometry, string, number?];
const fuse = (parts: Part[]) => mergeGeometries(parts.map(([g, c, r]) => finish(g, c, r ?? R.fabric)), false)!;

const rb = (w: number, h: number, d: number, r: number, x = 0, y = 0, z = 0) =>
  new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)).translate(x, y, z);
const ball = (r: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 18) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)).scale(sx, sy, sz).translate(x, y, z);

/**
 * A body section turned from a profile of [radius, y] points (y going up), then squashed front to
 * back by `depth` (x) so cross-sections are oval like a real body. Smoothed by a spline.
 */
function lathe(profile: [number, number][], depth = 1, width = 1, seg = 20) {
  const pts = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(profile.length * 4);
  return new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(Math.max(p.x, 0.0005), p.y)), seg).scale(depth, 1, width);
}
/** A limb hanging down from its joint: [radius, distance below the joint] pairs. */
const limb = (profile: [number, number][], depth = 1, width = 1) => lathe(profile.map(([r, d]) => [r, -d] as [number, number]).reverse(), depth, width, 16);

const L = { hip: 0.95, hipW: 0.092, thigh: 0.43, shin: 0.41, shoulderY: 0.46, shoulderW: 0.19, upper: 0.29, fore: 0.25, neck: 0.585 };

const geoCache = new Map<string, Record<string, THREE.BufferGeometry>>();
function bodyParts(look: Look) {
  const key = JSON.stringify(look);
  const hit = geoCache.get(key);
  if (hit) return hit;
  const { skin, shirt, trousers, vest, hat, hair, boots } = look;
  const f = look.body === "f";
  const style: Hair = look.hairStyle ?? "short";
  const headwear: Headwear = look.headwear ?? (hat ? { kind: "hardhat", color: hat } : null);
  const gloves = !!vest;
  const trouserR = trousers === "#3B4F70" ? R.denim : R.fabric;
  const parts: Record<string, THREE.BufferGeometry> = {};

  // Pelvis: hips and seat in trousers, a belt with a buckle at the waist.
  const hipR = f ? 0.178 : 0.165;
  parts.pelvis = fuse([
    [lathe([[0.07, -0.14], [0.135, -0.11], [hipR, -0.05], [hipR - 0.006, 0.01], [0.148, 0.04]], 0.66, 1, 24), trousers, trouserR],
    [lathe([[0.151, 0.018], [0.155, 0.032], [0.155, 0.048], [0.151, 0.06]], 0.67, 1, 24), "#1C1E22", R.gloss],
    [rb(0.012, 0.03, 0.045, 0.004, 0.104, 0.04, 0), "#B9BCC2", 0.25],
  ]);

  // Legs: thigh tapering to the knee; shin with a calf; a shoe with toe box, heel and sole.
  parts.thigh = fuse([
    [limb([[0.088, 0], [0.084, 0.08], [0.074, 0.24], [0.062, 0.38], [0.058, L.thigh]], 1, 0.95), trousers, trouserR],
    [ball(0.058, 0.004, -L.thigh, 0, 1, 1, 0.95), trousers, trouserR],
  ]);
  const shin: Part[] = [
    [limb([[0.058, 0], [0.061, 0.09], [0.058, 0.17], [0.05, 0.29], [0.052, 0.34], [0.054, 0.37]], 1, 0.95), trousers, trouserR],
    // Shoe: sole, upper, rounded toe box and heel
    [rb(0.255, 0.022, 0.094, 0.01, 0.04, -L.shin - 0.084, 0), "#17181A", R.shoe],
    [rb(0.17, 0.085, 0.09, 0.04, 0.02, -L.shin - 0.035, 0), boots, R.shoe],
    [ball(0.047, 0.105, -L.shin - 0.05, 0, 1.25, 0.72, 0.95), boots, R.shoe],
    [ball(0.044, -0.04, -L.shin - 0.045, 0, 0.95, 0.95, 0.98), boots, R.shoe],
  ];
  if (vest) shin.push([new THREE.CylinderGeometry(0.052, 0.056, 0.07, 16).translate(0, -L.shin + 0.0, 0), boots, R.shoe]); // boot collar
  parts.shin = fuse(shin);

  // Torso: waist, ribcage, chest and sloping shoulders, oval in section.
  const sh = f ? 0.158 : 0.176;
  const torsoProfile: [number, number][] = [
    [f ? 0.138 : 0.15, 0.0],
    [f ? 0.132 : 0.148, 0.08],
    [f ? 0.15 : 0.158, 0.18],
    [f ? 0.162 : 0.172, 0.29],
    [sh, 0.39],
    [sh - 0.01, 0.45],
    [0.12, 0.51],
    [0.062, 0.55],
    [0.0, 0.56],
  ];
  const torso: Part[] = [
    [lathe(torsoProfile, f ? 0.68 : 0.64, 1, 24), shirt],
    // Deltoids where the arms meet the shoulders
    [ball(0.062, 0, L.shoulderY - 0.005, L.shoulderW - 0.015, 1, 0.9, 1), shirt],
    [ball(0.062, 0, L.shoulderY - 0.005, -(L.shoulderW - 0.015), 1, 0.9, 1), shirt],
    // Neck, slightly forward of the spine
    [new THREE.CylinderGeometry(0.047, 0.055, 0.09, 16).translate(0.008, L.neck - 0.02, 0), skin, R.skin],
  ];
  if (vest) {
    // Hi-vis vest over the shirt: open at the neck, two reflective hoops and shoulder braces, pockets
    torso.push([lathe([[0.153, 0.06], [0.161, 0.18], [0.175, 0.29], [sh + 0.006, 0.39], [sh - 0.006, 0.45]], 0.665, 1.03, 24), vest]);
    for (const y of [0.14, 0.3]) torso.push([lathe([[0.168 + (y - 0.14) * 0.06, y - 0.017], [0.169 + (y - 0.14) * 0.06, y], [0.168 + (y - 0.14) * 0.06, y + 0.017]], 0.67, 1.04, 24), "#DDE1E6", R.tape]);
    for (const z of [-0.075, 0.075]) torso.push([rb(0.02, 0.2, 0.035, 0.008).rotateX(z > 0 ? 0.1 : -0.1).translate(0.112, 0.36, z), "#DDE1E6", R.tape]);
    torso.push([rb(0.01, 0.34, 0.018, 0.004, 0.118, 0.25, 0), "#4B5418", R.gloss]); // zip
    for (const z of [-0.08, 0.08]) torso.push([rb(0.01, 0.06, 0.07, 0.004, 0.113, 0.11, z), vest]); // pockets
  } else {
    // Collared shirt: placket, collar points, a lanyard and badge
    torso.push([rb(0.008, 0.4, 0.02, 0.003, 0.111, 0.29, 0), shirt === "#EEF1F5" ? "#D7DCE3" : shirt]);
    for (const z of [-1, 1]) torso.push([rb(0.045, 0.01, 0.055, 0.004).rotateZ(-0.35).rotateX(z * 0.45).translate(0.07, 0.525, z * 0.042), shirt]);
    if (f && shirt === "#EEF1F5") {
      torso.push([rb(0.006, 0.2, 0.012, 0.003).rotateX(-0.25).translate(0.113, 0.4, 0.035), "#2F6DF6", R.gloss]);
      torso.push([rb(0.01, 0.07, 0.05, 0.006, 0.114, 0.26, 0.06), "#FFFFFF", R.gloss]);
    }
  }
  parts.torso = fuse(torso);

  // Head: cranium, jaw and chin, nose, ears, eyes, brows, lips.
  const head: Part[] = [
    [ball(0.094, -0.004, 0.118, 0, 1.06, 1.12, f ? 0.84 : 0.88, 24), skin, R.skin],
    [ball(0.066, 0.03, 0.058, 0, 0.95, 0.85, f ? 0.96 : 1.08, 20), skin, R.skin], // jaw
    [ball(0.024, 0.075, 0.035, 0, 0.9, 0.9, 1.1), skin, R.skin], // chin
    [new THREE.ConeGeometry(0.019, 0.048, 12).rotateZ(-Math.PI / 2).scale(1, 1.25, 0.9).translate(0.103, 0.094, 0), skin, R.skin], // nose
    [ball(0.012, 0.094, 0.073, 0, 0.6, 0.6, 1.4), skin, R.skin], // nostrils
    [ball(0.024, -0.008, 0.105, 0.083, 0.55, 1.05, 0.45), skin, R.skin], // ears
    [ball(0.024, -0.008, 0.105, -0.083, 0.55, 1.05, 0.45), skin, R.skin],
    [rb(0.012, 0.009, 0.042, 0.004, 0.086, 0.058, 0), "#8E4E3E", R.skin], // lips
  ];
  for (const z of [-0.034, 0.034]) {
    head.push([ball(0.0125, 0.082, 0.118, z, 0.6, 0.85, 1.1), "#EEEFF2", R.eye]);
    head.push([ball(0.0072, 0.09, 0.118, z, 0.5, 1, 1), "#191E27", R.eye]);
    head.push([rb(0.008, 0.007, 0.034, 0.003, 0.094, 0.142, z).rotateX(z > 0 ? 0.12 : -0.12), hair, R.hair]); // brows
  }
  if (look.beard) head.push([ball(0.07, 0.022, 0.052, 0, 0.95, 0.8, 1.1), hair, 0.95], [rb(0.01, 0.012, 0.05, 0.005, 0.092, 0.07, 0), hair, 0.95]);
  if (look.glasses) {
    for (const z of [-0.034, 0.034]) head.push([new THREE.TorusGeometry(0.019, 0.0028, 6, 18).rotateY(Math.PI / 2).translate(0.101, 0.118, z), "#1D1E22", R.glass]);
    head.push([rb(0.004, 0.004, 0.03, 0.002, 0.104, 0.12, 0), "#1D1E22", R.glass]);
    for (const z of [-1, 1]) head.push([rb(0.09, 0.004, 0.004, 0.002, 0.055, 0.122, z * 0.056), "#1D1E22", R.glass]);
  }
  // Hair
  const cap = (phi: number, sx = 1.08, sy = 1.15, sz = 0.92) =>
    new THREE.SphereGeometry(0.098, 24, 14, 0, Math.PI * 2, 0, phi).scale(sx, sy, sz).translate(-0.01, 0.12, 0);
  if (style === "crop") head.push([cap(Math.PI * 0.4, 1.06, 1.1, 0.9), hair, R.hair], [ball(0.093, -0.03, 0.1, 0, 0.9, 1.0, 0.9), hair, R.hair]);
  else if (style === "short") head.push([cap(Math.PI * 0.42), hair, R.hair], [ball(0.095, -0.03, 0.1, 0, 0.9, 1.05, 0.92), hair, R.hair]);
  else {
    head.push([cap(Math.PI * 0.46, 1.1, 1.17, 0.95), hair, R.hair], [ball(0.098, -0.032, 0.095, 0, 0.92, 1.1, 0.96), hair, R.hair]);
    if (style === "ponytail") head.push([ball(0.03, -0.11, 0.13, 0, 1, 1, 1), hair, R.hair], [new THREE.CapsuleGeometry(0.026, 0.12, 4, 10).rotateZ(-0.35).translate(-0.135, 0.06, 0), hair, R.hair]);
    if (style === "bun") head.push([ball(0.042, -0.085, 0.2, 0, 1, 0.9, 1), hair, R.hair]);
    if (style === "long") head.push([rb(0.06, 0.22, 0.17, 0.05, -0.06, 0.02, 0), hair, R.hair]);
  }
  // Headwear
  if (headwear?.kind === "hardhat") {
    const c = headwear.color;
    head.push([new THREE.SphereGeometry(0.115, 26, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.12, 0.95, 0.98).translate(0, 0.152, 0), c, R.gloss]);
    head.push([new THREE.CylinderGeometry(0.122, 0.124, 0.012, 28).scale(1.2, 1, 1.04).translate(0.012, 0.155, 0), c, R.gloss]);
    head.push([new THREE.CylinderGeometry(0.08, 0.06, 0.012, 20, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 1.4).translate(0.11, 0.157, 0), c, R.gloss]); // front peak
    head.push([rb(0.21, 0.02, 0.026, 0.01, 0, 0.26, 0), c, R.gloss]);
    head.push([lathe([[0.112, 0.168], [0.113, 0.178]], 1.12, 0.98, 26), "#2B2D31", R.fabric]); // headband line
  } else if (headwear?.kind === "cap") {
    const c = headwear.color;
    head.push([new THREE.SphereGeometry(0.103, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.08, 0.82, 0.96).translate(-0.005, 0.15, 0), c, R.fabric]);
    head.push([new THREE.CylinderGeometry(0.075, 0.075, 0.008, 20, 1, false, -Math.PI / 2, Math.PI).scale(1.15, 1, 1.25).translate(0.088, 0.152, 0).rotateZ(-0.08), c, R.fabric]);
  }
  parts.head = fuse(head);

  // Arms: deltoid into bicep, a forearm tapering to the wrist, then a hand with a thumb.
  parts.upper = fuse([
    [limb([[0.05, 0], [0.052, 0.07], [0.047, 0.18], [0.041, 0.26], [0.04, L.upper]], 1, 0.92), shirt],
    [ball(0.04, 0, -L.upper, 0), shirt],
  ]);
  const handC = gloves ? "#3A3D42" : skin;
  const handR = gloves ? R.fabric : R.skin;
  parts.fore = fuse([
    [limb([[0.04, 0], [0.043, 0.06], [0.036, 0.16], [0.031, L.fore - 0.03]], 1, 0.9), shirt],
    [lathe([[0.034, -(L.fore - 0.01)], [0.035, -(L.fore - 0.035)]], 1, 0.92, 16), gloves ? "#3A3D42" : shirt], // cuff
    [rb(0.07, 0.075, 0.028, 0.013, 0.006, -L.fore - 0.05, 0), handC, handR], // palm
    [rb(0.066, 0.06, 0.024, 0.011, 0.012, -L.fore - 0.11, 0).rotateZ(0.05), handC, handR], // fingers
    [new THREE.CapsuleGeometry(0.011, 0.04, 3, 8).rotateZ(0.5).translate(0.04, -L.fore - 0.06, 0.006), handC, handR], // thumb
  ]);
  geoCache.set(key, parts);
  return parts;
}

/** One material for every person: vertex colour, plus per-vertex roughness read in the shader. */
let mat: THREE.MeshStandardMaterial | null = null;
function personMat() {
  if (mat) return mat;
  mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float rough;\nvarying float vRough;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRough = rough;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vRough;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor *= vRough;");
  };
  mat.customProgramCacheKey = () => "person-rough";
  return mat;
}

const tabletGeo = () =>
  fuse([
    [rb(0.016, 0.17, 0.25, 0.012), "#1E2126", R.gloss],
    [rb(0.004, 0.148, 0.224, 0.004, 0.009, 0, 0), "#6F95F2", R.glass],
    [rb(0.003, 0.02, 0.17, 0.002, 0.012, 0.045, 0), "#E9EEF8", R.glass],
    [rb(0.003, 0.012, 0.11, 0.002, 0.012, 0.015, -0.03), "#E9EEF8", R.glass],
  ]);
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

/** One person. Joints are groups; the pose drives them each frame, with breathing, weight shifts and glances. */
export function Person({ look = "crew", pose = "stand", seed = 0, speed = 1.3, scale, ...props }: PersonProps) {
  const l = typeof look === "string" ? LOOKS[look] : look;
  const g = bodyParts(l);
  const h = l.height ?? 1;
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
    const breathe = Math.sin(t * 1.6) * 0.01;
    // Standing: weight settles on one leg, then the other; that knee locks, the other softens.
    const shift = calm ? 0 : Math.sin(t * 0.31);
    let thighL = 0.02, thighR = 0.02, shinL = -0.03 - Math.max(0, shift) * 0.1, shinR = -0.03 - Math.max(0, -shift) * 0.1;
    let upL = 0.06, upR = 0.06, foL = 0.16, foR = 0.16, spread = 0.09;
    let lean = 0, twist = 0, yaw = 0, headPitch = 0, bob = 0;
    let headYaw = Math.sin(t * 0.37) * 0.4 * Math.max(0, Math.sin(t * 0.19));
    let roll = shift * 0.035;
    if (pose === "walk") {
      const f = t * speed * 4.4;
      const s = Math.sin(f);
      // Thighs swing; each knee flexes as its foot swings through, and softens at heel strike.
      thighL = 0.4 * s;
      thighR = -0.4 * s;
      shinL = -0.08 - 0.85 * Math.max(0, Math.sin(f - 1.3)) - 0.08 * Math.max(0, -Math.cos(f));
      shinR = -0.08 - 0.85 * Math.max(0, Math.sin(f - 1.3 + Math.PI)) - 0.08 * Math.max(0, Math.cos(f));
      // Arms swing opposite to the legs, elbows a little bent.
      upL = -0.32 * s;
      upR = 0.32 * s;
      foL = 0.28 + 0.18 * Math.max(0, -s);
      foR = 0.28 + 0.18 * Math.max(0, s);
      // The pelvis turns with the stride and the chest counter-turns; the body rises over each step.
      yaw = 0.09 * s;
      twist = -0.12 * s;
      roll = 0.03 * Math.cos(f);
      bob = Math.abs(Math.cos(f)) * 0.022 - 0.018;
      lean = -0.06;
      headYaw *= 0.25;
      spread = 0.07;
    } else if (pose === "sit") {
      thighL = thighR = Math.PI / 2 - 0.08;
      shinL = shinR = -Math.PI / 2 + 0.12;
      upL = upR = 0.62;
      foL = foR = 0.85;
      spread = 0.12;
      lean = 0.06;
      roll = 0;
    } else if (pose === "tablet") {
      upL = upR = 0.3;
      foL = foR = 1.22;
      spread = 0.05;
      headPitch = -0.4 + Math.max(0, Math.sin(t * 0.4)) * 0.38;
      headYaw *= 0.4;
      lean = 0.04;
    } else if (pose === "point") {
      upR = 1.32 + Math.sin(t * 1.3) * 0.05;
      foR = 0.1;
      upL = 0.1;
      foL = 0.5; // other hand resting on the hip
      headYaw = 0.12;
      twist = 0.12;
    } else if (pose === "wave") {
      upR = Math.PI - 0.55;
      foR = 0.45 + Math.sin(t * 6) * 0.35;
      headYaw = 0.05;
    }
    j.pelvis.position.y = (pose === "sit" ? 0 : L.hip) + bob;
    j.pelvis.rotation.set(roll, yaw, 0);
    j.torso!.rotation.set(-roll * 0.6, twist, -lean);
    j.torso!.scale.set(1 + breathe, 1 + breathe * 0.5, 1 + breathe);
    j.head!.rotation.set(-roll * 0.3, headYaw - twist * 0.6, headPitch);
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

  const m = personMat();
  const leg = (s: 1 | -1, k: "L" | "R") => (
    <group key={k} ref={k === "L" ? thighLJ : thighRJ} position={[0, -0.05, s * L.hipW]}>
      <mesh geometry={g.thigh} material={m} castShadow />
      <group ref={k === "L" ? shinLJ : shinRJ} position-y={-L.thigh}>
        <mesh geometry={g.shin} material={m} castShadow />
      </group>
    </group>
  );
  const arm = (s: 1 | -1, k: "L" | "R") => (
    <group key={k} ref={k === "L" ? upLJ : upRJ} position={[0, L.shoulderY - 0.02, s * L.shoulderW]}>
      <mesh geometry={g.upper} material={m} castShadow />
      <group ref={k === "L" ? foLJ : foRJ} position-y={-L.upper}>
        <mesh geometry={g.fore} material={m} castShadow />
      </group>
    </group>
  );
  // Height variety scales the whole figure; an explicit `scale` from the scene multiplies it.
  const s = typeof scale === "number" ? scale * h : h;
  return (
    <group ref={rootJ} scale={s} userData={{ live: true }} {...props}>
      <mesh ref={statueJ} material={m} visible={false} castShadow />
      <group ref={pelvisJ} position-y={L.hip}>
        <mesh geometry={g.pelvis} material={m} castShadow />
        {leg(-1, "L")}
        {leg(1, "R")}
        <group ref={torsoJ} position-y={0.04}>
          <mesh geometry={g.torso} material={m} castShadow />
          <group ref={headJ} position-y={L.neck + 0.02}>
            <mesh geometry={g.head} material={m} castShadow />
          </group>
          {arm(-1, "L")}
          {arm(1, "R")}
          {pose === "tablet" && <mesh geometry={(tabletCache ??= tabletGeo())} material={m} position={[0.3, 0.18, 0]} rotation-z={0.9} castShadow />}
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
    <group ref={root} userData={{ live: true }}>
      <Person {...p} pose={calm ? "stand" : "walk"} speed={speed} />
    </group>
  );
}
