"use client";

// Energy: a distribution substation, built in code in island units (1 unit about 10 m). A
// transformer on its plinth with a saffron hazard band, a kiosk, a fence, and two lattice poles in
// the yard carrying the feeder out over its fence and off the side of the frame. Along the road, not away from
// it: in the story's camera "away" is up the screen, and the far pole and its wires climbed into the
// chapter's headline figures.
import * as THREE from "three";
import { Person } from "./people";
import { aluminium, concrete, enamel, steel } from "./materials";
import { box, cylX, cylY, geo, merge, rbox } from "./parts";
import { TINTS } from "./palette";

const H = 0.95; // pole height
const POLES: [number, number][] = [[-0.3, -0.34], [0.55, -0.36]]; // x, z: both along the yard's back fence
const PHASES = [-0.15, 0, 0.15]; // conductor offsets along the crossarm (across the line, in z)
const ARM_Y = H - 0.05;
const DROP = 0.07; // insulator length under the arm
const BUSH = [-0.09, 0, 0.09]; // transformer bushings, x
const TX: [number, number] = [0.14, 0.06]; // transformer centre
const TOP = 0.05 + 0.3; // tank top

const up = new THREE.Vector3(0, 1, 0);
/** A square bar from a to b. */
function strut(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const d = new THREE.Vector3().subVectors(b, a);
  const g = new THREE.BoxGeometry(t, d.length(), t);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
  const m = a.clone().add(b).multiplyScalar(0.5);
  return g.translate(m.x, m.y, m.z);
}

/** A tapering four-legged lattice tower with a Warren brace on every face and a crossarm on top. */
function lattice(x: number, z: number) {
  const parts: THREE.BufferGeometry[] = [];
  const at = (k: number, y: number) => {
    const h = THREE.MathUtils.lerp(0.05, 0.018, y / H);
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]][k % 4];
    return new THREE.Vector3(x + c[0] * h, y, z + c[1] * h);
  };
  const levels = 7;
  for (let k = 0; k < 4; k++) parts.push(strut(at(k, 0), at(k, H), 0.011));
  for (let l = 0; l <= levels; l++) {
    const y = (l / levels) * (H - 0.04);
    for (let k = 0; k < 4; k++) {
      if (l > 0) parts.push(strut(at(k, y), at(k + 1, y), 0.006));
      if (l < levels) {
        const y2 = ((l + 1) / levels) * (H - 0.04);
        parts.push(l % 2 ? strut(at(k, y), at(k + 1, y2), 0.005) : strut(at(k + 1, y), at(k, y2), 0.005));
      }
    }
  }
  // Crossarm across the line (the line runs along x), braced back to the tower
  parts.push(box(0.022, 0.016, 0.4, x, ARM_Y, z));
  for (const s of [-1, 1]) parts.push(strut(new THREE.Vector3(x, ARM_Y, z + s * 0.17), new THREE.Vector3(x, ARM_Y - 0.12, z + s * 0.03), 0.007));
  return merge(parts);
}

/** Suspension insulators hanging from both crossarms: a stalk with three sheds each. */
function insulators() {
  const parts: THREE.BufferGeometry[] = [];
  for (const [x, z] of POLES)
    for (const p of PHASES) {
      parts.push(cylY(0.005, DROP, x, ARM_Y - DROP / 2, z + p, 8));
      for (let i = 0; i < 3; i++) parts.push(cylY(0.016, 0.006, x, ARM_Y - 0.018 - i * 0.02, z + p, 16));
    }
  // Transformer bushings: a porcelain stack on each terminal
  for (const bx of BUSH) {
    for (let i = 0; i < 5; i++) parts.push(cylY(0.022 - i * 0.002, 0.008, TX[0] + bx, TOP + 0.03 + i * 0.022, TX[1] - 0.04, 16));
    parts.push(cylY(0.011, 0.12, TX[0] + bx, TOP + 0.06, TX[1] - 0.04, 12));
  }
  return merge(parts);
}

/** A conductor sagging between two points, as a thin tube. */
function span(a: THREE.Vector3, b: THREE.Vector3, sag: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0035, 5, false);
}

/** Droppers from the bushings to the near pole, the span between the poles, and the feeder away. */
function conductors() {
  const parts: THREE.BufferGeometry[] = [];
  const [a, b] = POLES;
  const tip = (x: number, z: number, p: number) => new THREE.Vector3(x, ARM_Y - DROP, z + p);
  PHASES.forEach((p, i) => {
    parts.push(span(new THREE.Vector3(TX[0] + BUSH[i], TOP + 0.18, TX[1] - 0.04), tip(a[0], a[1], p), 0.03));
    parts.push(span(tip(a[0], a[1], p), tip(b[0], b[1], p), 0.06));
    // The feeder runs on out of the frame along the road (to the right, down the screen).
    parts.push(span(tip(b[0], b[1], p), new THREE.Vector3(b[0] + 4.4, ARM_Y + 0.05, b[1] - 0.5 + p), 0.3));
  });
  return merge(parts);
}

