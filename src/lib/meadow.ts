/* ==========================================================================
   meadow.ts — a blue-flower meadow drawn as text. Every blade, stem, leaf
   and petal is a vector shape rasterised into a character grid each frame:
   cell brightness picks a glyph from the ramp, the cell keeps its colour.
   Plants carry a depth (0 far … 1 near) that sets size, position, brightness
   and draw order. Plain TypeScript, no dependencies. React wrapper:
   components/Meadow.tsx.
   ========================================================================== */

export const MEADOW_CONFIG = {
  // Font size in CSS px (cell height); cell width follows the font's advance.
  fontSize: 7,
  fontSizeMobile: 6,
  // Density ramp, dim → bright.
  ramp: " .:-=+*#%@",
  // Horizon as a fraction of the height. Grass and flowers fill everything below it.
  horizon: 0.42,
  // Grass blades and flowers per 1000px of width; clamped to the ranges below.
  bladesPer1000: 380,
  bladesRange: [300, 450] as [number, number],
  flowersPer1000: 44,
  flowersRange: [50, 70] as [number, number],
  // Atmospheric fade applied to the farthest plants (0 none … 1 vanish).
  fade: 0.45,
  // Growth timing in seconds: grass first, then flowers in a front-to-back wave.
  grassGrow: 1.6,
  flowerStart: 1.2,
  flowerWave: 2.2,
  flowerStagger: 0.8,
  flowerGrow: 2.4,
  // Breeze: travelling wave speed/length and the gust period.
  windSpeed: 0.9,
  windLength: 2.6,
  windAmount: 0.09,
  gustEvery: 9,
  gustAmount: 0.22,
  // Faint sky stars per cell above the horizon.
  starDensity: 0.012,
  // Stable layout seed.
  seed: 7,
  // Frame-rate cap while animating.
  maxFps: 30,
  // Cap on devicePixelRatio.
  maxDpr: 2,
  // Canvas font. null reads the site's --font-mono token.
  fontFamily: null as string | null,
};

export type MeadowConfig = typeof MEADOW_CONFIG;

type RGB = [number, number, number];
const BG: RGB = [12, 12, 12];

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const TAU = Math.PI * 2;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(i: number, j: number) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ---------- species ---------- */

export type Species = "delphinium" | "aster" | "agapanthus" | "thistle" | "anemone" | "aquilegia" | "seaholly";
export const SPECIES: Species[] = ["delphinium", "aster", "agapanthus", "thistle", "anemone", "aquilegia", "seaholly"];

// relative stem heights (× ground-band height at depth 1) and head sizes (px at depth 1, 1000px wide)
const SPEC: Record<Species, { h: number; r: number; weight: number; flex: number }> = {
  delphinium: { h: 1.5, r: 18, weight: 1, flex: 0.9 },
  aster: { h: 0.95, r: 60, weight: 1.3, flex: 1 },
  agapanthus: { h: 1.15, r: 64, weight: 1, flex: 0.8 },
  thistle: { h: 1.0, r: 42, weight: 1, flex: 0.7 },
  anemone: { h: 0.6, r: 52, weight: 1.2, flex: 1.1 },
  aquilegia: { h: 0.9, r: 46, weight: 1, flex: 1.2 },
  seaholly: { h: 0.85, r: 40, weight: 0.9, flex: 0.7 },
};

interface Blade {
  x: number;
  d: number;
  front?: boolean;
  len: number;
  lean: number;
  bend: number;
  g: number; // colour variation
  t0: number;
}

interface Flower {
  sp: Species;
  x: number;
  d: number;
  h: number; // stem height px
  r: number; // head size px
  t0: number;
  seed: number;
  lean: number;
  leaves: number;
  n: number; // florets
  jitter: number[];
  order: number[]; // floret pop order
}

/* ---------- renderer ---------- */

