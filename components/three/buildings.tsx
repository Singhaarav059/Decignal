"use client";

// Buildings and the six source systems, built in code with real materials.
// Plants are modelled in metres (scaled by the parent); island models in scene units.
import * as THREE from "three";
import { Person, Walker } from "./people";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { GlobeMaterial, SignMaterial, aluminium, brushed, chrome, cladding, clearGlass, concrete, darkGlass, enamel, hazard, lamp, paint, plastic, rubber, steel } from "./materials";
import { Bake, LIVE } from "./Bake";
import { NEUTRAL } from "./accent";
import { LoadedPallet, Tote, box, cylY, geo, merge, rbox } from "./parts";
import { Forklift, SemiTruck } from "./vehicles";
import { CRATE, ISLAND_TOTE } from "@/lib/scene";
import { COLORS, INK_ON, TINTS } from "./palette";
import { FACES } from "@/lib/copy";

/* ---------------- Signs: lettering drawn at the size it shows on screen ---------------- */

/** Lettering that reads on a system colour: ink on saffron, white on the others (palette INK_ON). */
export function inkOn(tone: string) {
  const key = (Object.keys(TINTS) as (keyof typeof TINTS)[]).find((k) => TINTS[k].toLowerCase() === tone.toLowerCase());
  return key ? INK_ON[key].ink : "#FFFFFF";
}

/** Canvas widths a sign can be drawn at. It picks the one nearest its width on screen in device
 *  pixels, so the lettering is never shrunk through mipmaps (soft) or stretched (blurred). */
const SIGN_TIERS = [128, 192, 256, 384, 512, 768, 1024, 1536];
const signA = new THREE.Vector3();
const signB = new THREE.Vector3();

/**
 * A painted sign, w x h, facing +z. The panel takes `bg` and the lettering `fg`; in the story a model's
 * accent driver eases both (to ink on white) when its system is not the subject.
 */
