import { ArrowUpRight } from "lucide-react";

const skills = [
  "Full-Stack Web Development",
  "Backend & API Architecture",
  "Data Ingestion & ETL Pipelines",
  "Modern Frontend & UI",
  "Database Design & Optimization",
  "AI/LLM & RAG Workflows",
];

const experience = [
  {
    role: "Software Engineering & AI/LLM Intern",
    company: "Innodata Inc.",
    period: "2026",
  },
  {
    role: "Full-Stack Builder",
    company: "DriveSafe, Wave Portal, TCDEX",
    period: "2024 — Present",
  },
];

const connectLinks = [
  {
    label: "Email",
    href: "mailto:johnearlmandawe17@gmail.com?subject=Reaching%20Out%20via%20Portfolio",
    external: false,
  },
  {
    label: "GitHub",
    href: "https://github.com/jearl09",
    external: true,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/john-earl-mandawe-539a90260/",
    external: true,
  },
];

export const AboutPage = () => {
  return (
    <div className="min-h-screen pt-24 pb-16 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16">
          <h1 className="text-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight opacity-0 animate-fade-up" style={{ animationFillMode: 'forwards' }}>
            ABOUT
          </h1>
        </header>

        <div className="grid md:grid-cols-2 gap-16 mb-24">
          <div className="opacity-0 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            <p className="text-muted-foreground leading-relaxed mb-6">
I’m John Earl Mandawe, a Full-Stack Software Engineer focused on building robust, high-performance web applications and scalable data-driven systems. I work across the stack with Java (Spring Boot), TypeScript, React, Next.js, and Supabase, backed by relational databases like PostgreSQL and MySQL. Whether I'm automating complex data ingestion pipelines, architecting resilient backend services, or tinkering in a Linux environment, I care about clean architecture, speed, and real-world impact.            </p>
            <p className="text-muted-foreground leading-relaxed">
              Based in Cebu, Philippines.
            </p>
          </div>

          <div className="opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="aspect-[3/4] bg-card overflow-hidden">
              <img
                src="/about-photo.jpeg"
                alt="Portrait"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-16 mb-24">
          <section className="opacity-0 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
            <h3 className="text-mono text-xs uppercase tracking-widest text-muted-foreground mb-8">
              Capabilities
            </h3>
            <ul className="space-y-4">
              {skills.map((skill) => (
                <li
                  key={skill}
                  className="text-display text-lg font-medium border-b border-border pb-4 hover:text-accent transition-colors duration-300 cursor-default"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </section>

          <section className="opacity-0 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
            <h3 className="text-mono text-xs uppercase tracking-widest text-muted-foreground mb-8">
              Experience
            </h3>
            <ul className="space-y-6">
              {experience.map((item) => (
                <li key={item.company} className="border-b border-border pb-6">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-display text-lg font-medium">{item.role}</span>
                    <span className="text-mono text-xs text-muted-foreground">
                      {item.period}
                    </span>
                  </div>
                  <span className="text-muted-foreground">{item.company}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="border-t border-border pt-16 opacity-0 animate-fade-up" style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
          <h3 className="text-mono text-xs uppercase tracking-widest text-muted-foreground mb-8">
            Connect
          </h3>

          <div className="mb-8 flex flex-wrap gap-4">
            <a
              href="/Resume_John Earl.pdf"
              download="Resume_John Earl.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:border-accent/60 hover:bg-accent/5 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              Download Resume
            </a>
          </div>

          <div className="flex flex-wrap gap-6">
            {connectLinks.map(({ label, href, external }) => (
              <a
                key={label}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="group inline-flex items-center gap-2 text-display text-sm md:text-base font-medium text-foreground transition-all duration-200 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                {label}
                <ArrowUpRight className="h-4 w-4 opacity-60 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
