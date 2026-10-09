"use client";

// The buildings around the plants where the other systems live: the head office (ERP), the sales
// office (CRM), the service centre (customer cases), and a few houses running on east along the
// coast road. Metres, ground at y = 0, each facing the road (+z).
import * as THREE from "three";
import { useMemo } from "react";
import { box, geo, merge } from "../three/parts";
import { useSign } from "../three/buildings";
import { TINTS } from "../three/palette";
import { nightGlow } from "./glow";

const mats = new Map<string, THREE.Material>();
function flat(color: string, rough = 0.75, metal = 0) {
  const k = `${color}-${rough}-${metal}`;
  let m = mats.get(k);
  if (!m) mats.set(k, (m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal })));
  return m;
}

const WALL = "#EEF1F5";
const ROOF = "#4A5672";
const WINDOW = "#FFE2B4";

/** A name panel on a façade. */
function Sign({ text, tone, w, h = 0.9, ...p }: React.ComponentProps<"mesh"> & { text: string; tone: string; w: number; h?: number }) {
  const map = useSign(text, tone, "#FFFFFF", 1024, Math.round((1024 * h) / w));
  return (
    <mesh {...p}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={map} roughness={0.5} />
    </mesh>
  );
}

/** Rows of windows, as one mesh: glass by day, lit by night. */
function windowBands(w: number, floors: number, floorH: number, z: number, y0: number) {
  return geo(`bands-${w}-${floors}-${floorH}-${z}-${y0}`, () => merge(Array.from({ length: floors }, (_, i) => box(w, floorH * 0.46, 0.06, 0, y0 + i * floorH + floorH * 0.55, z))));
}
function mullions(w: number, floors: number, floorH: number, z: number, y0: number) {
  return geo(`mull-${w}-${floors}-${floorH}-${z}-${y0}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < floors; i++) for (let x = -w / 2; x <= w / 2 + 0.01; x += 1.6) parts.push(box(0.1, floorH * 0.46, 0.1, x, y0 + i * floorH + floorH * 0.55, z + 0.04));
    return merge(parts);
  });
}

/** The head office: three storeys of white bands and glass, the ERP's home. */
export function HeadOffice(p: React.ComponentProps<"group">) {
  const W = 16;
  const D = 11;
  const F = 3.6;
  return (
    <group {...p}>
      <mesh position-y={(3 * F + 0.6) / 2} material={flat(WALL, 0.7)} castShadow receiveShadow>
        <boxGeometry args={[W, 3 * F + 0.6, D]} />
      </mesh>
      <mesh geometry={windowBands(W - 1.2, 3, F, D / 2 + 0.02, 0)} material={nightGlow(WINDOW, 1.25, 0.04, "#2B3954")} />
      <mesh geometry={mullions(W - 1.2, 3, F, D / 2 + 0.02, 0)} material={flat("#C9D1DC", 0.4, 0.5)} />
      {/* Side windows */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2 + s * 0.02, 0, 0]} rotation-y={(s * Math.PI) / 2} geometry={windowBands(D - 1.6, 3, F, 0, 0)} material={nightGlow(WINDOW, 1.1, 0.04, "#2B3954")} />
      ))}
      {/* Roof: parapet, plant room, a mast */}
      <mesh position={[0, 3 * F + 0.9, 0]} material={flat("#D6DCE4", 0.8)} castShadow>
        <boxGeometry args={[W - 4, 0.6, D - 3]} />
      </mesh>
      <mesh position={[4.5, 3 * F + 3.2, -2]} material={flat("#8F9AAB", 0.5, 0.5)}>
        <cylinderGeometry args={[0.06, 0.08, 5, 8]} />
      </mesh>
      {/* Entrance canopy and the name band in the ERP's colour */}
      <mesh position={[-3, 3.0, D / 2 + 1.2]} material={flat("#DDE3EA", 0.6)} castShadow>
        <boxGeometry args={[5, 0.2, 2.4]} />
      </mesh>
      <Sign text="HEAD OFFICE" tone={TINTS.cobalt} w={6.4} h={0.95} position={[3.2, 3 * F + 0.05, D / 2 + 0.05]} />
    </group>
  );
}

/** A two-storey office with a shopfront and an awning in its system's colour. */
function Office({ name, tone, ...p }: React.ComponentProps<"group"> & { name: string; tone: string }) {
  const W = 12;
  const D = 9;
  return (
    <group {...p}>
      <mesh position-y={3.6} material={flat(WALL, 0.7)} castShadow receiveShadow>
        <boxGeometry args={[W, 7.2, D]} />
      </mesh>
      <mesh position={[0, 1.6, D / 2 + 0.02]} material={nightGlow(WINDOW, 1.2, 0.05, "#2B3954")}>
        <boxGeometry args={[W - 2, 2.4, 0.05]} />
      </mesh>
      <mesh position={[0, 5.2, D / 2 + 0.02]} geometry={windowBands(W - 2, 1, 2.4, 0, -1.2)} material={nightGlow(WINDOW, 1.1, 0.04, "#2B3954")} />
      {/* Awning */}
      <mesh position={[0, 3.25, D / 2 + 0.8]} rotation-x={0.28} material={flat(tone, 0.6)} castShadow>
        <boxGeometry args={[W - 1.4, 0.08, 1.8]} />
      </mesh>
      <mesh position={[0, 7.35, 0]} material={flat("#D6DCE4", 0.8)}>
        <boxGeometry args={[W + 0.2, 0.3, D + 0.2]} />
      </mesh>
      <Sign text={name} tone={tone} w={5.2} h={0.9} position={[0, 6.6, D / 2 + 0.05]} />
    </group>
  );
}

export const SalesOffice = (p: React.ComponentProps<"group">) => <Office name="SALES" tone={TINTS.violet} {...p} />;
export const ServiceCentre = (p: React.ComponentProps<"group">) => <Office name="SERVICE" tone={TINTS.pink} {...p} />;

/** Low houses along the coast road east of the site: white walls, slate-blue hipped roofs. */
export function Houses({ spots }: { spots: { x: number; z: number; w: number; d: number; ry?: number }[] }) {
  const { walls, roofs, lit } = useMemo(() => {
    const walls: THREE.BufferGeometry[] = [];
    const roofs: THREE.BufferGeometry[] = [];
    const lit: THREE.BufferGeometry[] = [];
    for (const s of spots) {
      const h = 3.2;
      const wall = new THREE.BoxGeometry(s.w, h, s.d).translate(0, h / 2, 0);
      // A hipped roof: a four-sided pyramid stretched over the plan, low and broad.
      const roof = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).scale(s.w + 1.2, 1.7, s.d + 1.2).translate(0, h + 0.85, 0);
      const win = new THREE.BoxGeometry(s.w * 0.5, 1.0, 0.04).translate(0, 1.6, s.d / 2 + 0.02);
      for (const g of [wall, roof, win]) {
        g.rotateY(s.ry ?? 0);
        g.translate(s.x, 0, s.z);
      }
      walls.push(wall);
      roofs.push(roof);
      lit.push(win);
    }
    return { walls: merge(walls), roofs: merge(roofs), lit: merge(lit) };
  }, [spots]);
  return (
    <group>
      <mesh geometry={walls} material={flat(WALL, 0.8)} castShadow receiveShadow />
      <mesh geometry={roofs} material={flat(ROOF, 0.7)} castShadow />
      <mesh geometry={lit} material={nightGlow(WINDOW, 1.3, 0.0, "#3A4660")} />
    </group>
  );
}
