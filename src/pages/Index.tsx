import { useCallback, useEffect, useState } from "react";
import { Marquee } from "@/components/Marquee";
import { Navigation } from "@/components/Navigation";
import { PlayPage } from "@/components/PlayPage";
import { WorkPage } from "@/components/WorkPage";
import { AboutPage } from "@/components/AboutPage";
import { AsciiAnimals } from "@/components/AsciiAnimals";
import { ANIMAL_BY_ID, ANIMAL_ORDER, DEFAULT_ANIMAL, swatchCss, type AnimalId } from "@/lib/asciiAnimals";

const SCENE_KEY = "portfolio.scene";

function storedScene(): AnimalId {
  try {
    const v = localStorage.getItem(SCENE_KEY) as AnimalId | null;
    if (v && ANIMAL_BY_ID[v]) return v;
  } catch {
    /* storage is optional */
  }
  return DEFAULT_ANIMAL;
}

const Index = () => {
  const [currentPage, setCurrentPage] = useState<"work" | "play" | "about">("work");
  const [scene, setScene] = useState<AnimalId>(storedScene);
  const showScene = currentPage !== "play";

  useEffect(() => {
    try {
      localStorage.setItem(SCENE_KEY, scene);
    } catch {
      /* storage is optional */
    }
  }, [scene]);

  const cycleScene = useCallback(() => {
    setScene((s) => ANIMAL_ORDER[(ANIMAL_ORDER.indexOf(s) + 1) % ANIMAL_ORDER.length]);
  }, []);

  return (
    <div className="min-h-screen">
      {showScene && <AsciiAnimals animal={scene} />}
      <Marquee />
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        scene={showScene ? { label: ANIMAL_BY_ID[scene].label, swatch: swatchCss(scene), onCycle: cycleScene } : undefined}
      />
      
      <main>
        {currentPage === "work" && <WorkPage />}
        {currentPage === "play" && <PlayPage />}
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
