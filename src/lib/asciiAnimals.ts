/* ==========================================================================
   asciiAnimals.ts — koi, jellyfish and dragonflies drifting on a coarse cell
   grid behind the page. Solid parts become tinted square cells, wispy parts
   (tentacles, trails) become monospace glyphs.

   Adapted from "ASCII Animals New Tab" by Pawan-webdeveloper, MIT licensed:
   https://github.com/Pawan-webdeveloper/Ascii-Animals-extension
   Trimmed to three animals, a transparent canvas and no UI. The React wrapper
   is components/AsciiAnimals.tsx.
   ========================================================================== */

export type AnimalId = "dragonflies" | "koi" | "jellyfish";

export const ASCII_ANIMALS_CONFIG = {
  // Cell size in CSS px. Smaller = finer animals, more cells to fill.
  cell: 9,
  // Population multiplier on each animal's base count (scaled by viewport area).
  density: 1,
  // Global speed multiplier.
  speed: 1,
  // Global size multiplier.
  size: 1,
  // Depth: how much smaller and dimmer far animals get (0 flat … 1 strong).
  depth: 0.6,
  // Sway: body wobble amount (0 … 1).
  sway: 0.5,
  // Glyph trails behind each animal.
  trails: true,
  // Cap on devicePixelRatio.
  maxDpr: 2,
  // Canvas font for glyph parts. null reads the site's --font-mono token.
  fontFamily: null as string | null,
};

export type AsciiAnimalsConfig = typeof ASCII_ANIMALS_CONFIG;

/* ---------- small maths ---------- */

const TAU = Math.PI * 2;
const sq = (x: number) => x * x;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = <T>(arr: T[]) => arr[(Math.random() * arr.length) | 0];
const ell = (u: number, v: number, cu: number, cv: number, ru: number, rv: number) => sq((u - cu) / ru) + sq((v - cv) / rv);
const angleDiff = (a: number, b: number) => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

function hash2(i: number, j: number, s: number) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise(x: number, y: number, s: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s);
  const b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s);
  const d = hash2(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}

type RGB = [number, number, number];
const mix = (c1: RGB, c2: RGB, t: number): RGB => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const WHITE: RGB = [240, 244, 255];

/* ---------- sampler output (reused to avoid allocations) ---------- */

const out = { r: 0, g: 0, b: 0, a: 1, ch: null as string | null, shine: 0 };

function hit(c: RGB, a = 1, shine = 0, k = 1) {
  out.r = c[0] * k;
  out.g = c[1] * k;
  out.b = c[2] * k;
  out.a = a;
  out.ch = null;
  out.shine = shine;
  return true;
}

function glyph(chars: string, c: RGB, a = 1, k = 1) {
  out.r = c[0] * k;
  out.g = c[1] * k;
  out.b = c[2] * k;
  out.a = a;
  out.ch = chars;
  out.shine = 0;
  return true;
}

/* ---------- animals ---------- */

interface Pal {
  [k: string]: RGB | number | undefined;
}

interface Entity {
  A: Animal;
  x: number;
  y: number;
  z: number;
  seed: number;
  pal: Pal;
  phase: number;
  rateMul: number;
  speedMul: number;
  baseOff: number;
  heading: number;
  target: number;
  retargetAt: number;
  fade: number;
  leaving: boolean;
  speedMod: number;
  phaseMod: number;
  lastTrail: number;
  trailFlip: number;
  // per-animal scratch
  amp: number;
  c: number;
  Rw: number;
  H: number;
  beat: number;
}

export interface Animal {
  id: AnimalId;
  label: string;
  swatch: RGB;
  scale?: number;
  radius: number;
  count: number;
  speed: number;
  turn: number;
  phaseRate: number;
  mode: "flow" | "wander";
  hoverShy?: boolean;
  retarget?: [number, number];
  direction: number;
  spread: number;
  trail: { chars: string; color: RGB; life: number; at: [number, number][] };
  variants: Pal[];
  prep(e: Entity, sway: number, t: number): void;
  wobble?(e: Entity, t: number): number;
  sample(u: number, v: number, e: Entity): boolean;
}

