"use client";

// 02 Signal: the Bearing X90 tote, the one part that is about to run short.
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CH, activePin, smoothstep, store, weight } from "@/lib/story";
import { WMS, signalCratePose } from "@/lib/scene";
import { EXAMPLE } from "@/lib/example";
import { COLORS, TINTS } from "../palette";
import { Crate, useDisposeOnUnmount } from "../kit";
import { BearingBed } from "../buildings";
import { coated, fineRibs } from "../materials";
import { TOTE_LABEL } from "../parts";
import { Actor, Rise } from "./core";
import { portraitWide } from "@/lib/device";

/** The bin label's two lines: the part and plant, then the stock the ERP holds for it. */
const BIN = [`${EXAMPLE.part.split(" ").pop()} · ${EXAMPLE.plant01.name.toUpperCase()}`, `${EXAMPLE.plant01.onHand} ON HAND`];
const LABEL_PX = 384;

/** The printed card in the tote's label holder: ink on white, in the page's label face. */
function BinLabel() {
  const gl = useThree((s) => s.gl);
  const L = TOTE_LABEL;
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = LABEL_PX;
    c.height = Math.round((LABEL_PX * L.h) / L.w);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
    return t;
  }, [gl, L.h, L.w]);
  useEffect(() => {
    let live = true;
    const draw = () => {
      if (!live) return;
      const c = tex.image as HTMLCanvasElement;
      const x = c.getContext("2d")!;
      const { width: W, height: H } = c;
      x.fillStyle = "#FFFFFF";
      x.fillRect(0, 0, W, H);
      const label = getComputedStyle(document.documentElement).getPropertyValue("--font-label").trim() || "ui-monospace, monospace";
      x.fillStyle = COLORS.ink;
      x.textBaseline = "alphabetic";
      x.font = `700 ${Math.round(H * 0.3)}px ${label}`;
      x.fillText(BIN[0], W * 0.07, H * 0.44);
      x.fillStyle = "#4A505C";
      x.font = `600 ${Math.round(H * 0.24)}px ${label}`;
      x.fillText(BIN[1], W * 0.07, H * 0.8);
      tex.needsUpdate = true;
    };
    draw();
    if (document.fonts.status !== "loaded") document.fonts.ready.then(draw);
    return () => {
      live = false;
    };
  }, [tex]);
  useDisposeOnUnmount(tex, (t) => t.dispose());
  return (
    <mesh position={[L.x, L.y, L.z + 0.0032]}>
      <planeGeometry args={[L.w - 0.012, L.h - 0.012]} />
      <meshStandardMaterial map={tex} roughness={0.6} />
    </mesh>
  );
}

/** The one tote that matters: Bearing X90 at Plant 01. Its number is on its own bin label. */
export function SignalCrate() {
  const portrait = useThree((state) => portraitWide(state.size.width, state.size.height));
  // Same moulded, ribbed plastic as every other tote; only its colour changes.
  const mat = useMemo(
    () => coated({ roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.5, normalMap: fineRibs(), normalScale: new THREE.Vector2(0.6, 0.6) }),
    [],
  );
  const saffron = useMemo(() => new THREE.Color(TINTS.saffron), []);
  const red = useMemo(() => new THREE.Color(COLORS.signal), []);
  const approved = useMemo(() => new THREE.Color(TINTS.emerald), []);
  const hover = useRef<THREE.Group>(null);

  const hint = useRef(0);
  useFrame((_, dt) => {
    const sigWeight = weight(CH.signal, store.g);
    // It stands still on the ground. Pointing at its readout on the page lifts it a little: the
    // numbers and the object are one thing.
    hint.current = THREE.MathUtils.damp(hint.current, store.signalHint || activePin() === "signal" ? 1 : 0, 9, Math.min(dt, 1 / 30));
    if (hover.current) hover.current.position.y = hint.current * 0.08 * sigWeight;
    // The colour is the signal: saffron stock turns red as the shortage is found. No glow.
    const r = smoothstep(0.45, 0.95, store.g);
    // Back on its island at the end, the same tote reads approved: the shortage is resolved.
    const ok = smoothstep(0.4, 0.95, weight(CH.final, store.g));
    mat.color.copy(saffron).lerp(red, r).lerp(approved, ok);
  });

  return (
    <Actor track={(c, t) => signalCratePose(c, t, portrait)} damp={0.12}>
      {/* Rides in with the warehouse it sits on. */}
      <Rise delay={0.25 + WMS * 0.09} float={() => 0}>
        <group ref={hover}>
          {/* An open tote of X90 bearings, 7 of its 12 pockets filled: the part that is running short */}
          <Crate material={mat} open>
            <BearingBed filled={7} />
            <BinLabel />
          </Crate>
        </group>
      </Rise>
    </Actor>
  );
}
