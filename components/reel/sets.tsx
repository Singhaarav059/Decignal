"use client";

// The sets the reel is shot on. Nothing hangs in empty space: every object stands on a floor, a
// dais, a stand or a diorama base, and each set carries the context its section is about.
// Two shadows ground everything: the key light's soft shadow, and a contact shadow, the dark line
// where an object meets the ground, which is what sells it as resting there.
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";
import { grain } from "../three/materials";
import { story } from "@/lib/reel";

/* ------------------------------------------------------------------ */
/* Contact shadow                                                       */
/* ------------------------------------------------------------------ */

const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
quadCam.position.z = 0.5;
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
const prevClear = new THREE.Color();
const worldScale = new THREE.Vector3();
/** Every contact shadow's display plane, hidden while any of them renders its depth pass. */
const displays = new Set<THREE.Object3D>();
/**
 * Solid bases (platforms, daises, plinths) that objects stand on. They're left out of contact
 * passes: they are the ground, and their own footprint would only darken the floor in a halo.
 */
export const grounds = new Set<THREE.Object3D>();
/** Registers a base as ground for contact shadows. */
export const asGround = (o: THREE.Object3D | null) => {
  if (o) grounds.add(o);
};

type ContactProps = React.ComponentProps<"group"> & {
  /** Footprint, in the parent's units. */
  w: number;
  d: number;
  /** Height above the ground that still darkens it. */
  far?: number;
  blur?: number;
  opacity?: number;
  res?: number;
  color?: string;
};

/**
 * A soft shadow where objects touch the ground, rendered from below each frame the set is on
 * screen: an orthographic depth pass of everything within `far` of the ground, blurred twice.
 */
export function Contact({ w, d, far = 1, blur = 2.4, opacity = 0.8, res = 512, color = "#171B23", ...props }: ContactProps) {
  const root = useRef<THREE.Group>(null);
  const kit = useMemo(() => {
    const rw = res;
    const rh = Math.max(64, Math.round((res * d) / w));
    const target = () => {
      const t = new THREE.WebGLRenderTarget(rw, rh);
      t.texture.generateMipmaps = false;
      return t;
    };
    const a = target();
    const b = target();
    // Looks straight up from just under the ground, so the undersides of things standing on it
    // are in the pass; the ground itself (and every registered base) is hidden while it runs.
    const cam = new THREE.OrthographicCamera(-w / 2, w / 2, d / 2, -d / 2, 0, far);
    cam.rotation.x = Math.PI / 2;
    const depth = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
    depth.onBeforeCompile = (s) => {
      s.uniforms.ucolor = { value: new THREE.Color(color) };
      s.fragmentShader = s.fragmentShader
        .replace("void main() {", "uniform vec3 ucolor;\nvoid main() {")
        // Darkest where the object touches the ground, gone by `far`.
        .replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );", "vec4( ucolor, pow( 1.0 - fragCoordZ, 1.7 ) );");
    };
    depth.customProgramCacheKey = () => `contact-${color}`;
    const h = new THREE.ShaderMaterial(HorizontalBlurShader);
    const v = new THREE.ShaderMaterial(VerticalBlurShader);
    h.depthTest = v.depthTest = false;
    // The pass looks up with the front (+z) at the top of its image: lay the image out to match.
    const plane = new THREE.PlaneGeometry(w, d).rotateX(Math.PI / 2);
    const show = new THREE.MeshBasicMaterial({ map: a.texture, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    return { a, b, cam, depth, h, v, plane, show, rw, rh, scale: 0 };
  }, [w, d, far, res, color, opacity]);

  useEffect(
    () => () => {
      kit.a.dispose();
      kit.b.dispose();
      kit.plane.dispose();
      kit.show.dispose();
    },
    [kit],
  );

  const display = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const m = display.current;
    if (!m) return;
    displays.add(m);
    return () => void displays.delete(m);
  }, []);

  // The pass redraws the whole scene from below: only worth it when the story has moved something.
  const last = useRef({ t: NaN, n: 0 });
  useFrame(({ gl, scene }) => {
    const t = story();
    const l = last.current;
    if (Math.abs(t - l.t) < 1e-5 && l.n > 2) return;
    l.t = t;
    l.n++;
    renderContact(gl, scene, root.current, kit, w, d, far, blur);
  }, 0.5);

  return (
    <group ref={root} {...props}>
      <mesh ref={display} geometry={kit.plane} material={kit.show} position-y={0.002} renderOrder={1} />
      <primitive object={kit.cam} position-y={-0.03} />
    </group>
  );
}

type ContactKit = {
  a: THREE.WebGLRenderTarget;
  b: THREE.WebGLRenderTarget;
  cam: THREE.OrthographicCamera;
  depth: THREE.MeshDepthMaterial;
  h: THREE.ShaderMaterial;
  v: THREE.ShaderMaterial;
  rw: number;
  rh: number;
  scale: number;
};

