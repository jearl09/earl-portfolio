/* ==========================================================================
   blackhole.ts — an ASCII-art Gargantua rendered on a 2D <canvas>.
   Plain TypeScript, no dependencies. The React wrapper lives in
   components/BlackHole.tsx; this file owns the maths and the draw loop.

   Everything tunable sits in BLACK_HOLE_CONFIG below. Units: the shadow
   (event horizon) radius is 1, so a disk radius of 5.6 means 5.6 shadow radii.
   ========================================================================== */

export type PaletteName = "fire" | "ice";

export const BLACK_HOLE_CONFIG = {
  // Glyph cell height in CSS px on desktop. Smaller = denser and more detail,
  // but more glyphs to draw per frame. 7–9 reads well.
  charSize: 8,
  // Glyph cell height under 768px. Larger cells keep phones at 30fps+.
  charSizeMobile: 9,
  // Density ramp, dim → bright. Brightness picks the index, flicker jitters it.
  ramp: " `.,':;-~\"^+=*!<>?rcvzxo0OXZ#%&8$@BMW",
  // Shadow radius as a fraction of the viewport height (also capped by width).
  holeSize: 0.16,
  // Accretion disk inner and outer radius, in shadow radii.
  diskInner: 1.28,
  diskOuter: 5.6,
  // Disk tilt: vertical squash of the front ellipse. 0 = edge on, 1 = face on.
  // 0.21 is roughly 12° above the disk plane.
  diskTilt: 0.21,
  // Roll of the whole system in degrees, clockwise.
  rollDeg: 12,
  // Angular speed of the inner disk edge in radians per second. Outer rings
  // orbit slower (Keplerian, ∝ r^-1.5) so streaks shear as they rotate.
  rotationSpeed: 0.5,
  // Doppler beaming: how much brighter the approaching (left) side is. 0 = even.
  doppler: 0.45,
  // Bloom strength for the blurred additive passes. 0 disables glow.
  glow: 1,
  // Per-glyph shimmer: how far a character may jump along the ramp. 0 = still.
  flicker: 0.6,
  // Background stars per cell. 0.012 is about one star per 80 cells.
  starDensity: 0.012,
  // Mouse parallax amount. 0 disables. Touch devices drift automatically.
  parallax: 1,
  // Cap on devicePixelRatio. 2 keeps retina crisp without 3x fill cost.
  maxDpr: 2,
  // Colour variant. "fire" matches the site's orange accent; "ice" is cool-toned.
  palette: "fire" as PaletteName,
  // Canvas font. null reads the site's --font-mono token (Space Mono).
  fontFamily: null as string | null,
};

export type BlackHoleConfig = typeof BLACK_HOLE_CONFIG;

/* Colour stops: [normalised brightness 0..1, r, g, b]. Dim outer fringe first,
   white-hot inner edge last. */
export const PALETTES: Record<PaletteName, [number, number, number, number][]> = {
  fire: [
    [0.0, 104, 20, 6],
    [0.12, 150, 34, 8],
    [0.3, 196, 62, 10],
    [0.48, 236, 110, 18],
    [0.66, 255, 160, 44],
    [0.8, 255, 204, 110],
    [0.9, 255, 232, 176],
    [1.0, 255, 252, 240],
  ],
  ice: [
    [0.0, 10, 28, 96],
    [0.12, 16, 52, 150],
    [0.3, 16, 80, 190],
    [0.48, 32, 130, 230],
    [0.66, 90, 190, 255],
    [0.8, 160, 225, 255],
    [0.9, 210, 242, 255],
    [1.0, 245, 252, 255],
  ],
};

const TWO_PI = Math.PI * 2;
const BUCKETS = 18; // colour groups; fillStyle is set once per bucket per frame
const STAR_BUCKETS = 3;
const MAX_INTENSITY = 1.35; // raw intensity that maps to the top of the palette
const STAR_GREYS = ["#3a3a3a", "#585858", "#7a7a7a"];
const STAR_CHARS = ".,'*";

