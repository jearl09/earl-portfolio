/* ==========================================================================
   wings.ts — a pair of white wings drawn as text. Each wing is built from
   procedural feathers (tertials, secondaries, primaries, three tiers of
   coverts, scapulars) anchored to a shoulder → elbow → wrist → tip skeleton
   and mirrored around a body gap. Every frame the feathers are rasterised
   into a character grid: brightness picks a glyph, the cell keeps a colour
   from cool shadow through silver to white, and the brightest cells bloom
   into the empty cells around them. The wings hold a spread pose and move
   only with a breeze. Plain TypeScript; React wrapper: components/Wings.tsx.
   ========================================================================== */

export const WINGS_CONFIG = {
  // Font size in CSS px (cell height); cell width follows the font's advance.
  cellSize: 6,
  cellSizeMobile: 5,
  // Density ramp, dim → bright.
  ramp: " .,:;-~=+*xX#%@",
  // Shine: bloom reach and strength around the brightest cells, feather boost,
  // and the shimmer band that sweeps root → tip.
  shine: 1,
  shimmerEvery: 4.5,
  // Breeze strength (radians of feather sway at the tips).
  breeze: 1,
  // Body gap between the wing roots as a fraction of the width.
  bodyGap: 0.07,
  // Feather colours: shadow → silver → white, and the bloom tint.
  shadow: [24, 26, 38] as [number, number, number],
  silver: [192, 196, 208] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  ivory: [255, 240, 200] as [number, number, number],
  // Faint photographic grit in the background (0 = none).
  grain: 0,
  // Frame-rate cap.
  maxFps: 30,
  // Cap on devicePixelRatio.
  maxDpr: 2,
  // Canvas font. null reads the site's --font-mono token.
  fontFamily: null as string | null,
};

export type WingsConfig = typeof WINGS_CONFIG;

type RGB = [number, number, number];
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const D2R = Math.PI / 180;

function hash2(i: number, j: number) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ---------- feather plan (built once per layout) ---------- */

interface Feather {
  ax: number; // anchor, right-wing local units (x outward, y down), × Lb
  ay: number;
  ang: number; // degrees, 0 = outward, 90 = straight down
  len: number; // × Lb
  hw: number; // half width × Lb
  reach: number; // 0 at the shoulder … 1 at the tip, drives breeze and shimmer
  base: number; // base brightness
  seed: number;
  kind: "flight" | "covert" | "lesser" | "scapular";
}

/** Pointed-tip width profile: rounded base, pointed end. */
export function featherProfile(t: number) {
  return Math.pow(Math.min(1, t / 0.14), 0.5) * Math.pow(1 - t, 0.55) * 1.15;
}

/** Build the right wing's feathers in units of the bone length. */
export function buildWing(): Feather[] {
  const F: Feather[] = [];
  // skeleton (y down): shoulder, elbow, wrist, tip
  const S = [0, 0], E = [0.2, -0.1], Wr = [0.62, -0.26], T = [1.0, -0.2];
  const on = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  let seed = 1;
  const add = (p: number[], ang: number, len: number, hw: number, reach: number, base: number, kind: Feather["kind"]) =>
    F.push({ ax: p[0], ay: p[1], ang, len, hw, reach, base, seed: seed++, kind });

  // flight feathers, drawn outer → inner so inner ones lie on top
  const prim: Feather[] = [], sec: Feather[] = [], ter: Feather[] = [];
  for (let k = 9; k >= 0; k--) {
    const u = k / 9;
    const p = on(Wr, T, 0.08 + 0.92 * u);
    const ang = lerp(58, -14, Math.pow(u, 0.75)); // inner hangs down-out, outer sweeps up along the leading edge
    const len = lerp(0.8, 1.06, u);
    prim.push({ ax: p[0], ay: p[1], ang, len, hw: lerp(0.034, 0.024, u), reach: 0.62 + 0.38 * u, base: 0.8, seed: seed++, kind: "flight" });
  }
  for (let k = 12; k >= 0; k--) {
    const u = k / 12;
    const p = on(E, Wr, u);
    sec.push({ ax: p[0], ay: p[1], ang: lerp(100, 76, u), len: lerp(0.78, 0.88, u), hw: 0.03, reach: 0.22 + 0.4 * u, base: 0.78, seed: seed++, kind: "flight" });
  }
  for (let k = 5; k >= 0; k--) {
    const u = k / 5;
    const p = on(S, E, 0.05 + 0.9 * u);
    ter.push({ ax: p[0], ay: p[1], ang: lerp(112, 102, u), len: lerp(0.62, 0.74, u), hw: 0.034, reach: 0.02 + 0.2 * u, base: 0.76, seed: seed++, kind: "flight" });
  }
  F.push(...prim, ...sec, ...ter);

  // greater coverts: same anchors, half length
  for (const f of [...prim, ...sec, ...ter]) add([f.ax + 0.01, f.ay + 0.01], f.ang + 3, f.len * 0.5, f.hw * 0.95, f.reach, 0.78, "covert");
  // median coverts: a third, slightly offset
  [...prim, ...sec, ...ter].forEach((f, i) => {
    if (i % 2) add([f.ax + 0.035, f.ay + 0.01], f.ang + 8, f.len * 0.3, f.hw * 0.9, f.reach, 0.84, "covert");
  });
  // three rows of small scalloped lesser coverts along the leading edge
  for (let row = 2; row >= 0; row--) {
    const n = 22;
    for (let k = n; k >= 0; k--) {
      const u = k / n;
      const seg = u < 0.2 ? on(S, E, u / 0.2) : u < 0.62 ? on(E, Wr, (u - 0.2) / 0.42) : on(Wr, T, (u - 0.62) / 0.38);
      const nx = 0, ny = 1; // roughly perpendicular to the (nearly horizontal) bones
      add([seg[0] + nx * row * 0.05 + 0.012, seg[1] + ny * row * 0.055 + 0.02], lerp(104, 40, u) + row * 4, lerp(0.18, 0.13, row / 2), 0.022, u, 0.9 - row * 0.03, "lesser");
    }
  }
  // soft scapulars at the root, lying over the bone
  for (let k = 7; k >= 0; k--) {
    const u = k / 7;
    add([0.02 + u * 0.22, -0.03 - u * 0.07], lerp(-10, -45, u) + 60 * u, 0.26, 0.04, u * 0.2, 0.86, "scapular");
  }
  return F;
}

