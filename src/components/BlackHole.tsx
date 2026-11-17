import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createBlackHole, type BlackHoleOptions } from "@/lib/blackhole";

interface BlackHoleProps extends BlackHoleOptions {
  className?: string;
}

/**
 * Decorative ASCII black hole. Fills its parent; the canvas is transparent so
 * the parent's background shows through. Tunables live in lib/blackhole.ts.
 */
export const BlackHole = ({ className, ...options }: BlackHoleProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!ref.current) return;
    return createBlackHole(ref.current, optionsRef.current);
    // Options are read once on mount; remount the component to change them.
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={cn("block h-full w-full", className)} />;
};
