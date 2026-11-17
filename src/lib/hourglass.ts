/* ==========================================================================
   hourglass.ts — a spinning 3D ASCII hourglass. Plain TypeScript, no 3D
   library: every cell casts an orthographic ray and raymarches a scene of
   signed distance functions (caps, rings, turned pillars, a glass shell of
   revolution, volume-accurate sand), then brightness picks a character.
   The React wrapper is components/Hourglass.tsx.
   ========================================================================== */

export type Timescale = "hour" | "day" | "countdown";

export const HOURGLASS_CONFIG = {
  // Character grid on desktop and under 768px.
  cols: 96,
  rows: 66,
  colsMobile: 64,
  rowsMobile: 44,
  // Font size in CSS px (cell height). Cell width follows the font's advance.
  fontSize: 10,
  fontSizeMobile: 8,
  // Density ramp, dark → bright.
  ramp: " .'`,:;-~=+*#%&$@",
  // Spin around the vertical axis, radians per second.
  rotationSpeed: 0.5,
  // Camera tilt below horizontal, degrees.
  cameraTilt: 14,
  // Light direction (towards the light), upper-left front.
  light: [-0.5, 0.6, 0.65] as [number, number, number],
  // Glass Fresnel rim strength (edges bright, centre faint).
  rimStrength: 0.9,
  // Opacity buckets for the text colour, dim → bright.
  opacityBuckets: [0.3, 0.5, 0.72, 1] as number[],
  // Accent for the falling stream. null reads the site's --accent token.
  accent: null as string | null,
  // Orbiting particles in the trail.
  particleCount: 150,
  // What the sand measures: the current hour, the current day, or a countdown.
  timescale: "hour" as Timescale,
  // Target for the "countdown" timescale (Date or ISO string).
  countdownTo: null as string | Date | null,
  // Flip animation length at the top of each period, seconds.
  flipDuration: 0.9,
  // Frame-rate cap while spinning. Raymarching is CPU work; 30 keeps laptops cool.
  maxFps: 30,
  // Cap on devicePixelRatio.
  maxDpr: 2,
  // Canvas font. null reads the site's --font-mono token.
  fontFamily: null as string | null,
};

export type HourglassConfig = typeof HOURGLASS_CONFIG;

export interface HourglassStats {
  rotationDeg: number;
  left: string; // "MM:SS" style
  leftLabel: string; // "LEFT THIS HOUR"
  glints: number;
}

/* ---------- geometry constants (object space, y up) ---------- */

const H = 0.95; // glass half-height
const CAP_T = 0.09; // cap plate thickness
const PLATE_R = 0.64;
const RING_R = 0.5;
const RING_T = 0.028;
const PILLAR_R = 0.045;
const PILLAR_D = 0.56;
const NECK = 0.055;
const BULB = 0.42;
const GLASS_T = 0.016;
const LUT_N = 512;
const BOX_R = 0.68;
const BOX_H = H + CAP_T * 2 + 0.02;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Glass radius profile by |y|: narrow neck → wide rounded bulb → tapers to the cap. */
export function profile(y: number) {
  const s = Math.min(1, Math.abs(y) / H);
  const r = NECK + (BULB - NECK) * Math.pow(smooth(0, 0.5, s), 0.8);
  const taper = smooth(0.72, 1, s);
  return r * (1 - 0.3 * taper * taper);
}

// Radius LUT and cumulative volume LUT (π R² dy) from the neck outward.
const R_LUT = new Float32Array(LUT_N);
const V_LUT = new Float32Array(LUT_N);
{
  const dy = H / (LUT_N - 1);
  let acc = 0;
  for (let i = 0; i < LUT_N; i++) {
    const y = i * dy;
    const r = profile(y);
    R_LUT[i] = r;
    const inner = Math.max(0, r - GLASS_T - 0.004);
    acc += Math.PI * inner * inner * dy;
    V_LUT[i] = acc;
  }
}
export const BULB_VOLUME = V_LUT[LUT_N - 1];