/* ---------- small maths helpers (exported for tests) ---------- */

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Integer hash → [0, 1). Cheap and stable across frames. */
export function hash2(i: number, j: number) {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Value noise, periodic along y with the given integer period (for angles). */
export function pnoise(x: number, y: number, period: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let fx = x - xi;
  let fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const y0 = ((yi % period) + period) % period;
  const y1 = (y0 + 1) % period;
  const a = hash2(xi, y0);
  const b = hash2(xi + 1, y0);
  const c = hash2(xi, y1);
  const d = hash2(xi + 1, y1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Palette colour at normalised brightness t in [0, 1]. */
export function paletteColor(name: PaletteName, t: number): [number, number, number] {
  const stops = PALETTES[name];
  const v = clamp(t, 0, 1);
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [t0, r0, g0, b0] = stops[i - 1];
      const [t1, r1, g1, b1] = stops[i];
      const k = (v - t0) / (t1 - t0);
      return [r0 + (r1 - r0) * k, g0 + (g1 - g0) * k, b0 + (b1 - b0) * k];
    }
  }
  const last = stops[stops.length - 1];
  return [last[1], last[2], last[3]];
}

/* ---------- the field: brightness and disk coordinates at a screen point ---------- */

export interface FieldOptions {
  diskInner: number;
  diskOuter: number;
  tilt: number;
  rotationSpeed: number;
  doppler: number;
  /** Photon ring half-width in shadow radii. Kept ≥ one glyph cell so it never breaks up. */
  ringWidth?: number;
}

/** Disk surface texture at polar disk coords (radius, angle) and time. */
function diskTexture(rho: number, phi: number, t: number, o: FieldOptions) {
  // Keplerian: inner material laps the outer rings.
  const omega = o.rotationSpeed * Math.pow(o.diskInner / rho, 1.5);
  let a = (phi - omega * t) / TWO_PI;
  a -= Math.floor(a);
  // Concentric striations, keyed by radius only.
  const bands = 0.65 + 0.35 * Math.sin(rho * 7.5 + 1.3 * Math.sin(rho * 1.9));
  // Broad streaks that follow the orbit, plus finer sheared ones.
  const n1 = pnoise(rho * 1.6, a * 10, 10);
  const n2 = pnoise(rho * 4.5 + 7.3, a * 26 + rho * 1.5, 26);
  return bands * (0.6 + 0.55 * n1) * (0.75 + 0.45 * n2);
}

/** Temperature falloff: white-hot at the inner edge, dark red at the fringe. */
function diskHeat(rho: number, o: FieldOptions) {
  const heat = Math.pow(o.diskInner / rho, 1.0);
  const outer = smoothstep(o.diskOuter, o.diskOuter - 1.6, rho);
  const inner = smoothstep(o.diskInner - 0.02, o.diskInner + 0.12, rho);
  return heat * outer * inner;
}

/**
 * Raw brightness at screen point (x, y) in shadow radii, after roll is removed.
 * y grows downward. Returns 0 for the shadow and empty space.
 */
export function fieldAt(x: number, y: number, t: number, o: FieldOptions): number {
  const r = Math.hypot(x, y);
  // Approaching side (left) is beamed brighter, receding side dimmer.
  const dop = 1 + o.doppler * (r > 1e-6 ? -x / r : 0);
  let I = 0;

  // 1. Near side of the disk: a flattened ellipse passing in front of the shadow.
  if (y >= 0) {
    const v = y / o.tilt;
    const rho = Math.hypot(x, v);
    if (rho >= o.diskInner - 0.02 && rho <= o.diskOuter) {
      I = diskHeat(rho, o) * diskTexture(rho, Math.atan2(v, x), t, o) * dop * 1.55;
    }
  }

  // 2. Event horizon: pure black unless the near disk covers it.
  if (r < 1) return I;

  // 3. Photon ring hugging the shadow. Dimmer where the near disk is in front.
  const rw = o.ringWidth ?? 0.045;
  const ring = 1.5 * Math.exp(-Math.pow((r - 1 - rw) / rw, 2));
  I += ring * (0.8 + 0.4 * dop) * (I > 0 ? 0.35 : 1);

  if (y < 0) {
    // 4a. Far side. Away from the hole it is the thin upper half of the
    //     ellipse; near the hole gravity lifts it into a thick arc over the
    //     top. Blend the two mappings by angle: pure arc at the top, pure
    //     ellipse at the sides so the arc merges into the band.
    const theta = Math.atan2(-y, x); // 0 at right, π/2 at top, π at left
    const sinT = Math.sin(theta);
    const w = Math.pow(sinT, 0.7);
    const vThin = y / o.tilt;
    const rhoThin = Math.hypot(x, vThin);
    const phiThin = Math.atan2(vThin, x);
    const thick = 0.12 + 1.0 * Math.pow(sinT, 1.2);
    const sArc = (r - 1) / thick;
    const rhoArc = o.diskInner + Math.pow(sArc, 1.4) * (o.diskOuter - o.diskInner);
    const rho = rhoThin + (rhoArc - rhoThin) * w;
    const phi = phiThin + (-theta - phiThin) * w;
    if (rho >= o.diskInner - 0.02 && rho <= o.diskOuter) {
      I += diskHeat(rho, o) * diskTexture(rho, phi, t, o) * dop * 1.5;
    }
  } else {
    // 4b. Secondary image wrapping under the bottom: thin and fainter.
    const theta = Math.atan2(y, x);
    const thick = 0.07 + 0.22 * Math.pow(Math.sin(theta), 1.5);
    const s = (r - 1) / thick;
    if (s < 1) {
      const rho = o.diskInner + Math.pow(s, 1.3) * (3.2 - o.diskInner);
      I += diskHeat(rho, o) * diskTexture(rho, -theta, t, o) * dop * 0.8 * smoothstep(1, 0.6, s);
    }
  }

  return I;
}

/* ---------- renderer ---------- */

export interface BlackHoleOptions extends Partial<BlackHoleConfig> {
  /** Vertical position of the hole centre as a fraction of the canvas height. */
  centerY?: number;
}

interface Star {
  cell: number;
  base: number;
  speed: number;
  phase: number;
  ch: string;
}

/**
 * Mount the renderer on a canvas that fills its parent. Returns a dispose().
 * The canvas stays transparent so the page background shows through.
 */
export function createBlackHole(canvas: HTMLCanvasElement, options: BlackHoleOptions = {}) {
  const cfg = { ...BLACK_HOLE_CONFIG, ...options };
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => {};

  const parent = canvas.parentElement ?? canvas;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const noHover = window.matchMedia("(hover: none)");
  const hasFilter = "filter" in ctx;

  const glowA = document.createElement("canvas");
  const glowB = document.createElement("canvas");
  const gA = glowA.getContext("2d")!;
  const gB = glowB.getContext("2d")!;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let cellW = 8;
  let cellH = 8;
  let isMobile = false;
  let font = "";
  let stars: Star[] = [];
  let starAt = new Int32Array(0);
  let bucketOf = new Int8Array(0);
  let charOf = new Uint8Array(0);
  const bucketColors: string[] = [];
  const runs: { x: number; y: number; s: string }[][] = [];
  for (let b = 0; b < BUCKETS + STAR_BUCKETS; b++) runs.push([]);

  let raf = 0;
  let last = 0;
  let time = 0;
  let intersecting = true;
  let disposed = false;
  let dirty = true;

  // Parallax: target and eased current values in [-1, 1].
  const target = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };

  const fontFamily = () =>
    cfg.fontFamily ??
    (getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || '"Space Mono", monospace');

  for (let b = 0; b < BUCKETS; b++) {
    const [r, g, bl] = paletteColor(cfg.palette, (b + 0.5) / BUCKETS);
    bucketColors.push(`rgb(${r | 0},${g | 0},${bl | 0})`);
  }
  bucketColors.push(...STAR_GREYS);

  function measure() {
    isMobile = window.innerWidth < 768;
    const size = isMobile ? cfg.charSizeMobile : cfg.charSize;
    font = `${size}px ${fontFamily()}`;
    ctx!.font = font;
    const m = ctx!.measureText("M");
    cellW = m.width || size * 0.6;
    cellH = size;
  }

  function resize() {
    const rect = parent.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    measure();
    cols = Math.ceil(width / cellW);
    rows = Math.ceil(height / cellH);
    bucketOf = new Int8Array(cols * rows);
    charOf = new Uint8Array(cols * rows);
    glowA.width = Math.max(1, Math.round(canvas.width * 0.25));
    glowA.height = Math.max(1, Math.round(canvas.height * 0.25));
    glowB.width = Math.max(1, Math.round(canvas.width * 0.1));
    glowB.height = Math.max(1, Math.round(canvas.height * 0.1));
    seedStars();
    dirty = true;
  }

  function seedStars() {
    stars = [];
    starAt = new Int32Array(cols * rows).fill(-1);
    for (let i = 0; i < cols * rows; i++) {
      if (hash2(i, 991) < cfg.starDensity) {
        const b = hash2(i, 17);
        starAt[i] = stars.length;
        stars.push({
          cell: i,
          base: 0.35 + 0.65 * b,
          speed: 0.6 + 1.8 * hash2(i, 29),
          phase: TWO_PI * hash2(i, 43),
          ch: STAR_CHARS[Math.min(STAR_CHARS.length - 1, Math.floor(b * b * STAR_CHARS.length))],
        });
      }
    }
  }

  function render(t: number) {
    const c = ctx!;
    const ramp = cfg.ramp;
    const rampMax = ramp.length - 1;

    // Camera: hole centre, scale, roll and tilt, nudged by parallax.
    const px = eased.x * cfg.parallax;
    const py = eased.y * cfg.parallax;
    const R = Math.min(height * cfg.holeSize, width * (isMobile ? 0.2 : 0.12));
    const cx = width * 0.5 + px * width * 0.025;
    const cy = height * (cfg.centerY ?? (isMobile ? 0.42 : 0.5)) + py * height * 0.02;
    const roll = ((cfg.rollDeg + px * 2.5) * Math.PI) / 180;
    const cosR = Math.cos(roll);
    const sinR = Math.sin(roll);
    const field: FieldOptions = {
      diskInner: cfg.diskInner,
      diskOuter: cfg.diskOuter,
      tilt: cfg.diskTilt * (1 + 0.35 * py),
      rotationSpeed: cfg.rotationSpeed,
      doppler: cfg.doppler,
      ringWidth: Math.max(0.045, (0.55 * cellH) / R),
    };
    const limitX = cfg.diskOuter + 0.3;
    const limitY = Math.max(cfg.diskOuter * field.tilt + 0.4, 2.4);
    const flickStep = Math.floor(t * 7);

    for (let b = 0; b < runs.length; b++) runs[b].length = 0;

    for (let row = 0; row < rows; row++) {
      const sy = ((row + 0.5) * cellH - cy) / R;
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const sx = ((col + 0.5) * cellW - cx) / R;
        // Undo the roll so the field is sampled in disk-aligned space.
        const x = sx * cosR + sy * sinR;
        const y = -sx * sinR + sy * cosR;
        let I = 0;
        if (Math.abs(x) <= limitX && Math.abs(y) <= limitY) I = fieldAt(x, y, t, field);

        if (I > 0.02) {
          const j = hash2(i, flickStep);
          I *= 1 + (j - 0.5) * 0.14 * cfg.flicker;
          const level = clamp(I / MAX_INTENSITY, 0, 1);
          const ci = clamp(Math.round(level * rampMax + (j - 0.5) * 2.4 * cfg.flicker), 1, rampMax);
          bucketOf[i] = Math.min(BUCKETS - 1, Math.floor(level * BUCKETS));
          charOf[i] = ci;
        } else {
          const s = starAt[i];
          if (s >= 0) {
            const st = stars[s];
            const tw = st.base * (0.55 + 0.45 * Math.sin(t * st.speed + st.phase));
            bucketOf[i] = BUCKETS + Math.min(STAR_BUCKETS - 1, Math.floor(tw * STAR_BUCKETS));
            charOf[i] = 255; // star glyph marker
          } else {
            bucketOf[i] = -1;
          }
        }
      }
    }

    // One string per row per colour bucket: glyphs of other buckets become
    // spaces (which paint nothing), so fillStyle is set once per bucket and
    // the call count stays near rows × buckets instead of one per glyph run.
    const first = new Int16Array(runs.length);
    const lastCol = new Int16Array(runs.length);
    for (let row = 0; row < rows; row++) {
      first.fill(-1);
      const base = row * cols;
      for (let col = 0; col < cols; col++) {
        const b = bucketOf[base + col];
        if (b < 0) continue;
        if (first[b] < 0) first[b] = col;
        lastCol[b] = col;
      }
      const y = (row + 0.5) * cellH;
      for (let b = 0; b < runs.length; b++) {
        if (first[b] < 0) continue;
        let str = "";
        for (let col = first[b]; col <= lastCol[b]; col++) {
          const i = base + col;
          if (bucketOf[i] !== b) str += " ";
          else str += charOf[i] === 255 ? stars[starAt[i]].ch : ramp[charOf[i]];
        }
        runs[b].push({ x: first[b] * cellW, y, s: str });
      }
    }

    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, width, height);
    c.font = font;
    c.textBaseline = "middle";
    c.textAlign = "left";
    for (let b = 0; b < runs.length; b++) {
      const list = runs[b];
      if (!list.length) continue;
      c.fillStyle = bucketColors[b];
      for (let k = 0; k < list.length; k++) c.fillText(list[k].s, list[k].x, list[k].y);
    }
    if (cfg.glow > 0) drawGlow();
  }

  /** Bloom: blurred, downscaled copies of the glyph layer added back on top. */
  function drawGlow() {
    const c = ctx!;
    const passes: [HTMLCanvasElement, CanvasRenderingContext2D, number, number][] = isMobile
      ? [[glowB, gB, 2, 0.8]]
      : [
          [glowA, gA, 3, 0.55],
          [glowB, gB, 2, 0.5],
        ];
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "lighter";
    c.imageSmoothingEnabled = true;
    for (const [gc, g, blur, alpha] of passes) {
      g.clearRect(0, 0, gc.width, gc.height);
      if (hasFilter) g.filter = `blur(${blur}px)`;
      g.drawImage(canvas, 0, 0, gc.width, gc.height);
      if (hasFilter) g.filter = "none";
      c.globalAlpha = alpha * cfg.glow;
      c.drawImage(gc, 0, 0, canvas.width, canvas.height);
    }
    c.restore();
  }

  function running() {
    return !disposed && intersecting && !document.hidden && !reducedMotion.matches;
  }

  function frame(now: number) {
    raf = 0;
    if (!running()) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    time += dt;
    if (noHover.matches) {
      // Touch: slow automatic drift instead of mouse parallax.
      target.x = Math.sin(time * 0.17) * 0.6;
      target.y = Math.cos(time * 0.11) * 0.5;
    }
    eased.x += (target.x - eased.x) * 0.045;
    eased.y += (target.y - eased.y) * 0.045;
    render(time);
    raf = requestAnimationFrame(frame);
  }

  function schedule() {
    if (disposed) return;
    if (reducedMotion.matches) {
      // One still frame; re-rendered only on resize or font load.
      if (dirty) {
        eased.x = eased.y = 0;
        render(1.5);
        dirty = false;
      }
      return;
    }
    if (!raf && running()) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const onMove = (e: PointerEvent) => {
    if (noHover.matches || cfg.parallax === 0) return;
    const rect = canvas.getBoundingClientRect();
    target.x = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    target.y = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
  };
  const onLeave = () => {
    target.x = 0;
    target.y = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : schedule());
  const onMotionChange = () => {
    stop();
    dirty = true;
    schedule();
  };

  const ro = new ResizeObserver(() => {
    resize();
    schedule();
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

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerleave", onLeave);
  document.addEventListener("visibilitychange", onVisibility);
  reducedMotion.addEventListener("change", onMotionChange);

  // Space Mono may arrive after first paint; re-measure cells once it does.
  if ("fonts" in document) {
    document.fonts.load(`${cfg.charSize}px ${fontFamily()}`).then(() => {
      if (disposed) return;
      resize();
      schedule();
    });
  }

  resize();
  schedule();

  return () => {
    disposed = true;
    stop();
    ro.disconnect();
    io.disconnect();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    reducedMotion.removeEventListener("change", onMotionChange);
  };
}
