"use client";

// Cards: the follow-up, its layers and functions, read under the pointer, and the ending's audit board.
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { easing } from "maath";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CH, HOVER_REST, blendAt, controlLayer, controlSettle, localIn, scaleDeal, scaleF, store, weight } from "@/lib/story";
import { CARD, CARDS, DECISION_CARD, HAND, HAND_TURN, ISO_DIR, LAYER_FOOT, bgAt, cardPose, handAxis, handPose, handRoll, handShift, setDeckEdge } from "@/lib/scene";
import { WHITE, clay, useDisposeOnUnmount } from "../kit";
import { aluminium } from "../materials";
import { FACE_H, FACE_W, FUNCTION_TONE, LAYER_TONE, drawFace, drawHandArt, faceKey, handArtPlane, handArtSize, readFonts, type DecisionMode, type FaceSpec } from "../faces";
import { reducedMotion, useActor } from "./core";
import { goToFunction } from "@/components/story/ScaleApps";
import { goToStory } from "@/components/story/chapters";
import { phoneWide, portraitWide } from "@/lib/device";

/* ------------------------------------------------------------------ */
/* Cards: the decision, its layers, functions and the ending's audit   */
/* ------------------------------------------------------------------ */

// The decision card stands out of Industries (each place's callout is page text), so it takes the
// ending's face there, out of sight, before it rises at the hub on portrait screens.
const finalAt = (g: number) => g >= CH.industries + 0.5;

/* Faces are drawn at about their size on screen in device pixels. A texture much larger than the
   face's footprint is shrunk through its mipmaps, which softens text; one much smaller is stretched.
   Each card measures its footprint every frame and redraws at the matching width when it settles. */
/**
 * drei's RoundedBox geometry (an extruded rounded square, centred, normals creased at 0.4 rad: its
 * defaults with smoothness 4), built once per size and shared. Built per card it was the bulk of the
 * deck's one long commit (every card's slab extruded and creased again).
 */
const slabs = new Map<string, THREE.BufferGeometry>();
const EPS = 0.00001;
function roundedSlab(width: number, height: number, depth: number, radius: number) {
  const key = `${width},${height},${depth},${radius}`;
  let g = slabs.get(key);
  if (g) return g;
  const shape = new THREE.Shape();
  const r = radius - EPS;
  shape.absarc(EPS, EPS, EPS, -Math.PI / 2, -Math.PI, true);
  shape.absarc(EPS, height - r * 2, EPS, Math.PI, Math.PI / 2, true);
  shape.absarc(width - r * 2, height - r * 2, EPS, Math.PI / 2, 0, true);
  shape.absarc(width - r * 2, EPS, EPS, 0, -Math.PI / 2, true);
  g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - radius * 2,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: radius - EPS,
    bevelThickness: radius,
    curveSegments: 4,
  });
  g.center();
  g = toCreasedNormals(g, 0.4);
  slabs.set(key, g);
  return g;
}

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

/* Hand art: a card's evidence graphic in Scale's hand, on its own small texture over the face's empty
   box, so it can build and move without redrawing (and re-uploading) the whole face. It builds as the
   card lands (ART_PLAY seconds); only the card being read keeps moving, redrawn at ART_FPS. */
const ART_PLAY = 1.5;
const ART_FPS = 30;
const INSET = 0.05;
const ART_PLANE = handArtPlane(CARD.w - INSET, CARD.h - INSET);

