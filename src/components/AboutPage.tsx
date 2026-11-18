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
    role: "Full-Stack Developer & Systems Engineer",
    company:
      "Live Luxe — Partner booking portal (Next.js, Supabase, Stripe, Hostaway) and back-office automation: owner disbursements, weekly variable costs, booking-clash checks (Python, Claude Code). Moved internal tools to a self-hosted Mac mini server over Tailscale; manage DNS, GoHighLevel funnels and email sending domains.",
    period: "2026 — Present",
  },
  {
    role: "Web & Integrations Developer",
    company:
      "Direct Auto — Company website (Next.js, Vercel, Cloudflare): SEO location pages, GoHighLevel chat widget, deployments and domain setup. Google Cloud and Workspace setup for the internal CRM (OAuth, Gmail API, Pub/Sub), plus DNS for ad tracking and email.",
    period: "2026 — Present",
  },
  {
    role: "Software Engineer",
    company: "Wholesale Acquisition Bot — automotive client (Python, FastAPI, PostgreSQL, Claude API, GoHighLevel)",
    period: "2026",
  },
  {
    role: "Automation Developer",
    company: "Stateline Rentals — Fleet board and Turo dynamic-pricing tool with guard rails (Node.js, SQLite)",
    period: "2026",
  },
  {
    role: "Software Engineering & AI/LLM Intern",
    company: "Innodata Inc.",
    period: "2026",
  },
  {
    role: "Full-Stack Builder",
    company: "DriveSafe, Wave Portal, TCDEX TalentIQ",
    period: "2024 — 2026",
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
              I&rsquo;m John Earl Mandawe, a <strong className="font-medium text-foreground">Full-Stack Software Engineer</strong> who
              builds <strong className="font-medium text-foreground">web apps, internal tools and automations</strong> for small
              businesses. I work mainly with <strong className="font-medium text-foreground">TypeScript, React, Next.js and Supabase</strong>,
              plus <strong className="font-medium text-foreground">Python and Java (Spring Boot)</strong>, on PostgreSQL and MySQL. Day to
              day that means shipping features, wiring up{" "}
              <strong className="font-medium text-foreground">integrations (GoHighLevel, Stripe, Xero, Google Workspace, Turo)</strong>, and
              keeping the systems behind them running:{" "}
              <strong className="font-medium text-foreground">deployments, DNS, servers and the access around them</strong>. I care about
              clean architecture, reliable systems, and work that makes a real difference to the people using it.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Based in Cebu, Philippines.
            </p>
          </div>

          <div className="opacity-0 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="aspect-[3/4] bg-card overflow-hidden">
              <img src="/about-portrait.webp" alt="John Earl Mandawe, graduation portrait" className="w-full h-full object-cover" />
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
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <span className="text-display text-lg font-medium">{item.role}</span>
                    <span className="text-mono text-xs text-muted-foreground shrink-0 whitespace-nowrap">
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
