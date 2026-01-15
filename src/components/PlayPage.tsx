import { GalleryCard } from "./GalleryCard";

const galleryItems = [
  {
    id: 1,
    image: "/wave-portal.png",
    title: "Wave Portal",
    category: "Web3 / Blockchain",
    year: "2026",
    link: "https://wave-portal.vercel.app/",
  },
  {
    id: 2,
    image: "/upark.png",
    title: "U-Park Locator",
    category: "UI/UX Design",
    year: "2025",
    link: "https://www.figma.com/proto/FD1VQMFQCsfzoLv5msmvN4/Parking-Spot-Locator",
  },
  {
    id: 3,
    image: "/leaf-root.png",
    title: "Leaf & Root Solutions",
    category: "Brand Identity",
    year: "2025",
    link: "https://www.figma.com/proto/puvhf7yCLE55ooO8PcmT7d/Leaf---Root-Solutions",
  },
  {
    id: 4,
    image: "/aktivklass.png",
    title: "AktivKlass",
    category: "Full Stack",
    year: "2025",
    link: "https://github.com/jearl09/Akktivklass.git",
  },
  {
    id: 5,
    image: "/tkting.png",
    title: "Tkting App",
    category: "Development",
    year: "2024",
    link: "https://github.com/jearl09/tkting",
  },
  {
    id: 6,
    image: "/centralized-forms.png",
    title: "Centralized Academic Forms",
    category: "System Design",
    year: "2024",
    link: "https://github.com/jearl09/Centralized-Education-Form",
  },
];

export const PlayPage = () => {
  return (
    <div className="bg-[#0C0C0C] min-h-screen pt-24 pb-16 px-6 md:px-12 text-foreground">
      {/* Header */}
      <header className="mb-16 max-w-4xl">
        <h1 className="text-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
          PLAY
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
          Explorations, concepts, and experiments. A sandbox for the creative process 
          where ideas take shape through motion and interaction design.
        </p>
      </header>

      {/* Gallery Grid - preserve strict square tiles, 1px gap, 3 columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
        {galleryItems.map((item, index) => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            aria-label={`${item.title} - ${item.category}`}
          >
            <GalleryCard
              image={item.image}
              title={item.title}
              year={item.year}
              category={item.category}
              index={index}
            />
          </a>
        ))}
      </div>
    </div>
  );
};