function useHandArt(spec: FaceSpec | null, tier: number) {
  const gl = useThree((s) => s.gl);
  const scale = TIERS[tier] / FACE_W;
  const { canvas, texture } = useMemo(() => {
    const [w, h] = handArtSize(scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    return { canvas, texture };
  }, [scale, gl]);
  useDisposeOnUnmount(texture, (t) => t.dispose());
  const state = useRef({ p: 0, t: 0, wait: 0 });
  const draw = useMemo(
    () => () => {
      if (!spec) return;
      drawHandArt(canvas, spec, state.current.p, state.current.t, scale);
      texture.needsUpdate = true;
    },
    [spec, canvas, texture, scale],
  );
  useLayoutEffect(() => {
    let live = true;
    readFonts();
    draw();
    if (document.fonts.status !== "loaded")
      document.fonts.ready.then(() => {
        if (!live) return;
        readFonts();
        draw();
      });
    return () => {
      live = false;
    };
  }, [draw]);
  /** Steps the art: `dealt` once the card has landed in the hand, `read` while it is the card being read. */
  const step = (dt: number, dealt: boolean, read: boolean) => {
    const a = state.current;
    const still = reducedMotion();
    const was = a.p;
    a.p = !dealt ? 0 : still ? 1 : Math.min(1, a.p + dt / ART_PLAY);
    let redraw = a.p !== was;
    if (read && a.p >= 1 && !still) {
      a.t += dt;
      a.wait += dt;
      if (a.wait >= 1 / ART_FPS) {
        a.wait = 0;
        redraw = true;
      }
    } else if (a.t !== 0 && !read) {
      // Stops where it is when another card is read; its idle motion starts again from rest.
      a.t = 0;
      redraw = true;
    }
    if (redraw) draw();
  };
  return { texture, step };
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
/** The glass layer card in Scale's hand: it lies over the functions, so pointing at it reads none. */
let glassBody: THREE.Mesh | null = null;
/* Where each card stands at rest (its pose and its roll in the hand, none of the reading moves): an
   undrawn box per card that picks the card under the pointer. Picking on the cards as drawn fed back:
   the cards stepping aside for one moved another under the pointer, which took focus, and the cards
   traded it back and forth while the pointer swept across them. */
const rests: (THREE.Mesh | null)[] = [];
let glassRest: THREE.Mesh | null = null;
const REST_BOX = new THREE.BoxGeometry(CARD.w, CARD.t, CARD.h);
const REST_MAT = new THREE.MeshBasicMaterial();
/** The boxes live on a layer no camera draws: hidden objects keep stale matrices (Shadows skipHidden),
 *  so they stay "visible" there and are picked by a ray on that layer alone. */
const REST_LAYER = 31;
const onRestLayer = (m: THREE.Mesh | null) => m?.layers.set(REST_LAYER);
/** How long the pointer must hold on another card before it takes the focus from the one being read. */
const SWITCH_DWELL = 0.07;
/** The reader's choice on the page's approval panel (DecisionControls writes it), if any. */
const decisionNow = (): { mode: DecisionMode; qty: number } | undefined => store.decision;
const readable = () => Math.max(weight(CH.control, store.g), weight(CH.scale, store.g)) > 0.9;
// Control holds until well past g = CH.scale - 0.5 (its ts), so the hand-off decides, not g.
const toneOf = (k: number) => (weight(CH.scale, store.g) > 0.5 ? FUNCTION_TONE[k] : LAYER_TONE[k]);

/** Control's row is in charge while it holds the screen (Scale's hand reads under the pointer). */
const inRow = () => weight(CH.control, store.g) > 0.5;
const foot = new THREE.Vector3();

/** Control's row: the scroll brings the layers to the front one by one (controlLayer), 1:1 with it. A
 *  pill under the pointer or the approval panel shows its card in front for a moment, eased there and
 *  back; a click on a card or a pill scrolls to its step. The cards are never read under a still
 *  hover: they move, and that fed back. */
function LayerRow() {
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  /** The card drawn under a point in normalised device coordinates, or -1. */
  const under = (x: number, y: number) => {
    ndc.set(x, y);
    ray.setFromCamera(ndc, camera);
    const live = bodies.filter((b): b is THREE.Mesh => !!b && b.parent?.parent?.visible !== false);
    const hit = ray.intersectObjects(live, false)[0];
    return hit ? bodies.indexOf(hit.object as THREE.Mesh) : -1;
  };
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || !inRow() || !readable() || (e.target instanceof Element && e.target.closest("a, button, input, select, textarea, label, [role=dialog]"))) return;
      const k = under((e.clientX / size.width) * 2 - 1, -(e.clientY / size.height) * 2 + 1);
      if (k >= 0) goToStory(CH.control, controlSettle(k));
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size]);
  const over = useRef(false);
  const follow = useRef({ hint: -1, on: true });
  useFrame((_, dt) => {
    if (!inRow()) {
      if (over.current) document.body.style.cursor = "";
      over.current = false;
      return;
    }
    const hint = store.focusHint;
    const target = hint >= 0 ? hint : controlLayer(localIn(CH.control, store.g));
    // Tied to the scroll, except on the way to or back from a pointed-at card.
    if (hint !== follow.current.hint) follow.current = { hint, on: false };
    if (follow.current.on || reducedMotion()) store.layer = target;
    else {
      store.layer = THREE.MathUtils.damp(store.layer, target, 7, Math.min(dt, 1 / 30));
      if (Math.abs(store.layer - target) < 0.01) follow.current.on = true;
    }
    const front = Math.round(target);
    const next = readable() ? front : -1;
    if (next !== store.focus) store.focus = next;
    // Under the row, for the pills (LayerPills).
    foot.set(...LAYER_FOOT()).project(camera);
    store.layerFoot.x = (foot.x * 0.5 + 0.5) * size.width;
    store.layerFoot.y = (-foot.y * 0.5 + 0.5) * size.height;
    // A card that is not in front shows it can be clicked.
    const k = readable() && store.pointerIn ? under(store.pointer.x, store.pointer.y) : -1;
    const want = k >= 0 && k !== front;
    if (want !== over.current) {
      over.current = want;
      document.body.style.cursor = want ? "pointer" : "";
    }
  });
  return null;
}

