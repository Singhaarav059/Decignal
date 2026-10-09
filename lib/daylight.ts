// One day over the bay, keyed to the story clock (lib/reel.ts story()): dawn over the hero, full
// day while the problem plays out, afternoon for the decision, golden hour, sunset and dusk for the
// result, night for the questions and the footer. One light source at a time (the sun, then the
// moon), so every shadow in the world agrees. Read every frame by the sky, the water and the lights.
import * as THREE from "three";
import { S } from "./reel";

type Key = {
  t: number;
  /** Sky at the zenith and at the horizon. */
  top: string;
  horizon: string;
  /** The air between you and the far shore: fog, mist and the mountains' haze. */
  haze: string;
  /** Glow around the sun (or after it has set). */
  glow: string;
  /** The sun in the sky, as [azimuth, elevation] in degrees; azimuth 0 is straight into the bay. */
  sun: [number, number];
  /** The light that casts shadows: the sun by day, the moon by night. */
  key: string;
  keyPower: number;
  keyAt: [number, number];
  /** Sky and ground fill. */
  fillSky: string;
  fillGround: string;
  fillPower: number;
  /** Open water, away from the sky's reflection. */
  water: string;
  /** Lanterns, windows and street lamps, 0 off to 1 fully lit. */
  lamps: number;
  stars: number;
};

const KEYS: Key[] = [
  // 01 Dawn: rose horizon, the first sun low on the right
  { t: S.hero, top: "#8EA8D6", horizon: "#F4D6D3", haze: "#E6DCE6", glow: "#FFC6AE", sun: [96, 5], key: "#FFD9C8", keyPower: 1.35, keyAt: [104, 12], fillSky: "#C8D3EE", fillGround: "#AAB6C8", fillPower: 0.8, water: "#7790B6", lamps: 0.25, stars: 0 },
  // 02 Morning
  { t: S.systems, top: "#7BA6DC", horizon: "#E2ECF6", haze: "#DEE7F1", glow: "#FFF0DF", sun: [122, 30], key: "#FFF3E6", keyPower: 1.75, keyAt: [124, 32], fillSky: "#CFDCF2", fillGround: "#B2BDCB", fillPower: 0.72, water: "#6A8EBF", lamps: 0, stars: 0 },
  // 03 Late morning, inside Plant 01
  { t: S.signal, top: "#76A5DF", horizon: "#E0ECF7", haze: "#DDE8F3", glow: "#FFFFFF", sun: [160, 50], key: "#FFFFFF", keyPower: 1.8, keyAt: [160, 52], fillSky: "#D2DEF2", fillGround: "#B7C1CE", fillPower: 0.72, water: "#668DC1", lamps: 0, stars: 0 },
  // 04 Afternoon, the decision
  { t: S.decision, top: "#7CA3D8", horizon: "#E4EAF3", haze: "#E0E7F0", glow: "#FFF4E8", sun: [212, 36], key: "#FFF4E8", keyPower: 1.72, keyAt: [212, 38], fillSky: "#D0DAEE", fillGround: "#B4BDCA", fillPower: 0.74, water: "#6A8BBA", lamps: 0, stars: 0 },
  // 05 Golden hour
  { t: S.yours, top: "#7896CC", horizon: "#F5D5CB", haze: "#E6D9DF", glow: "#FFCCB0", sun: [246, 13], key: "#FFD3B6", keyPower: 1.5, keyAt: [244, 16], fillSky: "#C3CCE8", fillGround: "#A6AFC2", fillPower: 0.76, water: "#6E86B2", lamps: 0.12, stars: 0 },
  // 06 Sunset
  { t: S.outcome, top: "#5868A4", horizon: "#F0A796", haze: "#CDB0BE", glow: "#FFAA8A", sun: [268, 2], key: "#FFB896", keyPower: 1.05, keyAt: [262, 7], fillSky: "#A3A9D0", fillGround: "#7F88A3", fillPower: 0.72, water: "#58699A", lamps: 0.5, stars: 0 },
  // 07 Dusk: the moon takes over the light
  { t: S.how, top: "#2B3668", horizon: "#9A8DB8", haze: "#6C6F9B", glow: "#C79AB4", sun: [278, -6], key: "#C9CCF4", keyPower: 0.42, keyAt: [118, 26], fillSky: "#6E7AAD", fillGround: "#404A6C", fillPower: 0.58, water: "#2F3C69", lamps: 0.88, stars: 0.3 },
  // 08 Night harbour
  { t: S.ask, top: "#0E1734", horizon: "#2B3A68", haze: "#27355F", glow: "#3B4A7E", sun: [290, -22], key: "#B9C7F4", keyPower: 0.36, keyAt: [114, 32], fillSky: "#43528A", fillGround: "#1E2744", fillPower: 0.5, water: "#16244A", lamps: 1, stars: 1 },
];

const COLOR_FIELDS = ["top", "horizon", "haze", "glow", "key", "fillSky", "fillGround", "water"] as const;
type ColorField = (typeof COLOR_FIELDS)[number];

const parsed = KEYS.map((k) => Object.fromEntries(COLOR_FIELDS.map((f) => [f, new THREE.Color(k[f])])) as Record<ColorField, THREE.Color>);

/** Direction towards a point in the sky, from [azimuth, elevation] in degrees. */
export function skyDir([az, el]: [number, number], out = new THREE.Vector3()) {
  const a = THREE.MathUtils.degToRad(az);
  const e = THREE.MathUtils.degToRad(el);
  return out.set(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}

/** The light right now. Mutated in place by stepDaylight. */
export const daylight = {
  t: 0,
  top: new THREE.Color(),
  horizon: new THREE.Color(),
  haze: new THREE.Color(),
  glow: new THREE.Color(),
  key: new THREE.Color(),
  fillSky: new THREE.Color(),
  fillGround: new THREE.Color(),
  water: new THREE.Color(),
  keyPower: 1,
  fillPower: 0.7,
  lamps: 0,
  stars: 0,
  sunDir: new THREE.Vector3(0, 1, 0),
  keyDir: new THREE.Vector3(0, 1, 0),
  /** Where the moon hangs at night: low over the bay, a little left of the mountain. */
  moonDir: skyDir([-14, 13]),
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const va = new THREE.Vector3();
const vb = new THREE.Vector3();

export function stepDaylight(t: number) {
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const k = smooth(Math.min(Math.max((t - a.t) / (b.t - a.t), 0), 1));
  for (const f of COLOR_FIELDS) daylight[f].copy(parsed[i][f]).lerp(parsed[i + 1][f], k);
  const mix = (x: number, y: number) => x + (y - x) * k;
  daylight.t = t;
  daylight.keyPower = mix(a.keyPower, b.keyPower);
  daylight.fillPower = mix(a.fillPower, b.fillPower);
  daylight.lamps = mix(a.lamps, b.lamps);
  daylight.stars = mix(a.stars, b.stars);
  daylight.sunDir.copy(skyDir(a.sun, va)).lerp(skyDir(b.sun, vb), k).normalize();
  daylight.keyDir.copy(skyDir(a.keyAt, va)).lerp(skyDir(b.keyAt, vb), k).normalize();
  // Never let the key light skim the ground: below 8 degrees it lights the water, not the land.
  if (daylight.keyDir.y < 0.14) {
    daylight.keyDir.y = 0.14;
    daylight.keyDir.normalize();
  }
}

/** The page colour behind the world, for anything drawn before the canvas is up. */
export function skyCss(t: number) {
  stepDaylight(t);
  return `#${daylight.horizon.getHexString()}`;
}
