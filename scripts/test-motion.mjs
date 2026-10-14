// Behavioral checks for animation timing and adaptive resolution. No browser or GPU needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function harness(file, { density = 1.5 } = {}) {
  let now = 0;
  let next = 1;
  let atRest = false;
  let ratio = density;
  const rafs = new Map();
  const timers = new Map();
  const cleanups = [];
  const frames = [];
  const draws = [];
  const densities = [];
  const events = new Map();
  const listener = (name, fn) => {
    const list = events.get(name) ?? new Set();
    list.add(fn);
    events.set(name, list);
  };
  const target = {
    addEventListener: listener,
    removeEventListener: (name, fn) => events.get(name)?.delete(fn),
  };
  const canvas = { ...target, dataset: {} };
  const gl = { domElement: canvas, getPixelRatio: () => ratio };
  const clock = { elapsedTime: 0 };
  const probe = { off3d: false, dprSetters: new Set() };
  const state = {
    gl, clock,
    get: () => state,
    advance: (t) => { draws.push(t - clock.elapsedTime); clock.elapsedTime = t; },
    setDpr: (d) => { ratio = Array.isArray(d) ? Math.min(2, d[1]) : d; densities.push(ratio); },
  };
  const doc = { ...target, hidden: false, documentElement: { dataset: {}, scrollHeight: 10000 }, getElementById: () => null };
  const win = { ...target, innerWidth: 390, innerHeight: 844, devicePixelRatio: 2, scrollY: 0,
    scrollTo: ({ top }) => { win.scrollY = top; },
    dispatchEvent: (e) => [...(events.get(e.type) ?? [])].forEach((fn) => fn(e)),
    setTimeout: (fn) => { const id = next++; timers.set(id, fn); return id; },
  };
  const chrome = { jumping: false };
  const mocks = {
    react: { useEffect: (fn) => { const off = fn(); if (off) cleanups.push(off); }, useRef: (v) => ({ current: v }) },
    '@react-three/fiber': { useThree: (select) => select(state), useFrame: (fn) => frames.push(fn) },
    '@/lib/pace': { probe, resting: () => atRest },
    '@/lib/device': { canvasQuality: () => ({ dpr: [1, 1.5] }) },
    'gsap/ScrollTrigger': { ScrollTrigger: { update: () => {} } },
    './chrome': { getChrome: () => chrome, setChrome: (patch) => Object.assign(chrome, patch), token: (_, fallback) => fallback },
    './story': { CH: { fragments: 0, industries: 7, final: 8 }, store: { cardRect: null } },
  };
  const vmModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module: vmModule, exports: vmModule.exports, require: (id) => mocks[id] ?? require(id),
    window: win, document: doc, URLSearchParams, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, performance: { now: () => now },
    requestAnimationFrame: (fn) => { const id = next++; rafs.set(id, fn); return id; },
    cancelAnimationFrame: (id) => rafs.delete(id), clearTimeout: (id) => timers.delete(id),
  });
  return {
    exports: vmModule.exports, doc, win, draws, densities, probe, rafs, timers, events,
    rest: (v) => { atRest = v; },
    tick: (t) => { now = t; const callbacks = [...rafs.values()]; rafs.clear(); callbacks.forEach((fn) => fn(t)); frames.forEach((fn) => fn()); },
    emit: (name) => [...(events.get(name) ?? [])].forEach((fn) => fn()),
    dispose: () => cleanups.forEach((fn) => fn()),
    ratio: () => ratio,
  };
}

