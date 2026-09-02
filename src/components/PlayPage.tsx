import { GalleryCard } from "./GalleryCard";

const webProjects = [
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
    image: "/DriveSafe.png",
    title: "DriveSafe",
    category: "Academic Archiving & Verification Vault",
    year: "2026",
    link: "https://archival-drivesafe.online/",
  },
  {
    id: 3,
    image: "/TCDEX.jpg",
    title: "TCDEX",
    category: "Talent & Cohort Analytics",
    year: "2026",
    link: "https://tcdex-app-iota.vercel.app/login",
  },
];

const figmaProjects = [
  {
    id: 4,
    image: "/upark.png",
    title: "U-Park Locator",
    category: "UI/UX Design",
    year: "2025",
    link: "https://www.figma.com/proto/FD1VQMFQCsfzoLv5msmvN4/Parking-Spot-Locator",
  },
  {
    id: 5,
    image: "/leaf-root.png",
    title: "Leaf & Root Solutions",
    category: "Brand Identity",
    year: "2025",
    link: "https://www.figma.com/proto/puvhf7yCLE55ooO8PcmT7d/Leaf---Root-Solutions",
  },
];

export const PlayPage = () => {
  return (
    <div className="bg-[#0C0C0C] min-h-screen pt-24 pb-16 px-6 md:px-12 text-foreground">
      <header className="mb-16 max-w-4xl">
        <h1 className="text-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
          PLAY
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
          Explorations, concepts, and experiments. A sandbox for the creative process where ideas take shape through motion and interaction design.
        </p>
      </header>

      <section className="mb-20">
        <h2 className="text-mono text-xs uppercase tracking-widest text-muted-foreground mb-8">
          Web Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
          {webProjects.map((item, index) => (
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
      </section>

      <section>
        <h2 className="text-mono text-xs uppercase tracking-widest text-muted-foreground mb-8">
          Figma Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
          {figmaProjects.map((item, index) => (
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
                index={index + webProjects.length}
              />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