export function Sign({ text, bg, fg, w, h, weight = 700, ...props }: React.ComponentProps<"mesh"> & { text: string; bg: string; fg: string; w: number; h: number; weight?: number }) {
  const gl = useThree((st) => st.gl);
  const ref = useRef<THREE.Mesh>(null);
  const [tier, setTier] = useState(3);
  const want = useRef({ tier: 3, for: 0 });
  const { tex, mat } = useMemo(() => {
    const t = new THREE.CanvasTexture(document.createElement("canvas"));
    // A coverage mask (data, not colour): the material mixes panel and lettering from it.
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    const m = new SignMaterial({ map: t, roughness: 0.45 });
    m.userData.neutral = "#F7F9FB";
    m.userData.fgNeutral = COLORS.ink;
    return { tex: t, mat: m };
  }, [gl]);
  useEffect(() => {
    mat.color.set(bg);
    mat.fg.set(fg);
    mat.userData.fgTone = fg;
  }, [mat, bg, fg]);
  useEffect(
    () => () => {
      tex.dispose();
      mat.dispose();
    },
    [tex, mat],
  );
  useEffect(() => {
    let live = true;
    const draw = () => {
      if (!live) return;
      const W = SIGN_TIERS[tier];
      const H = Math.max(16, Math.round((W * h) / w));
      const c = tex.image as HTMLCanvasElement;
      // A new size needs new GPU storage: release the old one before the canvas changes.
      if (c.width !== W || c.height !== H) {
        tex.dispose();
        c.width = W;
        c.height = H;
      }
      const x = c.getContext("2d")!;
      x.fillStyle = "#000";
      x.fillRect(0, 0, W, H);
      const fam = getComputedStyle(document.body).fontFamily;
      let size = H * 0.5;
      // Letter-spaced caps, like signage on a real plant; shrunk only if the name would not fit.
      const spacing = (x as CanvasRenderingContext2D & { letterSpacing: string });
      for (; size > H * 0.25; size -= 1) {
        x.font = `${weight} ${size}px ${fam}`;
        spacing.letterSpacing = `${size * 0.12}px`;
        if (x.measureText(text).width <= W * 0.86) break;
      }
      x.fillStyle = "#FFF";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(text, W / 2 + size * 0.06, H * 0.54);
      tex.needsUpdate = true;
    };
    draw();
    if (document.fonts.status !== "loaded") document.fonts.ready.then(draw);
    return () => {
      live = false;
    };
  }, [tex, text, tier, w, h, weight]);
  useFrame(({ camera, size }, dt) => {
    const m = ref.current;
    for (let o: THREE.Object3D | null = m; o; o = o.parent) if (!o.visible) return;
    if (!m) return;
    // Width on screen in device pixels: the sign's left and right edges, projected.
    m.localToWorld(signA.set(-w / 2, 0, 0)).project(camera);
    m.localToWorld(signB.set(w / 2, 0, 0)).project(camera);
    if (signA.z > 1 || signB.z > 1) return;
    const px = Math.hypot((signA.x - signB.x) * size.width, (signA.y - signB.y) * size.height) * 0.5 * gl.getPixelRatio();
    if (px < 2) return;
    let t = SIGN_TIERS.findIndex((v) => v >= px * 0.95);
    if (t < 0) t = SIGN_TIERS.length - 1;
    const wt = want.current;
    if (t !== wt.tier) {
      wt.tier = t;
      wt.for = 0;
    } else wt.for += dt;
    if (t !== tier && wt.for > (t > tier ? 0.25 : 1)) setTier(t);
  });
  return (
    <mesh ref={ref} material={mat} {...props}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
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
 * lines and the crew stand on top of it rather than underneath. `neutral` paints it without its
 * colour (grey fascia, ink lettering on a white sign, white bay lines) for a chapter whose colour
 * belongs to something else.
 */
export function Plant({ accent, name, crew = true, ground = 0, neutral = false }: { accent: string; name: string; crew?: boolean; ground?: number; neutral?: boolean }) {
  const { W, D, H } = PLANT;
  const wall = H - 1.2;
  const fascia = neutral ? NEUTRAL : accent;
  return (
    <group>
      {/* Nothing in the shed moves: one draw per finish. The crew walk, so they stay outside. */}
      <Bake key={`${accent}-${neutral}`}>
      <mesh geometry={plantShell()} material={concrete("#D5D9DF")} castShadow receiveShadow />
      {/* Walls: horizontal-span ribbed steel, rib pitch about 0.5 m on every face */}
      <mesh position={[0, 1.2 + wall / 2, D / 2 - 0.05]} material={cladding("#ECEEF1", Math.round(W / 0.5))} castShadow receiveShadow>
        <boxGeometry args={[W, wall, 0.1]} />
      </mesh>
      <mesh position={[0, 1.2 + wall / 2, -D / 2 + 0.05]} material={cladding("#ECEEF1", Math.round(W / 0.5))} castShadow receiveShadow>
        <boxGeometry args={[W, wall, 0.1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * W) / 2 - s * 0.05, 1.2 + wall / 2, 0]} rotation-y={Math.PI / 2} material={cladding("#ECEEF1", Math.round(D / 0.5))} castShadow receiveShadow>
          <boxGeometry args={[D - 0.2, wall, 0.1]} />
        </mesh>
      ))}
      {/* Fascia band in the plant's colour, with its name */}
      <mesh position={[0, H - 0.5, 0]} material={enamel(fascia, 0.4)} castShadow>
        <boxGeometry args={[W + 0.14, 1.0, D + 0.14]} />
      </mesh>
      <Sign text={name} bg={neutral ? "#F7F9FB" : accent} fg={neutral ? COLORS.ink : inkOn(accent)} w={6.4} h={1.2} position={[-W / 2 + 4.6, H - 0.5, D / 2 + 0.075]} />
      <mesh geometry={plantRoof()} material={enamel("#D3D7DD", 0.6)} castShadow receiveShadow />
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
        <mesh key={x} position={[x, 5.25, D / 2 + 0.12]} material={lamp("#F4F8FF", 1.2)}>
          <boxGeometry args={[0.5, 0.12, 0.12]} />
        </mesh>
      ))}
      <mesh geometry={bollards()} material={enamel(neutral ? NEUTRAL : "#FFB21E", 0.4)} castShadow />
      {/* Dock edges in hazard chevrons, and painted bay lines on the apron */}
      <mesh geometry={dockHazard()} material={hazard()} />
      <mesh geometry={bayLines()} material={enamel(neutral ? "#F3F5F7" : "#F2C230", 0.55)} position-y={ground} receiveShadow />
      </Bake>
      {crew && (
        <group position-y={ground}>
          <PlantCrew />
        </group>
      )}
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

