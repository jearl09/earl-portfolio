import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createMeadow, type MeadowConfig } from "@/lib/meadow";

interface MeadowProps extends Partial<MeadowConfig> {
  className?: string;
}

/**
 * A low-angle meadow of blue flowers drawn as text, growing in and moving
 * in a travelling breeze. Fills its parent. Tunables live in lib/meadow.ts.
 */
export const Meadow = ({ className, ...options }: MeadowProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!ref.current) return;
    return createMeadow(ref.current, optionsRef.current);
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={cn("block h-full w-full", className)} />;
};
