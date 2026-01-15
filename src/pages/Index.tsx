import { useState } from "react";
import { Marquee } from "@/components/Marquee";
import { Navigation } from "@/components/Navigation";
import { PlayPage } from "@/components/PlayPage";
import { WorkPage } from "@/components/WorkPage";
import { AboutPage } from "@/components/AboutPage";

const Index = () => {
  const [currentPage, setCurrentPage] = useState<"work" | "play" | "about">("play");

  return (
    <div className="min-h-screen bg-background">
      <Marquee />
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <main>
        {currentPage === "play" && <PlayPage />}
        {currentPage === "work" && <WorkPage />}
        {currentPage === "about" && <AboutPage />}
      </main>

      <footer className="border-t border-border px-6 md:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-mono text-xs text-muted-foreground">
            © 2026 JOHN EARL MANDAWE
          </span>
          <span className="text-mono text-xs text-muted-foreground">
            CEBU, PHILIPPINES
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