/** One contact pass: depth from below, then two blurs, into the kit's target. */
function renderContact(gl: THREE.WebGLRenderer, scene: THREE.Scene, g: THREE.Group | null, kit: ContactKit, w: number, d: number, far: number, blur: number) {
  if (!g) return;
    for (let o: THREE.Object3D | null = g; o; o = o.parent) if (!o.visible) return;
    const { a, b, cam, depth, h, v, rw, rh } = kit;
    // Cameras ignore their parents' scale, so the frustum is sized in world units here.
    g.getWorldScale(worldScale);
    if (worldScale.x !== kit.scale) {
      const k = (kit.scale = worldScale.x);
      cam.left = (-w / 2) * k;
      cam.right = (w / 2) * k;
      cam.top = (d / 2) * k;
      cam.bottom = (-d / 2) * k;
      cam.near = 0;
      cam.far = (far + 0.03) * k;
      cam.updateProjectionMatrix();
    }
    const shown: THREE.Object3D[] = [];
    const hide = (m: THREE.Object3D) => {
      if (m.visible) {
        m.visible = false;
        shown.push(m);
      }
    };
    displays.forEach(hide);
    grounds.forEach(hide);
    const bg = scene.background;
    const over = scene.overrideMaterial;
    scene.background = null;
    scene.overrideMaterial = depth;
    // Clear to transparent, whatever another pass left the clear colour at.
    gl.getClearColor(prevClear);
    const prevAlpha = gl.getClearAlpha();
    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(a);
    gl.clear(true, true, false);
    gl.setClearColor(prevClear, prevAlpha);
    gl.render(scene, cam);
    scene.overrideMaterial = over;
    scene.background = bg;
    shown.forEach((m) => (m.visible = true));
    // Two blur passes: wide, then a finer one to smooth the steps.
    for (const k of [blur, blur * 0.45]) {
      quad.material = h;
      h.uniforms.tDiffuse.value = a.texture;
      h.uniforms.h.value = k / rw;
      gl.setRenderTarget(b);
      gl.render(quad, quadCam);
      quad.material = v;
      v.uniforms.tDiffuse.value = b.texture;
      v.uniforms.v.value = k / rh;
      gl.setRenderTarget(a);
      gl.render(quad, quadCam);
    }
    gl.setRenderTarget(null);
}

/* ------------------------------------------------------------------ */
/* Floors                                                               */
/* ------------------------------------------------------------------ */

const mats = new Map<string, THREE.Material>();
function memo<T extends THREE.Material>(k: string, make: () => T): T {
  let m = mats.get(k) as T | undefined;
  if (!m) mats.set(k, (m = make()));
  return m;
}

/** Glazed porcelain: a warm white body, a thin glossy glaze, a faint orange-peel in the glaze. */
export const porcelain = (color = "#F1F2F5") =>
  memo(`porcelain-${color}`, () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 0.9, clearcoatRoughness: 0.14, bumpMap: grain("glaze", 128, 18), bumpScale: 0.0006, sheen: 0.25, sheenColor: new THREE.Color("#FFF4E6"), sheenRoughness: 0.6 }));

/** Unglazed porcelain: the cut and underside of a base, matte with a fine grain. */
export const bisque = (color = "#DEE1E7") => memo(`bisque-${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.82, bumpMap: grain("bisque", 140, 40), bumpScale: 0.002 }));

/** Draws onto a canvas texture once fonts are ready, so labels never render in a fallback face. */
export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  let text = false;
  const paint = () => {
    const g = c.getContext("2d")!;
    // Note whether this canvas draws any text: only those need repainting once the fonts arrive.
    if (!text) {
      const fill = g.fillText.bind(g);
      g.fillText = (...a: Parameters<CanvasRenderingContext2D["fillText"]>) => {
        text = true;
        g.fillText = fill;
        return fill(...a);
      };
    }
    g.clearRect(0, 0, w, h);
    draw(g, w, h);
    t.needsUpdate = true;
  };
  paint();
  // A big ground texture takes hundreds of milliseconds to paint: never paint one twice for nothing.
  if (typeof document !== "undefined" && text && document.fonts?.status !== "loaded") document.fonts.ready.then(paint);
  return t;
}

export const sans = () => (typeof document === "undefined" ? "Arial, sans-serif" : getComputedStyle(document.body).fontFamily || "Arial, sans-serif");
export const display = () => {
  const v = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue("--font-reel").trim();
  return v ? `${v}, Georgia, serif` : "Georgia, serif";
};

/**
 * Fills text in the display serif. Canvas can't set the font's optical-size axis, but it follows
 * the font size: drawn at 12px and scaled up, the letters keep the sturdy text cut, whose
 * hairlines survive on a texture, instead of the display cut, whose hairlines vanish.
 */
/** The largest display size, up to `px`, at which `text` fits in `maxW` canvas pixels. */
export function fitDisplay(g: CanvasRenderingContext2D, text: string, maxW: number, px: number, weight = 800) {
  g.save();
  g.font = `${weight} 12px ${display()}`;
  const w12 = g.measureText(text).width;
  g.restore();
  return Math.min(px, (maxW / Math.max(w12, 1)) * 12);
}

export function displayText(g: CanvasRenderingContext2D, text: string, x: number, y: number, px: number, weight = 800) {
  const k = px / 12;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  g.font = `${weight} 12px ${display()}`;
  g.fillText(text, 0, 0);
  g.restore();
}