const rackBands = () => geo("rack-bands", () => merge([-0.21, 0.21].map((x) => rbox(0.38, 0.034, 0.012, 0.004, x, 0.997, 0.283, 1))));

let rackGlassMat: THREE.Material | null = null;
/** Smoked glass door: the servers show through, the studio reflects on top. */
const rackGlass = () =>
  (rackGlassMat ??= new THREE.MeshPhysicalMaterial({ color: "#9FB2C4", roughness: 0.04, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.22, depthWrite: false }));

/** ERP: two 42U cabinets on a raised floor, glass doors over live servers. */
export function ServerRacks() {
  const face = useServerFace();
  const faceMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: face.map, emissiveMap: face.emissive, emissive: "#FFFFFF", emissiveIntensity: 1.1, roughness: 0.5 }),
    [face],
  );
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
      {/* A data-centre engineer checking the racks on a tablet */}
      <group position={[0.56, 0.02, 0.44]} rotation-y={2.5} scale={0.34}>
        <Person look="engineer" pose="tablet" seed={0.8} />
      </group>
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
        {/* The cabinets' nameplate bands over the doors, in the system's colour */}
        <mesh geometry={rackBands()} material={enamel(TINTS.cobalt, 0.4)} />
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

/** CRM: a shopfront with a striped awning, display windows and a lit sign. `accent` is CRM violet
 *  by default; scenes where the store is not the CRM pass a neutral. */
export function Storefront({ accent = TINTS.violet }: { accent?: string } = {}) {
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
      <mesh position={[0, 0.3, 0]} material={enamel("#F3F5F8", 0.75)} castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.6, 0.62]} />
      </mesh>
      <mesh position={[0, 0.62, 0]} material={enamel("#E4E7EB", 0.7)} castShadow>
        <boxGeometry args={[1.06, 0.05, 0.68]} />
      </mesh>
      {/* Recessed dark interior, then glass */}
      <mesh position={[0, 0.25, 0.3]} material={enamel("#2A2733", 0.8)}>
        <boxGeometry args={[0.92, 0.38, 0.01]} />
      </mesh>
      <mesh geometry={interior} material={enamel("#E6E9ED", 0.6)} />
      <mesh geometry={goods} material={plastic(accent, 0.5)} />
      <mesh position={[0, 0.25, 0.31]} material={clearGlass()}>
        <boxGeometry args={[0.92, 0.38, 0.006]} />
      </mesh>
      <mesh geometry={frames} material={aluminium(0.35)} castShadow />
      {/* Sign band */}
      <Sign text="STORE" bg={accent} fg={inkOn(accent)} w={0.62} h={0.11} position={[0, 0.53, 0.312]} />
      {/* Awning, tilted out from the facade */}
      <group position={[0, 0.47, 0.31]} rotation-x={0.42}>
        <mesh geometry={awning} material={enamel(accent, 0.6)} castShadow />
        <mesh geometry={awningB} material={enamel(accent, 0.6)} castShadow />
      </group>
      {/* Staff at the door and a shopper passing along the pavement */}
      <group scale={0.13}>
        <Person look="planner" pose="wave" seed={3.1} position={[1.6, 0, 3.4]} rotation-y={-Math.PI / 2 + 0.3} />
        <Walker look="shopper" speed={0.9} path={[[-3.6, 4.4], [2.2, 4.4], [2.2, 5.2], [-3.6, 5.2]]} />
      </group>
      {/* A planter by the door and an A-board on the pavement */}
      <mesh position={[0.38, 0.05, 0.42]} material={concrete("#D5D9DF")} castShadow>
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
      <mesh position={[-0.18, 0.21, -0.08]} material={cladding("#EEF0F3", 24)} castShadow receiveShadow>
        <boxGeometry args={[1.08, 0.42, 0.64]} />
      </mesh>
      <mesh position={[-0.18, 0.04, -0.08]} material={concrete("#D5D9DF")} castShadow>
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
      <mesh position={[0.4, 0.6, -0.22]} castShadow material={concrete("#E6E9ED")}>
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
        <group ref={boxes} position-y={0.12} userData={LIVE.userData}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} material={plastic(TINTS.emerald, 0.5)} castShadow>
              <boxGeometry args={[0.05, 0.04, 0.06]} />
            </mesh>
          ))}
        </group>
      </group>
      {/* Line staff: one checks the run on a tablet, one walks the yard */}
      <group scale={0.065}>
        <Person look="crew" pose="tablet" seed={1.9} position={[7.2, 0, 8.6]} rotation-y={Math.PI * 0.8} />
        <Walker look="warehouse" speed={1.0} offset={0.6} path={[[-9, 4.6], [-1, 4.6], [-1, 5.6], [-9, 5.6]]} />
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
        <Forklift color={TINTS.saffron} parked lift={() => 0.25 + Math.sin(performance.now() / 900) * 0.2}>
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
        {/* The driver checks the load sheet beside the cab */}
        <Person look="driver" pose="tablet" seed={2.6} position={[6.2, 0, 1.85]} rotation-y={Math.PI / 2 + 0.6} />
        <SemiTruck accent={TINTS.tangerine} parked>
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

