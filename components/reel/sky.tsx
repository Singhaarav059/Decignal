"use client";

// Everything above and beyond the bay: the sky dome, painted clouds, the far shore, the mountain
// and a few gulls. All of it is coloured by the daylight (lib/daylight.ts), so the whole backdrop
// moves from dawn to night with the scroll and never cuts.
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { daylight } from "@/lib/daylight";
import { reel } from "@/lib/reel";

/* ------------------------------------------------------------------ */
/* Shared sky colour, used by the dome and by the water's reflection    */
/* ------------------------------------------------------------------ */

export const SKY_GLSL = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uGlow;
uniform vec3 uSun;
uniform vec3 uMoon;
uniform float uStars;
uniform float uNight;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

vec3 skyColour(vec3 d, bool withDiscs) {
  float h = d.y;
  // A long, soft gradient: the horizon colour holds low in the sky, then gives way to the zenith.
  float up = pow(smoothstep(-0.02, 0.62, h), 0.62);
  vec3 c = mix(uHorizon, uTop, up);
  // Below the horizon the far air takes over (mostly hidden by the water).
  c = mix(c, uHaze, smoothstep(0.0, -0.08, h));
  // Glow around the sun, widest along the horizon on its side of the sky.
  float s = max(dot(d, uSun), 0.0);
  vec2 hz = normalize(d.xz + 1e-5);
  vec2 sz = normalize(uSun.xz + 1e-5);
  float side = pow(max(dot(hz, sz), 0.0), 2.4);
  float band = exp(-abs(h - max(uSun.y, -0.05) * 0.4) * 7.0) * side;
  c = mix(c, uGlow, clamp(band * 0.55 + pow(s, 9.0) * 0.45, 0.0, 0.85));
  if (withDiscs) {
    // The sun's disc, softly edged, only while it is up.
    float disc = smoothstep(0.99955, 0.99975, s) * smoothstep(-0.02, 0.02, uSun.y);
    c = mix(c, vec3(1.0, 0.97, 0.92), disc * 0.9);
    // The moon at night, with a faint halo.
    float m = max(dot(d, uMoon), 0.0);
    c += uNight * (smoothstep(0.99962, 0.9998, m) * vec3(0.86, 0.9, 1.0) + pow(m, 260.0) * vec3(0.10, 0.12, 0.2));
    // Stars: a sparse field, brighter towards the zenith, gone near the horizon's haze.
    if (uStars > 0.001 && h > 0.04) {
      vec3 p = floor(d * 420.0);
      float st = step(0.9965, hash13(p));
      float tw = 0.65 + 0.35 * hash13(p + 7.0);
      c += st * tw * uStars * smoothstep(0.04, 0.3, h) * vec3(0.9, 0.93, 1.0);
    }
  }
  return c;
}
`;

/** Uniforms every sky-coloured shader shares; updated once per frame. */
export const skyUniforms = {
  uTop: { value: new THREE.Color() },
  uHorizon: { value: new THREE.Color() },
  uHaze: { value: new THREE.Color() },
  uGlow: { value: new THREE.Color() },
  uSun: { value: new THREE.Vector3(0, 1, 0) },
  uMoon: { value: new THREE.Vector3(0, 1, 0) },
  uStars: { value: 0 },
  uNight: { value: 0 },
  uTime: { value: 0 },
};

export function stepSkyUniforms(time: number) {
  const u = skyUniforms;
  u.uTop.value.copy(daylight.top);
  u.uHorizon.value.copy(daylight.horizon);
  u.uHaze.value.copy(daylight.haze);
  u.uGlow.value.copy(daylight.glow);
  u.uSun.value.copy(daylight.sunDir);
  u.uMoon.value.copy(daylight.moonDir);
  u.uStars.value = daylight.stars;
  u.uNight.value = Math.min(daylight.stars * 1.4, 1);
  // Ambient motion stands still for readers who asked for less of it.
  if (!reel.calm) u.uTime.value = time;
}

/* ------------------------------------------------------------------ */
/* Dome                                                                 */
/* ------------------------------------------------------------------ */

export const SKY_RADIUS = 4200;

export function SkyDome() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }`,
        fragmentShader: /* glsl */ `
          ${SKY_GLSL}
          varying vec3 vDir;
          void main() {
            vec3 c = skyColour(normalize(vDir), true);
            // A whisper of dither so the long gradient never bands.
            c += (hash13(gl_FragCoord.xyz) - 0.5) / 255.0;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  // The dome travels with the camera, so the sky is always infinitely far away.
  useFrame(({ camera }) => mesh.current?.position.copy(camera.position), -0.5);
  return (
    <mesh ref={mesh} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[SKY_RADIUS, 48, 24]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Clouds: painted cumulus, lit on top and shaded underneath            */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = Math.abs(Math.round(seed * 9973)) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * One cloud as a texture: red is how lit each point is, alpha is its shape. A cumulus is drawn
 * the way a background painter would: a broad, flat-bottomed body, its upper edge built from many
 * small billows of different sizes, lit from above with one soft gradient (not ball by ball), and
 * a faint rim of light along the top. The shader colours it from the daylight.
 */
function cloudTexture(seed: number, w = 1024, h = 400) {
  const r = rng(seed);
  const base = h * 0.82;
  const blobs: [number, number, number][] = [];
  // The body: a low, wide mound, highest a little off centre.
  const peak = 0.38 + r() * 0.24;
  const n = 26;
  for (let i = 0; i < n; i++) {
    const u = 0.06 + 0.88 * (i / (n - 1)) + (r() - 0.5) * 0.02;
    const env = Math.exp(-Math.pow((u - peak) / 0.26, 2));
    const rad = h * (0.07 + 0.2 * env) * (0.75 + r() * 0.5);
    blobs.push([u * w, base - rad * 0.55 - env * h * 0.18, rad]);
  }
  // Billows on the upper edge: small ones crowding round the larger ones.
  const top = blobs.slice();
  for (const [x, y, rad] of top) {
    const k = 2 + Math.floor(r() * 3);
    for (let j = 0; j < k; j++) {
      const a = -Math.PI * (0.15 + r() * 0.7);
      const rr = rad * (0.32 + r() * 0.3);
      blobs.push([x + Math.cos(a) * rad * 0.82, y + Math.sin(a) * rad * 0.82, rr]);
    }
  }
  const shape = document.createElement("canvas");
  shape.width = w;
  shape.height = h;
  const gs = shape.getContext("2d")!;
  gs.filter = "blur(1.2px)";
  gs.fillStyle = "#fff";
  for (const [x, y, rad] of blobs) {
    gs.beginPath();
    gs.arc(x, y, rad, 0, Math.PI * 2);
    gs.fill();
  }
  gs.filter = "none";
  gs.clearRect(0, base, w, h - base);
  // A soft fade along the flat base, so it sits in the air rather than on a shelf.
  const fade = gs.createLinearGradient(0, base - h * 0.06, 0, base);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,1)");
  gs.globalCompositeOperation = "destination-out";
  gs.fillStyle = fade;
  gs.fillRect(0, base - h * 0.06, w, h * 0.06);
  gs.globalCompositeOperation = "source-over";

  // Light: one gradient for the whole cloud, top lit, base in shade, a touch of modelling per billow.
  const light = document.createElement("canvas");
  light.width = w;
  light.height = h;
  const gl = light.getContext("2d")!;
  const lg = gl.createLinearGradient(0, base - h * 0.62, 0, base);
  lg.addColorStop(0, "rgb(255,0,0)");
  lg.addColorStop(0.55, "rgb(215,0,0)");
  lg.addColorStop(1, "rgb(90,0,0)");
  gl.fillStyle = lg;
  gl.fillRect(0, 0, w, h);
  for (const [x, y, rad] of blobs) {
    const gr = gl.createRadialGradient(x - rad * 0.25, y - rad * 0.35, 0, x, y, rad);
    gr.addColorStop(0, "rgba(255,0,0,0.16)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    gl.fillStyle = gr;
    gl.beginPath();
    gl.arc(x, y, rad, 0, Math.PI * 2);
    gl.fill();
  }
  const li = gl.getImageData(0, 0, w, h);
  const al = gs.getImageData(0, 0, w, h);
  for (let i = 0; i < li.data.length; i += 4) {
    li.data[i + 1] = 0;
    li.data[i + 2] = 0;
    li.data[i + 3] = al.data[i + 3];
  }
  gl.putImageData(li, 0, 0);
  const t = new THREE.CanvasTexture(light);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

const CLOUDS: { x: number; y: number; z: number; w: number; seed: number; drift: number }[] = [
  { x: -700, y: 250, z: -1900, w: 560, seed: 1, drift: 3.2 },
  { x: -120, y: 380, z: -2300, w: 700, seed: 2, drift: 2.4 },
  { x: 640, y: 300, z: -2100, w: 520, seed: 3, drift: 2.8 },
  { x: 1200, y: 210, z: -1700, w: 420, seed: 4, drift: 3.6 },
  { x: 240, y: 170, z: -1500, w: 260, seed: 5, drift: 4.1 },
  { x: -1250, y: 200, z: -1600, w: 380, seed: 6, drift: 3.4 },
];

export function Clouds() {
  const group = useRef<THREE.Group>(null);
  const items = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    return CLOUDS.map((c) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { ...skyUniforms, uMap: { value: cloudTexture(c.seed) }, uFar: { value: 0.22 } },
        transparent: true,
        depthWrite: false,
        fog: false,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uHaze;
          uniform vec3 uGlow;
          uniform float uFar;
          uniform float uNight;
          varying vec2 vUv;
          void main() {
            vec4 m = texture2D(uMap, vUv);
            float lit = m.r;
            // Lit side: near white, warmed by the glow; shade: the sky's own colour, a touch deeper.
            vec3 light = mix(vec3(1.0), uGlow, 0.35);
            vec3 shade = mix(mix(uTop, uHorizon, 0.55), light, 0.35);
            vec3 c = mix(shade, light, smoothstep(0.45, 0.95, lit));
            // By night clouds are dim shapes against the stars.
            c = mix(c, mix(uTop, uHorizon, 0.5) * 1.25, uNight * 0.8);
            // The farther the cloud, the more of the air it carries.
            c = mix(c, uHorizon, uFar);
            gl_FragColor = vec4(c, m.a * 0.96);
            #include <colorspace_fragment>
          }`,
      });
      const aspect = 400 / 1024;
      return { c, mat, geo, aspect };
    });
  }, []);

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const time = skyUniforms.uTime.value;
    g.children.forEach((m, i) => {
      const { c } = items[i];
      // A slow drift to the east, wrapping round a 4 km span.
      const x = ((c.x + time * c.drift + 2000) % 4000) - 2000;
      m.position.set(camera.position.x * 0.35 + x, c.y, c.z);
      // Billboards that stay upright.
      m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z);
    });
  });

  return (
    <group ref={group}>
      {items.map(({ c, mat, geo, aspect }, i) => (
        <mesh key={i} geometry={geo} material={mat} scale={[c.w, c.w * aspect, 1]} renderOrder={-9} frustumCulled={false} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* The far shore and the mountain                                       */
/* ------------------------------------------------------------------ */

const LAND_VERT = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

/** Distant land: flat colour, softly lit by the key light, sinking into the air with distance. */
function farMaterial(color: string, haze: number, snow?: { line: number; top: number }) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...skyUniforms,
      uColor: { value: new THREE.Color(color) },
      uAir: { value: haze },
      uKey: { value: new THREE.Vector3(0, 1, 0) },
      uKeyColor: { value: new THREE.Color("#ffffff") },
      uSnow: { value: snow ? new THREE.Vector2(snow.line, snow.top) : new THREE.Vector2(1e9, 1e9) },
      uCentre: { value: new THREE.Vector2(snow ? FUJI.x : 0, snow ? FUJI.z : 0) },
    },
    fog: false,
    vertexShader: LAND_VERT,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uHorizon;
      uniform vec3 uHaze;
      uniform vec3 uTop;
      uniform float uAir;
      uniform vec3 uKey;
      uniform vec3 uKeyColor;
      uniform vec2 uSnow;
      uniform vec2 uCentre;
      uniform float uNight;
      varying vec3 vWorld;
      varying vec3 vNormal;
      void main() {
        vec3 n = normalize(vNormal);
        float ndl = max(dot(n, uKey), 0.0);
        vec3 base = uColor;
        // Snow: a ragged line of gullies running down from the summit.
        float ang = atan(vWorld.x - uCentre.x, vWorld.z - uCentre.y);
        float ragged = 0.08 * sin(ang * 7.0 + 0.6) + 0.05 * sin(ang * 17.0 + 1.3) + 0.025 * sin(ang * 41.0);
        float rel = (vWorld.y - uSnow.x) / max(uSnow.y - uSnow.x, 1.0);
        float snow = smoothstep(-0.02, 0.02, rel + ragged * (1.0 - rel));
        base = mix(base, vec3(0.95, 0.96, 0.99), snow);
        // Soft, low-contrast light: shapes read, nothing goes dark.
        vec3 lit = base * (0.62 + 0.5 * ndl * uKeyColor);
        // Aerial perspective: the farther the ridge, the more it becomes the sky behind it.
        vec3 air = mix(uHaze, uHorizon, 0.55);
        // Mist gathers low over the water, so every ridge stands on a band of haze.
        float mist = (1.0 - smoothstep(-4.0, 46.0, vWorld.y)) * 0.55;
        vec3 c = mix(lit, air, clamp(uAir + (1.0 - uAir) * mist, 0.0, 1.0));
        // Night flattens the land into dark, cool silhouettes.
        c = mix(c, mix(uTop, uHorizon, 0.35) * 0.8, uNight * 0.55);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

function valueNoise(seed: number) {
  const r = rng(seed);
  const pts = Array.from({ length: 64 }, () => r());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = pts[((i % 64) + 64) % 64];
    const b = pts[(((i + 1) % 64) + 64) % 64];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

/** A ridge of hills: a strip of terrain whose crest follows layered noise. */
function ridgeGeometry(x0: number, x1: number, depth: number, height: number, seed: number) {
  const n1 = valueNoise(seed);
  const n2 = valueNoise(seed + 11);
  const n3 = valueNoise(seed + 29);
  const geo = new THREE.PlaneGeometry(x1 - x0, depth, 220, 10).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0, 0);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const crest = Math.pow(0.5 * n1(x / 240) + 0.32 * n2(x / 80) + 0.18 * n3(x / 28), 1.6) * 1.5;
    // A rounded profile front to back, low at both edges.
    const across = Math.pow(Math.sin(Math.PI * (z / depth + 0.5)), 1.4);
    // Ends taper into the plain.
    const end = Math.min(1, (x - x0) / 260, (x1 - x) / 260);
    p.setY(i, Math.max(0, height * crest * Math.pow(across, 0.8) * Math.max(end, 0)) - 4);
  }
  geo.computeVertexNormals();
  return geo;
}

/** The mountain: steep, slightly concave flanks, a flat crater rim, shallow gullies. */
function mountainGeometry(H: number, R: number) {
  const pts: THREE.Vector2[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * H;
    const k = y / H;
    const r = 0.035 * R + (R - 0.035 * R) * Math.pow(1 - k, 1.85);
    pts.push(new THREE.Vector2(r, y));
  }
  pts.push(new THREE.Vector2(0.02 * R, H - H * 0.012));
  pts.push(new THREE.Vector2(0, H - H * 0.012));
  const geo = new THREE.LatheGeometry(pts.reverse(), 160);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const ang = Math.atan2(v.x, v.z);
    const k = v.y / H;
    // Gullies: shallow grooves strongest high on the cone.
    const gully = (Math.sin(ang * 23) * 0.5 + Math.sin(ang * 51 + 2) * 0.3) * 0.012 * R * k * (1 - k) * 4;
    const rad = Math.hypot(v.x, v.z);
    if (rad > 1e-3) {
      const s = (rad + gully) / rad;
      p.setX(i, v.x * s);
      p.setZ(i, v.z * s);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Where the mountain stands: across the bay, right of centre from the harbour. */
export const FUJI = { x: 260, z: -2100, H: 250, R: 640 };

export function FarShore() {
  const mats = useMemo(
    () => ({
      far: farMaterial("#8E9FBF", 0.62),
      mid: farMaterial("#6F8AA6", 0.46),
      near: farMaterial("#6E8E8A", 0.3),
      fuji: farMaterial("#6E83AC", 0.36, { line: FUJI.H * 0.6, top: FUJI.H }),
    }),
    [],
  );
  const geos = useMemo(
    () => ({
      far: ridgeGeometry(-3400, 3600, 420, 150, 3),
      mid: ridgeGeometry(-700, 3200, 300, 105, 7),
      near: ridgeGeometry(-80, 2600, 220, 62, 13),
      fuji: mountainGeometry(FUJI.H, FUJI.R),
    }),
    [],
  );
  useFrame(() => {
    for (const m of Object.values(mats)) {
      m.uniforms.uKey.value.copy(daylight.keyDir);
      m.uniforms.uKeyColor.value.copy(daylight.key).multiplyScalar(Math.min(daylight.keyPower, 1.4) / 1.4);
    }
  });
  return (
    <group>
      <mesh geometry={geos.far} material={mats.far} position-z={-2300} />
      <mesh geometry={geos.mid} material={mats.mid} position-z={-1150} />
      <mesh geometry={geos.near} material={mats.near} position-z={-560} />
      <mesh geometry={geos.fuji} material={mats.fuji} position={[FUJI.x, -6, FUJI.z]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Gulls                                                                */
/* ------------------------------------------------------------------ */

function gullGeometry() {
  // Two swept wings and a small body, flat like a paper cut-out seen from below.
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.35, 0.18, 0.95, 0.06);
  shape.quadraticCurveTo(0.45, 0.06, 0.06, -0.08);
  shape.lineTo(-0.06, -0.08);
  shape.quadraticCurveTo(-0.45, 0.06, -0.95, 0.06);
  shape.quadraticCurveTo(-0.35, 0.18, 0, 0);
  return new THREE.ShapeGeometry(shape, 6);
}

const GULLS = [
  { cx: -20, cz: -70, r: 34, y: 30, speed: 0.12, phase: 0 },
  { cx: -20, cz: -70, r: 30, y: 34, speed: 0.12, phase: 0.5 },
  { cx: 40, cz: -90, r: 46, y: 42, speed: 0.09, phase: 2 },
  { cx: -60, cz: -40, r: 26, y: 24, speed: 0.15, phase: 4 },
  { cx: 10, cz: -120, r: 60, y: 52, speed: 0.07, phase: 1.2 },
];

export function Gulls() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const geo = useMemo(() => gullGeometry(), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#F4F6FA", side: THREE.DoubleSide, fog: true }), []);
  useFrame(({ camera }) => {
    const t = skyUniforms.uTime.value;
    // Dark against a light sky, pale against a dark one.
    mat.color.set(daylight.stars > 0.2 ? "#C9D2E6" : "#3E4A66");
    refs.current.forEach((m, i) => {
      if (!m) return;
      const g = GULLS[i];
      const a = g.phase + t * g.speed;
      m.position.set(g.cx + Math.cos(a) * g.r, g.y + Math.sin(t * 0.4 + i) * 1.2, g.cz + Math.sin(a) * g.r * 0.5);
      m.lookAt(camera.position);
      // A slow wingbeat with long glides between.
      const beat = Math.sin(t * 3.2 + i * 1.7);
      const flap = Math.max(beat, -0.2);
      m.scale.set(1.6, 1.6 * (0.55 + 0.6 * flap), 1);
    });
  });
  return (
    <group>
      {GULLS.map((_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)} geometry={geo} material={mat} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Sky light: the world is lit and reflected by its own sky              */
/* ------------------------------------------------------------------ */

/**
 * Image-based light from the sky the page is showing, not from a photo studio: a copy of the sky
 * (and below the horizon, the bay and the land) is filtered into an environment map that every
 * physical material uses for its ambient light and reflections. Windows mirror the dawn, paint picks
 * up the golden hour, and at night everything falls into the moonlit blue. It is refreshed as the
 * day moves on, a few times a second at most, and never while the story stands still.
 */
export function SkyLight({ intensity = 1 }: { intensity?: number }) {
  const kit = useRef<ReturnType<typeof skyLightKit> | null>(null);
  const get = useThree((s) => s.get);
  useEffect(
    () => () => {
      const k = kit.current;
      if (!k) return;
      const { scene } = get();
      if (scene.environment === k.target?.texture) scene.environment = null;
      k.target?.dispose();
      k.pmrem.dispose();
      k.material.dispose();
      kit.current = null;
    },
    [get],
  );
  useFrame(({ gl, scene }) => {
    const k = (kit.current ??= skyLightKit(gl));
    k.n++;
    const t = daylight.t;
    if (Math.abs(t - k.t) < 0.02 || (k.target && k.n % 6)) return;
    k.t = t;
    // The ground half: the water and the land in the hour's light.
    k.ground.value.copy(daylight.water).lerp(daylight.fillGround, 0.5);
    const next = k.pmrem.fromScene(k.envScene, 0, 0.1, 200, { size: 128 });
    k.target?.dispose();
    k.target = next;
    scene.environment = next.texture;
    scene.environmentIntensity = intensity;
  }, -0.9);
  return null;
}

function skyLightKit(gl: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(gl);
  const envScene = new THREE.Scene();
  const ground = { value: new THREE.Color() };
  const material = new THREE.ShaderMaterial({
    uniforms: { ...skyUniforms, uGround: ground },
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${SKY_GLSL}
      uniform vec3 uGround;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = skyColour(d, false);
        // Below the horizon: the bay and the land under the sky's light.
        c = mix(c, uGround, smoothstep(0.0, -0.12, d.y));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), material));
  return { pmrem, envScene, ground, material, target: null as THREE.WebGLRenderTarget | null, t: NaN, n: 0 };
}
