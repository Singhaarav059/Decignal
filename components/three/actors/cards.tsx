"use client";

// Cards: the decision, its layers, functions and industries, read under the pointer.
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CH, INDUSTRIES, localIn, scaleF, smoothstep, store, weight } from "@/lib/story";
import { CARD, CARDS, DECISION_CARD, cardPose, industryF } from "@/lib/scene";
import { WHITE, clay, useDisposeOnUnmount } from "../kit";
import { aluminium } from "../materials";
import { FACE_H, FACE_W, FUNCTION_TONE, LAYER_TONE, drawFace, faceKey, readFonts, type DecisionMode, type FaceSpec } from "../faces";
import { useActor } from "./core";
import { goToFunction } from "@/components/story/ScaleApps";

/* ------------------------------------------------------------------ */
/* Cards: the decision, its layers, functions and industries           */
/* ------------------------------------------------------------------ */

type Mode = "base" | "industries" | "final";
// The final face goes on as the card starts its last half turn, while that face is still turned away.
const modeAt = (g: number): Mode => (g < CH.industries - 0.4 ? "base" : g < CH.final - 0.1 ? "industries" : "final");

/* Faces are drawn at about their size on screen in device pixels. A texture much larger than the
   face's footprint is shrunk through its mipmaps, which softens text; one much smaller is stretched.
   Each card measures its footprint every frame and redraws at the matching width when it settles. */
const TIERS = [256, 320, 400, 480, 640, 800, 1024, 1280, 1600, 2048];
const START_TIER = 5;

function useFace(spec: FaceSpec, rotate: boolean, tier: number) {
  const gl = useThree((s) => s.gl);
  const w = TIERS[tier];
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = Math.round((w * FACE_H) / FACE_W);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    return { canvas, texture };
  }, [w, gl]);
  useDisposeOnUnmount(texture, (t) => t.dispose());
  const key = `${faceKey(spec)}-${rotate}`;
  // Drawn before the frame that first shows it, so a resolution change never flashes a blank face.
  useLayoutEffect(() => {
    let live = true;
    const draw = () => {
      if (!live) return;
      readFonts();
      drawFace(canvas, spec, rotate, w / FACE_W);
      texture.needsUpdate = true;
    };
    // Always draw now (a new canvas is blank, which reads black on the card), and again once any
    // font still loading has arrived.
    draw();
    if (document.fonts.status !== "loaded") document.fonts.ready.then(draw);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, canvas]);
  return texture;
}

const corner = new THREE.Vector3();
const projected = [0, 0, 0, 0, 0, 0, 0, 0];
/** Device pixels across the face's width on screen, taking the larger of its two edges. */
function footprint(n: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }, dpr: number) {
  const hw = CARD.w / 2;
  const hh = CARD.h / 2;
  [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].forEach(([x, z], i) => {
    n.localToWorld(corner.set(x, 0, z)).project(camera);
    projected[i * 2] = corner.x * 0.5 * size.width;
    projected[i * 2 + 1] = corner.y * 0.5 * size.height;
  });
  const P = projected;
  const edge = (a: number, b: number) => Math.hypot(P[a * 2] - P[b * 2], P[a * 2 + 1] - P[b * 2 + 1]);
  const across = Math.max(edge(0, 1), edge(3, 2));
  const down = Math.max(edge(0, 3), edge(1, 2)) * (CARD.w / CARD.h);
  return Math.max(across, down) * dpr;
}

/* Reading a card: under the pointer it lifts out of the stack, turns square to the viewer and
   grows enough to read; the others step aside and dim. Its rim lights up in the card's colour. */

const bodies: (THREE.Mesh | null)[] = [];
/** The reader's choice on the page's approval panel (DecisionControls writes it), if any. */
const decisionNow = (): { mode: DecisionMode; qty: number } | undefined => store.decision;
const readable = () => Math.max(weight(CH.control, store.g), weight(CH.scale, store.g)) > 0.9;
const toneOf = (k: number) => (store.g < CH.scale - 0.5 ? LAYER_TONE[k] : FUNCTION_TONE[k]);

