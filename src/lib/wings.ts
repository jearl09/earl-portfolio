/* ==========================================================================
   wings.ts — a pair of white wings drawn as text, driven by a photograph.
   /public/wing.png (a white wing on black, root left, tip right) is cleaned
   once on load (levels, gamma, cutoff, unsharp), then every frame it is
   warped over a 3-bone rig (shoulder → elbow → hand) through a mesh of
   triangles into a small offscreen canvas, read back once, averaged per
   character cell and mapped to a dense ramp, with directional characters
   where the gradient is strong. The left wing is the mirror image. The
   brightest cells bloom ivory into the empty cells around them, a band of
   light sweeps root → tip, and faint grit sits behind. Plain TypeScript;
   React wrapper: components/Wings.tsx.
   ========================================================================== */

export const WINGS_CONFIG = {
  // Source photo: white wing on black, extended horizontally, root on the left.
  src: "/wing.png",
  // Target character cell width in CSS px. Font size is derived so a glyph
  // fills the cell and the row height equals the glyph height.
  cellWidth: 2.8,
  cellWidthMobile: 2.4,
  // Dense ramp, dark → bright.
  ramp: " .'`,:;~-=+*x%#@",
  // Preprocess: levels (black/white points), gamma, transparency cutoff, unsharp amount.
  blackPoint: 0.08,
  whitePoint: 1.0,
  gamma: 1.0,
  cutoff: 0.12,
  sharpen: 0.25,
  // Local contrast: how much each pixel is judged against its neighbourhood
  // (0 = plain luminance, 1 = pure detail). Brings out scallops inside the white mass.
  local: 0.55,
  localRadius: 7,
  localGain: 2.4,
  // Grunge mask: regions whose wide-area mean luminance is below this are background.
  maskRadius: 14,
  maskFrom: 0.2,
  maskTo: 0.34,
  // Tone curve on the cell luminance before the ramp: >1 spreads the highlights over more glyphs.
  tone: 1.0,
  // Gradient magnitude above which a cell uses a directional character.
  edgeThreshold: 0.35,
  // Rig: flap amplitude at the shoulder, cycle length, lag of elbow and hand
  // (radians behind the shoulder) and how much of the amplitude they add.
  flapDeg: 3,
  flapPeriod: 5.5,
  elbowLag: 0.4,
  handLag: 0.8,
  elbowRatio: 0.3,
  handRatio: 0.3,
  // Primaries flex against the motion (degrees) and tip flutter amplitude (px).
  flexDeg: 3,
  flutter: 1.2,
  // Shine: bloom strength and the shimmer band period (seconds).
  shine: 1,
  shimmerEvery: 4.5,
  // Body gap between the wing roots as a fraction of the width.
  bodyGap: 0.04,
  // Colours: shadow → silver → white, and the bloom tint.
  shadow: [24, 26, 38] as [number, number, number],
  silver: [192, 196, 208] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  ivory: [255, 240, 200] as [number, number, number],
  // Faint photographic grit (0 = none).
  grain: 0.5,
  // Frame-rate cap and DPR cap.
  maxFps: 30,
  maxDpr: 2,
  // Canvas font. null reads the site's --font-mono token.
  fontFamily: null as string | null,
};

export type WingsConfig = typeof WINGS_CONFIG;

type RGB = [number, number, number];
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const D2R = Math.PI / 180;

function hash2(i: number, j: number) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ---------- pure helpers (exported for tests) ---------- */

/** Levels + gamma curve on a 0..1 luminance. */
export function levels(l: number, black: number, white: number, gamma: number) {
  return Math.pow(clamp((l - black) / (white - black), 0, 1), gamma);
}

/** Bone weights by position along the wing: [elbow, hand]; the shoulder moves everything. */
export function boneWeights(u: number): [number, number] {
  return [smooth(0.2, 0.45, u), smooth(0.5, 0.75, u)];
}

