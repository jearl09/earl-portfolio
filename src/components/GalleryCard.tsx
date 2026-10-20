import { cn } from "@/lib/utils";
import { metaRow, type Project } from "@/data/projects";

interface GalleryCardProps {
  project: Project;
  index: number;
  onOpen?: (project: Project) => void;
}

export const GalleryCard = ({ project, index, onOpen }: GalleryCardProps) => {
  const { image, title, category, tagline, status, link, caseStudy } = project;
  const archived = status === "ARCHIVED";
  const hasCaseStudy = Boolean(caseStudy && onOpen);

  const open = () => onOpen?.(project);

  const tile = (
    <div className="aspect-square overflow-hidden bg-card relative">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover object-top transform transition-all duration-300 filter grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
        loading="lazy"
      />

      {archived && (
        <span className="absolute top-3 left-3 z-10 text-mono text-[10px] uppercase tracking-widest text-foreground/80 border border-foreground/30 bg-background/70 px-2 py-1">
          Archived
        </span>
      )}

      {/* Hover overlay: bold uppercase title and category */}
      <div className="absolute inset-0 flex items-end p-4 pointer-events-none">
        <div className="w-full text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-sm font-bold uppercase leading-tight text-foreground">{title}</h3>
          <span className="text-xs font-mono uppercase text-muted-foreground">{category}</span>
        </div>
      </div>
    </div>
  );

  return (
    <article
      className={cn("gallery-card group flex flex-col", "opacity-0 animate-fade-up")}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "forwards" }}
    >
      {hasCaseStudy ? (
        <button
          type="button"
          onClick={open}
          className="block w-full text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label={`${title}: view case study`}
        >
          {tile}
        </button>
      ) : link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          aria-label={`${title}: ${link.label}`}
        >
          {tile}
        </a>
      ) : (
        tile
      )}

      {/* Always-visible details */}
      <div className="relative p-4 bg-[#0C0C0C] flex flex-col gap-2 flex-1">
        <h3 className="text-display text-base md:text-lg font-bold uppercase leading-tight tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{tagline}</p>
        <span className="text-mono text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground break-words">
          {metaRow(project)}
        </span>

        <div className="mt-auto pt-2 flex items-center gap-4">
          {hasCaseStudy && (
            <button
              type="button"
              onClick={open}
              className="text-mono text-xs uppercase tracking-widest text-foreground hover:text-accent transition-colors"
            >
              View case study →
            </button>
          )}
          {link && (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label} ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
};
