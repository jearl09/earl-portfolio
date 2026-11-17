import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createAsciiAnimals, type AnimalId, type AsciiAnimalsHandle } from "@/lib/asciiAnimals";

interface AsciiAnimalsProps {
  animal: AnimalId;
  className?: string;
}

/**
 * Full-viewport, fixed, transparent canvas with koi / jellyfish / dragonflies
 * drifting behind the page. Decorative only. Tunables live in lib/asciiAnimals.ts.
 */
export const AsciiAnimals = ({ animal, className }: AsciiAnimalsProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const handle = useRef<AsciiAnimalsHandle | null>(null);
  const initial = useRef(animal);

  useEffect(() => {
    if (!ref.current) return;
    handle.current = createAsciiAnimals(ref.current, initial.current);
    return () => {
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  useEffect(() => {
    handle.current?.show(animal);
  }, [animal]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 -z-10 h-[100vh] w-[100vw] opacity-70", className)}
    />
  );
};
