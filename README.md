# Earl Portfolio

This repository contains Earl's personal portfolio site — projects showcasing Web3, UI/UX, Full Stack and Systems work.

How to run locally

```bash
npm install
npm run dev
```

Notes

- Replace the placeholder images in `public/` with your project screenshots (e.g. `wave-portal.png`, `upark.png`, etc.).
- This repo has been debranded to remove mentions of the original generator.

## ASCII black hole (hero)

The Play section opens on a full-viewport, Interstellar-style black hole drawn
entirely from monospace characters on a `<canvas>`. No 3D library: it is a
hand-written field function (shadow, photon ring, Doppler-beamed accretion disk,
lensed far side) sampled per character cell, with a blurred additive bloom.

- `src/lib/blackhole.ts` — the renderer. Every tunable is in `BLACK_HOLE_CONFIG`
  at the top of the file (character size, density ramp, hole size, disk radii and
  tilt, roll, rotation speed, Doppler strength, glow, flicker, star density,
  parallax, DPR cap, palette `fire` | `ice`, font).
- `src/components/BlackHole.tsx` — React wrapper; renders a transparent,
  `aria-hidden` canvas that fills its parent. Props override the config per mount.
- Used in `src/components/PlayPage.tsx` as the hero background. The project gallery lives in
  `src/components/WorkPage.tsx` (the Work tab, which is the landing page).

Behaviour: pauses when offscreen or the tab is hidden, resizes with its parent,
renders a single still frame under `prefers-reduced-motion`, mouse parallax on
pointer devices and a slow automatic drift on touch devices, larger glyphs under
768px.

## Background scene (Work and About)

Koi, jellyfish or dragonflies drift on a cell grid behind the Work and About tabs. The
single ↻ button in the nav cycles Dragonflies → Koi → Jellyfish; the choice is remembered
in localStorage. The Play tab has no scene.

- `src/lib/asciiAnimals.ts` — simulation and renderer, adapted from
  [ASCII Animals New Tab](https://github.com/Pawan-webdeveloper/Ascii-Animals-extension)
  by Pawan-webdeveloper (MIT), trimmed to three animals and a transparent canvas.
  Tunables in `ASCII_ANIMALS_CONFIG` (theme `mono` | `color`, accent, cell size, density, speed,
  size, depth, sway, trails). The default `mono` theme tones the animals to greys with the site's
  orange accent on their coloured parts so they sit inside the portfolio palette.
- `src/components/AsciiAnimals.tsx` — fixed full-viewport canvas behind the page.
- Wiring (which tabs show it, the cycle button, persistence) lives in `src/pages/Index.tsx`.
