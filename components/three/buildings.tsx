"use client";

// The plants, built in code with real materials, in metres.
import * as THREE from "three";
import { Person, Walker } from "./people";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { aluminium, cladding, concrete, darkGlass, enamel, hazard, lamp } from "./materials";
import { box, cylY, geo, merge, rbox } from "./parts";
import { asGround } from "../reel/sets";
import { clipUnder } from "../reel/cutaway";

/* ---------------- Canvas text for signs ---------------- */

export function useSign(text: string, bg: string, fg: string, w = 1024, h = 192, weight = 700) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16;
    return t;
  }, [w, h]);
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      if (!live) return;
      const c = tex.image as HTMLCanvasElement;
      const x = c.getContext("2d")!;
      x.fillStyle = bg;
      x.fillRect(0, 0, w, h);
      const fam = getComputedStyle(document.body).fontFamily;
      x.font = `${weight} ${h * 0.5}px ${fam}`;
      x.fillStyle = fg;
      x.textAlign = "center";
      x.textBaseline = "middle";
      // Letter-spaced caps, like signage on a real plant
      (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${h * 0.06}px`;
      x.fillText(text, w / 2, h * 0.54);
      tex.needsUpdate = true;
    });
    return () => {
      live = false;
    };
  }, [tex, text, bg, fg, w, h, weight]);
  return tex;
}

/* ------------------------------------------------------------------ */
/* Plant: an industrial shed with dock doors, a drive-in door, offices  */
/* ------------------------------------------------------------------ */

export const PLANT = { W: 17, D: 10, H: 7, door: -5.0 /* x of the drive-in door */ };

function plantDark() {
  return geo("plant-dark", () => {
    const { W, D } = PLANT;
    const z = D / 2;
    const parts: THREE.BufferGeometry[] = [];
    // Drive-in door opening (dark interior)
    parts.push(box(3.6, 4.2, 0.06, PLANT.door, 2.1, z + 0.01));
    // Dock shelters: black rubber frames around two raised doors
    for (const x of [0.6, 4.6]) {
      parts.push(box(3.4, 0.35, 0.55, x, 4.75, z + 0.28));
      for (const s of [-1, 1]) parts.push(box(0.35, 3.3, 0.55, x + s * 1.53, 3.1, z + 0.28));
      // Dock bumpers
      for (const s of [-1, 1]) parts.push(rbox(0.25, 0.45, 0.2, 0.04, x + s * 1.1, 1.0, z + 0.12));
    }
    // Panel joints on the dock doors
    for (const x of [0.6, 4.6]) for (let i = 1; i < 6; i++) parts.push(box(2.7, 0.03, 0.02, x, 1.45 + i * 0.52, z + 0.06));
    // Office mullions
    for (let i = 0; i <= 5; i++) parts.push(box(0.08, 1.9, 0.08, W / 2 - 4.9 + i * 0.86, 4.6, z + 0.06));
    // Entrance door frame
    parts.push(box(1.6, 0.08, 0.1, W / 2 - 2.6, 2.6, z + 0.07));
    // Gutter along the front
    parts.push(box(W + 0.4, 0.18, 0.2, 0, PLANT.H + 0.02, z + 0.2));
    return merge(parts);
  });
}

function plantShell() {
  // Precast concrete plinth, then cladding above it
  return geo("plant-plinth", () => {
    const { W, D } = PLANT;
    return merge([box(W + 0.06, 1.2, D + 0.06, 0, 0.6, 0)]);
  });
}

function plantRoof() {
  return geo("plant-roof", () => {
    const { W, D, H } = PLANT;
    const parts: THREE.BufferGeometry[] = [box(W + 0.3, 0.16, D + 0.3, 0, H + 0.08, 0)];
    // Rooftop units
    parts.push(rbox(1.6, 0.8, 1.2, 0.05, -4, H + 0.56, -1.5));
    parts.push(rbox(1.2, 0.6, 1.0, 0.05, 3.5, H + 0.46, -2.2));
    return merge(parts);
  });
}

function plantGlass() {
  return geo("plant-glass", () => {
    const { W, D, H } = PLANT;
    const z = D / 2;
    const parts: THREE.BufferGeometry[] = [];
    // Office glazing band and entrance
    parts.push(box(4.3, 1.8, 0.05, W / 2 - 2.75, 4.6, z + 0.02));
    parts.push(box(1.5, 2.4, 0.05, W / 2 - 2.6, 1.4, z + 0.02));
    // Rooflights
    for (const x of [-6, -2, 2, 6]) parts.push(box(1.0, 0.08, D - 2.5, x, H + 0.2, 0.4));
    return merge(parts);
  });
}

function plantTrim() {
  return geo("plant-trim", () => {
    const { W, D, H } = PLANT;
    const parts: THREE.BufferGeometry[] = [];
    // Corner flashings
    for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push(box(0.22, H - 1.2, 0.22, (x * W) / 2, 1.2 + (H - 1.2) / 2, (z * D) / 2));
    // Rolled-up door drum over the drive-in opening
    parts.push(rbox(3.9, 0.55, 0.45, 0.12, PLANT.door, 4.5, D / 2 + 0.22));
    // Entrance canopy
    parts.push(box(2.6, 0.12, 1.4, W / 2 - 2.6, 2.95, D / 2 + 0.7));
    // Fan grilles on the rooftop units
    parts.push(cylY(0.36, 0.04, -4, H + 0.98, -1.5, 32));
    parts.push(cylY(0.3, 0.04, 3.5, H + 0.78, -2.2, 32));
    return merge(parts);
  });
}

function dockHazard() {
  return geo("dock-hazard", () => {
    const { D } = PLANT;
    return merge([0.6, 4.6].map((x) => new THREE.PlaneGeometry(3.4, 0.26).translate(x, 1.06, D / 2 + 0.035)));
  });
}

function bayLines() {
  return geo("bay-lines", () => {
    const { D } = PLANT;
    const parts: THREE.BufferGeometry[] = [];
    // A truck bay in front of each dock, and a pedestrian walkway along the facade
    for (const x of [0.6, 4.6]) for (const s of [-1, 1]) parts.push(box(0.12, 0.012, 5.5, x + s * 1.75, 0.006, D / 2 + 3.0));
    parts.push(box(10.6, 0.012, 0.1, 1.2, 0.006, D / 2 + 0.55));
    for (let i = 0; i < 9; i++) parts.push(box(0.5, 0.012, 0.32, -1.4 + i * 0.62, 0.006, D / 2 + 0.3));
    return merge(parts);
  });
}

/** Yellow bollards guarding the drive-in door. */
function bollards() {
  return geo("bollards", () => merge([-1, 1].map((s) => cylY(0.12, 1.1, PLANT.door + s * 2.2, 0.55, PLANT.D / 2 + 0.6, 20))));
}

/** The people who work the plant: a supervisor at the entrance, a marshal by the drive-in door, someone on the apron. */
function PlantCrew() {
  const { W, D } = PLANT;
  return (
    <group>
      <Person look="planner" pose="tablet" seed={0.4} position={[W / 2 - 2.9, 0, D / 2 + 0.9]} rotation-y={-Math.PI / 2 - 0.5} />
      <Person look="crew" pose="point" seed={2.1} position={[PLANT.door + 2.6, 0, D / 2 + 1.3]} rotation-y={Math.PI * 0.85} />
      <Walker look="engineer" speed={1.1} offset={0.3} path={[[W / 2 - 4.2, D / 2 + 0.8], [-1.6, D / 2 + 0.8], [-1.6, D / 2 + 1.5], [W / 2 - 4.2, D / 2 + 1.5]]} />
    </group>
  );
}

/**
 * `ground` is the height (m) of whatever paving the scene lays in front of the plant: the bay
 * lines and the crew stand on top of it rather than underneath.
 */
export function Plant({ accent, name, crew = true, ground = 0, cut }: { accent: string; name: string; crew?: boolean; ground?: number; cut?: THREE.Plane[] }) {
  const { W, D, H } = PLANT;
  const sign = useSign(name, accent, "#FFFFFF");
  const wall = H - 1.2;
  // The building above its plinth: what a section cut opens up (`cut`), so the inside shows.
  const structure = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (cut && structure.current) clipUnder(structure.current, cut);
  }, [cut]);
  return (
    <group>
      <mesh geometry={plantShell()} material={concrete("#CFD2D7")} castShadow receiveShadow />
      <group ref={structure}>
      {/* Walls: horizontal-span ribbed steel, rib pitch about 0.5 m on every face */}
      <mesh position={[0, 1.2 + wall / 2, D / 2 - 0.05]} material={cladding("#EAECEE", Math.round(W / 0.5))} castShadow receiveShadow>
        <boxGeometry args={[W, wall, 0.1]} />
      </mesh>
      <mesh position={[0, 1.2 + wall / 2, -D / 2 + 0.05]} material={cladding("#EAECEE", Math.round(W / 0.5))} castShadow receiveShadow>
        <boxGeometry args={[W, wall, 0.1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2 - s * 0.05, 1.2 + wall / 2, 0]} rotation-y={Math.PI / 2} material={cladding("#EAECEE", Math.round(D / 0.5))} castShadow receiveShadow>
          <boxGeometry args={[D - 0.2, wall, 0.1]} />
        </mesh>
      ))}
      {/* Fascia band in the plant's colour, with its name */}
      <mesh position={[0, H - 0.5, 0]} material={enamel(accent, 0.4)} castShadow>
        <boxGeometry args={[W + 0.14, 1.0, D + 0.14]} />
      </mesh>
      <mesh position={[-W / 2 + 4.6, H - 0.5, D / 2 + 0.075]}>
        <planeGeometry args={[6.4, 1.2]} />
        <meshStandardMaterial map={sign} roughness={0.45} />
      </mesh>
      <mesh geometry={plantRoof()} material={enamel("#CFD2D7", 0.6)} castShadow receiveShadow />
      <mesh geometry={plantGlass()} material={darkGlass()} />
      <mesh geometry={plantTrim()} material={aluminium(0.4)} castShadow />
      <mesh geometry={plantDark()} material={enamel("#1E1F23", 0.75)} castShadow />
      {/* Dock doors */}
      {[0.6, 4.6].map((x) => (
        <mesh key={x} position={[x, 3.05, D / 2 + 0.03]} material={enamel("#C9CDD3", 0.45)}>
          <boxGeometry args={[2.8, 3.2, 0.04]} />
        </mesh>
      ))}
      {/* Dock lights */}
      {[0.6, 4.6].map((x) => (
        <mesh key={x} position={[x, 5.25, D / 2 + 0.12]} material={lamp("#FFF4DA", 1.2)}>
          <boxGeometry args={[0.5, 0.12, 0.12]} />
        </mesh>
      ))}
      </group>
      <mesh geometry={bollards()} material={enamel("#FFB21E", 0.4)} castShadow />
      {/* Dock edges in hazard chevrons, and painted bay lines on the apron */}
      <mesh geometry={dockHazard()} material={hazard()} />
      <mesh ref={asGround} geometry={bayLines()} material={enamel("#F2C230", 0.55)} position-y={ground} receiveShadow />
      {crew && (
        <group position-y={ground}>
          <PlantCrew />
        </group>
      )}
    </group>
  );
}
