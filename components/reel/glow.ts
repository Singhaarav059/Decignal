// Lights that come on with the evening: windows, lanterns, street lamps, ship lights. Each is an
// emissive material registered here with its full brightness; the world scales them all by the
// daylight's lamp level once a frame, so the whole bay lights up together and fades, never blinks.
import * as THREE from "three";
import { daylight } from "@/lib/daylight";

const lamps = new Map<string, { mat: THREE.MeshStandardMaterial; max: number; floor: number }>();

/**
 * A surface that glows at night. `floor` is how lit it looks by day (a lit window still reads
 * faintly in daylight); `max` is its brightness at full night.
 */
export function nightGlow(color: string, max = 1.6, floor = 0, base = "#2A3448") {
  const key = `${color}-${max}-${floor}-${base}`;
  let l = lamps.get(key);
  if (!l) {
    const mat = new THREE.MeshStandardMaterial({ color: base, emissive: color, emissiveIntensity: floor, roughness: 0.35, metalness: 0.1 });
    l = { mat, max, floor };
    lamps.set(key, l);
  }
  return l.mat;
}

export function stepGlow() {
  const k = daylight.lamps;
  for (const { mat, max, floor } of lamps.values()) mat.emissiveIntensity = floor + (max - floor) * k;
}
