import { cn } from "@/lib/utils";

interface GalleryCardProps {
  image: string;
  title: string;
  year: string;
  category?: string;
  index: number;
}

export const GalleryCard = ({ image, title, year, category, index }: GalleryCardProps) => {
  return (
    <div
      className={cn(
        "gallery-card group",
        "opacity-0 animate-fade-up",
      )}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
    >
      {/* Square tile */}
      <div className="aspect-square overflow-hidden bg-card relative">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transform transition-all duration-300 filter grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
          loading="lazy"
        />

        {/* Hover overlay: bold uppercase title and category */}
        <div className="absolute inset-0 flex items-end p-4 pointer-events-none">
          <div className="w-full text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-sm font-bold uppercase leading-tight text-foreground">
              {title}
            </h3>
            {category && (
              <span className="text-xs font-mono uppercase text-muted-foreground">
                {category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Year shown subtly below for non-hover context (kept minimal) */}
      <div className="relative p-2 bg-[#0C0C0C]">
        <span className="text-mono text-xs text-muted-foreground">#{year}</span>
      </div>
    </div>
  );
};
