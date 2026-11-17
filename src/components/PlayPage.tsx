import { ArrowUpRight } from "lucide-react";
import { AsciiImage } from "./AsciiImage";
import { BlackHole } from "./BlackHole";
import { Hourglass } from "./Hourglass";
import { Meadow } from "./Meadow";
import { Wings } from "./Wings";

const SOURCE_URL = "https://github.com/jearl09/earl-portfolio/blob/main/src/lib/blackhole.ts";
const HOURGLASS_SOURCE_URL = "https://github.com/jearl09/earl-portfolio/blob/main/src/lib/hourglass.ts";
const MEADOW_SOURCE_URL = "https://github.com/jearl09/earl-portfolio/blob/main/src/lib/meadow.ts";
const WINGS_SOURCE_URL = "https://github.com/jearl09/earl-portfolio/blob/main/src/lib/wings.ts";

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

const meadowNotes = [
  ["Render", "Vector stems, leaves and petals rasterised into a character grid every frame"],
  ["Species", "Delphinium, aster, agapanthus, globe thistle, anemone, columbine, sea holly"],
  ["Depth", "Far plants sit at the horizon, small and faded; near blades overlap the blooms"],
  ["Motion", "Grass grows first, flowers open front to back, a breeze rolls left to right with a gust every nine seconds"],
];

const wingsNotes = [
  ["Render", "Procedural feathers rasterised into a 6px character grid, each cell coloured shadow → silver → white"],
  ["Anatomy", "Shoulder, elbow, wrist, tip; tertials, secondaries, primaries, three tiers of coverts, scapulars"],
  ["Shine", "The brightest cells bloom ivory into the empty cells around them; a band of light sweeps root to tip"],
  ["Motion", "A still, spread pose that only breathes in the breeze; a static frame under reduced motion"],
];

export const PlayPage = () => {
  return (
    <div className="bg-[#0C0C0C] text-foreground">
      {/* Hero: ASCII black hole as the full-viewport backdrop, heading layered on top */}
      <header className="relative h-[100svh] min-h-[560px] overflow-hidden">
        {/* Deep field behind the hole: Hubble Ultra Deep Field 2014 (NASA/ESA) as dim colour ASCII,
            faded out around the centre so the shadow and photon ring stay clean */}
        <div
          className="absolute inset-0 opacity-50 md:opacity-60 [mask-image:radial-gradient(ellipse_70%_40%_at_50%_42%,transparent_14%,black_78%)] md:[mask-image:radial-gradient(ellipse_52%_48%_at_50%_50%,transparent_8%,black_72%)]"
          aria-hidden="true"
        >
          <AsciiImage src="/deep-field.jpg" alt="" intro={false} hover={false} zoom={1.7} cellWidth={7} cellWidthMobile={8} brightnessBoost={1.35} saturationBoost={1.6} darkThreshold={0.06} edgeThreshold={0.55} />
        </div>
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
            <span className="hidden md:inline">Made with code &middot; field: NASA/ESA Hubble UDF 2014</span>
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

        <div className="max-w-6xl mt-24">
          <div className="aspect-[4/5] md:aspect-[2/1] w-full overflow-hidden">
            <Meadow />
          </div>
          <div className="grid md:grid-cols-2 gap-12 mt-10">
            <div>
              <h3 className="text-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
                <span className="text-accent text-mono text-xs align-top mr-3">03</span>
                Meadow
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                A field of blue flowers seen from grass height. Seven species are drawn from their real
                forms, each plant carries a depth that sets its size, brightness and draw order, and the
                whole thing is rasterised into characters every frame as it grows and moves in the wind.
              </p>
              <a
                href={MEADOW_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-mono text-xs uppercase tracking-widest text-foreground hover:text-accent transition-colors duration-300"
              >
                View source <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <dl className="border-t border-border">
              {meadowNotes.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_1fr] gap-4 py-4 border-b border-border">
                  <dt className="text-mono text-xs uppercase tracking-widest text-muted-foreground">{k}</dt>
                  <dd className="text-sm text-foreground/85 leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="max-w-6xl mt-24">
          <div className="aspect-[4/3] md:aspect-[12/5] w-full overflow-hidden">
            <Wings />
          </div>
          <div className="grid md:grid-cols-2 gap-12 mt-10">
            <div>
              <h3 className="text-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
                <span className="text-accent text-mono text-xs align-top mr-3">04</span>
                Wings
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                A pair of white wings built feather by feather on a real wing skeleton and drawn as text. Every
                feather has a bright shaft, barbed vanes and darker edges so the overlaps read; the brightest
                cells bloom into the dark around them while a band of light sweeps from root to tip.
              </p>
              <a
                href={WINGS_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-mono text-xs uppercase tracking-widest text-foreground hover:text-accent transition-colors duration-300"
              >
                View source <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <dl className="border-t border-border">
              {wingsNotes.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_1fr] gap-4 py-4 border-b border-border">
                  <dt className="text-mono text-xs uppercase tracking-widest text-muted-foreground">{k}</dt>
                  <dd className="text-sm text-foreground/85 leading-relaxed">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </div>
  );
};