/** Finds the card under the pointer once per frame. In Scale a click on a card scrolls to its function. */
function CardFocus() {
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const restRay = useMemo(() => {
    const r = new THREE.Raycaster();
    r.layers.set(REST_LAYER);
    return r;
  }, []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const lost = useRef(0);
  const pend = useRef({ k: -1, t: 0 });
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
    if (inRow()) return;
    let hit = -1;
    // While the page scrolls, the scroll drives the deck: cards sliding under a still pointer must not
    // take focus (it read as the page sticking, and focus flicked between cards). Hover reading
    // returns a beat after the scroll settles.
    const scrolling = performance.now() - store.scrollAt < HOVER_REST;
    // Reading waits for the pointer to have moved since this scroll began: cards that slid under a
    // still pointer stay put, instead of opening when the scroll pauses and closing when it resumes
    // (it read as shaking).
    const moved = store.pointerAt > store.scrollFrom;
    // Pointing at the page's own controls (the approval panel, a Scale column) reads the card they
    // name. Those controls sit over the canvas, so the cards behind them are not under the pointer:
    // skip the ray, or a card peeking out behind a column steals focus back and forth every frame.
    const hint = readable() && store.focusHint >= 0 ? store.focusHint : -1;
    if (hint < 0 && readable() && store.pointerIn && !scrolling && moved) {
      ndc.set(store.pointer.x, store.pointer.y);
      ray.setFromCamera(ndc, camera);
      restRay.ray.copy(ray.ray);
      const cur = store.focus;
      const live = bodies.filter((b): b is THREE.Mesh => !!b && b.parent?.parent?.visible !== false);
      if (glassBody?.parent?.parent?.visible) live.push(glassBody);
      const at = rests.filter((b): b is THREE.Mesh => !!b && b.parent?.visible !== false);
      if (glassRest?.parent?.visible) at.push(glassRest);
      const rest = restRay.intersectObjects(at, false)[0];
      const restK = rest ? rests.indexOf(rest.object as THREE.Mesh) : -1;
      const drawn = cur >= 0 ? ray.intersectObjects(live, false)[0] : undefined;
      const onCur = !!drawn && drawn.object === bodies[cur];
      // Scale's hand: the card being read keeps the pointer while it is the card drawn under it,
      // wherever it now stands; otherwise the card whose resting place is under the pointer takes it.
      hit = onCur ? cur : restK;
    }
    // Moving from one card to another, the new one takes over once the pointer has held on it a moment,
    // so a quick sweep across the stack does not set every card moving at once.
    const pd = pend.current;
    if (hit >= 0 && store.focus >= 0 && hit !== store.focus) {
      if (pd.k !== hit) {
        pd.k = hit;
        pd.t = 0;
      } else pd.t += dt;
      if (pd.t < SWITCH_DWELL) hit = store.focus;
    } else pd.k = -1;
    // Hold focus briefly when the pointer slips into a gap, so a moving card never flickers.
    if (hit >= 0) {
      lost.current = 0;
      store.hoverAt = performance.now();
    } else lost.current += dt;
    const idle = scrolling || lost.current > 0.18 || !readable() ? -1 : store.focus;
    const next = hint >= 0 ? hint : hit >= 0 ? hit : idle;
    if (next !== store.focus) {
      store.focus = next;
      document.body.style.cursor = next >= 0 ? "pointer" : "";
    }
  });
  return null;
}