let worldMask: THREE.CanvasTexture | null = null;
/** The printed world as a mask: red = land (a light fill and an even field of dots), green = the
 *  graticule. GlobeMaterial colours the land with the material's colour and prints the rest white. */
function worldMaskTexture() {
  if (worldMask) return worldMask;
  const W = 2048;
  const H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#000";
  x.fillRect(0, 0, W, H);
  // Graticule
  x.strokeStyle = "rgb(0,255,0)";
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
  // Printed land silhouettes stay legible at the miniature's display size.
  x.fillStyle = "rgba(255,0,0,0.34)";
  LAND.forEach((polygon) => {
    x.beginPath();
    polygon.forEach(([lon, lat], i) => {
      const px = ((lon + 180) / 360) * W;
      const py = ((90 - lat) / 180) * H;
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    });
    x.closePath();
    x.fill();
  });
  // Land as an even field of dots: equal spacing on the sphere, not on the map.
  x.fillStyle = "rgb(255,0,0)";
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
  worldMask = new THREE.CanvasTexture(c);
  worldMask.colorSpace = THREE.NoColorSpace;
  worldMask.anisotropy = 16;
  return worldMask;
}

function useWorldMaterial(land: string) {
  const m = useMemo(() => {
    const g = new GlobeMaterial({ map: worldMaskTexture(), color: land, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.12 });
    // The land greys to a quiet dot field when the story looks elsewhere.
    g.userData.neutral = "#B4BAC4";
    return g;
  }, [land]);
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

export function Globe() {
  const globe = useRef<THREE.Group>(null);
  const sat = useRef<THREE.Group>(null);
  const world = useWorldMaterial(TINTS.pink);
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
      <mesh position-y={0.066} material={brushed()}>
        <cylinderGeometry args={[0.2, 0.2, 0.012, 48]} />
      </mesh>
      <mesh position-y={0.15} material={brushed()} castShadow>
        <cylinderGeometry args={[0.022, 0.03, 0.18, 20]} />
      </mesh>
      <group position-y={0.62} rotation-z={tilt}>
        {/* Meridian arc */}
        <mesh rotation-y={Math.PI / 2} material={brushed()} castShadow>
          <torusGeometry args={[0.43, 0.012, 12, 96, Math.PI * 1.2]} />
        </mesh>
        <group ref={globe} userData={LIVE.userData}>
          <mesh castShadow material={world}>
            <sphereGeometry args={[0.4, 72, 48]} />
          </mesh>
          {/* Axis pins */}
          {[-1, 1].map((s) => (
            <mesh key={s} position-y={s * 0.425} material={brushed()}>
              <cylinderGeometry args={[0.01, 0.01, 0.05, 12]} />
            </mesh>
          ))}
        </group>
      </group>
      {/* A weather satellite on its orbit */}
      <group position-y={0.62} rotation-x={0.35}>
        <group ref={sat} userData={LIVE.userData}>
          <group position={[0.58, 0, 0]} rotation-y={Math.PI / 2}>
            <mesh material={paint("#F0F2F5", 0.3)} castShadow>
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

let bearingEtchTexCache: THREE.CanvasTexture | null = null;
/** The etched ring text, drawn once and shared by every bearing. */
const bearingEtchTexture = () => (bearingEtchTexCache ??= drawBearingEtch());
function drawBearingEtch() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.font = "bold 19px monospace";
  ctx.fillStyle = "rgba(45, 50, 60, 0.85)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const text = FACES.crate;
  const radius = size * 0.44;
  const step = (Math.PI * 2) / text.length;
  for (let i = 0; i < text.length; i++) {
    ctx.save();
    ctx.rotate(i * step);
    ctx.fillText(text[i], 0, -radius);
    ctx.restore();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

/* ---------------- The signal tote's contents: X90 bearings in a foam insert ---------------- */

/** Deep-groove ball bearing (6204 class): a chamfered ring turned from its section. */
const bearingRing = (ro: number, ri: number, wd: number) =>
  new THREE.LatheGeometry(
    [
      [ri + 0.002, -wd / 2],
      [ro - 0.002, -wd / 2],
      [ro, -wd / 2 + 0.002],
      [ro, wd / 2 - 0.002],
      [ro - 0.002, wd / 2],
      [ri + 0.002, wd / 2],
      [ri, wd / 2 - 0.002],
      [ri, -wd / 2 + 0.002],
      [ri + 0.002, -wd / 2],
    ].map(([a, b]) => new THREE.Vector2(a, b)),
    40,
  );

/** The insert has twelve pockets in a 4 x 3 grid; the bearing in each, front row last. */
const BED_X = [-0.2025, -0.0675, 0.0675, 0.2025];
const BED_Z = [-0.12, 0, 0.12];
const BED_SLOTS = BED_Z.flatMap((z) => BED_X.map((x) => [x, z] as const));
const BEARING_S = 0.9;
const POCKET_R = 0.058;

type BedSteel = { rings: THREE.BufferGeometry; balls: THREE.BufferGeometry; cages: THREE.BufferGeometry; etch: THREE.BufferGeometry };
const bedSteelCache = new Map<number, BedSteel>();
/** The bearings in the first `filled` pockets, merged per finish. */
function bedSteel(filled: number): BedSteel {
  const hit = bedSteelCache.get(filled);
  if (hit) return hit;
  const rings: THREE.BufferGeometry[] = [];
  const balls: THREE.BufferGeometry[] = [];
  const cages: THREE.BufferGeometry[] = [];
  const etch: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  BED_SLOTS.slice(0, filled).forEach(([x, z], i) => {
    // Each bearing sits in its pocket at its own turn, so the etched text never lines up.
    m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(up, i * 1.37), new THREE.Vector3(BEARING_S, BEARING_S, BEARING_S));
    rings.push(bearingRing(0.06, 0.047, 0.026).applyMatrix4(m), bearingRing(0.033, 0.02, 0.026).applyMatrix4(m));
    for (let b = 0; b < 10; b++) {
      const a = (b / 10) * Math.PI * 2;
      balls.push(new THREE.SphereGeometry(0.0084, 12, 9).translate(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04).applyMatrix4(m));
    }
    // Stamped steel cage: two annular bands and a bridge between each pair of balls
    cages.push(new THREE.RingGeometry(0.0345, 0.0455, 32).rotateX(-Math.PI / 2).translate(0, 0.009, 0).applyMatrix4(m));
    cages.push(new THREE.RingGeometry(0.0345, 0.0455, 32).rotateX(Math.PI / 2).translate(0, -0.009, 0).applyMatrix4(m));
    for (let b = 0; b < 10; b++) {
      const a = (b + 0.5) * ((Math.PI * 2) / 10);
      cages.push(cylY(0.0025, 0.016, Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04, 6).applyMatrix4(m));
    }
    etch.push(new THREE.RingGeometry(0.048, 0.0595, 48).rotateX(-Math.PI / 2).translate(0, 0.0131, 0).applyMatrix4(m));
  });
  const empty = () => new THREE.BufferGeometry();
  const out = filled
    ? { rings: merge(rings), balls: merge(balls), cages: merge(cages), etch: merge(etch) }
    : { rings: empty(), balls: empty(), cages: empty(), etch: empty() };
  bedSteelCache.set(filled, out);
  return out;
}

/**
 * Every part of the insert, merged per finish: one draw each for the foam, the pockets, the rings,
 * the balls, the cages and the etching, however many bearings it holds.
 */
function bearingBed(filled: number) {
  return {
    foam: geo("bed-foam", () =>
      merge([
        // Base ESD conductive foam block with a raised rim
        rbox(CRATE.w - 0.036, 0.03, CRATE.d - 0.036, 0.008, 0, -0.016, 0),
        box(CRATE.w - 0.04, 0.008, 0.012, 0, 0.002, CRATE.d / 2 - 0.024),
        box(CRATE.w - 0.04, 0.008, 0.012, 0, 0.002, -CRATE.d / 2 + 0.024),
        box(0.012, 0.008, CRATE.d - 0.04, CRATE.w / 2 - 0.024, 0.002, 0),
        box(0.012, 0.008, CRATE.d - 0.04, -CRATE.w / 2 + 0.024, 0.002, 0),
      ]),
    ),
    // An empty pocket reads as a cut-out: a dark round floor where a bearing is missing.
    pockets: geo(`bed-pockets-${filled}`, () =>
      filled < BED_SLOTS.length
        ? merge(BED_SLOTS.slice(filled).map(([x, z]) => new THREE.CircleGeometry(POCKET_R, 32).rotateX(-Math.PI / 2).translate(x, 0.0005, z)))
        : new THREE.BufferGeometry(),
    ),
    ...bedSteel(filled),
  };
}

let bedMats: { foam: THREE.Material; pocket: THREE.Material; steel: THREE.Material; etch: THREE.Material } | null = null;
const bearingBedMats = () =>
  (bedMats ??= {
    foam: new THREE.MeshStandardMaterial({ color: "#181A1E", roughness: 0.88, metalness: 0.06 }),
    pocket: new THREE.MeshStandardMaterial({ color: "#0C0D10", roughness: 0.95, metalness: 0 }),
    steel: new THREE.MeshStandardMaterial({ color: "#DDE0E5", roughness: 0.12, metalness: 0.94 }),
    etch: new THREE.MeshBasicMaterial({ map: bearingEtchTexture(), transparent: true, opacity: 0.88, depthWrite: false }),
  });

/** Contents of the signal tote: X90 bearings in an anti-static foam insert. `filled` of its 12
 *  pockets hold a bearing; the empty ones show the tote running short. */
export function BearingBed({ filled = 7 }: { filled?: number }) {
  const g = bearingBed(Math.max(0, Math.min(BED_SLOTS.length, Math.round(filled))));
  const m = bearingBedMats();
  return (
    <group position-y={CRATE.h / 2 - 0.028}>
      <mesh geometry={g.foam} material={m.foam} receiveShadow />
      <mesh geometry={g.pockets} material={m.pocket} />
      <mesh geometry={g.rings} material={m.steel} castShadow receiveShadow />
      <mesh geometry={g.balls} material={chrome()} />
      <mesh geometry={g.cages} material={brushed()} />
      <mesh geometry={g.etch} material={m.etch} />
    </group>
  );
}

export { rubber };
