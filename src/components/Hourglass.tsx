import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createHourglass, type HourglassOptions, type HourglassStats } from "@/lib/hourglass";

interface HourglassProps extends HourglassOptions {
  className?: string;
}

const fmt = (s: HourglassStats) => `ROTATION ${s.rotationDeg.toFixed(1)}\u00b0 \u00b7 ${s.left} ${s.leftLabel} \u00b7 GLINTS ${s.glints}`;

/**
 * Spinning raymarched ASCII hourglass whose sand tracks the current hour.
 * Decorative canvas plus a small mono label; the label is mirrored to a
 * polite live region at most once a minute. Tunables live in lib/hourglass.ts.
 */
export const Hourglass = ({ className, ...options }: HourglassProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!canvasRef.current) return;
    let lastLive = 0;
    return createHourglass(canvasRef.current, {
      ...optionsRef.current,
      onStats: (s) => {
        optionsRef.current.onStats?.(s);
        if (labelRef.current) labelRef.current.textContent = fmt(s);
        const now = Date.now();
        if (liveRef.current && now - lastLive > 60000) {
          lastLive = now;
          liveRef.current.textContent = `${s.left} ${s.leftLabel.toLowerCase()}`;
        }
      },
    });
  }, []);

  return (
    <div className={cn("inline-flex max-w-full flex-col items-start gap-4", className)}>
      <canvas ref={canvasRef} aria-hidden="true" className="block text-foreground" />
      <span ref={labelRef} aria-hidden="true" className="max-w-full text-mono text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums">
        ROTATION 0.0\u00b0 \u00b7 00:00 LEFT THIS HOUR \u00b7 GLINTS 0
      </span>
      <span ref={liveRef} aria-live="polite" className="sr-only" />
    </div>
  );
};