export const ANIMALS: Animal[] = [
  {
    id: "dragonflies",
    label: "Dragonflies",
    swatch: [50, 220, 120],
    radius: 13,
    count: 11,
    speed: 8,
    turn: 4,
    phaseRate: 38,
    mode: "wander",
    hoverShy: true,
    retarget: [0.8, 2.6],
    direction: 60,
    spread: 0.55,
    trail: { chars: ".·", color: [120, 230, 170], life: 0.9, at: [[-12, 0]] },
    variants: [
      { body: [50, 220, 120], band: [24, 118, 90], eye: [30, 150, 110] },
      { body: [56, 200, 150], band: [20, 96, 80], eye: [24, 130, 100] },
      { body: [62, 170, 255], band: [24, 70, 150], eye: [40, 110, 200] },
    ],
    prep(e, _sway, t) {
      e.beat = 0.8 + 0.2 * Math.cos(e.phase);
      const dart = 0.5 + 0.5 * Math.sin(t * 1.3 + e.seed * 9);
      e.speedMod = 0.12 + 1.7 * dart * dart;
    },
    sample(u, v, e) {
      const av = Math.abs(v);
      const P = e.pal;
      if (ell(u, v, 2.6, 0, 1.0, 1.5) < 1) return av > 0.5 ? hit(P.eye as RGB) : hit(P.body as RGB, 1, 0, 0.8);
      if (ell(u, v, 0.4, 0, 1.9, 1.15) < 1) return hit(P.body as RGB, 1, 0.2, 0.9);
      if (u < -1 && u > -12.5 && av < (u > -3 ? 0.62 : 0.5)) {
        return hit((((-u * 0.75) | 0) & 1 ? P.band : P.body) as RGB, 1, 0.15);
      }
      if (av > 0.6) {
        const w = (av - 0.6) / e.beat;
        for (let k = 0; k < 2; k++) {
          const base = k ? -0.3 : 1.1;
          const tilt = k ? -0.12 : 0.22;
          const len = k ? 5.8 : 6.4;
          const perp = u - base - tilt * w;
          const d = sq((w - len * 0.5 - 0.2) / (len * 0.55)) + sq(perp / 1.15);
          if (d < 1) {
            if (w > len * 0.86 && Math.abs(perp) < 0.6) return hit([70, 84, 98], 0.9);
            return hit([196, 232, 255], d > 0.6 ? 0.55 : 0.38);
          }
        }
      }
      return false;
    },
  },
  {
    id: "koi",
    label: "Koi",
    swatch: [244, 196, 44],
    radius: 13,
    count: 12,
    speed: 4.4,
    turn: 1.1,
    phaseRate: 5,
    mode: "wander",
    retarget: [2.5, 6],
    direction: 0,
    spread: 0.9,
    trail: { chars: "~-~=", color: [150, 175, 210], life: 1.8, at: [[-10, 0]] },
    variants: [
      { base: [236, 232, 226], patch: [214, 48, 36], thr: 0.5 },
      { base: [236, 232, 226], patch: [205, 45, 35], thr: 0.55, dark: [30, 30, 34] },
      { base: [244, 196, 44], patch: [250, 150, 30], thr: 0.72 },
      { base: [240, 118, 38], patch: [255, 172, 72], thr: 0.68 },
      { base: [214, 220, 228], patch: [176, 186, 202], thr: 0.6 },
    ],
    prep(e, sway) {
      e.amp = 1.3 * (0.35 + sway);
    },
    sample(u, v, e) {
      if (u < -12.6 || u > 8.4) return false;
      const P = e.pal;
      const base = P.base as RGB;
      const tw = clamp((8 - u) / 20, 0, 1);
      const vv = v - e.amp * Math.sin(e.phase - u * 0.34) * tw * tw * 1.6;
      const av = Math.abs(vv);
      let hw = 0;
      if (u > 3.6) hw = 3.0 * Math.sqrt(Math.max(0, 1 - sq((u - 3.6) / 4.7)));
      else if (u > -8) hw = 0.75 + 2.25 * Math.pow((u + 8) / 11.6, 1.25);
      if (av < hw) {
        if (u > 5.5 && u < 6.9 && av > hw - 1.15 && av < hw - 0.2) return hit([22, 22, 26]);
        const n = vnoise(u * 0.3 + e.seed * 7, vv * 0.42, e.seed);
        let c = n > (P.thr as number) ? (P.patch as RGB) : base;
        if (P.dark && vnoise(u * 0.45, vv * 0.5 + 9, e.seed + 3) > 0.68) c = P.dark as RGB;
        const k = hw - av < 0.65 ? 0.78 : av < 0.5 ? 1.05 : 1;
        return hit(c, 1, 0.2, k);
      }
      const fin = mix(base, WHITE, 0.25);
      if (u > 0.2 && u < 3.4 && ell(u + (av - hw) * 0.45, av, 1.6, hw + 1.1, 1.3, 1.3) < 1) return hit(fin, 0.55);
      if (u <= -7.4) {
        const t = -7.4 - u;
        const fw = 0.55 + t * 0.72;
        if (av < fw && !(t > 3.7 && av < (t - 3.7) * 1.1)) return hit(fin, 0.62);
      }
      return false;
    },
  },
  {
    id: "jellyfish",
    label: "Jellyfish",
    swatch: [232, 56, 182],
    scale: 1.35,
    radius: 17,
    count: 9,
    speed: 3.2,
    turn: 0.6,
    phaseRate: 2.6,
    mode: "flow",
    direction: 0,
    spread: 0.12,
    trail: { chars: "°.o", color: [220, 120, 210], life: 1.4, at: [[-15, -2], [-15, 2]] },
    variants: [
      { bell: [232, 56, 182], core: [255, 172, 230], arm: [240, 112, 202] },
      { bell: [168, 78, 240], core: [226, 182, 255], arm: [190, 122, 250] },
      { bell: [255, 96, 142], core: [255, 192, 208], arm: [255, 132, 172] },
    ],
    prep(e) {
      const c = Math.pow(Math.max(0, Math.sin(e.phase)), 2);
      e.c = c;
      e.Rw = 5.4 * (1 - 0.2 * c);
      e.H = 4.6 * (1 + 0.18 * c);
      e.speedMod = 0.35 + 1.4 * c;
    },
    wobble(e, t) {
      return 0.18 * Math.sin(t * 0.4 + e.seed * 3);
    },
    sample(u, v, e) {
      const av = Math.abs(v);
      const P = e.pal;
      if (u >= -0.5) {
        const d = sq(Math.max(u, 0) / e.H) + sq(v / e.Rw);
        if (d < 1) {
          if (u < 0 && (Math.floor((v + 40) * 0.8) & 1) === 1) return false;
          const glow = 1 + 0.35 * e.c;
          if (d < 0.32) return hit(P.core as RGB, 0.95, 0.2, glow);
          if (d > 0.78) return hit(P.bell as RGB, 0.95, 0, 0.72 * glow);
          return hit(P.bell as RGB, 0.95, 0.15, glow);
        }
        return false;
      }
      const depth = -u;
      if (depth > 16) return false;
      const armW = 1.5 + 0.5 * Math.sin(e.phase * 0.8 + depth * 0.6);
      if (depth < 8.5 && av < armW * (1 - depth / 12)) return glyph("$§%&", P.arm as RGB, 0.95 - depth * 0.05);
      const pull = 1 - 0.12 * e.c;
      for (let k = -4.3; k <= 4.4; k += 2.15) {
        if (Math.abs(k) < 1) continue;
        const cx = k * pull + 0.9 * Math.sin(e.phase * 0.7 + depth * 0.42 + k) * (depth / 12);
        if (Math.abs(v - cx) < 0.6) return glyph("()|:", P.arm as RGB, 0.85 * (1 - depth / 16), 0.8);
      }
      return false;
    },
  },
];