for (const hz of [60, 120]) {
  const h = harness('components/three/Pacer.tsx');
  h.exports.Pacer({});
  for (let i = 1; i <= hz * 2; i++) h.tick(i * 1000 / hz);
  assert.ok(h.draws.length >= 118 && h.draws.length <= 121, `${hz} Hz screen: ${h.draws.length} animation updates`);
  assert.ok(h.draws.every((dt) => dt <= 1 / 30), 'animation steps stay bounded');
  h.doc.hidden = true;
  h.emit('visibilitychange');
  assert.equal(h.rafs.size, 0, 'hidden tabs stop requesting frames');
  const before = h.draws.length;
  h.tick(50000);
  assert.equal(h.draws.length, before, 'hidden tabs do not animate');
  h.doc.hidden = false;
  h.emit('visibilitychange');
  h.tick(50020);
  assert.equal(h.draws.length, before + 1, 'visible tabs resume');
  assert.ok(h.draws.at(-1) <= 1 / 30, 'resume does not replay hidden time');
  h.dispose();
  assert.equal(h.rafs.size, 0);
  assert.equal(h.timers.size, 0);
  assert.ok([...h.events.values()].every((s) => s.size === 0));
}
{
  const h = harness('components/three/Pacer.tsx');
  h.rest(true);
  h.exports.Pacer({ drawnAt: () => 0 });
  for (let i = 1; i <= 120; i++) h.tick(2000 + i * 1000 / 60);
  assert.ok(h.draws.length >= 14 && h.draws.length <= 17, 'settled scenes check at about 8 Hz');
  h.dispose();
}
{
  const h = harness('components/three/Pacer.tsx');
  let paused = true;
  h.exports.Pacer({ paused: () => paused });
  h.tick(16);
  assert.equal(h.draws.length, 0, 'offscreen scenes do not draw');
  assert.equal(h.rafs.size, 0, 'offscreen scenes release the animation clock');
  paused = false;
  h.emit('scroll');
  h.tick(32);
  assert.equal(h.draws.length, 1, 'scroll wakes an offscreen scene immediately');
  h.dispose();
}
{
  const h = harness('components/three/AdaptiveQuality.tsx');
  h.exports.AdaptiveQuality();
  for (let i = 1; i <= 200; i++) h.tick(i * 33);
  assert.equal(h.ratio(), 1.25, 'sustained slow interaction lowers pixel cost');
  h.emit('resize');
  assert.equal(h.ratio(), 1.25, 'browser bar resizing preserves the measured budget');
  h.win.innerWidth = 844;
  h.emit('resize');
  assert.equal(h.ratio(), 1.5, 'rotation resets the screen budget');
  h.rest(true);
  for (let i = 1; i <= 300; i++) h.tick(7000 + i * 125);
  assert.equal(h.ratio(), 1.5, 'capped idle frames never lower graphics quality');
  h.dispose();
  assert.equal(h.probe.dprSetters.size, 0);
}
{
  const h = harness('lib/stills.ts');
  let reduced = false;
  h.win.innerHeight = 844;
  h.win.location = { search: '' };
  h.win.matchMedia = (q) => ({ matches: q.includes('prefers-reduced-motion') ? reduced : h.win.innerWidth <= 767 });
  assert.equal(h.exports.phoneStills(), false, 'phones retain live animation by default');
  reduced = true;
  assert.equal(h.exports.phoneStills(), true, 'upright reduced-motion phones use baked artwork');
  h.win.location.search = '?live3d';
  assert.equal(h.exports.phoneStills(), false, 'live preview overrides baked artwork');
  reduced = false;
  h.win.location.search = '?stills';
  assert.equal(h.exports.phoneStills(), true, 'lightweight mode is available explicitly');
  h.win.innerWidth = 844;
  h.win.innerHeight = 390;
  assert.equal(h.exports.phoneStills(), false, 'landscape screens use live framing');
}
{
  const h = harness('lib/device.ts');
  let touch = true;
  h.win.matchMedia = (q) => ({ matches: q.includes('max-width') ? h.win.innerWidth <= 767 : touch });
  assert.equal(h.exports.canvasQuality().dpr[1], 1.5);
  h.win.innerWidth = 844;
  h.win.innerHeight = 390;
  assert.equal(h.exports.isTouchPhone(), true, 'landscape phones keep the phone material budget');
  assert.equal(h.exports.canvasQuality().dpr[1], 1.5, 'landscape phones keep the pixel budget');
  touch = false;
  h.win.innerWidth = 1440;
  h.win.innerHeight = 900;
  assert.equal(h.exports.canvasQuality().dpr[1], 2, 'laptops keep their higher density');
}
{
  const h = harness('lib/jump.ts');
  h.win.matchMedia = () => ({ matches: false });
  const first = h.exports.jumpTo(600, { focus: false });
  h.tick(200);
  assert.ok(h.win.scrollY > 0 && h.win.scrollY < 600, 'native chapter navigation glides');
  const replacement = h.exports.jumpTo(900, { immediate: true, focus: false });
  h.tick(216);
  await replacement;
  await first;
  h.tick(1500);
  assert.equal(h.win.scrollY, 900, 'an obsolete glide cannot overwrite a new landing');
  const rotating = h.exports.jumpTo(500, { focus: false });
  h.tick(1520);
  h.emit('resize');
  await rotating;
  const stopped = h.win.scrollY;
  h.tick(3000);
  assert.equal(h.win.scrollY, stopped, 'rotation cancels a glide aimed at old coordinates');
  assert.equal(h.events.get('resize').size, 0, 'cancelled navigation releases its resize listener');
}
console.log('Motion checks passed: 60/120 Hz cadence, visibility, resume, idle, offscreen wake, adaptive density, rotation and cleanup.');