/** The approval lift lasts 300 ms. */
const PULSE = 0.3;

/* The ending's audit board stands on the ground on a stand of its own: two
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
    const fin = weight(CH.final, store.g);
    const s = g.scale.x;
    // It comes and goes with the board: its parts thin in with the chapter's weight.
    const w = THREE.MathUtils.smoothstep(fin, 0.05, 0.6) * (g.visible ? 1 : 0);
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

const WHITE_C = new THREE.Color(WHITE);
const TONE_C = FUNCTION_TONE.map((t) => new THREE.Color(t));
const axY = new THREE.Vector3();
const toCam = new THREE.Vector3();
// Face colour: white (an #F7F7F7 multiply read as a grey tint on the boards), dimmed when another card is being read.
const FACE_BASE = new THREE.Color("#FFFFFF").r;

function Card({ k }: { k: number }) {
  const ref = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const portrait = useThree((state) => portraitWide(state.size.width, state.size.height));
  const phone = useThree((state) => phoneWide(state.size.width));
  // A function still waiting to be dealt comes into the hand early while it is pointed at on the page.
  const peek = useRef(0);
  useActor(ref, (c, t) => cardPose(k, c, t, portrait, phone, peek.current), k * 0.05, 0.11);
  const anim = useRef({ me: 0, other: 0, shift: 0 });
  // The card's turn about its own face in Scale's hand (upright, then its slot's roll), eased like its pose.
  const roll = useRef({ v: 0 });
  const restRef = useRef<THREE.Mesh | null>(null);
  // In the hand the card takes its function's colour edge to edge, so its own body takes it too.
  const body = useMemo(() => clay(WHITE, 0.35).clone(), []);
  useDisposeOnUnmount(body, (m) => m.dispose());
  // Confirming on the page gives the follow-up card one short lift and settle (no glow).
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
  // The hand face carries its evidence graphic.
  const handFace = faces.bottom.kind === "function";
  const art = useHandArt(handFace ? faces.bottom : null, tier);
  const artMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ camera, size, gl }, dt) => {
    const g = ref.current;
    const n = inner.current;
    // Which face the viewer sees: the top (s = 1) or the bottom (s = -1).
    let s = 1;
    if (g) {
      axY.set(0, 1, 0).applyQuaternion(g.quaternion);
      s = axY.dot(toCam.subVectors(camera.position, g.position)) >= 0 ? 1 : -1;
    }
    let next = baseFaces(k);
    // Its back (the function face) is turned away at the hub, so only the face it shows changes.
    if (k === DECISION_CARD && finalAt(store.g)) next = { ...next, top: { kind: "final" }, topRotated: true };
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
      if (mode === "confirmed" && k === DECISION_CARD) pl.t = 0;
      pl.mode = mode;
    }
    pl.t += d;
    const bump = pl.t < PULSE ? Math.sin((Math.PI * pl.t) / PULSE) * 0.6 : 0;
    a.me = THREE.MathUtils.damp(a.me, f === k ? 1 : 0, 9, d);
    a.other = THREE.MathUtils.damp(a.other, f >= 0 && f !== k ? 1 : 0, 7, d);
    if (!g || !n) return;
    // Control's row places the read card itself (lib/scene.ts layerRow); here only the approval's
    // short lift and settle.
    const fx = 0;
    const fy = s * bump * 0.5;
    const fs = 1 + bump * 0.06;
    // Scale's hand: the cards are square to the viewer and nothing may pass through a neighbour, so a
    // card stays in its own plane. The one being read grows a little, and the cards dealt after it
    // (lying over it) step right until it shows whole (handShift).
    const lw = weight(CH.scale, store.g);
    const lt = localIn(CH.scale, store.g);
    peek.current = lw > 0 && k > scaleDeal(lt) ? a.me : 0;
    easing.damp(roll.current, "v", lw * (HAND_TURN + handRoll(k, lt, portrait, peek.current)), 0.11, d);
    a.shift = THREE.MathUtils.damp(a.shift, f < CARDS ? handShift(k, f) : 0, 7, d);
    const L = THREE.MathUtils.lerp;
    // No rise in the hand: a card that rose from under the pointer handed it to the card below, which
    // dropped it back, and the two traded focus every frame near an edge. It only grows a little.
    n.position.set(L(fx, a.shift * CARD.h, lw), L(fy, s * a.me * 0.02, lw), 0);
    n.rotation.set(0, roll.current.v, 0);
    restRef.current?.rotation.set(0, roll.current.v, 0);
    n.scale.setScalar(L(fs, 1 + a.me * 0.03, lw));
    body.color.copy(WHITE_C).lerp(TONE_C[k], lw);
    rim.color.set(toneOf(k));
    // The rim grows out from behind the card's edge rather than fading: no transparency to sort.
    if (rimRef.current) {
      rimRef.current.visible = a.me > 0.02;
      rimRef.current.scale.set(1 + a.me * 0.011, 1, 1 + a.me * 0.018);
    }
    if (handFace && lw > 0.01) {
      const deal = scaleDeal(lt);
      const dealt = deal >= k - 0.15 || peek.current > 0.5;
      art.step(d, dealt, dealt && (f === k || (f < 0 && Math.round(deal) === k)));
    }
    stand.current?.(camera);
    const dim = FACE_BASE * (1 - a.other * 0.14);
    topMat.current?.color.setScalar(dim);
    bottomMat.current?.color.setScalar(dim);
    artMat.current?.color.setScalar(dim);
  });

  const inset = INSET;
  return (
    <>
    {k === DECISION_CARD && <Stand card={ref} drive={stand} />}
    <group ref={ref} visible={false}>
      <mesh
        ref={(m) => {
          onRestLayer(m);
          rests[k] = m;
          restRef.current = m;
        }}
        geometry={REST_BOX}
        material={REST_MAT}
      />
      <group ref={inner}>
        <mesh
          ref={(m: THREE.Mesh | null) => {
            bodies[k] = m;
          }}
          geometry={roundedSlab(CARD.w, CARD.t, CARD.h, 0.022)}
          castShadow
          receiveShadow
          material={body}
        />
        {/* Coloured rim: a hairline of the card's tone, lit while it is being read */}
        <mesh ref={rimRef} geometry={roundedSlab(CARD.w, CARD.t * 0.7, CARD.h, 0.014)} material={rim} visible={false} />
        <mesh position-y={CARD.t / 2 + 0.0012} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[CARD.w - inset, CARD.h - inset]} />
          <meshBasicMaterial ref={topMat} map={top} toneMapped={false} color="#FFFFFF" />
        </mesh>
        <group position-y={-CARD.t / 2 - 0.0012} rotation-x={Math.PI / 2}>
          <mesh>
            <planeGeometry args={[CARD.w - inset, CARD.h - inset]} />
            <meshBasicMaterial ref={bottomMat} map={bottom} toneMapped={false} color="#FFFFFF" />
          </mesh>
          <mesh position={[ART_PLANE.x, ART_PLANE.y, 0.0008]} visible={handFace}>
            <planeGeometry args={[ART_PLANE.w, ART_PLANE.h]} />
            <meshBasicMaterial ref={artMat} map={art.texture} toneMapped={false} color="#FFFFFF" />
          </mesh>
        </group>
      </group>
    </group>
    </>
  );
}

