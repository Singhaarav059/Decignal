"use client";

// Buildings and the six source systems, built in code with real materials.
// Plants are modelled in metres (scaled by the parent); island models in scene units.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { aluminium, brass, chrome, cladding, clearGlass, concrete, darkGlass, enamel, lamp, paint, plastic, rubber, steel } from "./materials";
import { Bearing, LoadedPallet, Tote, box, cylY, geo, merge, rbox } from "./parts";
import { Forklift, SemiTruck } from "./vehicles";
import { CRATE, ISLAND_TOTE } from "@/lib/scene";
import { TINTS } from "./palette";

/* ---------------- Canvas text for signs ---------------- */

function useSign(text: string, bg: string, fg: string, w = 1024, h = 192, weight = 700) {
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

/** Yellow bollards guarding the drive-in door. */
function bollards() {
  return geo("bollards", () => merge([-1, 1].map((s) => cylY(0.12, 1.1, PLANT.door + s * 2.2, 0.55, PLANT.D / 2 + 0.6, 20))));
}

export function Plant({ accent, name }: { accent: string; name: string }) {
  const { W, D, H } = PLANT;
  const sign = useSign(name, accent, "#FFFFFF");
  const wall = H - 1.2;
  return (
    <group>
      <mesh geometry={plantShell()} material={concrete("#D9D5CD")} castShadow receiveShadow />
      {/* Walls: horizontal-span ribbed steel, rib pitch about 0.5 m on every face */}
      <mesh position={[0, 1.2 + wall / 2, D / 2 - 0.05]} material={cladding("#EEEDEA", Math.round(W / 0.5))} castShadow receiveShadow>
        <boxGeometry args={[W, wall, 0.1]} />
      </mesh>
      <mesh position={[0, 1.2 + wall / 2, -D / 2 + 0.05]} material={cladding("#EEEDEA", Math.round(W / 0.5))} castShadow receiveShadow>
        <boxGeometry args={[W, wall, 0.1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2 - s * 0.05, 1.2 + wall / 2, 0]} rotation-y={Math.PI / 2} material={cladding("#EEEDEA", Math.round(D / 0.5))} castShadow receiveShadow>
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
      <mesh geometry={plantRoof()} material={enamel("#D6D4D0", 0.6)} castShadow receiveShadow />
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
      <mesh geometry={bollards()} material={enamel("#FFB21E", 0.4)} castShadow />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Island models (scene units, standing on an island of radius ~0.87)   */
/* ------------------------------------------------------------------ */

/** Server face: rows of 1U/2U servers with drive bays and status lights, drawn in code. */
function useServerFace() {
  return useMemo(() => {
    const W = 256;
    const H = 768;
    const make = (lit: boolean) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const x = c.getContext("2d")!;
      x.fillStyle = lit ? "#000" : "#18191C";
      x.fillRect(0, 0, W, H);
      let y = 18;
      let n = 0;
      while (y < H - 30) {
        const u = n % 5 === 2 ? 2 : 1;
        const h = u * 30 - 4;
        if (!lit) {
          x.fillStyle = n % 7 === 3 ? "#2C2E33" : "#25272B";
          x.fillRect(12, y, W - 24, h);
          // Drive bays
          for (let i = 0; i < (u === 2 ? 12 : 8); i++) {
            x.fillStyle = "#34363C";
            x.fillRect(22 + i * (u === 2 ? 15 : 20), y + 4, u === 2 ? 11 : 16, h - 8);
          }
        }
        // Status lights
        x.fillStyle = lit ? (n % 6 === 4 ? "#2BE38F" : "#4F7DFF") : "#3A3D44";
        x.fillRect(W - 40, y + h / 2 - 3, 6, 6);
        x.fillRect(W - 28, y + h / 2 - 3, 6, 6);
        y += u * 30;
        n++;
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 16;
      return t;
    };
    return { map: make(false), emissive: make(true) };
  }, []);
}

let rackGlassMat: THREE.Material | null = null;
/** Smoked glass door: the servers show through, the studio reflects on top. */
const rackGlass = () =>
  (rackGlassMat ??= new THREE.MeshPhysicalMaterial({ color: "#9FB2C4", roughness: 0.04, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.22, depthWrite: false }));

/** ERP: two 42U cabinets on a raised floor, glass doors over live servers. */
export function ServerRacks() {
  const face = useServerFace();
  const faceMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: face.map, emissiveMap: face.emissive, emissive: "#FFFFFF", emissiveIntensity: 1.4, roughness: 0.5 }),
    [face],
  );
  // The racks are live: lights flicker as the system reads and writes.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    faceMat.emissiveIntensity = 1.1 + Math.sin(t * 9) * 0.25 + (Math.sin(t * 23.0) > 0.7 ? 0.5 : 0);
  });
  const body = geo("rack-body", () =>
    merge(
      [-0.21, 0.21].flatMap((x) => [
        rbox(0.4, 0.98, 0.56, 0.02, x, 0.49 + 0.03, 0),
        // Plinth and roof cap
        box(0.36, 0.03, 0.5, x, 0.015, 0),
        rbox(0.41, 0.02, 0.57, 0.006, x, 1.03, 0),
      ]),
    ),
  );
  const trim = geo("rack-trim", () =>
    merge([
      // Door handles and hinges
      ...[-0.21, 0.21].flatMap((x) => [rbox(0.012, 0.12, 0.02, 0.004, x + 0.16, 0.6, 0.29)]),
      // Cable tray over both racks
      box(0.86, 0.012, 0.16, 0, 1.12, -0.1),
      ...[-0.42, 0.42].map((x) => box(0.012, 0.05, 0.16, x, 1.14, -0.1)),
      ...[-0.25, 0, 0.25].map((x) => box(0.012, 0.08, 0.012, x, 1.08, -0.1)),
    ]),
  );
  const tiles = geo("rack-tiles", () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (i * i + j * j <= 10) parts.push(rbox(0.2, 0.02, 0.2, 0.004, i * 0.21, 0.01, j * 0.21, 1));
    return merge(parts);
  });
  return (
    <group>
      <mesh geometry={tiles} material={enamel("#E4E6EA", 0.6)} receiveShadow />
      <group position-y={0.02}>
        <mesh geometry={body} material={steel("#202125", 0.45)} castShadow receiveShadow />
        {[-0.21, 0.21].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.53, 0.281]} material={faceMat}>
              <planeGeometry args={[0.34, 0.9]} />
            </mesh>
            <mesh position={[x, 0.53, 0.285]} material={rackGlass()} renderOrder={1}>
              <boxGeometry args={[0.35, 0.92, 0.004]} />
            </mesh>
          </group>
        ))}
        <mesh geometry={trim} material={aluminium(0.3)} castShadow />
        {/* Cables dropping into the racks, in the system's colour */}
        {[-0.3, -0.12, 0.12, 0.3].map((x, i) => (
          <mesh key={x} position={[x, 1.08, -0.16]} material={plastic(i % 2 ? TINTS.cobalt : "#2B2C31", 0.5)}>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** CRM: a shopfront with a striped awning, display windows and a lit sign. */
export function Storefront() {
  const sign = useSign("STORE", TINTS.violet, "#FFFFFF", 512, 128);
  const awning = geo("awning", () => {
    // Scalloped, sloped stripes
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) parts.push(box(0.11, 0.012, 0.26, -0.44 + i * 0.11, 0, 0.13));
    return merge(parts);
  });
  const awningB = geo("awning-b", () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i += 2) parts.push(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 16, 1, false, 0, Math.PI).rotateY(-Math.PI / 2).translate(-0.44 + i * 0.11, -0.0, 0.26));
    return merge(parts);
  });
  const frames = geo("shop-frames", () =>
    merge([
      // Window and door frames
      ...[-0.47, -0.17, 0.17, 0.47].map((x) => box(0.025, 0.4, 0.03, x, 0.25, 0.315)),
      box(0.98, 0.025, 0.03, 0, 0.45, 0.315),
      box(0.98, 0.03, 0.03, 0, 0.05, 0.315),
      ...[-0.32, 0.32].map((x) => box(0.012, 0.38, 0.02, x, 0.25, 0.32)),
      // Door handle
      box(0.01, 0.1, 0.02, 0.12, 0.24, 0.335),
    ]),
  );
  const interior = geo("shop-in", () =>
    merge([
      // Shelves and goods seen through the glass
      ...[-0.32, 0.32].flatMap((x) => [box(0.26, 0.012, 0.08, x, 0.14, 0.24), box(0.26, 0.012, 0.08, x, 0.26, 0.24), box(0.26, 0.012, 0.08, x, 0.38, 0.24)]),
    ]),
  );
  const goods = geo("shop-goods", () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const x of [-0.32, 0.32]) for (const y of [0.14, 0.26]) for (let i = 0; i < 4; i++) parts.push(box(0.045, 0.07, 0.05, x - 0.09 + i * 0.06, y + 0.04, 0.24));
    return merge(parts);
  });
  return (
    <group>
      {/* Building: rendered walls over a dark base course */}
      <mesh position={[0, 0.3, 0]} material={enamel("#F5F2EC", 0.75)} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.6, 0.62]} />
      </mesh>
      <mesh position={[0, 0.62, 0]} material={enamel("#E7E3DC", 0.7)} castShadow>
        <boxGeometry args={[1.06, 0.05, 0.68]} />
      </mesh>
      {/* Recessed dark interior, then glass */}
      <mesh position={[0, 0.25, 0.3]} material={enamel("#2A2733", 0.8)}>
        <boxGeometry args={[0.92, 0.38, 0.01]} />
      </mesh>
      <mesh geometry={interior} material={enamel("#E9E5DF", 0.6)} />
      <mesh geometry={goods} material={plastic(TINTS.violet, 0.5)} />
      <mesh position={[0, 0.25, 0.31]} material={clearGlass()}>
        <boxGeometry args={[0.92, 0.38, 0.006]} />
      </mesh>
      <mesh geometry={frames} material={aluminium(0.35)} castShadow />
      {/* Sign band */}
      <mesh position={[0, 0.53, 0.312]}>
        <planeGeometry args={[0.62, 0.11]} />
        <meshStandardMaterial map={sign} roughness={0.4} emissiveMap={sign} emissive="#FFFFFF" emissiveIntensity={0.18} />
      </mesh>
      {/* Awning, tilted out from the facade */}
      <group position={[0, 0.47, 0.31]} rotation-x={0.42}>
        <mesh geometry={awning} material={enamel(TINTS.violet, 0.6)} castShadow />
        <mesh geometry={awningB} material={enamel(TINTS.violet, 0.6)} castShadow />
      </group>
      {/* A planter by the door and an A-board on the pavement */}
      <mesh position={[0.38, 0.05, 0.42]} material={concrete("#D9D5CD")} castShadow>
        <boxGeometry args={[0.12, 0.1, 0.12]} />
      </mesh>
      <mesh position={[0.38, 0.14, 0.42]} material={enamel("#3F8F5E", 0.8)} castShadow>
        <sphereGeometry args={[0.08, 16, 12]} />
      </mesh>
      <group position={[-0.3, 0, 0.5]} rotation-y={0.3}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, 0.09, s * 0.025]} rotation-x={s * 0.22} material={enamel("#2A2B30", 0.6)} castShadow>
            <boxGeometry args={[0.11, 0.18, 0.008]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** MES: a sawtooth factory with rooflights, a stack, a silo and a running conveyor. */
export function Factory() {
  const tooth = geo("tooth", () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.36, 0);
    s.lineTo(0, 0.22);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.64, bevelEnabled: false });
    g.translate(0, 0, -0.32);
    return g;
  });
  const glaze = geo("tooth-glass", () => merge([0, 1, 2].map((k) => box(0.012, 0.2, 0.6, -0.545 + k * 0.36, 0.53, -0.08))));
  const puffs = useRef<THREE.Mesh[]>([]);
  const boxes = useRef<THREE.Group>(null);
  const puffMats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true, depthWrite: false })),
    [],
  );
  // Steam rises and thins out; parts ride out of the plant on the conveyor.
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    puffs.current.forEach((m, i) => {
      const k = (t * 0.3 + i / 3) % 1;
      m.position.set(0.4 + k * 0.12, 1.02 + k * 0.45, -0.22);
      m.scale.setScalar(0.04 + k * 0.08);
      puffMats[i].opacity = Math.sin(k * Math.PI) * 0.85;
    });
    boxes.current?.children.forEach((c, i) => {
      const k = (t * 0.12 + i / 3) % 1;
      c.position.x = -0.05 + k * 0.5;
      c.scale.setScalar(Math.min(1, Math.sin(k * Math.PI) * 4));
    });
  });
  return (
    <group position-x={-0.05}>
      {/* Walls */}
      <mesh position={[-0.18, 0.21, -0.08]} material={cladding("#F0EEEA", 24)} castShadow receiveShadow>
        <boxGeometry args={[1.08, 0.42, 0.64]} />
      </mesh>
      <mesh position={[-0.18, 0.04, -0.08]} material={concrete("#D9D5CD")} castShadow>
        <boxGeometry args={[1.1, 0.08, 0.66]} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} geometry={tooth} position={[-0.72 + k * 0.36, 0.42, -0.08]} castShadow material={enamel(TINTS.emerald, 0.45)} />
      ))}
      <mesh geometry={glaze} material={darkGlass()} />
      {/* Roller door */}
      <mesh position={[0.18, 0.15, 0.245]} material={enamel("#C9CDD3", 0.45)}>
        <boxGeometry args={[0.22, 0.26, 0.01]} />
      </mesh>
      {/* Stack with steel bands */}
      <mesh position={[0.4, 0.6, -0.22]} castShadow material={concrete("#E9E6E0")}>
        <cylinderGeometry args={[0.055, 0.07, 0.8, 28]} />
      </mesh>
      {[0.85, 0.95].map((y) => (
        <mesh key={y} position={[0.4, y, -0.22]} material={enamel(TINTS.emerald, 0.4)}>
          <cylinderGeometry args={[0.058, 0.058, 0.04, 28]} />
        </mesh>
      ))}
      {/* Silo */}
      <group position={[0.58, 0, 0.12]}>
        <mesh position-y={0.3} material={aluminium(0.28)} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.4, 32]} />
        </mesh>
        <mesh position-y={0.545} material={aluminium(0.28)} castShadow>
          <coneGeometry args={[0.1, 0.09, 32]} />
        </mesh>
        <mesh position-y={0.06} material={aluminium(0.28)}>
          <coneGeometry args={[0.1, 0.08, 32]} />
        </mesh>
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} position={[x, 0.05, 0.05]} material={steel()}>
            <boxGeometry args={[0.015, 0.1, 0.015]} />
          </mesh>
        ))}
      </group>
      {/* Conveyor out of the door, parts riding on it */}
      <group position={[0.2, 0, 0.42]}>
        <mesh position={[0.2, 0.09, 0]} material={steel("#34363C", 0.5)} castShadow>
          <boxGeometry args={[0.5, 0.025, 0.1]} />
        </mesh>
        {[0.0, 0.2, 0.4].map((x) => (
          <mesh key={x} position={[x, 0.04, 0]} material={steel("#34363C", 0.5)}>
            <boxGeometry args={[0.015, 0.08, 0.08]} />
          </mesh>
        ))}
        <group ref={boxes} position-y={0.12}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={plastic(TINTS.emerald, 0.5)} castShadow>
              <boxGeometry args={[0.05, 0.04, 0.06]} />
            </mesh>
          ))}
        </group>
      </group>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) puffs.current[i] = el;
          }}
          material={puffMats[i]}
        >
          <sphereGeometry args={[1, 16, 16]} />
        </mesh>
      ))}
    </group>
  );
}

