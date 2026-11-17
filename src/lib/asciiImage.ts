/* ==========================================================================
   asciiImage.ts — renders an <img> as coloured text characters on a canvas.
   Plain TypeScript, no dependencies. The React wrapper is
   components/AsciiImage.tsx; this file owns sampling, edges and drawing.
   ========================================================================== */

export const ASCII_IMAGE_CONFIG = {
  // Target character cell width in CSS px on desktop. Cell height follows the
  // font's advance ratio so glyphs are not squashed. 6–7px is detailed.
  cellWidth: 6.5,
  // Cell width under 768px; fewer cells keep phones quick.
  cellWidthMobile: 8,
  // Density ramp, dark → bright. Index is picked by cell brightness.
  ramp: " .'`^,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  // Colour boosts so the photo's colours pop on the dark page.
  saturationBoost: 1.35,
  brightnessBoost: 1.2,
  // Sobel edge pass. Strength scales the response; cells above the threshold
  // use directional characters ( | / - \ _ ) instead of the density ramp.
  edgeStrength: 1.0,
  edgeThreshold: 0.32,
  // Cells darker than this (0..1 luminance) are left empty so they blend in.
  darkThreshold: 0.07,
  // Intro "decode" sweep length in ms, top to bottom, played once on scroll-in.
  introDuration: 1200,
  // Cursor radius in CSS px within which characters scramble and settle back.
  hoverRadius: 60,
  // How long a hovered cell scrambles before settling, in ms.
  hoverSettle: 320,
  // Zoom into the centre of the image: 1 shows the whole cover crop, 2 shows the middle half.
  zoom: 1,
  // Play the decode intro when the image scrolls into view. false draws it at once.
  intro: true,
  // Scramble characters near the cursor. false makes the render fully static.
  hover: true,
  // Cap on devicePixelRatio so retina stays sharp without 3x fill cost.
  maxDpr: 2,
  // Canvas font. null reads the site's --font-mono token (Space Mono).
  fontFamily: null as string | null,
};

export type AsciiImageConfig = typeof ASCII_IMAGE_CONFIG;

/* ---------- pure helpers (exported for tests) ---------- */

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function hash2(i: number, j: number) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Rec. 601 luminance in 0..1 from 0..255 channels. */
export function luminance(r: number, g: number, b: number) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Character from the ramp for a 0..1 brightness. */
export function rampChar(ramp: string, level: number) {
  return ramp[clamp(Math.round(clamp(level, 0, 1) * (ramp.length - 1)), 0, ramp.length - 1)];
}

/**
 * Directional character for a Sobel gradient (gx, gy), y down. The stroke
 * runs perpendicular to the gradient: a horizontal gradient is a vertical edge.
 */
export function edgeChar(gx: number, gy: number) {
  const ax = Math.abs(gx);
  const ay = Math.abs(gy);
  if (ax > ay * 2.4) return "|";
  if (ay > ax * 2.4) return gy > 0 ? "_" : "-";
  return gx * gy > 0 ? "/" : "\\";
}

/** Saturation and brightness boost around the channel mean, clamped. */
export function boostColor(r: number, g: number, b: number, sat: number, bright: number): [number, number, number] {
  const m = (r + g + b) / 3;
  return [
    clamp((m + (r - m) * sat) * bright, 0, 255),
    clamp((m + (g - m) * sat) * bright, 0, 255),
    clamp((m + (b - m) * sat) * bright, 0, 255),
  ];
}

/* ---------- renderer ---------- */

export interface AsciiImageOptions extends Partial<AsciiImageConfig> {
  /** Called when the image cannot load or the canvas cannot render. */
  onError?: (err: unknown) => void;
}

/**
 * Mount the renderer on a canvas that fills its parent. The image is drawn
 * object-fit: cover, like the <img> it replaces. Returns a dispose().
 */