/* The glass layer card: dealt last onto Scale's hand, over every function. Frosted glass (the cards
   under it show through, softened) with its print on the face turned to the viewer. Only in Scale, and
   never on phones, where the hand is a flat deck. */

const GLASS = HAND.slots - 1;
const GLASS_FACE: FaceSpec = { kind: "glass" };

/* What the glass sees through it. The canvas is clear over the page's sky, and three.js fills a clear
   canvas's refraction view with half-transparent white, so the glass read as a white haze wherever no
   card lay under it. This sheet of the sky colour stands behind the hand and draws only into that
   view (a render target); in the frame itself it writes nothing. */
const SKY_BACK = 6;
const skyC = new THREE.Color();
function GlassSky({ glass }: { glass: React.RefObject<THREE.Group | null> }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, fog: false }), []);
  useDisposeOnUnmount(mat, (m) => m.dispose());
  const onBefore = useMemo(
    () => (gl: THREE.WebGLRenderer) => {
      const into = gl.getRenderTarget() !== null;
      mat.colorWrite = into;
      mat.depthWrite = into;
    },
    [mat],
  );
  useFrame(({ camera }) => {
    const m = ref.current;
    const g = glass.current;
    if (!m) return;
    m.visible = !!g?.visible && g.scale.x > 0.01;
    if (!m.visible || !g) return;
    m.position.copy(g.position).addScaledVector(tmpDir.set(...ISO_DIR), -SKY_BACK);
    m.lookAt(camera.position);
    const [r, gg, b] = bgAt(store.g);
    mat.color.copy(skyC.setRGB(r / 255, gg / 255, b / 255, THREE.SRGBColorSpace));
  });
  return (
    <mesh ref={ref} material={mat} visible={false} onBeforeRender={onBefore} frustumCulled={false}>
      <planeGeometry args={[80, 80]} />
    </mesh>
  );
}
const tmpDir = new THREE.Vector3();

