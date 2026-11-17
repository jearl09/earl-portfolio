import { ArrowUpRight } from "lucide-react";
import { BlackHole } from "./BlackHole";
import { Hourglass } from "./Hourglass";

const SOURCE_URL = "https://github.com/jearl09/earl-portfolio/blob/main/src/lib/blackhole.ts";
const HOURGLASS_SOURCE_URL = "https://github.com/jearl09/earl-portfolio/blob/main/src/lib/hourglass.ts";

const notes = [
  ["Render", "2D canvas, monospace glyphs, one string per row per colour"],
  ["Physics", "Shadow, photon ring, Doppler-beamed disk, lensed far side"],
  ["Motion", "Keplerian shear, shimmer, mouse parallax, bloom"],
  ["Weight", "Zero dependencies, pauses offscreen, honours reduced motion"],
];

const hourglassNotes = [
  ["Render", "Orthographic rays, raymarched signed distance fields, 96 \u00d7 66 cells"],
  ["Model", "Caps, inset rings, three turned pillars, glass shell, volume-accurate sand"],
  ["Time", "Top bulb holds what is left of the hour; it flips over at :00"],
  ["Weight", "Zero dependencies, pauses offscreen, still frame under reduced motion"],
];

export const PlayPage = () => {
  return (
    <div className="bg-[#0C0C0C] text-foreground">
      {/* Hero: ASCII black hole as the full-viewport backdrop, heading layered on top */}
      <header className="relative h-[100svh] min-h-[560px] overflow-hidden">
        <div className="absolute inset-0">
          <BlackHole />
        </div>
        {/* Scrim keeps the copy readable where the disk glows behind it */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0C0C0C] via-[#0C0C0C]/70 to-transparent"
          aria-hidden="true"
        />
        <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-16 md:px-12 md:pb-20">
          <div className="max-w-4xl [text-shadow:0_2px_24px_rgba(12,12,12,0.9)]">
            <h1 className="text-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              PLAY
            </h1>
            <p className="text-foreground/75 text-lg md:text-xl max-w-2xl leading-relaxed">
              Explorations, concepts, and experiments. A sandbox for the creative process where ideas take shape through motion and interaction design.
            </p>
          </div>
          <div className="mt-10 flex items-center justify-between text-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>
              <span className="text-accent">01</span> &nbsp;Gargantua &middot; ASCII &middot; canvas
            </span>
            <span className="hidden md:inline">Made with code</span>
          </div>
        </div>
      </header>

      <section className="px-6 md:px-12 pt-20 pb-24">
        <h2 className="text-mono text-xs uppercase tracking-widest text-muted-foreground mb-8">
          Experiments
        </h2>
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl">
          <div>
            <h3 className="text-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
              <span className="text-accent text-mono text-xs align-top mr-3">01</span>
              Gargantua, in text
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              An Interstellar-style black hole drawn entirely from characters. No 3D library: a hand-written field
              function decides how bright each cell is, picks a glyph from a density ramp, and a blurred additive pass
              makes the text glow. Move the mouse to tilt the view.
            </p>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-mono text-xs uppercase tracking-widest text-foreground hover:text-accent transition-colors duration-300"
            >
              View source <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <dl className="border-t border-border">
            {notes.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[6rem_1fr] gap-4 py-4 border-b border-border">
                <dt className="text-mono text-xs uppercase tracking-widest text-muted-foreground">{k}</dt>
                <dd className="text-sm text-foreground/85 leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mt-24 items-start">
          <div className="order-2 md:order-1">
            <h3 className="text-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
              <span className="text-accent text-mono text-xs align-top mr-3">02</span>
              Hourglass
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              A turned-wood hourglass rendered by casting a ray through every character cell and marching
              signed distance fields: no 3D library. The glass is a thin shell with a Fresnel rim, the sand
              volume is integrated so what leaves the top lands in the bottom, and the top bulb empties with
              the hour on your clock.
            </p>
            <a
              href={HOURGLASS_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-mono text-xs uppercase tracking-widest text-foreground hover:text-accent transition-colors duration-300 mb-10"
            >
              View source <ArrowUpRight className="h-4 w-4" />
            </a>
            <dl className="border-t border-border">
              {hourglassNotes.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_1fr] gap-4 py-4 border-b border-border">
                  <dt className="text-mono text-xs uppercase tracking-widest text-muted-foreground">{k}</dt>
                  <dd className="text-sm text-foreground/85 leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="order-1 md:order-2 flex justify-center md:justify-end">
            <Hourglass />
          </div>
        </div>
      </section>
    </div>
  );
};