/* ---------- renderer ---------- */

export function createWings(canvas: HTMLCanvasElement, options: Partial<WingsConfig> = {}) {
  const cfg = { ...WINGS_CONFIG, ...options };
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};
  const parent = canvas.parentElement ?? canvas;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const feathers = buildWing();

  let W = 0, Hh = 0, dpr = 1, cols = 0, rows = 0, cellW = 3.6, cellH = 6, font = "";
  let Lb = 100, shX = 0, shY = 0, gap = 0; // bone length px, right shoulder position, half body gap
  let I = new Float32Array(0), G = new Float32Array(0);
  let raf = 0, lastNow = 0, start = 0, intersecting = true, disposed = false, resizeTimer = 0;

  const fontFamily = () =>
    cfg.fontFamily ??
    (getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || '"Space Mono", monospace');

  function layout() {
    const rect = parent.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    Hh = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    const fs = window.innerWidth < 768 ? cfg.cellSizeMobile : cfg.cellSize;
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
    I = new Float32Array(cols * rows);
    G = new Float32Array(cols * rows);
    gap = (W * cfg.bodyGap) / 2;
    // primaries reach ~1.95 bone lengths from the shoulder; hanging feathers ~0.8 below the elbow
    Lb = Math.min((W / 2 - gap - W * 0.02) / 2.05, Hh / 1.4);
    shX = W / 2 + gap;
    shY = Hh * 0.5;
  }

  /* ---- plotting ---- */

  function plot(x: number, y: number, v: number) {
    const ci = (x / cellW) | 0, cj = (y / cellH) | 0;
    if (ci < 0 || cj < 0 || ci >= cols || cj >= rows) return;
    I[cj * cols + ci] = v; // painter's order: later feathers lie on top
  }

  function drawFeather(f: Feather, side: 1 | -1, t: number, shimmerC: number, pulse: number) {
    const reduced = reducedMotion.matches;
    // breeze: slow body sway plus a per-feather flutter, stronger toward the tips
    const sway = reduced ? 0 : (0.045 * Math.sin(t * 0.55 + f.ax * 2.2 + side * 0.4) + 0.016 * Math.sin(t * 1.9 + f.seed * 2.1)) * cfg.breeze;
    const ang = (f.ang + (f.kind === "flight" ? 0 : 2)) * D2R + sway * (0.3 + 0.7 * f.reach) * (side === 1 ? 1 : -1);
    const ox = side === 1 ? shX : W - shX; // mirrored shoulder
    const bx = ox + side * f.ax * Lb;
    const by = shY + f.ay * Lb;
    const L = f.len * Lb, hw = f.hw * Lb;
    const dx = side * Math.cos(ang), dy = Math.sin(ang); // direction (y down)
    const nx = -dy, ny = dx; // normal
    const stepS = cellH * 0.42, stepU = cellW * 0.42;
    const shaftW = Math.max(cellW * 0.55, hw * 0.09);
    const texS = 1 / (cellH * 0.9), texU = 1 / (cellW * 0.75);
    for (let s = 0; s <= L; s += stepS) {
      const tt = s / L;
      const w = Math.max(cellW * 0.35, hw * featherProfile(tt));
      const cxp = bx + dx * s, cyp = by + dy * s;
      // shimmer band by distance from the shoulder
      const dn = Math.hypot(cxp - ox, cyp - shY) / (Lb * 2.05);
      const band = Math.exp(-Math.pow((dn - shimmerC) / 0.07, 2)) * 0.32 * cfg.shine;
      for (let u = -w; u <= w; u += stepU) {
        const au = Math.abs(u);
        const e = au / w;
        let v;
        if (au < shaftW) v = 1.0;
        else {
          const tex = 0.5 + 0.5 * Math.sin(s * texS * 0.45 + au * texU * 0.9 + f.seed);
          v = f.base * (0.9 + 0.1 * tex) * (1 - 0.45 * Math.pow(e, 2)) * (1 - 0.2 * tt * tt);
          if (e > 0.9) v *= 0.5; // dark rim so overlaps read
          v += (hash2(f.seed * 7 + ((s / stepS) | 0), (u / stepU) | 0) - 0.5) * 0.06;
        }
        v = v * pulse + band;
        plot(cxp + nx * u, cyp + ny * u, clamp(v, 0.06, 1.2));
      }
    }
  }

  function leadingEdge(side: 1 | -1) {
    const ox = side === 1 ? shX : W - shX;
    const pts = [
      [0, 0],
      [0.2, -0.1],
      [0.62, -0.26],
      [1.0, -0.2],
    ];
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      const x0 = ox + side * a[0] * Lb, y0 = shY + a[1] * Lb, x1 = ox + side * b[0] * Lb, y1 = shY + b[1] * Lb;
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (cellW * 0.4));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        plot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 1.1);
        plot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + cellH * 0.9, 0.95);
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
        if (v < 0.92) continue;
        for (let dj = -R; dj <= R; dj++) {
          const jj = j + dj;
          if (jj < 0 || jj >= rows) continue;
          for (let di = -R; di <= R; di++) {
            const ii = i + di;
            if (ii < 0 || ii >= cols) continue;
            const idx = jj * cols + ii;
            if (I[idx] >= 0.05) continue;
            const d = Math.hypot(di * 0.6, dj) / R;
            if (d > 1) continue;
            const g = (1 - d) * (1 - d) * 0.5 * cfg.shine * Math.min(1, (v - 0.88) * 6);
            if (g > G[idx]) G[idx] = g;
          }
        }
      }
    }
  }

  function render(t: number) {
    I.fill(0);
    const reduced = reducedMotion.matches;
    const pulse = reduced ? 1 : 1 + 0.035 * Math.sin(t * 0.8);
    const shimmerC = reduced ? -1 : ((t % cfg.shimmerEvery) / cfg.shimmerEvery) * 1.3 - 0.15;
    for (const side of [1, -1] as const) {
      for (const f of feathers) drawFeather(f, side, t, shimmerC, pulse);
      leadingEdge(side);
    }
    bloom();
    draw(t);
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
    const GAP = 4;
    const runs = new Map<number, string[]>();
    const keyOf = new Int32Array(cols);
    const glyphOf = new Array<string>(cols);
    const grainStep = Math.floor(t * 2);
    for (let j = 0; j < rows; j++) {
      const base = j * cols;
      const y = (j + 0.5) * cellH;
      for (let i = 0; i < cols; i++) {
        const idx = base + i;
        let v = I[idx];
        let col: RGB;
        if (v >= 0.05) {
          const boosted = Math.min(1, v * (1 + 0.08 * cfg.shine));
          col = colorOf(boosted);
          glyphOf[i] = ramp[Math.max(1, Math.round(boosted * rm))];
        } else if (G[idx] > 0.03) {
          v = G[idx];
          const k = Math.min(1, v * 2.2);
          col = [cfg.ivory[0] * k, cfg.ivory[1] * k, cfg.ivory[2] * k];
          glyphOf[i] = ramp[Math.max(1, Math.min(4, Math.round(v * 8)))];
        } else if (cfg.grain > 0 && hash2(i + grainStep * 7, j) < cfg.grain * 0.02) {
          col = [70, 70, 76];
          glyphOf[i] = hash2(i, j + grainStep) < 0.5 ? "." : ",";
        } else {
          keyOf[i] = -1;
          continue;
        }
        keyOf[i] = ((((col[0] | 0) >> 4) & 15) << 8) | ((((col[1] | 0) >> 4) & 15) << 4) | (((col[2] | 0) >> 4) & 15);
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
      const r = ((key >> 8) & 15) << 4, g = ((key >> 4) & 15) << 4, b = (key & 15) << 4;
      c.fillStyle = `rgb(${r + 8},${g + 8},${b + 8})`;
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
  if ("fonts" in document) {
    document.fonts.load(`${cfg.cellSize}px ${fontFamily()}`).then(() => {
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
