"use client";

// The places the story happens, each built in metres around the thing its section is about:
// - PlantFloor: a slice of Plant 01, the rack's floor and the wall it backs onto, with Line 2
//   behind a strip curtain (where its stock goes) and the operations display where the facts
//   arrive and the recommendation appears.
// The island, the harbour and Plant 02's dispatch yard are in land.tsx and harbour.tsx.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { TINTS } from "../three/palette";
import { aluminium, darkGlass, enamel, grain, hazard, lamp, paint, rubber, steel } from "../three/materials";
import { asGround, bisque, canvasTexture, sans } from "./sets";

const mats = new Map<string, THREE.Material>();
function memo<T extends THREE.Material>(k: string, make: () => T): T {
  let m = mats.get(k) as T | undefined;
  if (!m) mats.set(k, (m = make()));
  return m;
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                             */
/* ------------------------------------------------------------------ */

/** Seeded random, so every surface draws the same each load. */
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Sealed epoxy on concrete: a warm grey with soft trowel clouds, a few scuffs, a satin sheen. */
export const epoxy = () =>
  memo("epoxy", () => {
    const map = canvasTexture(1024, 1024, (g, w, h) => {
      g.fillStyle = "#CDD0D5";
      g.fillRect(0, 0, w, h);
      const r = rng(11);
      for (let i = 0; i < 90; i++) {
        const x = r() * w;
        const y = r() * h;
        const rad = 40 + r() * 160;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        const dark = r() > 0.5;
        gr.addColorStop(0, dark ? "rgba(96,108,128,0.07)" : "rgba(250,252,255,0.08)");
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
      // Tyre scuffs from pallet trucks
      g.strokeStyle = "rgba(46,54,70,0.05)";
      for (let i = 0; i < 26; i++) {
        g.lineWidth = 3 + r() * 6;
        g.beginPath();
        const x = r() * w;
        const y = r() * h;
        g.moveTo(x, y);
        g.bezierCurveTo(x + 80, y + (r() - 0.5) * 60, x + 160, y + (r() - 0.5) * 60, x + 240 + r() * 120, y + (r() - 0.5) * 40);
        g.stroke();
      }
    });
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(2, 2);
    const rough = grain("epoxy", 120, 50).clone();
    rough.needsUpdate = true;
    rough.repeat.set(6, 6);
    return new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, roughnessMap: rough, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  });

/** Concrete block paving in a stretcher bond, the pavement in front of a shop. */
export const pavers = () =>
  memo("pavers", () => {
    const map = canvasTexture(512, 512, (g, w, h) => {
      g.fillStyle = "#AAAFB7";
      g.fillRect(0, 0, w, h);
      const r = rng(3);
      const bw = 64;
      const bh = 32;
      for (let row = 0; row < h / bh; row++)
        for (let col = -1; col < w / bw + 1; col++) {
          const x = col * bw + (row % 2) * (bw / 2);
          const y = row * bh;
          const v = 205 + Math.floor((r() - 0.5) * 22);
          g.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
          g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
        }
    });
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(3, 3);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.86, bumpMap: map, bumpScale: 0.004 });
  });

/** Warehouse sandwich panel: white, with a recessed joint every metre and fine micro-ribs. */
const panelWall = (repeat: number) =>
  memo(`panel-${repeat}`, () => {
    const n = canvasTexture(
      256,
      8,
      (g, w) => {
        g.fillStyle = "rgb(128,128,255)";
        g.fillRect(0, 0, w, 8);
        // Micro-ribs
        for (let x = 0; x < w; x += 16) {
          g.fillStyle = "rgb(112,128,250)";
          g.fillRect(x, 0, 2, 8);
          g.fillStyle = "rgb(144,128,250)";
          g.fillRect(x + 2, 0, 2, 8);
        }
        // The panel joint
        g.fillStyle = "rgb(40,128,200)";
        g.fillRect(0, 0, 4, 8);
        g.fillStyle = "rgb(216,128,200)";
        g.fillRect(4, 0, 4, 8);
      },
      false,
    );
    n.wrapS = n.wrapT = THREE.RepeatWrapping;
    n.repeat.set(repeat, 1);
    return new THREE.MeshStandardMaterial({ color: "#EBEDF0", roughness: 0.55, metalness: 0.15, normalMap: n, normalScale: new THREE.Vector2(0.9, 0.9) });
  });