/** WMS: a small distribution shed, stock outside, a forklift at work. */
export function Warehouse({ accent = TINTS.saffron, crates = true }: { accent?: string; crates?: boolean }) {
  const tote = useMemo(() => plastic(accent, 0.5, true), [accent]);
  return (
    <group>
      <group position={[-0.12, 0, -0.22]} scale={0.06}>
        <Plant accent={accent} name="WMS" />
      </group>
      {/* Stock outside the dock: half-size totes, two stacks; the signal tote rides on the front one */}
      {crates && (
        <group position={[0.48, (CRATE.h * ISLAND_TOTE) / 2, 0.42]} scale={ISLAND_TOTE}>
          <Tote material={tote} />
          <group position={[0, 0, -0.5]}>
            <Tote material={tote} />
            <group position-y={CRATE.h + 0.004}>
              <Tote material={tote} />
            </group>
          </group>
        </group>
      )}
      <group position={[-0.36, 0, 0.42]} rotation-y={0.35} scale={0.085}>
        <Forklift color={TINTS.saffron} lift={() => 0.25 + Math.sin(performance.now() / 900) * 0.2}>
          <group rotation-y={Math.PI / 2}>
            <LoadedPallet tote={tote} />
          </group>
        </Forklift>
      </group>
    </group>
  );
}

