import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavigationProps {
  currentPage: "work" | "play" | "about";
  onNavigate: (page: "work" | "play" | "about") => void;
}

export const Navigation = ({ currentPage, onNavigate }: NavigationProps) => {
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const navItems = [
    { id: "work" as const, label: "WORK" },
    { id: "play" as const, label: "PLAY" },
    { id: "about" as const, label: "ABOUT" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 md:px-12">
      <div className="text-display font-semibold text-sm tracking-tight">
        JOHN EARL
      </div>

      <div className="flex items-center gap-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            onMouseEnter={() => setIsHovered(item.id)}
            onMouseLeave={() => setIsHovered(null)}
            className={cn(
              "relative text-xs font-mono uppercase tracking-widest transition-colors duration-300",
              currentPage === item.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
            <span
              className={cn(
                "absolute -bottom-1 left-0 h-px bg-foreground transition-all duration-300",
                currentPage === item.id || isHovered === item.id
                  ? "w-full"
                  : "w-0"
              )}
            />
          </button>
        ))}
      </div>

      <div className="status-available text-muted-foreground">
        <span className="hidden md:inline">LIMITED AVAILABILITY</span>
      </div>
    </nav>
  );
};