/** The inside of a building seen through a doorway: dim, matte, lit from within. */
const interior = () => memo("interior", () => new THREE.MeshStandardMaterial({ color: "#4A4B50", roughness: 0.9, side: THREE.BackSide }));

const screenGlass = () => memo("screen-glass", () => new THREE.MeshPhysicalMaterial({ color: "#000000", transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1, depthWrite: false }));

/** Paint on the floor: a satin line with a slightly worn edge. */
const floorPaint = (color: string) => memo(`floorpaint-${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -1 }));

/** A flat printed decal (signs, floor markings, labels). */
export function Decal({ w, h, draw, res = 512, ground, ...p }: React.ComponentProps<"mesh"> & { w: number; h: number; res?: number; ground?: boolean; draw: (g: CanvasRenderingContext2D, w: number, h: number) => void }) {
  const mat = useMemo(() => {
    const map = canvasTexture(res, Math.round((res * h) / w), draw);
    return new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, res]);
  return (
    <mesh ref={ground ? asGround : undefined} material={mat} {...p}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

/** A sign panel: text centred on a coloured plate, letter-spaced caps. */
export function signDraw(text: string, bg: string, fg: string, sub?: string) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(0, 0, w, h, h * 0.08);
    g.fill();
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${Math.round(h * 0.05)}px`;
    g.font = `750 ${Math.round(h * (sub ? 0.36 : 0.46))}px ${sans()}`;
    g.fillText(text, w / 2, h * (sub ? 0.4 : 0.54));
    if (sub) {
      g.globalAlpha = 0.72;
      g.font = `600 ${Math.round(h * 0.2)}px ${sans()}`;
      g.fillText(sub, w / 2, h * 0.76);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Plant 01: the rack's floor, its wall, Line 2 behind it               */
/* ------------------------------------------------------------------ */

/** Plant 01 slice, in metres. x across, z towards the viewer, floor at y = 0. */
export const PLANT01 = {
  floor: { w: 10.5, d: 6.4 },
  wall: { z: -2.7, h: 3.7, t: 0.2 },
  rack: { x: -2.2 },
  /** The strip-curtain opening behind the rack: Line 2 is through there. */
  door: { w: 3.5, h: 2.75 },
  /** The operations display on the wall: where the facts arrive and the recommendation appears. */
  screen: { x: 3.05, y: 1.72, w: 3.6, h: 2.0 },
};

/** A floor that fades out at its front and sides, so the plant dissolves into the page. */
function fadingFloor(base: THREE.MeshPhysicalMaterial, w: number, d: number) {
  const m = base.clone();
  m.transparent = true;
  m.onBeforeCompile = (s) => {
    s.vertexShader = "varying vec2 vFloor;\n" + s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvFloor = position.xy;");
    s.fragmentShader =
      "varying vec2 vFloor;\n" +
      s.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        // Plane space: x across, y from the back (+) to the front (-).
        vec2 q = vFloor / vec2(${(w / 2).toFixed(2)}, ${(d / 2).toFixed(2)});
        float edge = max(smoothstep(0.62, 1.0, abs(q.x)), smoothstep(0.25, 1.0, -q.y));
        gl_FragColor.a *= 1.0 - edge;`,
      );
  };
  m.customProgramCacheKey = () => `fadefloor-${w}-${d}`;
  return m;
}

/** The plant floor, its back wall with Line 2's doorway, and what's painted and posted on them. */
export function PlantFloor({ screen, span = PLANT01.floor.w }: { screen: THREE.Texture; span?: number }) {
  const { floor, wall, door, rack } = PLANT01;
  // The partition runs wall to wall inside the plant: panels carry it out past the floor's width.
  const fill = Math.max(0, (span - floor.w) / 2);
  const floorMat = useMemo(() => fadingFloor(epoxy() as THREE.MeshPhysicalMaterial, floor.w, floor.d), [floor.w, floor.d]);
  const W = floor.w;
  // Wall pieces around the doorway.
  const left = W / 2 + (rack.x - door.w / 2);
  const right = W / 2 - (rack.x + door.w / 2);
  const wallZ = wall.z;
  const strips = useMemo(() => Array.from({ length: 16 }, (_, i) => -door.w / 2 + 0.11 + i * ((door.w - 0.22) / 15)), [door.w]);
  const curtain = memo("curtain", () => new THREE.MeshPhysicalMaterial({ color: "#D5E6EA", roughness: 0.18, transparent: true, opacity: 0.5, clearcoat: 1, clearcoatRoughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  const sway = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    // The strips hang still but for a draught from the line.
    sway.current.forEach((m, i) => m && (m.rotation.x = Math.sin(clock.elapsedTime * 0.9 + i * 0.7) * 0.012));
  });
  return (
    <group>
      {/* Floor, fading towards the viewer */}
      <mesh ref={asGround} rotation-x={-Math.PI / 2} position-z={wallZ + floor.d / 2} material={floorMat} receiveShadow>
        <planeGeometry args={[floor.w, floor.d]} />
      </mesh>
      {/* Walkway lines in front of the rack, and the rack's location marked on the floor */}
      {[wallZ + 1.55, wallZ + 3.2].map((z) => (
        <mesh key={z} ref={asGround} rotation-x={-Math.PI / 2} position={[rack.x + 0.6, 0.003, z]} material={floorPaint("#F2C230")} receiveShadow>
          <planeGeometry args={[6.2, 0.1]} />
        </mesh>
      ))}
      <Decal
        ground
        w={1.5}
        h={0.3}
        rotation-x={-Math.PI / 2}
        position={[rack.x - 0.9, 0.004, wallZ + 1.25]}
        draw={(g, w, h) => {
          g.fillStyle = "rgba(30,30,32,0.82)";
          g.font = `800 ${Math.round(h * 0.7)}px ${sans()}`;
          g.textBaseline = "middle";
          g.fillText("A-01 · 4471", 4, h * 0.55);
        }}
      />

      {/* Back wall: panels left and right of the doorway, and over it */}
      <group position-z={wallZ - wall.t / 2}>
        <mesh position={[-W / 2 + left / 2, wall.h / 2, 0]} material={panelWall(Math.round(left))} castShadow receiveShadow>
          <boxGeometry args={[left, wall.h, wall.t]} />
        </mesh>
        <mesh position={[W / 2 - right / 2, wall.h / 2, 0]} material={panelWall(Math.round(right))} castShadow receiveShadow>
          <boxGeometry args={[right, wall.h, wall.t]} />
        </mesh>
        <mesh position={[rack.x, door.h + (wall.h - door.h) / 2, 0]} material={panelWall(Math.round(door.w))} castShadow receiveShadow>
          <boxGeometry args={[door.w, wall.h - door.h, wall.t]} />
        </mesh>
        {fill > 0 &&
          [-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (W / 2 + fill / 2), wall.h / 2, 0]} material={panelWall(Math.round(fill))} castShadow receiveShadow>
              <boxGeometry args={[fill, wall.h, wall.t]} />
            </mesh>
          ))}
        {/* Cut edge along the top, so the wall reads as a section through the building */}
        <mesh position={[0, wall.h + 0.01, 0]} material={bisque("#C8CCD4")}>
          <boxGeometry args={[W + fill * 2, 0.02, wall.t + 0.002]} />
        </mesh>
        {/* Base kerb: a steel kick plate where the floor meets the wall */}
        <mesh position={[0, 0.08, wall.t / 2 + 0.01]} material={enamel("#9AA0A8", 0.45)} receiveShadow>
          <boxGeometry args={[W + fill * 2, 0.16, 0.02]} />
        </mesh>
      </group>

      {/* Line 2, through the doorway: a dim hall, its conveyor and work lights */}
      <group position={[rack.x, 0, wallZ - wall.t]}>
        <mesh position={[0, door.h / 2 + 0.1, -1.4]} material={interior()}>
          <boxGeometry args={[door.w + 0.4, door.h + 0.2, 2.8]} />
        </mesh>
        {/* Back wall of the hall, lit warm */}
        <mesh position={[0, door.h / 2, -2.75]} material={lamp("#FFD9A8", 0.25)}>
          <planeGeometry args={[door.w + 0.4, door.h]} />
        </mesh>
        {/* The line's roller conveyor, running across behind the doorway */}
        <mesh position={[0, 0.78, -1.2]} material={aluminium(0.35)} castShadow>
          <boxGeometry args={[door.w + 0.4, 0.08, 0.7]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.2, 0.38, -1.2]} material={steel("#55585E", 0.5)}>
            <boxGeometry args={[0.06, 0.76, 0.6]} />
          </mesh>
        ))}
        <mesh position={[0, door.h - 0.2, -1.6]} material={lamp("#FFF1DA", 1.4)}>
          <boxGeometry args={[1.6, 0.05, 0.12]} />
        </mesh>
      </group>
      {/* Door frame and the strip curtain */}
      <group position={[rack.x, 0, wallZ + 0.02]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[(s * (door.w + 0.1)) / 2, door.h / 2, 0]} material={steel("#C7CBD1", 0.4)} castShadow>
            <boxGeometry args={[0.1, door.h, 0.08]} />
          </mesh>
        ))}
        <mesh position={[0, door.h + 0.05, 0]} material={steel("#C7CBD1", 0.4)} castShadow>
          <boxGeometry args={[door.w + 0.2, 0.1, 0.12]} />
        </mesh>
        {strips.map((x, i) => (
          <group key={x} position={[x, door.h - 0.02, i % 2 ? 0.012 : -0.012]}>
            <mesh ref={(m) => void (sway.current[i] = m)} position-y={-door.h / 2 + 0.03} material={curtain} renderOrder={3}>
              <boxGeometry args={[0.23, door.h - 0.04, 0.004]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Signs: the plant's name, and where the doorway leads */}
      <Decal w={2.6} h={0.5} position={[rack.x, door.h + 0.36, wallZ + 0.005]} draw={signDraw("LINE 2 · ASSEMBLY", "#22252B", "#FFFFFF")} />
      <Decal w={2.6} h={0.42} position={[PLANT01.screen.x, 3.28, wallZ + 0.005]} res={1024} draw={signDraw("PLANT 01 · OPERATIONS", TINTS.cobalt, "#FFFFFF")} />
      {/* The operations display: a wall-mounted screen in a dark bezel, on a steel bracket */}
      <group position={[PLANT01.screen.x, PLANT01.screen.y, wallZ + 0.07]}>
        <mesh material={enamel("#17181B", 0.35)} castShadow>
          <boxGeometry args={[PLANT01.screen.w + 0.12, PLANT01.screen.h + 0.12, 0.1]} />
        </mesh>
        <mesh position-z={0.051}>
          <planeGeometry args={[PLANT01.screen.w, PLANT01.screen.h]} />
          <meshStandardMaterial map={screen} emissiveMap={screen} emissive="#FFFFFF" emissiveIntensity={0.85} roughness={0.18} metalness={0.1} />
        </mesh>
        {/* Glass over the panel: a faint reflection of the hall */}
        <mesh position-z={0.056} material={screenGlass()}>
          <planeGeometry args={[PLANT01.screen.w, PLANT01.screen.h]} />
        </mesh>
      </group>
      {/* A wall lamp over the rack and a safety notice by the doorway */}
      <mesh position={[rack.x, 3.45, wallZ + 0.12]} material={enamel("#2A2C31", 0.5)} castShadow>
        <boxGeometry args={[1.4, 0.08, 0.24]} />
      </mesh>
      <mesh position={[rack.x, 3.405, wallZ + 0.16]} material={lamp("#FFF4DE", 1.2)}>
        <boxGeometry args={[1.3, 0.012, 0.12]} />
      </mesh>
      <Decal w={0.42} h={0.56} position={[rack.x + door.w / 2 + 0.55, 1.55, wallZ + 0.005]} draw={(g, w, h) => {
        g.fillStyle = "#0FA874";
        g.beginPath();
        g.roundRect(0, 0, w, h, 14);
        g.fill();
        g.fillStyle = "#fff";
        g.font = `800 ${Math.round(w * 0.16)}px ${sans()}`;
        g.textAlign = "center";
        g.fillText("HI-VIS", w / 2, h * 0.42);
        g.fillText("ZONE", w / 2, h * 0.62);
      }} />
      {/* Column and fire point at the right */}
      <mesh position={[0.65, wall.h / 2, wallZ + 0.16]} material={paint("#E2E4E7", 0.5)} castShadow receiveShadow>
        <boxGeometry args={[0.3, wall.h, 0.3]} />
      </mesh>
      {[0.25, 0.5].map((y) => (
        <mesh key={y} position={[0.65, y, wallZ + 0.16]} material={hazard()}>
          <boxGeometry args={[0.31, 0.12, 0.31]} />
        </mesh>
      ))}
      <group position={[5.05, 0, wallZ + 0.16]}>
        <mesh position-y={0.36} material={paint("#D7261E", 0.3)} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.5, 24]} />
        </mesh>
        <mesh position-y={0.66} material={enamel("#1E1F22", 0.5)}>
          <cylinderGeometry args={[0.03, 0.05, 0.1, 16]} />
        </mesh>
      </group>
    </group>
  );
}


export { darkGlass, rubber };
