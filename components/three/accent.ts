"use client";

// Colour only on the chapter's object. A model is built in its system colour; in the story, a
// chapter that is about something else greys it out. useStoryAccent finds the parts painted in the
// model's tone and eases them between that tone and a cool neutral, every frame, from a weight the
// chapter supplies (1 = in colour, 0 = neutral). It never edits shared materials: each model gets
// its own story-only copies, so the explorer and every other user of a memoised material is untouched.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

/** Paint, enamel and plastic parts go to this grey when their system is not the subject. */
export const NEUTRAL = "#C9CFD8";
/** Large light surfaces (signs, wide panels) go lighter, so they read as white, not as grey blocks. */
export const NEUTRAL_LIGHT = "#E8EBEF";

/**
 * A material with a second colour to ease (a sign's lettering): `fg` is its live colour, `fgTone`
 * and `fgNeutral` the two ends. Declared through userData so any material class can take part.
 */
type Dual = THREE.Material & { color: THREE.Color; fg?: THREE.Color; userData: { fgTone?: string; fgNeutral?: string; neutral?: string } };

type Entry = { mesh: THREE.Mesh; source: THREE.Material };
type Clone = { mat: Dual; neutral: THREE.Color; tone: THREE.Color; fgN?: THREE.Color; fgT?: THREE.Color };

const same = (a: THREE.Color, b: THREE.Color) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 1e-4;

/**
 * Eases every part of `ref`'s model painted in `tone` (or marked userData.accent) between that tone
 * and its neutral, by `k()` (0..1). Parts can name their own neutral with material.userData.neutral.
 * Call it on a group whose contents are mounted with it; Bake (a child) has merged them by then.
 */
export function useStoryAccent(ref: React.RefObject<THREE.Object3D | null>, tone: string, k: () => number) {
  const clones = useRef<Clone[]>([]);
  const last = useRef(-1);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const want = new THREE.Color(tone);
    const swapped: Entry[] = [];
    const made = new Map<THREE.Material, Clone>();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.bakedAway || Array.isArray(mesh.material)) return;
      const src = mesh.material as Dual;
      if (!src.color) return;
      if (!src.userData.accent && !same(src.color, want)) return;
      let c = made.get(src);
      if (!c) {
        const mat = src.clone() as Dual;
        const fgT = src.userData.fgTone ? new THREE.Color(src.userData.fgTone) : undefined;
        const fgN = src.userData.fgNeutral ? new THREE.Color(src.userData.fgNeutral) : undefined;
        c = { mat, neutral: new THREE.Color(src.userData.neutral ?? NEUTRAL), tone: src.color.clone(), fgN, fgT };
        made.set(src, c);
      }
      swapped.push({ mesh, source: src });
      mesh.material = c.mat;
    });
    clones.current = [...made.values()];
    last.current = -1;
    return () => {
      swapped.forEach(({ mesh, source }) => (mesh.material = source));
      made.forEach((c) => c.mat.dispose());
      clones.current = [];
    };
  }, [ref, tone]);
  useFrame(() => {
    const v = THREE.MathUtils.clamp(k(), 0, 1);
    if (!clones.current.length || Math.abs(v - last.current) < 1e-3) return;
    last.current = v;
    for (const c of clones.current) {
      c.mat.color.lerpColors(c.neutral, c.tone, v);
      if (c.mat.fg && c.fgN && c.fgT) c.mat.fg.lerpColors(c.fgN, c.fgT, v);
    }
  });
}

/** A weight that eases toward its goal instead of switching: chapter hand-offs never strobe. */
export function useEased(goal: () => number, lambda = 6) {
  const v = useRef(-1);
  useFrame((_, dt) => {
    const g = goal();
    v.current = v.current < 0 ? g : THREE.MathUtils.damp(v.current, g, lambda, Math.min(dt, 1 / 30));
  });
  return v;
}
