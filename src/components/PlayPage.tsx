import { useCallback, useState } from "react";
import { GalleryCard } from "./GalleryCard";
import { GalleryModal } from "./GalleryModal";
import { webProjects, figmaProjects, type Project } from "@/data/projects";

const caseStudies = webProjects.filter((p) => p.caseStudy);

export const PlayPage = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const openProject = useCallback((project: Project) => {
    const i = caseStudies.findIndex((p) => p.id === project.id);
    if (i >= 0) setOpenIndex(i);
  }, []);

  const close = useCallback(() => setOpenIndex(null), []);
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i - 1 + caseStudies.length) % caseStudies.length)),
    []
  );
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i + 1) % caseStudies.length)),
    []
  );

  return (
    <div className="bg-[#0C0C0C] min-h-screen pt-24 pb-16 px-6 md:px-12 text-foreground">
      <header className="mb-16 max-w-4xl">
        <h1 className="text-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
          PLAY
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
          Explorations, concepts, and experiments. A sandbox for the creative process where ideas take shape through motion and interaction design.
        </p>
      </header>

      <section className="mb-20">
        <h2 className="text-mono text-xs uppercase tracking-widest text-muted-foreground mb-8">
          Web Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
          {webProjects.map((project, index) => (
            <GalleryCard key={project.id} project={project} index={index} onOpen={openProject} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-mono text-xs uppercase tracking-widest text-muted-foreground mb-8">
          Figma Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
          {figmaProjects.map((project, index) => (
            <GalleryCard key={project.id} project={project} index={index + webProjects.length} />
          ))}
        </div>
      </section>

      <GalleryModal
        isOpen={openIndex !== null}
        item={openIndex === null ? null : caseStudies[openIndex]}
        currentIndex={openIndex ?? 0}
        totalItems={caseStudies.length}
        onClose={close}
        onPrev={prev}
        onNext={next}
      />
    </div>
  );
};
