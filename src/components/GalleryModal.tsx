import { useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { metaRow, type Project } from "@/data/projects";

interface GalleryModalProps {
  isOpen: boolean;
  item: Project | null;
  currentIndex: number;
  totalItems: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section>
    <h3 className="text-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">{label}</h3>
    {children}
  </section>
);

export const GalleryModal = ({
  isOpen,
  item,
  currentIndex,
  totalItems,
  onClose,
  onPrev,
  onNext,
}: GalleryModalProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    },
    [isOpen, onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Scroll back to the top when switching projects
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [item?.id]);

  if (!isOpen || !item) return null;

  const cs = item.caseStudy;

  return (
    <div
      className="modal-backdrop flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-study-title"
    >
      {/* Controls */}
      <div className="shrink-0 px-4 py-4 md:px-8 md:py-6 flex items-center justify-between border-b border-border bg-background/80">
        <div className="flex items-center gap-4">
          <button
            onClick={onPrev}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs font-mono text-muted-foreground">
          {currentIndex + 1}/{totalItems}
        </span>

        <button
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Close
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="w-full max-w-5xl mx-auto px-4 py-8 md:px-8 md:py-12 slide-up">
          <div className="aspect-video overflow-hidden bg-card mb-8 relative">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover object-top filter grayscale-[40%] opacity-90"
            />
            {item.status === "ARCHIVED" && (
              <span className="absolute top-3 left-3 text-mono text-[10px] uppercase tracking-widest text-foreground/80 border border-foreground/30 bg-background/70 px-2 py-1">
                Archived
              </span>
            )}
          </div>

          <header className="mb-10 md:mb-12">
            <h2 id="case-study-title" className="text-display text-3xl md:text-5xl font-bold mb-3 tracking-tight">
              {item.title}
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-4">{item.tagline}</p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-mono text-xs uppercase tracking-widest text-muted-foreground">{metaRow(item)}</span>
              {item.link ? (
                <a
                  href={item.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mono text-xs uppercase tracking-widest text-foreground hover:text-accent transition-colors"
                >
                  {item.link.label} ↗
                </a>
              ) : item.status === "ARCHIVED" ? (
                <span className="text-mono text-xs uppercase tracking-widest text-muted-foreground/70">No longer live</span>
              ) : null}
            </div>
          </header>

          {cs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 border-t border-border pt-10">
              <Section label="Overview">
                <div className="space-y-3">
                  {cs.overview.map((p, i) => (
                    <p key={i} className="text-sm text-foreground/90 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              </Section>

              <Section label="How it works">
                <ol className="space-y-3">
                  {cs.howItWorks.map((p, i) => (
                    <li key={i} className="flex gap-4 text-sm text-foreground/90 leading-relaxed">
                      <span className="text-mono text-xs text-muted-foreground pt-1 shrink-0 w-6">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
              </Section>

              <Section label="Stack">
                <ul className="flex flex-wrap gap-2">
                  {cs.stack.map((s) => (
                    <li
                      key={s}
                      className="text-mono text-[11px] uppercase tracking-wider text-foreground/90 border border-border px-2.5 py-1"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </Section>

              <Section label="My role">
                <div className="space-y-3">
                  {cs.role.map((p, i) => (
                    <p key={i} className="text-sm text-foreground/90 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