export const ANIMAL_BY_ID = Object.fromEntries(ANIMALS.map((a) => [a.id, a])) as Record<AnimalId, Animal>;
export const ANIMAL_ORDER: AnimalId[] = ANIMALS.map((a) => a.id);
export const DEFAULT_ANIMAL: AnimalId = "dragonflies";

export function swatchCss(id: AnimalId) {
  const [r, g, b] = ANIMAL_BY_ID[id].swatch;
  return `rgb(${r},${g},${b})`;
}

/* ---------- renderer ---------- */

export interface AsciiAnimalsHandle {
  show(id: AnimalId): void;
  dispose(): void;
}

/**
 * Mount the scene on a canvas that covers the viewport. The canvas stays
 * transparent so the page background shows through.
 */
export function createAsciiAnimals(canvas: HTMLCanvasElement, initial: AnimalId, options: Partial<AsciiAnimalsConfig> = {}): AsciiAnimalsHandle {
  const cfg = { ...ASCII_ANIMALS_CONFIG, ...options };
  const ctx = canvas.getContext("2d", { alpha: true });
  const lo = document.createElement("canvas");
  const loCtx = lo.getContext("2d");
  if (!ctx || !loCtx) return { show() {}, dispose() {} };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const noHover = window.matchMedia("(hover: none)");
  const overlay = document.createElement("canvas");

  const R = { dpr: 1, W: 0, H: 0, cell: 9, cols: 0, rows: 0, line: 1, font: "" };
  let img: ImageData;
  let buf: Uint32Array;
  let occ: Int16Array;
  let tLife: Float32Array;
  let tChar: Uint8Array;
  let tCol: Uint8Array;

  let entities: Entity[] = [];
  let seedCounter = 1;
  let simTime = 0;
  let current: AnimalId = initial;
  const pointer = { x: -1e9, y: -1e9, active: false };
  const glyphs: (number | string)[] = [];
  let raf = 0;
  let last = 0;
  let disposed = false;

  const fontFamily = () =>
    cfg.fontFamily ??
    (getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || '"Space Mono", monospace');

  function pageBg() {
    const c = getComputedStyle(document.body).backgroundColor;
    return c && c !== "rgba(0, 0, 0, 0)" ? c : "rgb(10,10,10)";
  }

  function resize() {
    R.dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    R.W = Math.round(window.innerWidth * R.dpr);
    R.H = Math.round(window.innerHeight * R.dpr);
    R.cell = Math.max(4, Math.round(cfg.cell * R.dpr));
    R.line = Math.max(1, Math.round(R.dpr));
    R.cols = Math.ceil(R.W / R.cell) + 1;
    R.rows = Math.ceil(R.H / R.cell) + 1;
    canvas.width = R.W;
    canvas.height = R.H;
    lo.width = R.cols;
    lo.height = R.rows;
    img = loCtx!.createImageData(R.cols, R.rows);
    buf = new Uint32Array(img.data.buffer);
    const n = R.cols * R.rows;
    occ = new Int16Array(n);
    tLife = new Float32Array(n);
    tChar = new Uint8Array(n);
    tCol = new Uint8Array(n * 3);
    R.font = `700 ${Math.round(R.cell * 1.02)}px ${fontFamily()}`;
    // Grid lines in the page colour carve the filled cells into tiles.
    overlay.width = R.W;
    overlay.height = R.H;
    const g = overlay.getContext("2d")!;
    g.clearRect(0, 0, R.W, R.H);
    g.fillStyle = pageBg();
    g.globalAlpha = 0.94;
    for (let i = 0; i <= R.cols; i++) g.fillRect(i * R.cell, 0, R.line, R.H);
    for (let j = 0; j <= R.rows; j++) g.fillRect(0, j * R.cell, R.W, R.line);
    syncPopulation();
  }

  function scaleFor(e: Entity) {
    const far = 1 - cfg.depth * 0.62;
    return cfg.size * (e.A.scale || 1) * lerp(far, 1.12, e.z);
  }

  function makeEntity(A: Animal, fade = 0): Entity {
    const dirRad = ((A.direction - 90) * Math.PI) / 180;
    const e: Entity = {
      A,
      x: rand(0, R.W),
      y: rand(0, R.H),
      z: Math.pow(Math.random(), 0.85),
      seed: (seedCounter++ * 2654435761) >>> 16,
      pal: pick(A.variants),
      phase: rand(0, TAU),
      rateMul: rand(0.85, 1.15),
      speedMul: rand(0.75, 1.25),
      baseOff: rand(-1, 1),
      heading: 0,
      target: 0,
      retargetAt: 0,
      fade,
      leaving: false,
      speedMod: 1,
      phaseMod: 1,
      lastTrail: -1,
      trailFlip: 0,
      amp: 0,
      c: 0,
      Rw: 1,
      H: 1,
      beat: 1,
    };
    e.heading = e.target = dirRad + (A.mode === "flow" ? e.baseOff * Math.PI * A.spread * 0.35 : rand(-1, 1) * Math.PI * A.spread);
    return e;
  }

  function desiredCount(A: Animal) {
    const area = (window.innerWidth * window.innerHeight) / (1440 * 900);
    return Math.max(1, Math.round(A.count * cfg.density * clamp(area, 0.35, 2.2)));
  }

  function syncPopulation(initialFill = false) {
    const A = ANIMAL_BY_ID[current];
    const live = entities.filter((e) => !e.leaving && e.A === A);
    const want = desiredCount(A);
    if (live.length < want) {
      for (let i = live.length; i < want; i++) entities.push(makeEntity(A, initialFill ? 1 : 0));
    } else if (live.length > want) {
      live.slice(want).forEach((e) => (e.leaving = true));
    }
  }

  function show(id: AnimalId) {
    if (!ANIMAL_BY_ID[id] || id === current) return;
    current = id;
    entities.forEach((e) => (e.leaving = true));
    syncPopulation();
    kick();
  }

  function step(dt: number) {
    const motion = reducedMotion.matches ? 0.3 : 1;
    const sp = cfg.speed * motion;
    simTime += dt * motion;
    const t = simTime;

    for (const e of entities) {
      const A = e.A;
      const dirRad = ((A.direction - 90) * Math.PI) / 180;
      e.fade = e.leaving ? Math.max(0, e.fade - dt / 0.6) : Math.min(1, e.fade + dt / 0.9);
      e.speedMod = 1;
      e.phaseMod = 1;
      A.prep(e, cfg.sway, t);
      e.phase += dt * A.phaseRate * e.rateMul * e.phaseMod * (0.55 + 0.45 * sp);

      if (A.mode === "flow") {
        e.target = dirRad + e.baseOff * Math.PI * A.spread * 0.35 + (A.wobble ? A.wobble(e, t) * (0.4 + cfg.sway * 1.2) : 0);
      } else if (t >= e.retargetAt && A.retarget) {
        e.target = dirRad + rand(-1, 1) * Math.PI * A.spread;
        e.retargetAt = t + rand(A.retarget[0], A.retarget[1]);
      }

      let dx = Math.cos(e.target);
      let dy = Math.sin(e.target);
      const k = scaleFor(e);
      const reach = A.radius * k * R.cell;
      let boost = 1;
      let turnMul = 1;

      for (const o of entities) {
        if (o === e || o.leaving || Math.abs(o.z - e.z) > 0.35) continue;
        const ox = e.x - o.x;
        const oy = e.y - o.y;
        const d = Math.hypot(ox, oy);
        const lim = (reach + o.A.radius * scaleFor(o) * R.cell) * 0.75;
        if (d > 0 && d < lim) {
          const w = (1 - d / lim) * 1.6;
          dx += (ox / d) * w;
          dy += (oy / d) * w;
        }
      }

      if (A.hoverShy && pointer.active) {
        const px = e.x - pointer.x;
        const py = e.y - pointer.y;
        const d = Math.hypot(px, py);
        const lim = reach + 70 * R.dpr;
        if (d > 0 && d < lim) {
          const w = (1 - d / lim) * 2.5;
          dx += (px / d) * w;
          dy += (py / d) * w;
          boost *= 1 + (1 - d / lim) * 0.9;
          turnMul *= 1.8;
        }
      }

      const desired = Math.atan2(dy, dx);
      const turn = A.turn * turnMul * dt;
      e.heading += clamp(angleDiff(desired, e.heading), -turn, turn);

      const parallax = 0.55 + 0.45 * e.z;
      const v = A.speed * e.speedMul * e.speedMod * sp * parallax * boost * R.cell * k * 0.6;
      e.x += Math.cos(e.heading) * v * dt;
      e.y += Math.sin(e.heading) * v * dt;

      // wrap around, re-entering along the far edge
      const m = reach + 4 * R.cell;
      if (e.x < -m) {
        e.x = R.W + m;
        e.y = rand(0, R.H);
      } else if (e.x > R.W + m) {
        e.x = -m;
        e.y = rand(0, R.H);
      }
      if (e.y < -m) {
        e.y = R.H + m;
        e.x = rand(0, R.W);
      } else if (e.y > R.H + m) {
        e.y = -m;
        e.x = rand(0, R.W);
      }
    }
    entities = entities.filter((e) => !(e.leaving && e.fade <= 0));
  }

  function rasterize(e: Entity, order: number) {
    const A = e.A;
    const k = scaleFor(e);
    const cx = e.x / R.cell;
    const cy = e.y / R.cell;
    const rad = A.radius * k;
    const i0 = Math.max(0, Math.floor(cx - rad));
    const i1 = Math.min(R.cols - 1, Math.ceil(cx + rad));
    const j0 = Math.max(0, Math.floor(cy - rad));
    const j1 = Math.min(R.rows - 1, Math.ceil(cy + rad));
    if (i0 > i1 || j0 > j1) return;
    const cs = Math.cos(e.heading) / k;
    const sn = Math.sin(e.heading) / k;
    const bright = lerp(0.38, 1, e.z);
    const fade = e.fade;
    const tick = (simTime * 5) | 0;

    for (let j = j0; j <= j1; j++) {
      const dy = j + 0.5 - cy;
      for (let i = i0; i <= i1; i++) {
        const dx = i + 0.5 - cx;
        const u = dx * cs + dy * sn;
        const v = -dx * sn + dy * cs;
        if (!A.sample(u, v, e)) continue;
        const idx = j * R.cols + i;
        const a = out.a * fade;
        if (a <= 0.01) continue;
        if (out.ch) {
          const set = out.ch;
          const ch = set.length > 1 ? set[(hash2(i, j, e.seed + tick) * set.length) | 0] : set;
          glyphs.push(i, j, order, out.r * bright, out.g * bright, out.b * bright, a * (0.45 + 0.55 * bright), ch);
          continue;
        }
        const jit = 0.86 + 0.28 * hash2(i, j, e.seed);
        let r = out.r * jit;
        let g = out.g * jit;
        let b = out.b * jit;
        if (out.shine && hash2(i, j, e.seed ^ 77) < out.shine * 0.18) {
          r = lerp(r, 245, 0.65);
          g = lerp(g, 248, 0.65);
          b = lerp(b, 255, 0.65);
        }
        // Transparent canvas: alpha stands in for blending toward the page colour.
        const al = clamp(a * bright * 255, 0, 255) | 0;
        buf[idx] = (al << 24) | ((clamp(b, 0, 255) | 0) << 16) | ((clamp(g, 0, 255) | 0) << 8) | (clamp(r, 0, 255) | 0);
        if (a > 0.5) occ[idx] = order;
      }
    }
  }

  function emitTrails(e: Entity) {
    if (!cfg.trails || e.fade < 0.5) return;
    const tr = e.A.trail;
    const k = scaleFor(e);
    const c = Math.cos(e.heading);
    const s = Math.sin(e.heading);
    e.trailFlip = (e.trailFlip + 1) % tr.at.length;
    const [tu, tv] = tr.at[e.trailFlip];
    const i = Math.floor(e.x / R.cell + (tu * c - tv * s) * k);
    const j = Math.floor(e.y / R.cell + (tu * s + tv * c) * k);
    if (i < 0 || j < 0 || i >= R.cols || j >= R.rows) return;
    const idx = j * R.cols + i;
    if (idx === e.lastTrail) return;
    e.lastTrail = idx;
    if (Math.random() > 0.75) return;
    tLife[idx] = lerp(0.35, 0.9, e.z);
    tChar[idx] = (Math.random() * tr.chars.length) | 0;
    tCol[idx * 3] = tr.color[0];
    tCol[idx * 3 + 1] = tr.color[1];
    tCol[idx * 3 + 2] = tr.color[2];
  }

  function render(dt: number) {
    buf.fill(0);
    occ.fill(-1);
    glyphs.length = 0;
    const sorted = entities.slice().sort((a, b) => a.z - b.z);
    for (let n = 0; n < sorted.length; n++) {
      rasterize(sorted[n], n);
      emitTrails(sorted[n]);
    }
    loCtx!.putImageData(img, 0, 0);
    const c = ctx!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, R.W, R.H);
    c.imageSmoothingEnabled = false;
    c.drawImage(lo, 0, 0, R.cols * R.cell, R.rows * R.cell);
    c.drawImage(overlay, 0, 0);

    c.font = R.font;
    c.textAlign = "center";
    c.textBaseline = "middle";
    const half = R.cell / 2 + R.line / 2;

    const A = ANIMAL_BY_ID[current];
    const trailChars = A.trail.chars;
    const decay = dt / A.trail.life;
    for (let idx = 0; idx < tLife.length; idx++) {
      const l = tLife[idx];
      if (l <= 0) continue;
      const nl = l - decay;
      tLife[idx] = nl;
      if (nl <= 0.02 || occ[idx] >= 0) continue;
      const i = idx % R.cols;
      const j = (idx / R.cols) | 0;
      c.fillStyle = `rgba(${tCol[idx * 3]},${tCol[idx * 3 + 1]},${tCol[idx * 3 + 2]},${(nl * 0.55).toFixed(3)})`;
      c.fillText(trailChars[tChar[idx] % trailChars.length], i * R.cell + half, j * R.cell + half);
    }
    for (let g = 0; g < glyphs.length; g += 8) {
      const i = glyphs[g] as number;
      const j = glyphs[g + 1] as number;
      if (occ[j * R.cols + i] > (glyphs[g + 2] as number)) continue;
      c.fillStyle = `rgba(${(glyphs[g + 3] as number) | 0},${(glyphs[g + 4] as number) | 0},${(glyphs[g + 5] as number) | 0},${(glyphs[g + 6] as number).toFixed(3)})`;
      c.fillText(glyphs[g + 7] as string, i * R.cell + half, j * R.cell + half);
    }
  }

  function frame(now: number) {
    raf = 0;
    if (disposed || document.hidden) return;
    const dt = last ? clamp((now - last) / 1000, 0, 0.05) : 0.016;
    last = now;
    step(dt);
    render(dt);
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf && !disposed && !document.hidden) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  const onMove = (e: PointerEvent) => {
    if (noHover.matches) return;
    pointer.x = e.clientX * R.dpr;
    pointer.y = e.clientY * R.dpr;
    pointer.active = true;
  };
  const onLeave = () => (pointer.active = false);
  const onVisibility = () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else kick();
  };

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);

  resize();
  syncPopulation(true);
  kick();

  return {
    show,
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