export function createMeadow(canvas: HTMLCanvasElement, options: Partial<MeadowConfig> = {}) {
  const cfg = { ...MEADOW_CONFIG, ...options };
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};
  const parent = canvas.parentElement ?? canvas;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let W = 0, Hh = 0, dpr = 1, cols = 0, rows = 0, cellW = 5, cellH = 8, font = "";
  let size = 1; // global scale (width / 1000)
  let I = new Float32Array(0);
  let CR = new Uint8Array(0), CG = new Uint8Array(0), CB = new Uint8Array(0);
  let CH = new Uint8Array(0); // stroke glyph code (0 = pick from the density ramp)
  let blades: Blade[] = [];
  let flowers: Flower[] = [];
  let raf = 0, lastNow = 0, start = 0, intersecting = true, disposed = false, resizeTimer = 0;

  const fontFamily = () =>
    cfg.fontFamily ??
    (getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || '"Space Mono", monospace');

  function layout() {
    const rect = parent.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    Hh = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    const mobile = window.innerWidth < 768;
    const fs = mobile ? cfg.fontSizeMobile : cfg.fontSize;
    font = `${fs}px ${fontFamily()}`;
    ctx!.font = font;
    cellW = ctx!.measureText("M").width || fs * 0.6;
    cellH = fs;
    cols = Math.ceil(W / cellW);
    rows = Math.ceil(Hh / cellH);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hh * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${Hh}px`;
    const n = cols * rows;
    I = new Float32Array(n);
    CR = new Uint8Array(n);
    CG = new Uint8Array(n);
    CB = new Uint8Array(n);
    CH = new Uint8Array(n);
    size = clamp(W / 1000, 0.55, 1.25);
    plant();
  }

  /* ---- layout of the field (seeded, stable) ---- */

  function plant() {
    const rnd = mulberry32(cfg.seed);
    const yH = Hh * cfg.horizon;
    const G = Hh - yH;
    const nb = clamp(Math.round((cfg.bladesPer1000 * W) / 1000), cfg.bladesRange[0], cfg.bladesRange[1]);
    blades = [];
    for (let i = 0; i < nb; i++) {
      const d = Math.pow(rnd(), 0.6);
      blades.push({
        x: rnd() * W,
        d,
        len: lerp(0.1, 0.8, d) * G * lerp(0.6, 1.25, rnd()),
        lean: (rnd() - 0.5) * 1.1,
        bend: 0.4 + rnd() * 0.9,
        g: rnd(),
        t0: rnd() * cfg.grassGrow * 0.7,
      });
    }
    // a few tall near blades in the very front
    for (let i = 0; i < 6 + Math.round(nb / 60); i++) {
      blades.push({ x: rnd() * W, d: 1, front: true, len: G * lerp(0.85, 1.15, rnd()), lean: (rnd() - 0.5) * 1.2, bend: 0.6 + rnd() * 0.6, g: rnd(), t0: cfg.grassGrow * 0.5 + rnd() * 0.4 });
    }
    const nf = clamp(Math.round((cfg.flowersPer1000 * W) / 1000), cfg.flowersRange[0], cfg.flowersRange[1]);
    const totalW = SPECIES.reduce((a, s) => a + SPEC[s].weight, 0);
    flowers = [];
    for (let i = 0; i < nf; i++) {
      let pickV = rnd() * totalW;
      let sp: Species = "aster";
      for (const s of SPECIES) {
        pickV -= SPEC[s].weight;
        if (pickV <= 0) {
          sp = s;
          break;
        }
      }
      const d = Math.pow(rnd(), 1.5);
      const sc = lerp(0.22, 1, d) * size;
      const lod = lerp(0.4, 1, d); // fewer petals on small far heads
      const n = sp === "agapanthus" ? Math.round(30 * lod) : sp === "delphinium" ? 10 + Math.round(rnd() * 2) : sp === "aster" ? Math.round(22 * lod) : sp === "thistle" ? Math.round(44 * lod) : 0;
      const jitter: number[] = [];
      for (let k = 0; k < 64; k++) jitter.push(rnd());
      const order = Array.from({ length: n }, (_, k) => k).sort(() => rnd() - 0.5);
      flowers.push({
        sp,
        x: rnd() * W,
        d,
        h: SPEC[sp].h * G * lerp(0.35, 1, d) * lerp(0.8, 1.15, rnd()),
        r: SPEC[sp].r * sc * lerp(0.85, 1.15, rnd()),
        t0: cfg.flowerStart + (1 - d) * cfg.flowerWave + rnd() * cfg.flowerStagger,
        seed: Math.floor(rnd() * 1e6),
        lean: (rnd() - 0.5) * 0.3,
        leaves: 2 + Math.floor(rnd() * 2),
        n,
        jitter,
        order,
      });
    }
    // draw far → near
    blades.sort((a, b) => a.d - b.d);
    flowers.sort((a, b) => a.d - b.d);
  }

  /* ---- plotting primitives ---- */

  let depthK = 1; // current plant depth brightness factor
  let depthFade = 0; // current mix toward background

  function setDepth(d: number) {
    depthK = lerp(1 - cfg.fade, 1, d);
    depthFade = (1 - d) * cfg.fade;
  }

  function plot(x: number, y: number, c: RGB, inten: number, ch = 0) {
    const ci = (x / cellW) | 0;
    const cj = (y / cellH) | 0;
    if (ci < 0 || cj < 0 || ci >= cols || cj >= rows) return;
    const idx = cj * cols + ci;
    const v = inten * depthK;
    if (v < 0.03) return;
    if (v >= 0.3 || v > I[idx]) {
      I[idx] = v;
      CR[idx] = lerp(c[0], BG[0], depthFade);
      CG[idx] = lerp(c[1], BG[1], depthFade);
      CB[idx] = lerp(c[2], BG[2], depthFade);
      CH[idx] = ch;
    }
  }

  /** Stroke glyph for a direction: | for upright, / \ for diagonals, - for flat. */
  function strokeChar(dx: number, dy: number) {
    const ax = Math.abs(dx) / cellW, ay = Math.abs(dy) / cellH; // in cell units so the font's aspect counts
    if (ay > ax * 2.2) return 124; // |
    if (ax > ay * 2.2) return 45; // -
    return dx * dy < 0 ? 47 : 92; // /  or  \  (screen y points down)
  }

  function line(x0: number, y0: number, x1: number, y1: number, c: RGB, i0: number, i1: number, w = 0, fixed = 0) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(len / (cellW * 0.45)));
    const nx = -(y1 - y0) / (len || 1), ny = (x1 - x0) / (len || 1);
    const ch = fixed || strokeChar(x1 - x0, y1 - y0);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const it = i0 + (i1 - i0) * t;
      plot(x, y, c, it, ch);
      if (w > 0) {
        plot(x + nx * w, y + ny * w, c, it * 0.85, ch);
        plot(x - nx * w, y - ny * w, c, it * 0.85, ch);
      }
    }
  }

  /** Quadratic curve from p0 via control c to p1 with a tapering intensity. */
  function curve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, c: RGB, i0: number, i1: number, w = 0, prog = 1, fixed = 0) {
    const approx = Math.hypot(cx - x0, cy - y0) + Math.hypot(x1 - cx, y1 - cy);
    const steps = Math.max(2, Math.ceil((approx * prog) / (cellW * 0.45)));
    let px = x0, py = y0;
    for (let s = 1; s <= steps; s++) {
      const t = (s / steps) * prog;
      const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
      const x = a * x0 + b * cx + d * x1, y = a * y0 + b * cy + d * y1;
      line(px, py, x, y, c, i0 + (i1 - i0) * (t - 1 / steps), i0 + (i1 - i0) * t, w * (1 - t * 0.7), fixed);
      px = x;
      py = y;
    }
  }

  /** Filled ellipse centred at (x,y), radii rx/ry, rotated by rot; shade(u, nx, ny) gives intensity by normalised radius. */
  function ellipse(x: number, y: number, rx: number, ry: number, rot: number, c: RGB, shade: (u: number, lx: number, ly: number) => number, seed = 0, c2?: RGB, c2u = 0) {
    if (rx < 0.3 || ry < 0.3) return;
    if (rx < cellW * 0.9 && ry < cellH * 0.9) {
      plot(x, y, c, shade(0.3, 0, 0));
      return;
    }
    const R = Math.max(rx, ry);
    const i0 = Math.max(0, Math.floor((x - R) / cellW)), i1 = Math.min(cols - 1, Math.ceil((x + R) / cellW));
    const j0 = Math.max(0, Math.floor((y - R) / cellH)), j1 = Math.min(rows - 1, Math.ceil((y + R) / cellH));
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let j = j0; j <= j1; j++) {
      const py = (j + 0.5) * cellH - y;
      for (let i = i0; i <= i1; i++) {
        const px = (i + 0.5) * cellW - x;
        const lx = (px * cr + py * sr) / rx, ly = (-px * sr + py * cr) / ry;
        const u2 = lx * lx + ly * ly;
        if (u2 > 1) continue;
        const u = Math.sqrt(u2);
        const nz = hash2(i * 31 + seed, j * 17 + seed);
        const it = shade(u, lx, ly) * (0.9 + 0.36 * nz);
        plot((i + 0.5) * cellW, (j + 0.5) * cellH, c2 && u > c2u ? c2 : c, it);
      }
    }
  }

  /* ---- wind ---- */

  function wind(x: number, t: number) {
    const base = Math.sin(t * cfg.windSpeed * TAU * 0.35 - (x / W) * cfg.windLength * TAU * 0.5) * cfg.windAmount;
    const gt = (t % cfg.gustEvery) / cfg.gustEvery; // 0..1 within the gust period
    const cx = (gt * 1.8 - 0.4) * W; // gust front rolls left → right
    const env = gt < 0.75 ? Math.exp(-Math.pow((x - cx) / (0.22 * W), 2)) : 0;
    return base + env * cfg.gustAmount * (0.6 + 0.4 * Math.sin(t * 5 + x * 0.02));
  }

  /* ---- plants ---- */

  const GRASS_FAR: RGB = [60, 110, 55];
  const GRASS_NEAR: RGB = [120, 210, 95];
  const STEM: RGB = [96, 170, 86];
  const LEAF: RGB = [84, 160, 80];

  function drawBlade(b: Blade, t: number, yH: number) {
    const prog = reducedMotion.matches ? 1 : easeOut((t - b.t0) / (cfg.grassGrow * 0.6));
    if (prog <= 0) return;
    setDepth(b.d);
    const base = yH + b.d * (Hh - yH);
    const sway = wind(b.x, t) * (1.4 - b.d * 0.4);
    const len = b.len * prog;
    const tipX = b.x + (b.lean + sway) * len;
    const col = mix(GRASS_FAR, GRASS_NEAR, b.d * 0.8 + b.g * 0.2);
    const ch = strokeChar((tipX - b.x) * 0.7, -len);
    curve(b.x, base, b.x + (b.lean + sway) * len * 0.3 * b.bend, base - len * 0.62, tipX, base - len, col, 0.95, 0.5, b.front ? cellW * 0.45 : 0, 1, ch);
  }

  // stem geometry shared by flowers: returns tip and the tilt angle there
  const stemOut = { tx: 0, ty: 0, ang: 0, cx: 0, cy: 0, base: 0 };
  function stem(f: Flower, t: number, yH: number, prog: number, extraBend = 0) {
    const base = yH + f.d * (Hh - yH);
    const sway = wind(f.x, t) * SPEC[f.sp].flex + f.lean;
    const h = f.h * prog;
    const bendX = (sway + extraBend) * h;
    const tx = f.x + bendX, ty = base - h + Math.abs(bendX) * 0.12;
    stemOut.tx = tx;
    stemOut.ty = ty;
    stemOut.cx = f.x + bendX * 0.15;
    stemOut.cy = base - h * 0.55;
    stemOut.base = base;
    stemOut.ang = Math.atan2(bendX, h || 1); // lean from vertical, + = right
    return stemOut;
  }

  function drawLeaves(f: Flower, s: typeof stemOut, prog: number, strap = false) {
    const n = f.leaves + (strap ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const jx = f.jitter[k * 3], jy = f.jitter[k * 3 + 1];
      const side = k % 2 ? 1 : -1;
      const at = strap ? 0.02 : 0.12 + jy * 0.3; // fraction up the stem
      const ax = f.x + (s.tx - f.x) * at * at, ay = s.base - (s.base - s.ty) * at;
      const L = (strap ? 0.55 : 0.32) * f.h * lerp(0.7, 1.1, jx) * prog;
      const w = strap ? cellW * 0.5 : cellW * 0.35;
      curve(ax, ay, ax + side * L * 0.55, ay - L * (strap ? 0.55 : 0.35), ax + side * L, ay - L * (strap ? 0.05 : 0.15) + L * 0.25 * (1 - prog), LEAF, 0.9, 0.35, w, 1);
    }
  }

  const V: RGB = [132, 112, 246]; // blue-violet
  const V_D: RGB = [96, 82, 200];
  const PALE: RGB = [222, 222, 255];

  function drawFlower(f: Flower, t: number, yH: number) {
    const p = reducedMotion.matches ? 1 : (t - f.t0) / cfg.flowerGrow;
    if (p <= 0) return;
    setDepth(f.d);
    const pStem = easeOut(p / 0.45);
    const pLeaf = ease((p - 0.2) / 0.4);
    const pBud = ease((p - 0.45) / 0.25);
    const open = ease((p - 0.65) / 0.35);
    const sp = f.sp;
    const r = f.r;
    const nod = sp === "aquilegia" ? 0.22 * pStem : 0;
    const s = stem(f, t, yH, pStem, nod);
    const stemCol = sp === "thistle" || sp === "seaholly" ? ([128, 168, 140] as RGB) : STEM;
    curve(f.x, s.base, s.cx, s.cy, s.tx, s.ty, stemCol, 0.9, 0.7, f.d > 0.6 ? cellW * 0.3 : 0);
    if (sp === "agapanthus") drawLeaves(f, s, pLeaf, true);
    else if (pLeaf > 0) drawLeaves(f, s, pLeaf);
    if (pBud <= 0) return;
    const tilt = s.ang * 0.5;
    const flutter = Math.sin(t * 3 + f.seed) * 0.03;
    const X = (lx: number, ly: number) => s.tx + lx * Math.cos(tilt) - ly * Math.sin(tilt);
    const Y = (lx: number, ly: number) => s.ty + lx * Math.sin(tilt) + ly * Math.cos(tilt);
    const bud = (bx: number, by: number, rr: number, c: RGB) => ellipse(bx, by, rr * 0.55, rr, tilt, c, (u) => 0.9 - 0.4 * u, f.seed);
    const petalShade = (u: number) => 0.55 + 0.45 * (1 - u);

    switch (sp) {
      case "aster": {
        if (open <= 0) {
          bud(s.tx, s.ty, r * 0.35 * pBud, [70, 120, 70]);
          return;
        }
        const R = r * open;
        const rd = r * 0.24;
        const petal: RGB = [166, 174, 250];
        for (let k = 0; k < f.n; k++) {
          const a = (k / f.n) * TAU + f.jitter[k % 64] * 0.12 + flutter + tilt;
          const len = R * lerp(0.85, 1, f.jitter[(k + 7) % 64]);
          const mx = Math.cos(a) * (rd + len) * 0.5, my = Math.sin(a) * (rd + len) * 0.5;
          ellipse(s.tx + mx, s.ty + my, (len - rd) * 0.5 + rd * 0.3, Math.max(cellH * 0.32, r * 0.055), a, petal, (u, lx) => 0.5 + 0.45 * (lx * 0.5 + 0.5), f.seed + k);
        }
        ellipse(s.tx, s.ty, rd, rd * 0.85, tilt, [232, 190, 60], (u) => 0.65 + 0.35 * (1 - u * u), f.seed + 99);
        return;
      }
      case "anemone": {
        if (open <= 0) {
          bud(s.tx, s.ty, r * 0.4 * pBud, [50, 70, 150]);
          return;
        }
        const R = r * open;
        const cob: RGB = [72, 112, 244];
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU + Math.PI / 6 + flutter + tilt;
          ellipse(s.tx + Math.cos(a) * R * 0.52, s.ty + Math.sin(a) * R * 0.52, R * 0.55, R * 0.4, a, cob, (u, lx) => 0.5 + 0.5 * (lx * 0.5 + 0.5) * (1 - u * 0.3), f.seed + k);
        }
        ellipse(s.tx, s.ty, R * 0.26, R * 0.24, tilt, [14, 20, 66], () => 0.9, f.seed);
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * TAU + flutter;
          plot(s.tx + Math.cos(a) * R * 0.34, s.ty + Math.sin(a) * R * 0.32, [90, 110, 190], 0.8);
        }
        return;
      }
      case "delphinium": {
        // spike up the top half of the stem; florets alternate sides; opens bottom → top
        const n = f.n;
        const h = s.base - s.ty;
        for (let k = 0; k < n; k++) {
          const frac = 0.5 + (0.5 * k) / (n - 1);
          const local = clamp((open * 1.3 - k / n) / 0.3, 0, 1); // opening wave
          const side = k % 2 ? 1 : -1;
          const sx = f.x + (s.tx - f.x) * frac * frac, sy = s.base - h * frac;
          const ox = side * r * 0.9, oy = 0;
          const px = sx + ox * Math.cos(tilt) - oy * Math.sin(tilt), py = sy + ox * Math.sin(tilt);
          line(sx, sy, px, py, STEM, 0.6, 0.6);
          if (k >= n - 2 || local <= 0) {
            if (pBud > 0) bud(px, py, r * 0.55 * pBud, V_D);
            continue;
          }
          const fr = r * local;
          for (let q = 0; q < 5; q++) {
            const a = (q / 5) * TAU + side * 0.3 + flutter;
            ellipse(px + Math.cos(a) * fr * 0.55, py + Math.sin(a) * fr * 0.55, fr * 0.6, fr * 0.4, a, V, petalShade, f.seed + k * 5 + q);
          }
          plot(px, py, PALE, 0.95);
          plot(px + cellW, py, PALE, 0.7);
        }
        return;
      }
      case "agapanthus": {
        if (pBud > 0 && open <= 0) {
          bud(s.tx, s.ty, r * 0.4 * pBud, [60, 90, 170]);
          return;
        }
        const R = r;
        const N = f.n;
        const fl: RGB = [116, 136, 248];
        const ped: RGB = [110, 150, 110];
        // fibonacci sphere; back half first
        const pts: [number, number, number, number][] = [];
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let k = 0; k < N; k++) {
          const yk = 1 - (k / (N - 1)) * 2;
          const rk = Math.sqrt(1 - yk * yk);
          const th = golden * k + t * 0.05;
          pts.push([Math.cos(th) * rk, yk, Math.sin(th) * rk, k]);
        }
        pts.sort((a, b) => a[2] - b[2]);
        for (const [x, y, z, k] of pts) {
          const pop = clamp((open * N * 1.25 - f.order[k]) / 3, 0, 1);
          if (pop <= 0) continue;
          const dim = 0.5 + 0.5 * (z + 1) * 0.5;
          const ex = X(x * R * pop, -y * R * pop), ey = Y(x * R * pop, -y * R * pop);
          line(s.tx, s.ty, ex, ey, ped, 0.45 * dim, 0.6 * dim);
          const tx2 = X(x * R * 1.3 * pop, -y * R * 1.3 * pop), ty2 = Y(x * R * 1.3 * pop, -y * R * 1.3 * pop);
          line(ex, ey, tx2, ty2, fl, 0.9 * dim, 1.0 * dim, cellW * 0.4);
        }
        return;
      }
      case "thistle": {
        const R = r * lerp(0.35, 1, open) * pBud;
        if (R <= 0) return;
        const ball: RGB = [122, 158, 208];
        ellipse(s.tx, s.ty, R, R, 0, ball, (u, lx, ly) => 0.45 + 0.4 * (1 - u) + 0.25 * (-lx * 0.4 - ly * 0.6), f.seed);
        for (let k = 0; k < f.n; k++) {
          const a = (k / f.n) * TAU + flutter;
          const L = R * lerp(1.0, 1.25, f.jitter[k % 64]);
          line(s.tx + Math.cos(a) * R * 0.85, s.ty + Math.sin(a) * R * 0.85, s.tx + Math.cos(a) * L, s.ty + Math.sin(a) * L, [150, 176, 212], 0.9, 0.35);
        }
        return;
      }
      case "aquilegia": {
        if (open <= 0) {
          bud(s.tx, s.ty, r * 0.45 * pBud, [80, 70, 160]);
          return;
        }
        const R = r * open;
        const down = Math.PI / 2 + tilt; // nodding head points down
        const sep: RGB = [138, 128, 246];
        for (let k = 0; k < 5; k++) {
          const a = down + (k - 2) * 0.72 + flutter;
          ellipse(s.tx + Math.cos(a) * R * 0.55, s.ty + Math.sin(a) * R * 0.55, R * 0.55, R * 0.18, a, sep, (u, lx) => 0.5 + 0.5 * (1 - Math.abs(lx)) + 0.2 * lx, f.seed + k);
          line(s.tx + Math.cos(a) * R, s.ty + Math.sin(a) * R, s.tx + Math.cos(a) * R * 1.18, s.ty + Math.sin(a) * R * 1.18, sep, 0.6, 0.2);
        }
        for (let k = 0; k < 5; k++) {
          const a = down + (k - 2) * 0.72 + 0.36 + flutter;
          ellipse(s.tx + Math.cos(a) * R * 0.32, s.ty + Math.sin(a) * R * 0.32, R * 0.3, R * 0.16, a, [120, 120, 235], (u, lx) => 0.6 + 0.4 * lx, f.seed + 9 + k, [240, 240, 255], 0.72);
        }
        for (let k = 0; k < 5; k++) {
          const a = down + Math.PI + (k - 2) * 0.5; // spurs curve back up behind the head
          const ex = s.tx + Math.cos(a) * R * 0.9, ey = s.ty + Math.sin(a) * R * 0.9;
          curve(s.tx, s.ty, s.tx + Math.cos(a + 0.5) * R * 0.6, s.ty + Math.sin(a + 0.5) * R * 0.6, ex, ey, [100, 92, 200], 0.6, 0.35);
        }
        return;
      }
      case "seaholly": {
        if (pBud <= 0) return;
        const heads: [number, number, number][] = [[s.tx, s.ty, 1]];
        const bl = f.h * 0.3 * pStem;
        for (const side of [-1, 1]) {
          const a = -Math.PI / 2 + side * 0.6 + tilt;
          const bx = s.cx + (s.tx - s.cx) * 0.6, by = s.cy + (s.ty - s.cy) * 0.6;
          const hx = bx + Math.cos(a) * bl, hy = by + Math.sin(a) * bl;
          curve(bx, by, bx + Math.cos(a) * bl * 0.5 + side * bl * 0.15, by + Math.sin(a) * bl * 0.5, hx, hy, stemCol, 0.8, 0.7);
          heads.push([hx, hy, 0.78]);
        }
        for (const [hx, hy, k] of heads) {
          const R = r * k * lerp(0.4, 1, open) * pBud;
          const bract: RGB = [150, 182, 232];
          for (let q = 0; q < 9; q++) {
            const a = (q / 9) * TAU + flutter;
            const L = R * 0.95 * lerp(0.85, 1.1, f.jitter[q]);
            const ex = hx + Math.cos(a) * L, ey = hy + Math.sin(a) * L;
            line(hx, hy, ex, ey, bract, 0.75, 0.3, cellW * 0.25);
            // jagged side spikes
            const mx = hx + Math.cos(a) * L * 0.6, my = hy + Math.sin(a) * L * 0.6;
            line(mx, my, mx + Math.cos(a + 0.7) * L * 0.25, my + Math.sin(a + 0.7) * L * 0.25, bract, 0.5, 0.2);
          }
          ellipse(hx, hy - R * 0.25, R * 0.34, R * 0.55, tilt, [74, 112, 196], (u, lx, ly) => 0.5 + 0.35 * (1 - u) + 0.25 * (-lx * 0.5 - ly * 0.5), f.seed + Math.round(hx), [190, 210, 240], 0.9);
        }
        return;
      }
    }
  }

  /* ---- frame ---- */

  function render(t: number) {
    I.fill(0);
    const yH = Hh * cfg.horizon;
    // sky stars
    const skyRows = Math.floor(yH / cellH);
    depthK = 1;
    depthFade = 0;
    for (let j = 0; j < skyRows; j++) {
      for (let i = 0; i < cols; i++) {
        const h = hash2(i + 1000, j + 7);
        if (h < cfg.starDensity) {
          const tw = 0.1 + 0.12 * hash2(i, j) + 0.06 * Math.sin(t * (0.5 + h * 60) + i);
          const idx = j * cols + i;
          I[idx] = tw;
          CR[idx] = CG[idx] = CB[idx] = 190;
          CH[idx] = 0;
        }
      }
    }
    for (const b of blades) if (!b.front) drawBlade(b, t, yH);
    for (const f of flowers) drawFlower(f, t, yH);
    for (const b of blades) if (b.front) drawBlade(b, t, yH); // a few tall front blades overlap the blooms
    draw();
  }

  function draw() {
    const c = ctx!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, Hh);
    c.font = font;
    c.textBaseline = "middle";
    c.textAlign = "left";
    const ramp = cfg.ramp;
    const rm = ramp.length - 1;
    const GAP = 4; // cells of gap a run may bridge with spaces before it is split
    // one string per (colour, run); colour keys quantised to 4 bits per channel
    const runs = new Map<number, string[]>();
    const keyOf = new Int32Array(cols);
    for (let j = 0; j < rows; j++) {
      const base = j * cols;
      const y = (j + 0.5) * cellH;
      const lastAt = new Map<number, number>();
      const open = new Map<number, { x: number; s: string }>();
      for (let i = 0; i < cols; i++) {
        const idx = base + i;
        const v = I[idx];
        if (v < 0.03) {
          keyOf[i] = -1;
          continue;
        }
        const k = 0.6 + 0.4 * Math.min(1, v);
        keyOf[i] = ((((CR[idx] * k) | 0) >> 4) << 8) | ((((CG[idx] * k) | 0) >> 4) << 4) | (((CB[idx] * k) | 0) >> 4);
      }
      for (let i = 0; i < cols; i++) {
        const key = keyOf[i];
        if (key < 0) continue;
        const idx = base + i;
        const glyph = CH[idx] ? String.fromCharCode(CH[idx]) : ramp[Math.max(1, Math.round(Math.min(1, I[idx]) * rm))];
        const prev = lastAt.get(key);
        let run = open.get(key);
        if (run && prev !== undefined && i - prev <= GAP) {
          run.s += " ".repeat(i - prev - 1) + glyph;
        } else {
          if (run) {
            let list = runs.get(key);
            if (!list) runs.set(key, (list = []));
            list.push(`${run.x}|${y}|${run.s}`);
          }
          run = { x: i, s: glyph };
          open.set(key, run);
        }
        lastAt.set(key, i);
      }
      for (const [key, run] of open) {
        let list = runs.get(key);
        if (!list) runs.set(key, (list = []));
        list.push(`${run.x}|${y}|${run.s}`);
      }
    }
    for (const [key, list] of runs) {
      const r = ((key >> 8) & 15) << 4, g = ((key >> 4) & 15) << 4, b = (key & 15) << 4;
      c.fillStyle = `rgb(${r},${g},${b})`;
      for (const item of list) {
        const a = item.indexOf("|"), b2 = item.indexOf("|", a + 1);
        c.fillText(item.slice(b2 + 1), Number(item.slice(0, a)) * cellW, Number(item.slice(a + 1, b2)));
      }
    }
  }

  /* ---- loop ---- */

  function running() {
    return !disposed && intersecting && !document.hidden;
  }

  function frame(now: number) {
    raf = 0;
    if (!running()) return;
    if (lastNow && now - lastNow < 1000 / cfg.maxFps - 1) {
      raf = requestAnimationFrame(frame);
      return;
    }
    lastNow = now;
    const t = (now - start) / 1000;
    render(t);
    raf = requestAnimationFrame(frame);
  }

  function schedule() {
    stop();
    if (!running()) return;
    if (reducedMotion.matches) {
      render(1000);
      return;
    }
    if (!start) start = performance.now();
    lastNow = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const onVisibility = () => (document.hidden ? stop() : schedule());
  const ro = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      layout();
      schedule();
    }, 120);
  });
  ro.observe(parent);
  const io = new IntersectionObserver(
    (entries) => {
      intersecting = entries.some((e) => e.isIntersecting);
      if (intersecting) schedule();
      else stop();
    },
    { threshold: 0 }
  );
  io.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  reducedMotion.addEventListener("change", schedule);
  if ("fonts" in document) {
    document.fonts.load(`${cfg.fontSize}px ${fontFamily()}`).then(() => {
      if (disposed) return;
      layout();
      schedule();
    });
  }

  layout();
  schedule();

  return () => {
    disposed = true;
    stop();
    window.clearTimeout(resizeTimer);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    reducedMotion.removeEventListener("change", schedule);
  };
}
