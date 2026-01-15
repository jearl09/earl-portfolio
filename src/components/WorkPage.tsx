const projects = [
  {
    id: 1,
    title: "Brand Refresh — Acme Corp",
    category: "BRAND IDENTITY",
    year: "2024",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
  },
  {
    id: 2,
    title: "Product Design System",
    category: "DESIGN SYSTEMS",
    year: "2024",
    image: "https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&q=80",
  },
  {
    id: 3,
    title: "Mobile App Experience",
    category: "PRODUCT DESIGN",
    year: "2023",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
  },
  {
    id: 4,
    title: "E-commerce Platform",
    category: "WEB DESIGN",
    year: "2023",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  },
];

export const WorkPage = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 px-6 md:px-12">
      <header className="mb-16 max-w-4xl">
        <h1 className="text-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
          WORK
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
          Selected projects spanning brand identity, product design, and digital experiences.
        </p>
      </header>

      <div className="space-y-24">
        {projects.map((project, index) => (
          <article
            key={project.id}
            className="group cursor-pointer opacity-0 animate-fade-up"
            style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'forwards' }}
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className={index % 2 === 0 ? "md:order-1" : "md:order-2"}>
                <div className="overflow-hidden bg-card aspect-[16/10]">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              </div>

              <div className={index % 2 === 0 ? "md:order-2" : "md:order-1"}>
                <span className="text-mono text-xs text-muted-foreground uppercase tracking-widest mb-4 block">
                  {project.category}
                </span>
                <h2 className="text-display text-2xl md:text-4xl font-semibold mb-4 group-hover:text-accent transition-colors duration-300">
                  {project.title}
                </h2>
                <span className="text-mono text-sm text-muted-foreground">
                  #{project.year}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
