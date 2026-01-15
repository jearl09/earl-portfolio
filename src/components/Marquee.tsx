const MarqueeItem = ({ text }: { text: string }) => (
  <span className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">
    {text}
    <span className="text-accent">→</span>
  </span>
);

const marqueeItems = [
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
  "THE GOAT",
];

export const Marquee = () => {
  return (
    <div className="w-full border-b border-border py-3 overflow-hidden">
      <div className="marquee">
        <div className="marquee-content">
          {marqueeItems.map((item, idx) => (
            <MarqueeItem key={idx} text={item} />
          ))}
        </div>
        <div className="marquee-content" aria-hidden="true">
          {marqueeItems.map((item, idx) => (
            <MarqueeItem key={`dup-${idx}`} text={item} />
          ))}
        </div>
      </div>
    </div>
  );
};