function GlassCard() {
  const ref = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const portrait = useThree((state) => portraitWide(state.size.width, state.size.height));
  const phone = useThree((state) => phoneWide(state.size.width));
  useActor(ref, (c, t) => (c === CH.scale && !phone ? handPose(GLASS, t, portrait) : null), 0.2, 0.11);
  const roll = useRef({ v: 0, open: 0, fade: 0 });
  const printMat = useRef<THREE.MeshBasicMaterial>(null);
  const artMat = useRef<THREE.MeshBasicMaterial>(null);
  const [tier, setTier] = useState(START_TIER);
  const want = useRef({ tier: START_TIER, for: 0 });
  const print = useFace(GLASS_FACE, false, tier);
  const art = useHandArt(GLASS_FACE, tier);
  // Smoked slate glass (the references' slate-teal, 2026-10-14; smoked blue before): what lies under it
  // shows through, deepened and frosted enough that its white print reads over any card. Not tone mapped: it refracts the page and the cards as drawn, and tone
  // mapping greyed them.
  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#41728F",
        transmission: 1,
        transparent: true,
        toneMapped: false,
        roughness: 0.3,
        thickness: 0.6,
        ior: 1.5,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1,
      }),
    [],
  );
  useDisposeOnUnmount(glass, (m) => m.dispose());
  // What the glass refracts is frosted (blurred) anyway: half the resolution reads the same and saves the
  // full-size multisampled copy of the frame it would otherwise render while the card is in view.
  const renderer = useThree((state) => state.gl);
  useEffect(() => {
    renderer.transmissionResolutionScale = 0.5;
  }, [renderer]);
  useFrame(({ camera, size, gl }, dt) => {
    const g = ref.current;
    const n = inner.current;
    if (!g || !n) return;
    const d = Math.min(dt, 1 / 30);
    const lw = weight(CH.scale, store.g);
    const r = roll.current;
    easing.damp(r, "v", lw * (HAND_TURN + handRoll(GLASS, localIn(CH.scale, store.g), portrait)), 0.11, d);
    // It lies over every function: whichever is read, it steps aside with the cards over it. Over the
    // last function it would have to leave the frame, so it lifts away (fades) instead.
    const f = store.focus;
    easing.damp(r, "open", f >= 0 && f < CARDS - 1 ? handShift(GLASS, f) : 0, 0.12, d);
    easing.damp(r, "fade", f === CARDS - 1 ? 1 : 0, 0.12, d);
    n.rotation.set(0, r.v, 0);
    n.position.x = r.open * CARD.h;
    glassRest?.rotation.set(0, r.v, 0);
    // Its print goes entirely (text over text reads as noise); the glass keeps a trace of its edge.
    glass.opacity = 1 - r.fade * 0.9;
    if (printMat.current) printMat.current.opacity = 1 - r.fade;
    if (artMat.current) artMat.current.opacity = 1 - r.fade;
    if (lw > 0.01) {
      const dealt = scaleDeal(localIn(CH.scale, store.g)) >= GLASS - 0.15;
      art.step(d, dealt, dealt && store.focus < 0);
    }
    if (g.visible && g.scale.x > 0.2) {
      const px = footprint(n, camera, size, gl.getPixelRatio());
      let t = TIERS.findIndex((w) => w >= px);
      if (t < 0) t = TIERS.length - 1;
      if (t === tier - 1 && TIERS[t] < px * 1.15) t = tier;
      const w = want.current;
      if (t !== w.tier) {
        w.tier = t;
        w.for = 0;
      } else w.for += dt;
      if (t !== tier && w.for > (t > tier ? 0.15 : 0.8)) setTier(t);
    }
  });
  const inset = INSET;
  return (
    <>
    <GlassSky glass={ref} />
    {/* Never shown on phones: the warm-up leaves it out (its transmission pass would link programs for nothing). */}
    <group ref={ref} visible={false} userData={{ noWarm: phone }}>
      <mesh
        ref={(m) => {
          onRestLayer(m);
          glassRest = m;
        }}
        geometry={REST_BOX}
        material={REST_MAT}
      />
      <group ref={inner}>
        <mesh
          ref={(m: THREE.Mesh | null) => {
            glassBody = m;
          }}
          geometry={roundedSlab(CARD.w, CARD.t, CARD.h, 0.024)}
          material={glass}
        />
        <group position-y={-CARD.t / 2 - 0.0016} rotation-x={Math.PI / 2}>
          <mesh>
            <planeGeometry args={[CARD.w - inset, CARD.h - inset]} />
            <meshBasicMaterial ref={printMat} map={print} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[ART_PLANE.x, ART_PLANE.y, 0.0008]}>
            <planeGeometry args={[ART_PLANE.w, ART_PLANE.h]} />
            <meshBasicMaterial ref={artMat} map={art.texture} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
    </>
  );
}