export function createAsciiImage(canvas: HTMLCanvasElement, src: string, options: AsciiImageOptions = {}) {
  const cfg = { ...ASCII_IMAGE_CONFIG, ...options };
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    options.onError?.(new Error("2d context unavailable"));
    return () => {};
  }
  const parent = canvas.parentElement ?? canvas;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const noHover = window.matchMedia("(hover: none)");
  const sampler = document.createElement("canvas");
  const sctx = sampler.getContext("2d", { willReadFrequently: true });

  let disposed = false;
  let image: HTMLImageElement | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let cellW = 0;
  let cellH = 0;
  let font = "";
  let advance = 0.6; // glyph advance / font size, measured once

  // Per-cell final state.
  let chars: string[] = [];
  let colors: string[] = [];
  let cellLevels = new Float32Array(0);
  // Animation state: ms timestamps at which each cell starts/stops scrambling.
  let scrambleFrom = new Float64Array(0);
  let scrambleTo = new Float64Array(0);
  let raf = 0;
  let introPlayed = false;
  let introPending = false;
  let resizeTimer = 0;

  const fontFamily = () =>
    cfg.fontFamily ??
    (getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || '"Space Mono", monospace');

  function measureAdvance() {
    ctx!.font = `100px ${fontFamily()}`;
    const w = ctx!.measureText("M").width;
    if (w > 0) advance = w / 100;
  }

  function layout() {
    const rect = parent.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const targetW = window.innerWidth < 768 ? cfg.cellWidthMobile : cfg.cellWidth;
    cols = Math.max(1, Math.floor(width / targetW));
    cellW = width / cols;
    const size = cellW / advance;
    cellH = size;
    rows = Math.max(1, Math.floor(height / cellH));
    cellH = height / rows; // stretch a hair so the grid fills the box exactly
    font = `${size.toFixed(2)}px ${fontFamily()}`;
  }

  /** Sample the image at one pixel per cell (cover crop), then classify cells. */
  function analyse() {
    if (!image || !sctx) return;
    sampler.width = cols;
    sampler.height = rows;
    const boxAspect = (cols * cellW) / (rows * cellH);
    const imgAspect = image.naturalWidth / image.naturalHeight;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;
    if (imgAspect > boxAspect) sw = sh * boxAspect;
    else sh = sw / boxAspect;
    const z = Math.max(1, cfg.zoom);
    sw /= z;
    sh /= z;
    const sx = (image.naturalWidth - sw) / 2;
    const sy = (image.naturalHeight - sh) / 2;
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = "high";
    sctx.clearRect(0, 0, cols, rows);
    sctx.drawImage(image, sx, sy, sw, sh, 0, 0, cols, rows);
    const data = sctx.getImageData(0, 0, cols, rows).data;

    const n = cols * rows;
    const lum = new Float32Array(n);
    for (let i = 0; i < n; i++) lum[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);

    chars = new Array(n);
    colors = new Array(n);
    cellLevels = new Float32Array(n);
    scrambleFrom = new Float64Array(n);
    scrambleTo = new Float64Array(n);

    const L = (x: number, y: number) => lum[clamp(y, 0, rows - 1) * cols + clamp(x, 0, cols - 1)];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const [r, g, b] = boostColor(data[i * 4], data[i * 4 + 1], data[i * 4 + 2], cfg.saturationBoost, cfg.brightnessBoost);
        const level = clamp(lum[i] * cfg.brightnessBoost, 0, 1);
        cellLevels[i] = level;
        if (level < cfg.darkThreshold) {
          chars[i] = "";
          colors[i] = "";
          continue;
        }
        // Sobel on cell luminance.
        const gx = -L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1) + L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1);
        const gy = -L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1) + L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1);
        const mag = (Math.hypot(gx, gy) / 4) * cfg.edgeStrength;
        const isEdge = mag > cfg.edgeThreshold;
        chars[i] = isEdge ? edgeChar(gx, gy) : rampChar(cfg.ramp, level);
        const k = isEdge ? 1.15 : 1;
        // Quantise to 32 levels per channel so equal-looking cells share a fillStyle.
        colors[i] = `rgb(${(clamp(r * k, 0, 255) | 0) & ~7},${(clamp(g * k, 0, 255) | 0) & ~7},${(clamp(b * k, 0, 255) | 0) & ~7})`;
      }
    }
  }

  /** Draw every cell, grouping by colour so fillStyle changes once per group. */
  function draw(now: number) {
    const c = ctx!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, width, height);
    c.font = font;
    c.textBaseline = "middle";
    c.textAlign = "center";
    const groups = new Map<string, number[]>();
    const n = cols * rows;
    const ramp = cfg.ramp;
    const tick = Math.floor(now / 50);
    let animating = false;
    for (let i = 0; i < n; i++) {
      if (!chars[i]) continue;
      if (now < scrambleFrom[i]) {
        animating = true; // not started yet: draw final, keep looping
      } else if (now < scrambleTo[i]) {
        animating = true;
        // Scrambling: random glyph of similar density, slightly dimmed.
        const j = hash2(i, tick);
        const idx = clamp(Math.round(cellLevels[i] * (ramp.length - 1) + (j - 0.5) * 24), 1, ramp.length - 1);
        const key = "s" + colors[i];
        let g = groups.get(key);
        if (!g) groups.set(key, (g = []));
        g.push(i, idx);
        continue;
      }
      let g = groups.get(colors[i]);
      if (!g) groups.set(colors[i], (g = []));
      g.push(i, -1);
    }
    for (const [key, list] of groups) {
      const scrambled = key[0] === "s";
      c.fillStyle = scrambled ? key.slice(1) : key;
      c.globalAlpha = scrambled ? 0.7 : 1;
      for (let k = 0; k < list.length; k += 2) {
        const i = list[k];
        const idx = list[k + 1];
        const x = (i % cols + 0.5) * cellW;
        const y = (Math.floor(i / cols) + 0.5) * cellH;
        c.fillText(idx < 0 ? chars[i] : ramp[idx], x, y);
      }
    }
    c.globalAlpha = 1;
    return animating;
  }

  function loop(now: number) {
    raf = 0;
    if (disposed) return;
    if (draw(now)) raf = requestAnimationFrame(loop);
  }

  function kick() {
    if (!raf && !disposed) raf = requestAnimationFrame(loop);
  }

  function startIntro() {
    introPlayed = true;
    const now = performance.now();
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const sweep = (row / Math.max(1, rows - 1)) * cfg.introDuration * 0.75;
      scrambleFrom[i] = now;
      scrambleTo[i] = now + sweep + cfg.introDuration * 0.25 * hash2(i, 7);
    }
    kick();
  }

  function rebuild() {
    try {
      layout();
      analyse();
      if (reducedMotion.matches || !cfg.intro) {
        introPlayed = true;
        draw(performance.now());
      } else if (introPlayed) {
        draw(performance.now());
      } else if (introPending) {
        startIntro();
      }
      // Otherwise stay blank until the section scrolls into view.
    } catch (err) {
      fail(err);
    }
  }

  function fail(err: unknown) {
    if (disposed) return;
    disposed = true;
    cleanup();
    options.onError?.(err);
  }

  const onMove = (e: PointerEvent) => {
    if (!cfg.hover || noHover.matches || reducedMotion.matches || !introPlayed) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const R = cfg.hoverRadius;
    const now = performance.now();
    const c0 = Math.max(0, Math.floor((mx - R) / cellW));
    const c1 = Math.min(cols - 1, Math.ceil((mx + R) / cellW));
    const r0 = Math.max(0, Math.floor((my - R) / cellH));
    const r1 = Math.min(rows - 1, Math.ceil((my + R) / cellH));
    let touched = false;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const d = Math.hypot((col + 0.5) * cellW - mx, (row + 0.5) * cellH - my);
        if (d > R) continue;
        const i = row * cols + col;
        if (!chars[i]) continue;
        // Ripple: cells further from the cursor start a little later.
        const from = now + (d / R) * 120;
        if (now >= scrambleTo[i] || scrambleFrom[i] > now) {
          scrambleFrom[i] = from;
          scrambleTo[i] = from + cfg.hoverSettle;
          touched = true;
        }
      }
    }
    if (touched) kick();
  };

  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!image || disposed) return;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      rebuild();
    }, 120);
  };

  const ro = new ResizeObserver(onResize);
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      introPending = true;
      io.disconnect();
      if (image && !introPlayed) {
        if (reducedMotion.matches) {
          introPlayed = true;
          draw(performance.now());
        } else startIntro();
      }
    },
    { threshold: 0.2 }
  );

  function cleanup() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    window.clearTimeout(resizeTimer);
    ro.disconnect();
    io.disconnect();
    canvas.removeEventListener("pointermove", onMove);
  }

  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    if (disposed) return;
    image = img;
    measureAdvance();
    rebuild();
    ro.observe(parent);
    canvas.addEventListener("pointermove", onMove, { passive: true });
    if ("fonts" in document) {
      document.fonts.load(`12px ${fontFamily()}`).then(() => {
        if (disposed || !image) return;
        measureAdvance();
        rebuild();
      });
    }
  };
  img.onerror = () => fail(new Error(`image failed to load: ${src}`));
  img.src = src;
  io.observe(canvas);

  return () => {
    disposed = true;
    cleanup();
  };
}