/** Directional glyph for a gradient (gx, gy): the stroke runs across the gradient. */
export function edgeGlyph(gx: number, gy: number) {
  const ax = Math.abs(gx), ay = Math.abs(gy);
  if (ax > ay * 2.2) return "|";
  if (ay > ax * 2.2) return "-";
  return gx * gy < 0 ? "/" : "\\";
}

/* ---------- renderer ---------- */

export function createWings(canvas: HTMLCanvasElement, options: Partial<WingsConfig> = {}) {
  const cfg = { ...WINGS_CONFIG, ...options };
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};
  const parent = canvas.parentElement ?? canvas;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // cleaned source
  const src = document.createElement("canvas");
  const sctx = src.getContext("2d")!;
  let sw = 0, sh = 0, ready = false;
  // warped wing, right side only, at 2 px per cell
  const off = document.createElement("canvas");
  const octx = off.getContext("2d", { willReadFrequently: true })!;

  let W = 0, Hh = 0, dpr = 1, cols = 0, rows = 0, cellW = 5, cellH = 8, font = "";
  let advance = 0.6;
  let gap = 0, halfCols = 0, xRight = 0; // half body gap, cells per wing, x where the right wing region starts
  let Ww = 0, Wh = 0, imgLeft = 0, imgTop = 0; // rest-pose image box of the right wing
  let I = new Float32Array(0), G = new Float32Array(0);
  let CH = new Uint8Array(0);
  let grainAt = new Uint8Array(0);
  let lumR = new Float32Array(0); // right-wing cell luminance (halfCols × rows)
  let raf = 0, lastNow = 0, start = 0, intersecting = true, disposed = false, resizeTimer = 0;

  const fontFamily = () =>
    cfg.fontFamily ??
    (getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || '"Space Mono", monospace');

  /* ---- preprocess the photo once ---- */
  function prepare(img: HTMLImageElement) {
    const scale = Math.min(1, 1024 / img.naturalWidth);
    sw = Math.round(img.naturalWidth * scale);
    sh = Math.round(img.naturalHeight * scale);
    src.width = sw;
    src.height = sh;
    sctx.drawImage(img, 0, 0, sw, sh);
    const id = sctx.getImageData(0, 0, sw, sh);
    const d = id.data;
    const n = sw * sh;
    const L = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const l = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
      L[i] = levels(l, cfg.blackPoint, cfg.whitePoint, cfg.gamma);
    }
    // separable box blurs: a small one for the unsharp mask, a wider one for local contrast
    const blur = (srcA: Float32Array, R: number) => {
      const tmp = new Float32Array(n), outA = new Float32Array(n);
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          let acc = 0, c = 0;
          for (let dx = -R; dx <= R; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= sw) continue;
            acc += srcA[y * sw + xx];
            c++;
          }
          tmp[y * sw + x] = acc / c;
        }
      }
      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          let acc = 0, c = 0;
          for (let dy = -R; dy <= R; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= sh) continue;
            acc += tmp[yy * sw + x];
            c++;
          }
          outA[y * sw + x] = acc / c;
        }
      }
      return outA;
    };
    const B = blur(L, 2);
    const B2 = blur(L, cfg.localRadius);
    const BM = blur(L, cfg.maskRadius);
    for (let i = 0; i < n; i++) {
      const sharp = clamp(L[i] + cfg.sharpen * (L[i] - B[i]), 0, 1);
      const detail = clamp(0.5 + cfg.localGain * (L[i] - B2[i]), 0, 1);
      const v = clamp(lerp(sharp, detail, cfg.local), 0, 1);
      // background grunge is sparse: its wide-area mean stays low, the wing's does not
      const a = (L[i] < cfg.cutoff ? 0 : smooth(cfg.cutoff, cfg.cutoff + 0.1, L[i])) * smooth(cfg.maskFrom, cfg.maskTo, BM[i]);
      const g = Math.round(v * 255);
      d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = g;
      d[i * 4 + 3] = Math.round(a * 255);
    }
    sctx.putImageData(id, 0, 0);
    ready = true;
  }

  /* ---- layout ---- */
  function layout() {
    const rect = parent.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    Hh = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    ctx!.font = `100px ${fontFamily()}`;
    const m = ctx!.measureText("M").width;
    if (m > 0) advance = m / 100;
    const target = window.innerWidth < 768 ? cfg.cellWidthMobile : cfg.cellWidth;
    const fs = target / advance;
    font = `${fs.toFixed(2)}px ${fontFamily()}`;
    cellW = target;
    cellH = fs; // row height = glyph height: no gaps between rows
    cols = Math.ceil(W / cellW);
    rows = Math.ceil(Hh / cellH);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hh * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${Hh}px`;
    const n = cols * rows;
    I = new Float32Array(n);
    G = new Float32Array(n);
    CH = new Uint8Array(n);
    grainAt = new Uint8Array(n);
    if (cfg.grain > 0) for (let i = 0; i < n; i++) if (hash2(i, 77) < cfg.grain * 0.02) grainAt[i] = 1;

    gap = (W * cfg.bodyGap) / 2;
    xRight = W / 2 + gap;
    halfCols = Math.ceil((W - xRight) / cellW);
    lumR = new Float32Array(halfCols * rows);
    off.width = halfCols * 2;
    off.height = rows * 2;

    // fit the wing: width across the half, height with room for the flap
    const aspect = sw > 0 ? sw / sh : 3;
    const flapRoom = Math.sin(cfg.flapDeg * (1 + cfg.elbowRatio + cfg.handRatio) * D2R) * 1.3;
    Ww = Math.min(W - xRight - W * 0.01, (Hh - 16) / (1 / aspect + flapRoom));
    Wh = Ww / aspect;
    imgLeft = xRight - 0.03 * Ww; // root pivot sits just inside the image
    imgTop = Hh / 2 - 0.56 * Wh;
  }

  /* ---- rig + mesh warp into the offscreen canvas ---- */
  const NX = 40, NY = 12;
  const vx = new Float32Array((NX + 1) * (NY + 1));
  const vy = new Float32Array((NX + 1) * (NY + 1));

  function rot(px: number, py: number, cx: number, cy: number, a: number): [number, number] {
    const c = Math.cos(a), s = Math.sin(a);
    const dx = px - cx, dy = py - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  }

  function warp(t: number) {
    const reduced = reducedMotion.matches;
    const phi = reduced ? 0 : (t / cfg.flapPeriod) * Math.PI * 2;
    const A = cfg.flapDeg * D2R;
    const ease = (p: number) => Math.sin(p) * (1 - 0.12 * Math.cos(2 * p)); // slightly held at the extremes
    const thS = reduced ? 0 : A * ease(phi);
    const thE = reduced ? 0 : A * cfg.elbowRatio * ease(phi - cfg.elbowLag);
    const thH = reduced ? 0 : A * cfg.handRatio * ease(phi - cfg.handLag);
    const thF = reduced ? 0 : -cfg.flexDeg * D2R * Math.sin(phi - 1.0);
    const up = reduced ? 0 : Math.max(0, -Math.sin(phi)); // upstroke amount

    const Sx = imgLeft + 0.04 * Ww, Sy = imgTop + 0.56 * Wh;
    const Ex = imgLeft + 0.3 * Ww, Ey = imgTop + 0.5 * Wh;
    const Hx = imgLeft + 0.6 * Ww, Hy = imgTop + 0.45 * Wh;
    const [E1x, E1y] = rot(Ex, Ey, Sx, Sy, thS);
    const [H1x, H1y] = rot(Hx, Hy, Sx, Sy, thS);
    const [H2x, H2y] = rot(H1x, H1y, E1x, E1y, thE);

    for (let j = 0; j <= NY; j++) {
      const v = j / NY;
      for (let i = 0; i <= NX; i++) {
        const u = i / NX;
        const [wE, wH] = boneWeights(u);
        let x = imgLeft + u * Ww, y = imgTop + v * Wh;
        [x, y] = rot(x, y, Sx, Sy, thS);
        if (wE > 0) {
          const [rx, ry] = rot(x, y, E1x, E1y, thE);
          x = lerp(x, rx, wE);
          y = lerp(y, ry, wE);
        }
        if (wH > 0) {
          const [rx, ry] = rot(x, y, H2x, H2y, thH);
          x = lerp(x, rx, wH);
          y = lerp(y, ry, wH);
          // primaries: lower half of the hand flexes against the motion and spreads on the upstroke
          const prim = smooth(0.65, 0.8, u) * clamp((v - 0.5) * 2, 0, 1);
          if (prim > 0) {
            const [fx, fy] = rot(x, y, H2x, H2y, thF * prim);
            x = fx;
            y = fy + (y - H2y) * 0.06 * up * prim;
          }
          // tiny flutter in the tip region
          const fl = smooth(0.7, 1, u) * cfg.flutter;
          if (fl > 0 && !reduced) y += fl * Math.sin(t * 6 + u * 40 + v * 9) * (Ww / 900);
        }
        const k = j * (NX + 1) + i;
        vx[k] = x;
        vy[k] = y;
      }
    }

    // draw the mesh as textured triangles into the offscreen canvas (2 px per cell)
    const kx = 2 / cellW, ky = 2 / cellH;
    const o = octx;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, off.width, off.height);
    const tri = (i0: number, i1: number, i2: number, s0: number[], s1: number[], s2: number[]) => {
      const x0 = (vx[i0] - xRight) * kx, y0 = vy[i0] * ky;
      const x1 = (vx[i1] - xRight) * kx, y1 = vy[i1] * ky;
      const x2 = (vx[i2] - xRight) * kx, y2 = vy[i2] * ky;
      // affine map source → dest
      const det = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
      if (Math.abs(det) < 1e-6) return;
      const a = ((x1 - x0) * (s2[1] - s0[1]) - (x2 - x0) * (s1[1] - s0[1])) / det;
      const b = ((y1 - y0) * (s2[1] - s0[1]) - (y2 - y0) * (s1[1] - s0[1])) / det;
      const c = ((x2 - x0) * (s1[0] - s0[0]) - (x1 - x0) * (s2[0] - s0[0])) / det;
      const d = ((y2 - y0) * (s1[0] - s0[0]) - (y1 - y0) * (s2[0] - s0[0])) / det;
      const e = x0 - a * s0[0] - c * s0[1];
      const f = y0 - b * s0[0] - d * s0[1];
      // clip to the triangle, pushed out a hair to hide seams
      const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3;
      const push = (x: number, y: number): [number, number] => {
        const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1;
        return [x + (dx / l) * 0.7, y + (dy / l) * 0.7];
      };
      const p0 = push(x0, y0), p1 = push(x1, y1), p2 = push(x2, y2);
      o.save();
      o.beginPath();
      o.moveTo(p0[0], p0[1]);
      o.lineTo(p1[0], p1[1]);
      o.lineTo(p2[0], p2[1]);
      o.closePath();
      o.clip();
      o.setTransform(a, b, c, d, e, f);
      o.drawImage(src, 0, 0);
      o.restore();
    };
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const k00 = j * (NX + 1) + i, k10 = k00 + 1, k01 = k00 + NX + 1, k11 = k01 + 1;
        const s00 = [(i / NX) * sw, (j / NY) * sh], s10 = [((i + 1) / NX) * sw, (j / NY) * sh];
        const s01 = [(i / NX) * sw, ((j + 1) / NY) * sh], s11 = [((i + 1) / NX) * sw, ((j + 1) / NY) * sh];
        tri(k00, k10, k11, s00, s10, s11);
        tri(k00, k11, k01, s00, s11, s01);
      }
    }
  }

  /* ---- ASCII conversion ---- */
  function convert(t: number) {
    const ow = off.width, oh = off.height;
    const d = octx.getImageData(0, 0, ow, oh).data;
    // average each 2×2 block → cell luminance (alpha-weighted)
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < halfCols; i++) {
        let s = 0;
        for (let dy = 0; dy < 2; dy++) {
          const row = (j * 2 + dy) * ow;
          for (let dx = 0; dx < 2; dx++) {
            const p = (row + i * 2 + dx) * 4;
            s += d[p + 3] > 40 ? d[p] / 255 : 0;
          }
        }
        lumR[j * halfCols + i] = s / 4;
      }
    }
    I.fill(0);
    CH.fill(0);
    const reduced = reducedMotion.matches;
    const pulse = reduced ? 1 : 1 + 0.03 * Math.sin(t * 0.8);
    const shimmerC = reduced ? -1 : ((t % cfg.shimmerEvery) / cfg.shimmerEvery) * 1.3 - 0.15;
    const L = (i: number, j: number) => lumR[clamp(j, 0, rows - 1) * halfCols + clamp(i, 0, halfCols - 1)];
    const rightCol = Math.round(xRight / cellW);
    const leftStart = Math.round((W / 2 - gap) / cellW) - 1; // right edge column of the left wing
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < halfCols; i++) {
        const l = lumR[j * halfCols + i];
        if (l < 0.04) continue;
        const gx = -L(i - 1, j - 1) - 2 * L(i - 1, j) - L(i - 1, j + 1) + L(i + 1, j - 1) + 2 * L(i + 1, j) + L(i + 1, j + 1);
        const gy = -L(i - 1, j - 1) - 2 * L(i, j - 1) - L(i + 1, j - 1) + L(i - 1, j + 1) + 2 * L(i, j + 1) + L(i + 1, j + 1);
        const mag = Math.hypot(gx, gy) / 4;
        const edge = mag > cfg.edgeThreshold;
        const dn = (i * cellW) / Ww;
        const band = Math.exp(-Math.pow((dn - shimmerC) / 0.07, 2)) * 0.3 * cfg.shine;
        const v = clamp(Math.pow(l, cfg.tone) * pulse + band, 0, 1.2);
        // right wing
        const ci = rightCol + i;
        if (ci < cols) {
          const idx = j * cols + ci;
          I[idx] = v;
          CH[idx] = edge ? edgeGlyph(gx, gy).charCodeAt(0) : 0;
        }
        // left wing: mirror, swapping the diagonals
        const li = leftStart - i;
        if (li >= 0) {
          const idx = j * cols + li;
          I[idx] = v;
          if (edge) CH[idx] = edgeGlyph(-gx, gy).charCodeAt(0);
        }
      }
    }
  }

  /** Bloom: the brightest cells cast faint ivory glow into empty neighbours. */
  function bloom() {
    G.fill(0);
    if (cfg.shine <= 0) return;
    const R = 3;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v = I[j * cols + i];
        if (v < 0.9) continue;
        for (let dj = -R; dj <= R; dj++) {
          const jj = j + dj;
          if (jj < 0 || jj >= rows) continue;
          for (let di = -R; di <= R; di++) {
            const ii = i + di;
            if (ii < 0 || ii >= cols) continue;
            const idx = jj * cols + ii;
            if (I[idx] >= 0.05) continue;
            const dd = Math.hypot(di * 0.6, dj) / R;
            if (dd > 1) continue;
            const g = (1 - dd) * (1 - dd) * 0.5 * cfg.shine * Math.min(1, (v - 0.86) * 6);
            if (g > G[idx]) G[idx] = g;
          }
        }
      }
    }
  }

  function colorOf(v: number): RGB {
    const { shadow, silver, white } = cfg;
    if (v < 0.5) {
      const k = v / 0.5;
      return [lerp(shadow[0], silver[0], k), lerp(shadow[1], silver[1], k), lerp(shadow[2], silver[2], k)];
    }
    const k = clamp((v - 0.5) / 0.5, 0, 1);
    return [lerp(silver[0], white[0], k), lerp(silver[1], white[1], k), lerp(silver[2], white[2], k)];
  }

  function draw(t: number) {
    const c = ctx!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, Hh);
    c.font = font;
    c.textBaseline = "middle";
    c.textAlign = "left";
    const ramp = cfg.ramp;
    const rm = ramp.length - 1;
    const GAP = 6;
    const LEVELS = 12;
    const grainStep = Math.floor(t * 2);
    const styleOf = (key: number) => {
      if (key >= 200) return "rgb(70,70,76)";
      if (key >= 100) {
        const k = Math.min(1, ((key - 100) / 4) * 1.1 + 0.15);
        return `rgb(${(cfg.ivory[0] * k) | 0},${(cfg.ivory[1] * k) | 0},${(cfg.ivory[2] * k) | 0})`;
      }
      const [r, g, b] = colorOf(0.22 + 0.78 * (key / LEVELS));
      return `rgb(${r | 0},${g | 0},${b | 0})`;
    };
    const runs = new Map<number, string[]>();
    const keyOf = new Int32Array(cols);
    const glyphOf = new Array<string>(cols);
    for (let j = 0; j < rows; j++) {
      const base = j * cols;
      const y = (j + 0.5) * cellH;
      for (let i = 0; i < cols; i++) {
        const idx = base + i;
        const v = I[idx];
        if (v >= 0.04) {
          const boosted = Math.min(1, v * (1 + 0.08 * cfg.shine));
          glyphOf[i] = CH[idx] ? String.fromCharCode(CH[idx]) : ramp[Math.max(1, Math.round(boosted * rm))];
          keyOf[i] = Math.round(boosted * LEVELS);
        } else if (G[idx] > 0.03) {
          const g = G[idx];
          glyphOf[i] = ramp[Math.max(1, Math.min(4, Math.round(g * 8)))];
          keyOf[i] = 100 + Math.min(4, Math.round(g * 4));
        } else if (grainAt[idx] && hash2(idx, grainStep) < 0.7) {
          glyphOf[i] = hash2(i, j + grainStep) < 0.5 ? "." : ",";
          keyOf[i] = 200;
        } else {
          keyOf[i] = -1;
          continue;
        }
      }
      const lastAt = new Map<number, number>();
      const open = new Map<number, { x: number; s: string }>();
      for (let i = 0; i < cols; i++) {
        const key = keyOf[i];
        if (key < 0) continue;
        const prev = lastAt.get(key);
        let run = open.get(key);
        if (run && prev !== undefined && i - prev <= GAP) run.s += " ".repeat(i - prev - 1) + glyphOf[i];
        else {
          if (run) {
            let list = runs.get(key);
            if (!list) runs.set(key, (list = []));
            list.push(`${run.x}|${y}|${run.s}`);
          }
          run = { x: i, s: glyphOf[i] };
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
      c.fillStyle = styleOf(key);
      for (const item of list) {
        const a = item.indexOf("|"), b2 = item.indexOf("|", a + 1);
        c.fillText(item.slice(b2 + 1), Number(item.slice(0, a)) * cellW, Number(item.slice(a + 1, b2)));
      }
    }
  }

  function render(t: number) {
    if (!ready) return;
    warp(t);
    convert(t);
    bloom();
    draw(t);
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
    render((now - start) / 1000);
    raf = requestAnimationFrame(frame);
  }
  function schedule() {
    stop();
    if (!running()) return;
    if (reducedMotion.matches) {
      render(0);
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

  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    if (disposed) return;
    prepare(img);
    layout();
    schedule();
    if ("fonts" in document) {
      document.fonts.load(`12px ${fontFamily()}`).then(() => {
        if (disposed) return;
        layout();
        schedule();
      });
    }
  };
  img.src = cfg.src;
  layout();

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
