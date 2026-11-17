import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createWings, type WingsConfig } from "@/lib/wings";

interface WingsProps extends Partial<WingsConfig> {
  className?: string;
}

/**
 * A pair of white wings drawn as text: procedural feathers on a mirrored
 * skeleton, holding a spread pose and moving only with a breeze while the
 * brightest feathers bloom. Fills its parent. Tunables live in lib/wings.ts.
 */
export const Wings = ({ className, ...options }: WingsProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!ref.current) return;
    return createWings(ref.current, optionsRef.current);
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={cn("block h-full w-full", className)} />;
};
