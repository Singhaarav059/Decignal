// Depth of field, off by default: the reader can turn it on from the nav. The frame is drawn into a
// target with its depth, then one full-screen pass blurs each pixel by how far it sits from the
// shot's subject, like a camera lens focused on it. The sharp picture is never lowered in resolution.
import * as THREE from "three";
import { isPhone } from "@/lib/device";

const KEY = "decignal-lens";

/** Whether the reader turned the lens on, and how far it has opened (eases, so toggling never pops). */
export const lens = { on: false, open: 0 };

const listeners = new Set<() => void>();

function loadLens() {
  try {
    // Phones keep the sharp picture: the extra pass is sized for a desktop GPU.
    lens.on = localStorage.getItem(KEY) === "1" && !isPhone();
  } catch {}
}
if (typeof window !== "undefined") loadLens();

export function setLens(on: boolean) {
  lens.on = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  listeners.forEach((fn) => fn());
}

/** For useSyncExternalStore: whether the lens is on, kept in step with every toggle. */
export const lensStore = {
  subscribe: (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn)),
  get: () => lens.on,
  server: () => false,
};

let target: THREE.WebGLRenderTarget | null = null;
const size = new THREE.Vector2();

/** The frame's target, the size of the drawing buffer, with the same MSAA the screen has. */
function frameTarget(gl: THREE.WebGLRenderer) {
  gl.getDrawingBufferSize(size);
  if (!target) {
    const samples = gl.getContext().getContextAttributes()?.antialias ? 4 : 0;
    // Half float: with MSAA, three gives an output-flagged target a linear multisample buffer, which
    // an 8-bit sRGB texture cannot be resolved into; at half float both sides are the same format.
    target = new THREE.WebGLRenderTarget(size.x, size.y, { depthBuffer: true, stencilBuffer: false, samples, type: THREE.HalfFloatType });
    // Drawn like the screen (tone mapping, sRGB output), as the water's reflection is: no second
    // set of shaders to compile. The pixels it holds are sRGB values; the lens decodes them.
    (target as unknown as { isXRRenderTarget: boolean }).isXRRenderTarget = true;
    target.texture.colorSpace = THREE.SRGBColorSpace;
    target.texture.generateMipmaps = false;
    target.texture.minFilter = THREE.LinearFilter;
    target.depthTexture = new THREE.DepthTexture(size.x, size.y);
    target.depthTexture.type = THREE.UnsignedIntType;
  } else if (target.width !== size.x || target.height !== size.y) {
    target.setSize(size.x, size.y);
  }
  return target;
}

const TAPS = 28;

const material = new THREE.ShaderMaterial({
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
    near: { value: 1 },
    far: { value: 9000 },
    focus: { value: 100 },
    aperture: { value: 0 },
    maxPx: { value: 8 },
    texel: { value: new THREE.Vector2() },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tColor;
    uniform sampler2D tDepth;
    uniform float near, far, focus, aperture, maxPx;
    uniform vec2 texel;
    varying vec2 vUv;

    float viewZ(vec2 uv) {
      float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
      return 2.0 * near * far / (far + near - z * (far - near));
    }
    // The target holds sRGB values in a float texture: blur in linear light.
    vec3 px(vec2 uv) {
      return sRGBTransferEOTF(vec4(max(texture2D(tColor, uv).rgb, 0.0), 1.0)).rgb;
    }
    // Blur radius in pixels: a thin lens focused at 'focus', both nearer and farther soften.
    float coc(float z) {
      return clamp(aperture * abs(z - focus) / z, 0.0, 1.0) * maxPx;
    }

    void main() {
      float zc = viewZ(vUv);
      float rc = coc(zc);
      vec4 sum = vec4(px(vUv), 1.0);
      // Gather on a golden-angle spiral over the largest blur. A sample counts where its own blur
      // reaches this pixel; one behind this pixel may spread no further than this pixel's own blur,
      // so a soft background never bleeds over a sharp subject.
      for (int i = 0; i < ${TAPS}; i++) {
        float f = float(i) + 0.5;
        float d = sqrt(f / float(${TAPS})) * maxPx;
        float a = f * 2.39996323;
        vec2 uv = vUv + vec2(cos(a), sin(a)) * d * texel;
        float zs = viewZ(uv);
        float rs = coc(zs);
        float r = zs > zc ? min(rs, rc) : rs;
        float w = clamp(r - d + 1.0, 0.0, 1.0);
        sum += vec4(px(uv) * w, w);
      }
      gl_FragColor = vec4(sum.rgb / sum.a, 1.0);
      #include <colorspace_fragment>
    }
  `,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
quad.frustumCulled = false;
const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

/** Builds the lens's shader up front, so turning it on never stalls a frame. */
export function warmLens(gl: THREE.WebGLRenderer) {
  gl.compile(quad, flat);
}

/** How strongly the lens blurs: the share of the largest blur reached far behind or near in front. */
const APERTURE = 1;
/** The largest blur, in CSS pixels. */
const MAX_BLUR = 6;

/**
 * Draws the frame: straight to the screen with the lens closed, otherwise through the lens,
 * focused `focus` metres in front of the camera.
 */
export function drawFrame(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, focus: number, dt: number) {
  lens.open = THREE.MathUtils.damp(lens.open, lens.on ? 1 : 0, 6, dt);
  if (!lens.on && lens.open < 0.01) {
    lens.open = 0;
    gl.render(scene, camera);
    return;
  }
  const t = frameTarget(gl);
  gl.setRenderTarget(t);
  gl.render(scene, camera);
  gl.setRenderTarget(null);
  const u = material.uniforms;
  u.tColor.value = t.texture;
  u.tDepth.value = t.depthTexture;
  u.near.value = camera.near;
  u.far.value = camera.far;
  u.focus.value = focus;
  u.aperture.value = APERTURE * lens.open;
  u.maxPx.value = MAX_BLUR * gl.getPixelRatio();
  u.texel.value.set(1 / t.width, 1 / t.height);
  gl.render(quad, flat);
}