/** Radiator fins on both long sides of the tank, with their header pipes. */
function radiators() {
  const parts: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const z = TX[1] + s * 0.19;
    for (let i = 0; i < 8; i++) parts.push(box(0.008, 0.2, 0.08, TX[0] - 0.15 + i * 0.043, 0.2, z));
    for (const y of [0.11, 0.29]) parts.push(cylX(0.009, 0.34, TX[0], y, TX[1] + s * 0.15, 10));
  }
  return merge(parts);
}

/** Chain-link fence on three sides: posts, top and middle rails. The front stays open (the gate). */
function fence() {
  const parts: THREE.BufferGeometry[] = [];
  const X = 0.66;
  const Z0 = -0.48;
  const Z1 = 0.44;
  for (let i = 0; i <= 8; i++) parts.push(box(0.012, 0.2, 0.012, -X + (i * 2 * X) / 8, 0.1, Z0));
  for (const s of [-1, 1]) for (let i = 1; i <= 5; i++) parts.push(box(0.012, 0.2, 0.012, s * X, 0.1, Z0 + (i * (Z1 - Z0)) / 5));
  for (const y of [0.1, 0.195]) {
    parts.push(box(2 * X, 0.006, 0.006, 0, y, Z0));
    for (const s of [-1, 1]) parts.push(box(0.006, 0.006, Z1 - Z0, s * X, y, (Z0 + Z1) / 2));
  }
  return merge(parts);
}

/** Thin mesh panels between the rails: pale and see-through enough to keep the yard in view. */
const meshMat = () => {
  const m = steel("#AEB5BF", 0.6).clone();
  m.transparent = true;
  m.opacity = 0.28;
  m.depthWrite = false;
  return m;
};
let fenceMesh: THREE.Material | null = null;

export function Substation() {
  const poles = geo("sub-poles", () => merge(POLES.map(([x, z]) => lattice(x, z))));
  return (
    <group>
      {/* Gravel yard on a concrete kerb */}
      <mesh position={[0, 0.008, -0.02]} material={concrete("#D3D8DF")} receiveShadow>
        <boxGeometry args={[1.36, 0.016, 0.96]} />
      </mesh>
      {/* Transformer: plinth, the saffron hazard band, tank, lid and conservator */}
      <group position={[TX[0], 0, TX[1]]}>
        <mesh position-y={0.025} material={concrete("#C9CED6")} castShadow receiveShadow>
          <boxGeometry args={[0.5, 0.05, 0.46]} />
        </mesh>
        <mesh position-y={0.062} material={enamel(TINTS.saffron, 0.45)} castShadow>
          <boxGeometry args={[0.41, 0.024, 0.27]} />
        </mesh>
        <mesh geometry={geo("sub-tank", () => rbox(0.4, 0.27, 0.26, 0.012, 0, 0.074 + 0.135, 0))} material={enamel("#C3C9D2", 0.42)} castShadow receiveShadow />
        <mesh position-y={TOP} material={enamel("#B7BEC8", 0.45)} castShadow>
          <boxGeometry args={[0.42, 0.014, 0.28]} />
        </mesh>
        <mesh geometry={geo("sub-cons", () => merge([cylX(0.042, 0.26, -0.02, TOP + 0.13, 0.08, 24), box(0.012, 0.12, 0.012, -0.1, TOP + 0.06, 0.08), box(0.012, 0.12, 0.012, 0.06, TOP + 0.06, 0.08)]))} material={enamel("#C3C9D2", 0.42)} castShadow />
      </group>
      <mesh geometry={geo("sub-rad", radiators)} material={enamel("#B9C0CA", 0.5)} castShadow />
      <mesh geometry={geo("sub-ins", insulators)} material={enamel("#F2F4F7", 0.22)} castShadow />
      {/* Lattice poles in galvanised steel and the feeder conductors */}
      <mesh geometry={poles} material={aluminium(0.45)} castShadow />
      <mesh geometry={geo("sub-lines", conductors)} material={steel("#30343B", 0.5)} />
      {/* Control kiosk with a hazard plate on its door */}
      <group position={[0.5, 0.016, 0.24]} rotation-y={-0.3}>
        <mesh position-y={0.13} material={enamel("#EEF1F4", 0.6)} castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.26, 0.18]} />
        </mesh>
        <mesh position-y={0.268} material={enamel("#D9DEE5", 0.5)} castShadow>
          <boxGeometry args={[0.25, 0.016, 0.21]} />
        </mesh>
        <mesh position={[0.03, 0.12, 0.0905]} material={enamel("#D3D8DF", 0.55)}>
          <boxGeometry args={[0.11, 0.2, 0.002]} />
        </mesh>
        <mesh position={[0.03, 0.17, 0.092]} material={enamel(TINTS.saffron, 0.4)}>
          <boxGeometry args={[0.05, 0.04, 0.002]} />
        </mesh>
      </group>
      <mesh geometry={geo("sub-fence", fence)} material={aluminium(0.4)} castShadow />
      <mesh position={[0, 0.1, -0.48]} material={(fenceMesh ??= meshMat())} renderOrder={1}>
        <boxGeometry args={[1.32, 0.18, 0.002]} />
      </mesh>
      {/* An engineer reads the transformer's load on a tablet */}
      <group position={[0.3, 0.016, 0.36]} rotation-y={-0.6} scale={0.1}>
        <Person look="engineer" pose="tablet" seed={4.2} />
      </group>
    </group>
  );
}
