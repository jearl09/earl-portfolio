import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { createAsciiImage, type AsciiImageOptions } from "@/lib/asciiImage";

interface AsciiImageProps extends AsciiImageOptions {
  src: string;
  alt: string;
  className?: string;
  /** Classes for the fallback <img>; defaults to object-fit: cover. */
  imgClassName?: string;
}

/**
 * An image rendered as coloured monospace characters on a canvas, drawn
 * object-fit: cover inside its parent. The real <img> stays in the DOM for
 * screen readers and SEO, visually hidden, and is shown if rendering fails.
 * Tunables live in lib/asciiImage.ts.
 */
export const AsciiImage = ({ src, alt, className, imgClassName, ...options }: AsciiImageProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    setFailed(false);
    return createAsciiImage(ref.current, src, {
      ...optionsRef.current,
      onError: (err) => {
        optionsRef.current.onError?.(err);
        setFailed(true);
      },
    });
  }, [src]);

  return (
    <div className={cn("relative h-full w-full", className)}>
      <canvas ref={ref} aria-hidden="true" className={cn("block h-full w-full", failed && "hidden")} />
      <img
        src={src}
        alt={alt}
        className={cn(failed ? cn("h-full w-full object-cover", imgClassName) : "sr-only")}
      />
    </div>
  );
};
