import { ArrowUpRight } from "lucide-react";

const skills = [
  "Creative Direction",
  "Brand Strategy",
  "Product Design",
  "Design Systems",
  "Motion Design",
  "UX Architecture",
  "Prototyping",
  "User Research",
];

const experience = [
  { role: "Design Director", company: "Studio One", period: "2022 — Present" },
  { role: "Senior Designer", company: "Agency X", period: "2019 — 2022" },
  { role: "Product Designer", company: "Tech Startup", period: "2017 — 2019" },
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
            <h2 className="text-display text-2xl md:text-3xl font-semibold mb-6 leading-tight">
              THE GOAT.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              I build things people pretend they didn't notice until they can't stop thinking about them. 
              Specialties include turning vague briefs into pixel-perfect reality and convincing stakeholders that "one more tweak" is a feature, not a bug.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Based in Cebu — aw wa ragud.
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
          <div className="flex flex-wrap gap-6">
            {["LinkedIn", "Twitter", "Dribbble", "Email"].map((link) => (
              <a
                key={link}
                href="#"
                className="group flex items-center gap-2 text-display font-medium hover:text-accent transition-colors duration-300"
              >
                {link}
                <ArrowUpRight className="w-4 h-4 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