function radiusAt(y: number) {
  const f = (Math.abs(y) / H) * (LUT_N - 1);
  const i = f | 0;
  if (i >= LUT_N - 1) return R_LUT[LUT_N - 1];
  const t = f - i;
  return R_LUT[i] + (R_LUT[i + 1] - R_LUT[i]) * t;
}

/** Height (from the neck) at which the cumulative bulb volume reaches v. */
export function levelForVolume(v: number) {
  if (v <= 0) return 0;
  if (v >= BULB_VOLUME) return H;
  let lo = 0;
  let hi = LUT_N - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (V_LUT[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const t = (v - V_LUT[i - 1]) / Math.max(1e-9, V_LUT[i] - V_LUT[i - 1]);
  return ((i - 1 + t) / (LUT_N - 1)) * H;
}

function hash3(x: number, y: number, z: number) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ---------- SDFs ---------- */

const MAT_NONE = 0;
const MAT_CAP = 1;
const MAT_RING = 2;
const MAT_PILLAR = 3;
const MAT_SAND = 4;
const MAT_GLASS = 5;
let hitMat = MAT_NONE;

const PILLARS: [number, number][] = [0, 1, 2].map((k) => {
  const a = (k * Math.PI * 2) / 3 + Math.PI / 6;
  return [PILLAR_D * Math.cos(a), PILLAR_D * Math.sin(a)];
});

function sdCappedCyl(rxz: number, py: number, cy: number, h: number, r: number, round: number) {
  const dx = rxz - r + round;
  const dy = Math.abs(py - cy) - h + round;
  const ox = dx > 0 ? dx : 0;
  const oy = dy > 0 ? dy : 0;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(ox, oy) - round;
}

// Sand state, set once per frame.
const sand = { topLevel: 0, topDip: 0, botLevel: -H, botMound: 0, hasTop: false, hasBot: false, streamBottom: -H };

function sandTopSurface(r: number) {
  const rl = Math.max(0.02, radiusAt(sand.topLevel));
  const k = 1 - clamp(r / rl, 0, 1);
  return sand.topLevel - sand.topDip * k * k;
}

function sandBotSurface(r: number) {
  const rl = Math.max(0.02, radiusAt(sand.botLevel));
  return sand.botLevel + sand.botMound * (1 - clamp(r / rl, 0, 1)) - sand.botMound / 3;
}

function sdOpaque(px: number, py: number, pz: number) {
  const rxz = Math.hypot(px, pz);
  let d = sdCappedCyl(rxz, py, H + CAP_T / 2, CAP_T / 2, PLATE_R, 0.025);
  hitMat = MAT_CAP;
  let e = sdCappedCyl(rxz, py, -H - CAP_T / 2, CAP_T / 2, PLATE_R, 0.025);
  if (e < d) d = e;
  e = Math.min(sdCappedCyl(rxz, py, H - RING_T / 2, RING_T / 2, RING_R, 0.008), sdCappedCyl(rxz, py, -H + RING_T / 2, RING_T / 2, RING_R, 0.008));
  if (e < d) {
    d = e;
    hitMat = MAT_RING;
  }
  // pillars: lathe-turned ripple in the radius
  const pr = PILLAR_R * (1 + 0.22 * Math.sin(py * 22) + 0.08 * Math.sin(py * 61));
  let pd = 1e9;
  for (let k = 0; k < 3; k++) {
    const q = Math.hypot(px - PILLARS[k][0], pz - PILLARS[k][1]) - pr;
    if (q < pd) pd = q;
  }
  pd = Math.max(pd, Math.abs(py) - H - 0.01);
  if (pd < d) {
    d = pd;
    hitMat = MAT_PILLAR;
  }
  // sand inside the glass
  const inner = rxz - (radiusAt(py) - GLASS_T - 0.004);
  if (sand.hasTop && py > -0.05) {
    const s = Math.max(inner * 0.7, py - sandTopSurface(rxz), -py, py - H);
    if (s < d) {
      d = s;
      hitMat = MAT_SAND;
    }
  }
  if (sand.hasBot && py < 0.05) {
    const s = Math.max(inner * 0.7, py - sandBotSurface(rxz), -(py + H));
    if (s < d) {
      d = s;
      hitMat = MAT_SAND;
    }
  }
  return d;
}

function sdGlass(px: number, py: number, pz: number) {
  const rxz = Math.hypot(px, pz);
  const d = (Math.abs(rxz - radiusAt(py)) - GLASS_T) * 0.7;
  return Math.max(d, Math.abs(py) - H);
}

function sdScene(px: number, py: number, pz: number) {
  const o = sdOpaque(px, py, pz);
  const g = sdGlass(px, py, pz);
  if (g < o) {
    hitMat = MAT_GLASS;
    return g;
  }
  return o;
}

/* ---------- renderer ---------- */

export interface HourglassOptions extends Partial<HourglassConfig> {
  onStats?: (s: HourglassStats) => void;
}

export function createHourglass(canvas: HTMLCanvasElement, options: HourglassOptions = {}) {
  const cfg = { ...HOURGLASS_CONFIG, ...options };
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let cols = cfg.cols;
  let rows = cfg.rows;
  let fontSize = cfg.fontSize;
  let cellW = 6;
  let cellH = 10;
  let dpr = 1;
  let font = "";
  let textColor = "rgb(250,250,250)";
  let accent = "hsl(24 100% 50%)";
  const ramp = cfg.ramp;
  const rampMax = ramp.length - 1;

  // per-cell buffers
  let charOf = new Uint8Array(0);
  let bucketOf = new Int8Array(0);
  let depthOf = new Float32Array(0);
  let occlOf = new Float32Array(0);
  const NB = cfg.opacityBuckets.length;
  const B_STREAM = NB; // accent bucket
  const B_PART = NB + 1; // particles: 3 buckets after
  const bucketStyles: string[] = [];

  let raf = 0;
  let timer = 0;
  let start = performance.now();
  let spin = 0;
  let lastNow = 0;
  let intersecting = true;
  let disposed = false;
  let flipStart = -1;
  let flipFrozen = 0;
  let lastF = 1;
  let periodKey = -1;
  let glints = 0;
  const mountTime = Date.now();

  const fontFamily = () =>
    cfg.fontFamily ??
    (getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || '"Space Mono", monospace');

  function readTheme() {
    const cs = getComputedStyle(canvas);
    textColor = cs.color || textColor;
    if (cfg.accent) accent = cfg.accent;
    else {
      const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      if (v) accent = `hsl(${v})`;
    }
    bucketStyles.length = 0;
    const m = textColor.match(/[\d.]+/g) || ["250", "250", "250"];
    const [r, g, b] = m;
    for (const a of cfg.opacityBuckets) bucketStyles.push(`rgba(${r},${g},${b},${a})`);
    bucketStyles.push(accent);
    for (const a of [0.9, 0.55, 0.3]) bucketStyles.push(`rgba(${r},${g},${b},${a})`);
  }

  function layout() {
    const mobile = window.innerWidth < 768;
    cols = mobile ? cfg.colsMobile : cfg.cols;
    rows = mobile ? cfg.rowsMobile : cfg.rows;
    fontSize = mobile ? cfg.fontSizeMobile : cfg.fontSize;
    dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    font = `${fontSize}px ${fontFamily()}`;
    ctx!.font = font;
    cellW = ctx!.measureText("M").width || fontSize * 0.6;
    cellH = fontSize;
    const w = Math.round(cols * cellW);
    const h = Math.round(rows * cellH);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const n = cols * rows;
    charOf = new Uint8Array(n);
    bucketOf = new Int8Array(n);
    depthOf = new Float32Array(n);
    occlOf = new Float32Array(n);
    readTheme();
  }

  /* ---- time → sand ---- */

  function periodState(nowMs: number) {
    const d = new Date(nowMs);
    if (cfg.timescale === "day") {
      const into = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
      const leftS = 86400 - into;
      return { f: 1 - into / 86400, key: Math.floor((nowMs - d.getTimezoneOffset() * 60000) / 86400000), left: fmtHM(leftS), label: "LEFT TODAY" };
    }
    if (cfg.timescale === "countdown" && cfg.countdownTo) {
      const target = new Date(cfg.countdownTo).getTime();
      const total = Math.max(1, target - mountTime);
      const leftMs = Math.max(0, target - nowMs);
      return { f: clamp(leftMs / total, 0, 1), key: 0, left: fmtDHM(leftMs / 1000), label: "LEFT" };
    }
    const into = d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
    const leftS = 3600 - into;
    return { f: 1 - into / 3600, key: Math.floor(nowMs / 3600000), left: fmtMS(leftS), label: "LEFT THIS HOUR" };
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmtMS = (s: number) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
  const fmtHM = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`;
  const fmtDHM = (s: number) => `${Math.floor(s / 86400)}:${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}`;

  function setSand(f: number) {
    const vTop = f * BULB_VOLUME;
    const vBot = (1 - f) * BULB_VOLUME;
    sand.hasTop = vTop > BULB_VOLUME * 0.002;
    sand.hasBot = vBot > BULB_VOLUME * 0.002;
    const lt = levelForVolume(vTop);
    sand.topDip = Math.min(0.07, lt * 0.5);
    sand.topLevel = Math.min(H, lt + sand.topDip / 6); // the dip removes ~⅙ of a cylinder of its depth
    const lb = levelForVolume(vBot);
    sand.botMound = Math.min(0.12, (H - lb) * 0.5 + 0.02);
    sand.botLevel = -H + lb;
    sand.streamBottom = sand.hasBot ? sandBotSurface(0) : -H + 0.02;
  }

  /* ---- marching ---- */

  // object-space ray basis for the frame
  let dx = 0, dy = 0, dz = 0; // ray direction
  let rx = 0, ry = 0, rz = 0; // screen right in object space
  let ux = 0, uy = 0, uz = 0; // screen up in object space
  let ox0 = 0, oy0 = 0, oz0 = 0; // origin for sx = sy = 0
  let lx = 0, ly = 0, lz = 0; // light in object space
  let wx = 0, wy = 0; // world units per cell
  // world→object rotation as a 3×3 (rows)
  const M = new Float64Array(9);

  function setBasis(spinA: number, flipA: number) {
    const tilt = (cfg.cameraTilt * Math.PI) / 180;
    // world camera: forward points into the scene
    const fw = [0, -Math.sin(tilt), -Math.cos(tilt)];
    const up = [0, Math.cos(tilt), -Math.sin(tilt)];
    const rt = [1, 0, 0];
    // object = Ry(-spin) · Rx(-flip) · world
    const cf = Math.cos(flipA), sf = Math.sin(flipA);
    const cs = Math.cos(spinA), ss = Math.sin(spinA);
    // Rx(-flip): y' = cf*y + sf*z ; z' = -sf*y + cf*z
    // Ry(-spin): x'' = cs*x - ss*z' ; z'' = ss*x + cs*z'
    M[0] = cs; M[1] = -ss * -sf; M[2] = -ss * cf;
    M[3] = 0; M[4] = cf; M[5] = sf;
    M[6] = ss; M[7] = cs * -sf; M[8] = cs * cf;
    const ap = (v: number[]) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
    [dx, dy, dz] = ap(fw);
    [rx, ry, rz] = ap(rt);
    [ux, uy, uz] = ap(up);
    const o = ap([-fw[0] * 4, -fw[1] * 4, -fw[2] * 4]);
    [ox0, oy0, oz0] = o;
    const L = cfg.light;
    const ln = Math.hypot(L[0], L[1], L[2]) || 1;
    [lx, ly, lz] = ap([L[0] / ln, L[1] / ln, L[2] / ln]);
    // world extents: rows span 2.7 units tall; cells keep the font's aspect
    wy = 2.7 / rows;
    wx = wy * (cellW / cellH);
  }

  /** World point → object space, then screen cell and ray depth. */
  function project(wxp: number, wyp: number, wzp: number, out: Float64Array) {
    const px = M[0] * wxp + M[1] * wyp + M[2] * wzp;
    const py = M[3] * wxp + M[4] * wyp + M[5] * wzp;
    const pz = M[6] * wxp + M[7] * wyp + M[8] * wzp;
    projectObj(px, py, pz, out);
  }
  function projectObj(px: number, py: number, pz: number, out: Float64Array) {
    const qx = px - ox0, qy = py - oy0, qz = pz - oz0;
    const sx = qx * rx + qy * ry + qz * rz;
    const sy = qx * ux + qy * uy + qz * uz;
    const t = qx * dx + qy * dy + qz * dz;
    out[0] = sx / wx + cols / 2 - 0.5;
    out[1] = -sy / wy + rows / 2 - 0.5;
    out[2] = t;
  }

  // slab test against the bounding box; returns [tEnter, tExit] or null
  let boxT0 = 0, boxT1 = 0;
  function slab(o: number, d: number, e: number) {
    if (Math.abs(d) < 1e-6) return Math.abs(o) <= e;
    let a = (-e - o) / d, b = (e - o) / d;
    if (a > b) { const t = a; a = b; b = t; }
    if (a > boxT0) boxT0 = a;
    if (b < boxT1) boxT1 = b;
    return boxT0 <= boxT1;
  }
  function boxHit(ox: number, oy: number, oz: number) {
    boxT0 = 0;
    boxT1 = 8;
    return slab(ox, dx, BOX_R) && slab(oy, dy, BOX_H) && slab(oz, dz, BOX_R);
  }

  const nrm = [0, 0, 0];
  function normalOf(f: (x: number, y: number, z: number) => number, px: number, py: number, pz: number) {
    const e = 0.0025;
    nrm[0] = f(px + e, py, pz) - f(px - e, py, pz);
    nrm[1] = f(px, py + e, pz) - f(px, py - e, pz);
    nrm[2] = f(px, py, pz + e) - f(px, py, pz - e);
    const n = Math.hypot(nrm[0], nrm[1], nrm[2]) || 1;
    nrm[0] /= n;
    nrm[1] /= n;
    nrm[2] /= n;
  }

  function march(f: (x: number, y: number, z: number) => number, ox: number, oy: number, oz: number, t0: number, t1: number, eps: number) {
    let t = t0;
    for (let i = 0; i < 72 && t < t1; i++) {
      const d = f(ox + dx * t, oy + dy * t, oz + dz * t);
      if (d < eps) return t;
      t += d < 0.02 ? d : d * 0.9;
    }
    return -1;
  }

  function shadeOpaque(px: number, py: number, pz: number, mat: number) {
    normalOf(sdOpaque, px, py, pz);
    const diff = Math.max(0, nrm[0] * lx + nrm[1] * ly + nrm[2] * lz);
    if (mat === MAT_SAND) {
      const g = hash3(Math.floor(px * 52), Math.floor(py * 52), Math.floor(pz * 52));
      return (0.32 + 0.68 * diff) * (0.85 + 0.5 * g);
    }
    const k = mat === MAT_RING ? 0.8 : mat === MAT_PILLAR ? 0.92 : 1;
    return (0.14 + 0.86 * diff) * k;
  }

  const prj = new Float64Array(3);

  function render(nowMs: number, tSec: number) {
    const st = periodState(nowMs);
    const reduced = reducedMotion.matches;

    // flip at the top of each period
    if (periodKey < 0) periodKey = st.key;
    else if (st.key !== periodKey) {
      periodKey = st.key;
      if (!reduced && cfg.timescale !== "countdown") {
        flipStart = tSec;
        flipFrozen = lastF; // the emptied top / full bottom, held while the piece turns over
      }
    }
    let flipA = 0;
    let f = st.f;
    if (flipStart >= 0) {
      const p = (tSec - flipStart) / cfg.flipDuration;
      if (p >= 1) flipStart = -1;
      else {
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        flipA = e * Math.PI;
        f = flipFrozen;
      }
    }
    lastF = st.f;
    setSand(f);
    setBasis(reduced ? 0.6 : spin, flipA);

    bucketOf.fill(-1);
    depthOf.fill(1e9);
    occlOf.fill(1e9);
    glints = 0;
    const rimK = cfg.rimStrength;

    for (let j = 0; j < rows; j++) {
      const sy = -(j + 0.5 - rows / 2) * wy;
      for (let i = 0; i < cols; i++) {
        const sx = (i + 0.5 - cols / 2) * wx;
        const ox = ox0 + rx * sx + ux * sy;
        const oy = oy0 + ry * sx + uy * sy;
        const oz = oz0 + rz * sx + uz * sy;
        if (!boxHit(ox, oy, oz)) continue;
        const tExit = boxT1;
        const idx = j * cols + i;
        const t = march(sdScene, ox, oy, oz, boxT0, tExit, 0.003);
        if (t < 0) continue;
        let b = 0;
        const mat = hitMat;
        if (mat === MAT_GLASS) {
          const px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
          normalOf(sdGlass, px, py, pz);
          const ndv = Math.abs(nrm[0] * dx + nrm[1] * dy + nrm[2] * dz);
          const rim = rimK * Math.pow(1 - ndv, 2.5);
          // reflect light about the normal, compare with the view direction
          const ndl = nrm[0] * lx + nrm[1] * ly + nrm[2] * lz;
          const refx = 2 * ndl * nrm[0] - lx, refy = 2 * ndl * nrm[1] - ly, refz = 2 * ndl * nrm[2] - lz;
          const spec = Math.pow(Math.max(0, -(refx * dx + refy * dy + refz * dz)), 48);
          if (spec > 0.45) glints++;
          occlOf[idx] = t;
          // continue through the shell to whatever is behind
          const t2 = march(sdOpaque, ox, oy, oz, t + 0.03, tExit, 0.003);
          if (t2 >= 0) {
            const m2 = hitMat;
            depthOf[idx] = t2;
            b = shadeOpaque(ox + dx * t2, oy + dy * t2, oz + dz * t2, m2) * 0.9 + rim * 0.6 + spec;
          } else {
            b = 0.07 + rim + spec;
          }
        } else {
          depthOf[idx] = t;
          occlOf[idx] = t;
          b = shadeOpaque(ox + dx * t, oy + dy * t, oz + dz * t, mat);
        }
        if (b < 0.045) continue;
        const lv = clamp(b, 0, 1);
        charOf[idx] = Math.round(lv * rampMax);
        bucketOf[idx] = Math.min(NB - 1, Math.floor(lv * NB));
      }
    }

    // falling stream: accent-coloured, cycles downward through the neck
    if (sand.hasTop && sand.hasBot && flipStart < 0) {
      const y0 = 0.02, y1 = sand.streamBottom;
      const steps = Math.max(2, Math.round(((y0 - y1) / wy) * 1.2));
      for (let k = 0; k <= steps; k++) {
        const y = y0 + (y1 - y0) * (k / steps);
        projectObj(0, y, 0, prj);
        const ci = Math.round(prj[0]), cj = Math.round(prj[1]);
        if (ci < 0 || cj < 0 || ci >= cols || cj >= rows) continue;
        const idx = cj * cols + ci;
        if (depthOf[idx] < prj[2]) continue;
        const phase = Math.floor(y * 26 + tSec * 14) & 3;
        charOf[idx] = 200 + phase;
        bucketOf[idx] = B_STREAM;
      }
    }

    // orbiting particles on a tilted orbit, hidden behind the model
    if (!reduced && cfg.particleCount > 0) {
      const tiltO = 0.62;
      const prec = tSec * 0.12;
      const cp = Math.cos(prec), sp = Math.sin(prec);
      const ct = Math.cos(tiltO), stt = Math.sin(tiltO);
      for (let k = 0; k < cfg.particleCount; k++) {
        const a = -tSec * 1.15 - k * 0.028;
        const r = 1.08 + 0.05 * Math.sin(k * 0.7);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        // orbit in the xz plane, tilted about x, then precessing about y (world space)
        const y1 = -z * stt, z1 = z * ct;
        const x2 = x * cp + z1 * sp, z2 = -x * sp + z1 * cp;
        project(x2, y1, z2, prj);
        const ci = Math.round(prj[0]), cj = Math.round(prj[1]);
        if (ci < 0 || cj < 0 || ci >= cols || cj >= rows) continue;
        const idx = cj * cols + ci;
        if (occlOf[idx] < prj[2]) continue;
        if (bucketOf[idx] === B_STREAM) continue;
        const stage = k < 12 ? 0 : k < 70 ? 1 : 2;
        charOf[idx] = 210 + stage;
        bucketOf[idx] = B_PART + stage;
      }
    }

    draw();
    cfg.onStats?.({ rotationDeg: ((((reduced ? 0.6 : spin) * 180) / Math.PI) % 360 + 360) % 360, left: st.left, leftLabel: st.label, glints });
  }

  const STREAM = "|:.'";
  const PART = "*+.";

  function draw() {
    const c = ctx!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, cols * cellW, rows * cellH);
    c.font = font;
    c.textBaseline = "middle";
    c.textAlign = "left";
    const nbAll = bucketStyles.length;
    const first = new Int16Array(nbAll);
    const last = new Int16Array(nbAll);
    const rowsByBucket: { x: number; y: number; s: string }[][] = bucketStyles.map(() => []);
    for (let j = 0; j < rows; j++) {
      first.fill(-1);
      const base = j * cols;
      for (let i = 0; i < cols; i++) {
        const b = bucketOf[base + i];
        if (b < 0) continue;
        if (first[b] < 0) first[b] = i;
        last[b] = i;
      }
      const y = (j + 0.5) * cellH;
      for (let b = 0; b < nbAll; b++) {
        if (first[b] < 0) continue;
        let s = "";
        for (let i = first[b]; i <= last[b]; i++) {
          const idx = base + i;
          if (bucketOf[idx] !== b) {
            s += " ";
            continue;
          }
          const ch = charOf[idx];
          s += ch >= 210 ? PART[ch - 210] : ch >= 200 ? STREAM[ch - 200] : ramp[ch];
        }
        rowsByBucket[b].push({ x: first[b] * cellW, y, s });
      }
    }
    for (let b = 0; b < nbAll; b++) {
      const list = rowsByBucket[b];
      if (!list.length) continue;
      c.fillStyle = bucketStyles[b];
      for (const r of list) c.fillText(r.s, r.x, r.y);
    }
  }

  /* ---- loop ---- */

  function running() {
    return !disposed && intersecting && !document.hidden;
  }

  function frame(now: number) {
    raf = 0;
    if (!running() || reducedMotion.matches) return;
    if (lastNow && now - lastNow < 1000 / cfg.maxFps - 1) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    spin += dt * cfg.rotationSpeed;
    render(Date.now(), (now - start) / 1000);
    raf = requestAnimationFrame(frame);
  }

  function schedule() {
    stop();
    if (!running()) return;
    if (reducedMotion.matches) {
      render(Date.now(), (performance.now() - start) / 1000);
      timer = window.setInterval(() => running() && render(Date.now(), (performance.now() - start) / 1000), 1000);
    } else {
      lastNow = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (timer) clearInterval(timer);
    timer = 0;
  }

  const onVisibility = () => (document.hidden ? stop() : schedule());
  const onMotion = () => schedule();
  const onResize = () => {
    layout();
    schedule();
  };
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
  reducedMotion.addEventListener("change", onMotion);
  window.addEventListener("resize", onResize);
  if ("fonts" in document) {
    document.fonts.load(`${cfg.fontSize}px ${fontFamily()}`).then(() => {
      if (!disposed) onResize();
    });
  }

  start = performance.now();
  layout();
  schedule();

  return () => {
    disposed = true;
    stop();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    reducedMotion.removeEventListener("change", onMotion);
    window.removeEventListener("resize", onResize);
  };
}