/** Suppliers: the same truck that makes the transfer later, waiting at the supplier. */
export function SupplierTruck() {
  const tote = useMemo(() => plastic(TINTS.tangerine, 0.5, true), []);
  return (
    <group rotation-y={0.5} position={[-0.05, 0, 0.05]} scale={0.104}>
      <group position-x={-1.65}>
        <SemiTruck accent={TINTS.tangerine}>
          {[3.6, 0.95].map((x) => (
            <group key={x} position={[x, 1.56, 0]} rotation-y={Math.PI / 2}>
              <LoadedPallet tote={tote} />
            </group>
          ))}
        </SemiTruck>
      </group>
    </group>
  );
}

/* ---------------- External: a desk globe with a dotted world ---------------- */

// Coarse coastlines (lon, lat). Enough to read as Earth at this size.
const LAND: [number, number][][] = [
  [[-168, 66], [-140, 70], [-95, 72], [-80, 62], [-62, 58], [-52, 47], [-70, 43], [-76, 35], [-81, 25], [-97, 26], [-97, 18], [-88, 15], [-83, 9], [-78, 8], [-105, 20], [-117, 32], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
  [[-55, 60], [-44, 60], [-20, 70], [-20, 81], [-60, 82], [-72, 77]],
  [[-78, 8], [-60, 10], [-50, 0], [-35, -7], [-40, -22], [-48, -28], [-58, -38], [-65, -55], [-73, -50], [-72, -30], [-70, -18], [-80, -5], [-80, 2]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [30, 71], [40, 66], [45, 55], [40, 45], [28, 41], [22, 37], [15, 38], [12, 44], [5, 43], [0, 39]],
  [[-6, 50], [2, 51], [-2, 57], [-5, 58], [-5, 54]],
  [[-17, 21], [-17, 14], [-8, 5], [5, 4], [9, 4], [10, -2], [13, -12], [12, -18], [18, -34], [26, -34], [33, -26], [40, -16], [40, -3], [51, 11], [43, 12], [35, 30], [32, 31], [20, 32], [10, 37], [-6, 36], [-10, 30]],
  [[35, 30], [44, 13], [52, 15], [58, 22], [56, 26], [48, 30], [45, 38], [40, 45], [45, 55], [40, 66], [60, 70], [80, 73], [110, 77], [140, 72], [180, 68], [170, 60], [160, 52], [140, 52], [135, 43], [122, 40], [122, 30], [110, 20], [108, 11], [100, 14], [100, 3], [95, 15], [90, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [50, 30], [40, 35]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [141, -38], [131, -31], [115, -34]],
  [[130, 31], [136, 34], [141, 37], [142, 43], [140, 41], [135, 35]],
  [[95, 5], [105, -6], [115, -8], [120, -2], [118, 4], [110, 2], [100, 0]],
];

const inside = (lon: number, lat: number, poly: [number, number][]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

function useWorldTexture(dot: string) {
  return useMemo(() => {
    const W = 2048;
    const H = 1024;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d")!;
    x.fillStyle = "#FBFAF7";
    x.fillRect(0, 0, W, H);
    // Printed land silhouettes stay legible at the miniature's display size.
    x.fillStyle = dot;
    x.globalAlpha = 0.34;
    LAND.forEach((polygon) => {
      x.beginPath();
      polygon.forEach(([lon, lat], i) => {
        const px = ((lon + 180) / 360) * W;
        const py = ((90 - lat) / 180) * H;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      });
      x.closePath();
      x.fill();
    });
    x.globalAlpha = 1;
    // Graticule
    x.strokeStyle = "rgba(20,19,15,0.07)";
    x.lineWidth = 2;
    for (let lon = -180; lon <= 180; lon += 30) {
      const px = ((lon + 180) / 360) * W;
      x.beginPath();
      x.moveTo(px, 0);
      x.lineTo(px, H);
      x.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const py = ((90 - lat) / 180) * H;
      x.beginPath();
      x.moveTo(0, py);
      x.lineTo(W, py);
      x.stroke();
    }
    // Land as an even field of dots: equal spacing on the sphere, not on the map.
    x.fillStyle = dot;
    const step = 2.2;
    for (let lat = -58; lat <= 82; lat += step) {
      const ls = step / Math.max(Math.cos((lat * Math.PI) / 180), 0.15);
      for (let lon = -180; lon < 180; lon += ls) {
        if (!LAND.some((p) => inside(lon, lat, p))) continue;
        const px = ((lon + 180) / 360) * W;
        const py = ((90 - lat) / 180) * H;
        const rx = 3.4 / Math.max(Math.cos((lat * Math.PI) / 180), 0.15);
        x.beginPath();
        x.ellipse(px, py, rx, 3.4, 0, 0, Math.PI * 2);
        x.fill();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16;
    return t;
  }, [dot]);
}

export function Globe() {
  const globe = useRef<THREE.Group>(null);
  const sat = useRef<THREE.Group>(null);
  const world = useWorldTexture(TINTS.pink);
  useFrame(({ clock }, dt) => {
    if (globe.current) globe.current.rotation.y += dt * 0.3;
    if (sat.current) sat.current.rotation.y = clock.elapsedTime * 0.6;
  });
  const tilt = 0.41; // Earth's axial tilt
  return (
    <group>
      {/* Weighted base and stem */}
      <mesh position-y={0.03} castShadow receiveShadow material={paint("#2A2B30", 0.35)}>
        <cylinderGeometry args={[0.24, 0.28, 0.06, 48]} />
      </mesh>
      <mesh position-y={0.066} material={brass()}>
        <cylinderGeometry args={[0.2, 0.2, 0.012, 48]} />
      </mesh>
      <mesh position-y={0.15} material={brass()} castShadow>
        <cylinderGeometry args={[0.022, 0.03, 0.18, 20]} />
      </mesh>
      <group position-y={0.62} rotation-z={tilt}>
        {/* Meridian arc */}
        <mesh rotation-y={Math.PI / 2} material={brass()} castShadow>
          <torusGeometry args={[0.43, 0.012, 12, 96, Math.PI * 1.2]} />
        </mesh>
        <group ref={globe}>
          <mesh castShadow>
            <sphereGeometry args={[0.4, 96, 64]} />
            <meshPhysicalMaterial map={world} roughness={0.32} clearcoat={0.8} clearcoatRoughness={0.12} />
          </mesh>
          {/* Axis pins */}
          {[-1, 1].map((s) => (
            <mesh key={s} position-y={s * 0.425} material={brass()}>
              <cylinderGeometry args={[0.01, 0.01, 0.05, 12]} />
            </mesh>
          ))}
        </group>
      </group>
      {/* A weather satellite on its orbit */}
      <group position-y={0.62} rotation-x={0.35}>
        <group ref={sat}>
          <group position={[0.58, 0, 0]} rotation-y={Math.PI / 2}>
            <mesh material={paint("#F2F0EB", 0.3)} castShadow>
              <boxGeometry args={[0.05, 0.05, 0.07]} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position-x={s * 0.085} material={darkGlass()}>
                <boxGeometry args={[0.11, 0.004, 0.045]} />
              </mesh>
            ))}
            <mesh position-z={0.045} rotation-x={Math.PI / 2} material={chrome()}>
              <coneGeometry args={[0.02, 0.02, 20, 1, true]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Contents of the signal tote: bearings lying in a bed of totes. */
export function BearingBed() {
  return (
    <group position-y={CRATE.h / 2 - 0.028}>
      {[
        [-0.17, -0.07, 0.1],
        [0.0, -0.08, 0.6],
        [0.17, -0.06, 1.2],
        [-0.09, 0.08, 2.1],
        [0.09, 0.08, 0.3],
        [0.21, 0.09, 2.6],
        [-0.22, 0.09, 1.5],
      ].map(([x, z, r], i) => (
        <Bearing key={i} position={[x, 0, z]} rotation-y={r} />
      ))}
    </group>
  );
}

export { rubber };