type FaceState = { top: FaceSpec; topRotated?: boolean; bottom: FaceSpec; bottomRotated: boolean };
const baseFaces = (k: number): FaceState => {
  const d = decisionNow();
  return {
    // Control's row reads each layer whole in front; the decision shows what the page's panel decided.
    top: k === DECISION_CARD ? { kind: "decision", qty: d?.qty, mode: d?.mode } : { kind: "layer", k },
    bottom: { kind: "function", k },
    bottomRotated: false,
  };
};

function useFacesState(k: number) {
  return useState<FaceState>(() => baseFaces(k));
}

const edgeA = new THREE.Vector3();
const edgeB = new THREE.Vector3();
/** While Scale holds the screen, reads where the screen's right edge crosses the hand, so the cards
 *  still to be dealt wait beyond it (lib/scene.ts handPlace). The hand's axis lies square to the
 *  viewer, so the edge is a straight read along it. */
function DeckEdge() {
  useFrame(({ camera }) => {
    if (blendAt(store.g).i !== CH.scale) return setDeckEdge(-Infinity);
    edgeA.set(...handAxis(0)).applyMatrix4(camera.matrixWorldInverse);
    edgeB.set(...handAxis(1)).applyMatrix4(camera.matrixWorldInverse);
    if (edgeA.z >= 0 || edgeB.z >= 0) return setDeckEdge(-Infinity);
    edgeA.applyMatrix4(camera.projectionMatrix);
    edgeB.applyMatrix4(camera.projectionMatrix);
    const per = edgeB.x - edgeA.x;
    setDeckEdge(per > 1e-4 ? (1 - edgeA.x) / per : -Infinity);
  });
  return null;
}

export function Cards() {
  return (
    <>
      <DeckEdge />
      <CardFocus />
      <LayerRow />
      {Array.from({ length: CARDS }, (_, k) => (
        <Card key={k} k={k} />
      ))}
      <GlassCard />
    </>
  );
}