/** Finds the card under the pointer once per frame. In Scale a click on a card scrolls to its function. */
function CardFocus() {
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const lost = useRef(0);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || !(e.target instanceof Element) || e.target.closest("a, button, input, select, textarea, label, [role=dialog]")) return;
      const k = store.focus;
      if (k >= 0 && weight(CH.scale, store.g) > 0.9 && k !== Math.round(scaleF(localIn(CH.scale, store.g)))) goToFunction(k);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);
  useFrame(({ camera }, dt) => {
    let hit = -1;
    // While the page scrolls, the scroll drives the deck: cards sliding under a still pointer must not
    // take focus (it read as the page sticking, and focus flicked between cards). Hover reading
    // returns a beat after the scroll settles.
    const scrolling = performance.now() - store.scrollAt < 380;
    // Pointing at the page's own controls (the approval panel, a Scale column) reads the card they
    // name. Those controls sit over the canvas, so the cards behind them are not under the pointer:
    // skip the ray, or a card peeking out behind a column steals focus back and forth every frame.
    const hint = readable() && store.focusHint >= 0 ? store.focusHint : -1;
    if (hint < 0 && readable() && store.pointerIn && !scrolling) {
      ndc.set(store.pointer.x, store.pointer.y);
      ray.setFromCamera(ndc, camera);
      const live = bodies.filter((b): b is THREE.Mesh => !!b && b.parent?.parent?.visible !== false);
      const first = ray.intersectObjects(live, false)[0];
      if (first) hit = bodies.indexOf(first.object as THREE.Mesh);
    }
    // Hold focus briefly when the pointer slips into a gap, so a moving card never flickers.
    if (hit >= 0) lost.current = 0;
    else lost.current += dt;
    const next = hint >= 0 ? hint : hit >= 0 ? hit : scrolling || lost.current > 0.18 || !readable() ? -1 : store.focus;
    if (next !== store.focus) {
      store.focus = next;
      document.body.style.cursor = next >= 0 ? "pointer" : "";
    }
  });
  return null;
}

/** The approval lift lasts 300 ms. */
const PULSE = 0.3;

/* The Industries board and the ending's card stand on the ground on a stand of their own: two
   aluminium legs under the board's lower edge, each on a foot rail, and at the end a rear strut. It
   is built each frame from the card's pose, so it holds whatever height and lean the card has. */

const STAND_REF = 1.6; // the card scale the stand's sizes are given at
const LEG = 0.028;
const RAIL: [number, number, number] = [0.05, 0.022, 0.46];
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const sv = { P: new THREE.Vector3(), X: new THREE.Vector3(), N: new THREE.Vector3(), D: new THREE.Vector3(), lo: new THREE.Vector3(), hi: new THREE.Vector3(), A: new THREE.Vector3(), F: new THREE.Vector3(), Y: new THREE.Vector3(), Z: new THREE.Vector3(), M: new THREE.Vector3(), cam: new THREE.Vector3() };
const basis = new THREE.Matrix4();

/** Places a unit box as a bar from a to b, `t` thick, its width along `x`. Returns false when too short. */
function bar(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, t: number, x: THREE.Vector3) {
  const len = a.distanceTo(b);
  if (len < 1e-3 || t < 1e-4) return false;
  sv.Y.subVectors(b, a).divideScalar(len);
  sv.Z.crossVectors(x, sv.Y).normalize();
  sv.X.crossVectors(sv.Y, sv.Z);
  basis.makeBasis(sv.X, sv.Y, sv.Z);
  m.quaternion.setFromRotationMatrix(basis);
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.scale.set(t, len, t);
  return true;
}

