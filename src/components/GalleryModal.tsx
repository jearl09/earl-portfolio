import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryItem {
  id: number;
  image: string;
  title: string;
  year: string;
  description: string;
}

interface GalleryModalProps {
  isOpen: boolean;
  item: GalleryItem | null;
  currentIndex: number;
  totalItems: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const GalleryModal = ({
  isOpen,
  item,
  currentIndex,
  totalItems,
  onClose,
  onPrev,
  onNext,
}: GalleryModalProps) => {
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
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  return (
    <div className="modal-backdrop flex items-center justify-center p-4 md:p-8">
      {/* Controls */}
      <div className="fixed top-4 left-4 right-4 md:top-8 md:left-8 md:right-8 flex items-center justify-between z-50">
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

      {/* Content */}
      <div className="w-full max-w-5xl slide-up">
        <div className="aspect-video overflow-hidden bg-card mb-8">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h2 className="text-display text-2xl md:text-4xl font-semibold mb-2">
              {item.title}
            </h2>
            <span className="text-mono text-sm text-muted-foreground">
              #{item.year}
            </span>
          </div>

          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  );
};