/** Card calls `drive` after its own pose update each frame, so the stand never trails the board. */
function Stand({ card, drive }: { card: React.RefObject<THREE.Group | null>; drive: React.RefObject<((camera: THREE.Camera) => void) | null> }) {
  const legs = useRef<(THREE.Mesh | null)[]>([]);
  const rails = useRef<(THREE.Mesh | null)[]>([]);
  const strut = useRef<THREE.Mesh>(null);
  const root = useRef<THREE.Group>(null);
  const mat = aluminium(0.3);
  const axis = useMemo(() => new THREE.Vector3(), []);
  useLayoutEffect(() => {
    drive.current = (camera) => place(camera);
    return () => {
      drive.current = null;
    };
  });
  const place = (camera: THREE.Camera) => {
    const g = card.current;
    const st = root.current;
    if (!g || !st) return;
    const ind = weight(CH.industries, store.g);
    const fin = weight(CH.final, store.g);
    const s = g.scale.x;
    // It comes and goes with the board: its parts thin in with the chapters' weight.
    const w = THREE.MathUtils.smoothstep(Math.max(ind, fin), 0.05, 0.6) * (g.visible ? 1 : 0);
    st.visible = w > 0.001 && s > 0.05;
    if (!st.visible) return;
    const { P, N, D, lo, hi, A, F, M, cam } = sv;
    P.copy(g.position);
    // The board's lower and upper edge centres, in the parent's space (y = 0 is the ground).
    lo.set(0, 0, CARD.h / 2).multiplyScalar(s).applyQuaternion(g.quaternion).add(P);
    hi.set(0, 0, -CARD.h / 2).multiplyScalar(s).applyQuaternion(g.quaternion).add(P);
    if (lo.y > hi.y) {
      A.copy(lo);
      lo.copy(hi);
      hi.copy(A);
    }
    D.subVectors(lo, hi).normalize();
    axis.set(1, 0, 0).applyQuaternion(g.quaternion);
    // Upright enough to stand on legs; while it turns over (lying flat) the stand gives way.
    const up = THREE.MathUtils.smoothstep(-D.y, 0.45, 0.75);
    const k = s / STAND_REF;
    const t = LEG * k * w * up;
    for (let i = 0; i < 2; i++) {
      const leg = legs.current[i];
      const rail = rails.current[i];
      if (!leg || !rail) continue;
      // Each leg starts inside the board's edge and runs on down its plane to the ground.
      A.copy(lo).addScaledVector(axis, (i ? 1 : -1) * 0.55 * (CARD.w / 2) * s);
      const len = Math.max(0, A.y) / Math.max(-D.y, 1e-3);
      F.copy(A).addScaledVector(D, len);
      F.y = 0;
      M.copy(A).addScaledVector(D, -0.05 * s);
      leg.visible = bar(leg, F, M, t, axis);
      // Its foot rail lies across it, front to back.
      N.set(0, 1, 0).applyQuaternion(g.quaternion);
      N.y = 0;
      if (N.lengthSq() < 1e-6) N.set(0, 0, 1);
      N.normalize();
      rail.position.set(F.x, (RAIL[1] / 2) * k * w * up, F.z);
      rail.rotation.set(0, Math.atan2(N.x, N.z), 0);
      rail.scale.set(RAIL[0] * k * w * up, RAIL[1] * k * w * up, RAIL[2] * k);
      rail.visible = t > 1e-4;
    }
    // The ending leans the card further back: a strut behind it, from its back to the ground.
    const sr = strut.current;
    if (sr) {
      N.set(0, 1, 0).applyQuaternion(g.quaternion);
      // The back is the side turned away from the viewer.
      if (N.dot(cam.subVectors(camera.position, P)) > 0) N.negate();
      M.copy(lo).lerp(hi, 0.6).addScaledVector(N, (CARD.t / 2) * s);
      F.set(N.x, 0, N.z);
      if (F.lengthSq() < 1e-6) F.set(0, 0, -1);
      F.normalize().multiplyScalar(M.y * 0.55).add(M);
      F.y = 0;
      sr.visible = bar(sr, F, M, LEG * k * THREE.MathUtils.smoothstep(fin, 0.3, 0.8) * up, axis);
    }
  };
  return (
    <group ref={root} visible={false}>
      {[0, 1].map((i) => (
        <group key={i}>
          <mesh
            ref={(m) => {
              legs.current[i] = m;
            }}
            geometry={unitBox}
            material={mat}
            castShadow
          />
          <mesh
            ref={(m) => {
              rails.current[i] = m;
            }}
            geometry={unitBox}
            material={mat}
            castShadow
            receiveShadow
          />
        </group>
      ))}
      <mesh ref={strut} geometry={unitBox} material={mat} castShadow />
    </group>
  );
}

const axX = new THREE.Vector3();
const axY = new THREE.Vector3();
const toCam = new THREE.Vector3();
// Face colour: white (an #F7F7F7 multiply read as a grey tint on the boards), dimmed when another card is being read.
const FACE_BASE = new THREE.Color("#FFFFFF").r;

function Card({ k }: { k: number }) {
  const ref = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const portrait = useThree((state) => state.size.width < 768 || (state.size.width < 1024 && state.size.height > state.size.width * 1.15));
  const phone = useThree((state) => state.size.width < 768);
  useActor(ref, (c, t) => cardPose(k, c, t, portrait, phone), k * 0.05, 0.11);
  const anim = useRef({ me: 0, other: 0, side: 0 });
  // Approving on the page gives the decision card one short lift and settle (no glow).
  const pulse = useRef({ mode: decisionNow()?.mode ?? "idle", t: 1 });
  const stand = useRef<((camera: THREE.Camera) => void) | null>(null);
  const rim = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const rimRef = useRef<THREE.Mesh>(null);
  const topMat = useRef<THREE.MeshBasicMaterial>(null);
  const bottomMat = useRef<THREE.MeshBasicMaterial>(null);

  // Which content each face carries depends on where the story is.
  const [faces, setFaces] = useFacesState(k);
  // Texture width for both faces, and how long the footprint has asked for a different one.
  const [tier, setTier] = useState(START_TIER);
  const want = useRef({ tier: START_TIER, for: 0 });
  const top = useFace(faces.top, faces.topRotated ?? false, tier);
  const bottom = useFace(faces.bottom, faces.bottomRotated, tier);
  useFrame(({ camera, size, gl }, dt) => {
    const g = ref.current;
    const n = inner.current;
    // Which face the viewer sees: the top (s = 1) or the bottom (s = -1).
    let s = 1;
    if (g) {
      axY.set(0, 1, 0).applyQuaternion(g.quaternion);
      s = axY.dot(toCam.subVectors(camera.position, g.position)) >= 0 ? 1 : -1;
    }
    const stage = modeAt(store.g);
    let next: FaceState;
    if (k !== DECISION_CARD || stage === "base") next = baseFaces(k);
    else if (stage === "final")
      next = { top: { kind: "final" }, topRotated: true, bottom: { kind: "industry", k: INDUSTRIES.length - 1 }, bottomRotated: true };
    else {
      const f = industryF(localIn(CH.industries, store.g));
      const front = Math.min(2 * Math.round(f / 2), INDUSTRIES.length - 1);
      const back = Math.min(2 * Math.round((f - 1) / 2) + 1, INDUSTRIES.length - 1);
      next = { top: { kind: "industry", k: front }, bottom: { kind: "industry", k: back }, bottomRotated: true };
      // Until the chapter begins the card is still turning from Scale (bottom to the viewer) to
      // Industries (top to the viewer): the bottom keeps its function and only the top, turned away
      // until the flip, becomes the first industry. No upside-down industry shows during the turn,
      // scrolling either way, and a card that rises in face up (phones skip Scale) already reads
      // as the first industry.
      if (store.g < CH.industries) {
        const base = baseFaces(k);
        next = { ...next, bottom: base.bottom, bottomRotated: base.bottomRotated };
      }
    }
    if (
      faceKey(next.top) !== faceKey(faces.top) ||
      faceKey(next.bottom) !== faceKey(faces.bottom) ||
      next.bottomRotated !== faces.bottomRotated ||
      !!next.topRotated !== !!faces.topRotated
    )
      setFaces(next);

    // Match the face texture to the footprint once it holds for a moment (sooner when it grows).
    if (n && g?.visible && g.scale.x > 0.2) {
      const px = footprint(n, camera, size, gl.getPixelRatio());
      let t = TIERS.findIndex((w) => w >= px);
      if (t < 0) t = TIERS.length - 1;
      // Hysteresis: step down only when the next tier below would still be clearly large enough.
      if (t === tier - 1 && TIERS[t] < px * 1.15) t = tier;
      const w = want.current;
      if (t !== w.tier) {
        w.tier = t;
        w.for = 0;
      } else w.for += dt;
      if (t !== tier && w.for > (t > tier ? 0.15 : 0.8)) setTier(t);
    }

    // Focus: spring toward the state the pointer asks for.
    const f = store.focus;
    const a = anim.current;
    const d = Math.min(dt, 1 / 30);
    const pl = pulse.current;
    const mode = decisionNow()?.mode ?? "idle";
    if (mode !== pl.mode) {
      if (mode === "approved" && k === DECISION_CARD) pl.t = 0;
      pl.mode = mode;
    }
    pl.t += d;
    const bump = pl.t < PULSE ? Math.sin((Math.PI * pl.t) / PULSE) * 0.6 : 0;
    a.me = THREE.MathUtils.damp(a.me, f === k ? 1 : 0, 9, d);
    a.other = THREE.MathUtils.damp(a.other, f >= 0 && f !== k ? 1 : 0, 7, d);
    if (f >= 0 && f !== k) a.side = Math.sign(k - f);
    if (!g || !n) return;
    // Which way the readable face points (stood up for layers, flipped for functions), and the
    // card's turn about the vertical. Read from axes, not Euler angles: cards stand at exactly 90°.
    axX.set(1, 0, 0).applyQuaternion(g.quaternion);
    const ry = Math.atan2(-axX.z, axX.x);
    // Control's fan: lift toward the viewer along the card's normal, square up to the camera, grow to
    // reading size. Edge cards also drift toward the middle of the stack, clear of the copy and the
    // screen edge. Cards to the left only shift a little: the copy column sits on that side.
    const aside = a.side > 0 ? 0.4 : 0.26;
    const fx = a.side * a.other * aside + (2 - k) * 0.3 * a.me;
    const fy = s * (Math.max(a.me, bump) * 1.05 - a.other * 0.1);
    const fs = 1 + Math.max(a.me, bump * 0.5) * 0.2 - a.other * 0.03;
    // Scale's line: the cards are already square and nothing may pass through its neighbours, so a
    // card stays in its own plane. One waiting behind rises along its face until its title clears the
    // card in front; the front one only lifts a little toward the viewer.
    const lw = weight(CH.scale, store.g);
    const q = (((k - scaleF(localIn(CH.scale, store.g))) % CARDS) + CARDS) % CARDS;
    const behind = q > CARDS - 1 ? 1 : smoothstep(0.2, 0.6, q);
    const L = THREE.MathUtils.lerp;
    n.position.set(L(fx, 0, lw), L(fy, s * a.me * 0.12 * (1 - behind), lw), L(0, -s * a.me * 0.3 * behind, lw));
    n.rotation.set(0, 0, s * ry * a.me * (1 - lw));
    n.scale.setScalar(L(fs, 1 + a.me * 0.03 * (1 - behind), lw));
    rim.color.set(toneOf(k));
    // The rim grows out from behind the card's edge rather than fading: no transparency to sort.
    if (rimRef.current) {
      rimRef.current.visible = a.me > 0.02;
      rimRef.current.scale.set(1 + a.me * 0.011, 1, 1 + a.me * 0.018);
    }
    stand.current?.(camera);
    const dim = FACE_BASE * (1 - a.other * 0.14);
    topMat.current?.color.setScalar(dim);
    bottomMat.current?.color.setScalar(dim);
  });

  const inset = 0.05;
  return (
    <>
    {k === DECISION_CARD && <Stand card={ref} drive={stand} />}
    <group ref={ref} visible={false}>
      <group ref={inner}>
        <RoundedBox
          ref={(m: THREE.Mesh | null) => {
            bodies[k] = m;
          }}
          args={[CARD.w, CARD.t, CARD.h]}
          radius={0.022}
          smoothness={4}
          castShadow
          receiveShadow
          material={clay(WHITE, 0.35)}
        />
        {/* Coloured rim: a hairline of the card's tone, lit while it is being read */}
        <RoundedBox ref={rimRef} args={[CARD.w, CARD.t * 0.7, CARD.h]} radius={0.014} smoothness={4} material={rim} visible={false} />
        <mesh position-y={CARD.t / 2 + 0.0012} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[CARD.w - inset, CARD.h - inset]} />
          <meshBasicMaterial ref={topMat} map={top} toneMapped={false} color="#FFFFFF" />
        </mesh>
        <mesh position-y={-CARD.t / 2 - 0.0012} rotation-x={Math.PI / 2}>
          <planeGeometry args={[CARD.w - inset, CARD.h - inset]} />
          <meshBasicMaterial ref={bottomMat} map={bottom} toneMapped={false} color="#FFFFFF" />
        </mesh>
      </group>
    </group>
    </>
  );
}

type FaceState = { top: FaceSpec; topRotated?: boolean; bottom: FaceSpec; bottomRotated: boolean };
const baseFaces = (k: number): FaceState => {
  const d = decisionNow();
  return {
    // The layers are read fanned out (Control); the decision shows what the page's panel decided.
    top: k === DECISION_CARD ? { kind: "decision", qty: d?.qty, mode: d?.mode } : { kind: "layer", k, fan: true },
    bottom: { kind: "function", k },
    bottomRotated: false,
  };
};

function useFacesState(k: number) {
  return useState<FaceState>(() => baseFaces(k));
}

export function Cards() {
  return (
    <>
      <CardFocus />
      {Array.from({ length: CARDS }, (_, k) => (
        <Card key={k} k={k} />
      ))}
    </>
  );
}
