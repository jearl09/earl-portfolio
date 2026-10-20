export type ProjectStatus = "LIVE" | "ARCHIVED" | "PRIVATE" | "PILOT" | "PROTOTYPE";

export interface CaseStudy {
  overview: string[];
  howItWorks: string[];
  stack: string[];
  role: string[];
}

export interface Project {
  id: string;
  kind: "web" | "figma";
  title: string;
  /** Short label shown on hover, like the Figma cards ("UI/UX DESIGN"). */
  category: string;
  /** One line under the title. */
  tagline: string;
  year: string;
  image: string;
  /** Two or three entries for the mono meta row. The full list lives in caseStudy.stack. */
  meta: string[];
  status: ProjectStatus;
  /** External link that still works (prototype, repo). Omit for archived sites. */
  link?: { href: string; label: string };
  caseStudy?: CaseStudy;
}

export const projects: Project[] = [
  {
    id: "wholesale-acquisition-bot",
    kind: "web",
    title: "Wholesale Acquisition Bot",
    category: "AI / Conversation Systems",
    tagline:
      "An AI-assisted chatbot that engages private car sellers, appraises the vehicle and presents a firm offer within pre-approved limits.",
    year: "2026",
    image: "/wholesale-bot.webp",
    meta: ["Python", "FastAPI", "Claude API"],
    status: "PRIVATE",
    caseStudy: {
      overview: [
        "Takes qualified private-seller leads, runs a structured discovery conversation over Messenger, values the car and presents an offer on a fixed concession ladder with a real 48-hour expiry.",
        "When the seller accepts, a complete deal packet goes to a human closer: confirmed facts, unverified claims, contradictions, the valuation and the full transcript. A review console lets staff watch every lead and step in.",
      ],
      howItWorks: [
        "An explicit state machine drives every stage. The deal stage is recomputed from the fact store on every inbound message, so a lead cannot reach an offer before the facts needed to price it exist.",
        "Claude Haiku extracts vehicle facts from each reply. Claude Sonnet writes the outbound message, but only from a directive chosen in code. The model never sets the price and never decides the stage.",
        "Every reply passes a validation gate before it is sent. A draft with an unauthorised figure is rejected and rewritten once; if that fails, a scripted fallback goes out instead.",
        "Messages, state transitions and valuations are append-only, enforced by database triggers, so every deal has a full audit trail.",
      ],
      stack: [
        "Python 3.11",
        "FastAPI",
        "PostgreSQL + SQLAlchemy 2",
        "Alembic",
        "Postgres-backed job queue",
        "Claude API (Haiku + Sonnet)",
        "Messenger transport",
        "300+ tests",
      ],
      role: [
        "Sole developer. Designed the state machine, valuation engine and validation gate, built the API, queue and review console, and wrote the test suite.",
      ],
    },
  },
  {
    id: "liveluxe-partner-portal",
    kind: "web",
    title: "Live Luxe Partner Portal",
    category: "Booking Platform",
    tagline:
      "A direct-booking platform giving corporate partners access to 110+ furnished short-stay properties across Australia.",
    year: "2026",
    image: "/liveluxe-portal.webp",
    meta: ["Next.js", "Supabase", "Stripe"],
    status: "LIVE",
    link: { href: "https://partners.liveluxe.au/", label: "Visit site" },
    caseStudy: {
      overview: [
        "Built for Live Luxe, a short-term rental manager. Corporate partners such as insurers, relocation firms and project crews get their own login to browse properties and send booking requests at partner rates instead of booking through public listings.",
        "Replaces an email-and-phone loop with live availability, a frozen quote and a request-and-approve flow that keeps the operator in control.",
      ],
      howItWorks: [
        "Invite-only sign-in with optional MFA. Each partner organisation has its own rate card, roles and audit trail, enforced with row-level security.",
        "Inventory, availability and check-in data sync from Hostaway. A partner searches, gets a quote priced from their rate card, and submits a request with a claim or PO reference.",
        "The request is secured with a card hold or invoice terms through Stripe. Operations approve, counter or decline from a queue with a service-level clock.",
        "On approval the portal creates the Hostaway reservation, captures payment or raises a tax invoice, and releases the check-in pack on a schedule.",
      ],
      stack: [
        "Next.js 16 (App Router)",
        "TypeScript",
        "Supabase (Postgres, RLS, Auth)",
        "Stripe",
        "Hostaway API",
        "Tailwind CSS 4",
        "Resend + React Email",
        "Vercel",
      ],
      role: [
        "Full-stack developer working from an architecture spec: database schema and policies, Hostaway and Stripe integrations, partner portal and admin console.",
      ],
    },
  },
  {
    id: "wave-portal",
    kind: "web",
    title: "Wave Portal",
    category: "Web3 / Blockchain",
    tagline:
      "A single message that lives on the Ethereum Sepolia testnet. Anyone with a wallet can overwrite it.",
    year: "2026",
    image: "/wave-portal.webp",
    meta: ["Solidity", "Next.js", "Ethers"],
    status: "ARCHIVED",
    link: { href: "https://github.com/jearl09/Wave-Portal", label: "Source" },
    caseStudy: {
      overview: [
        "An experiment in writing to a blockchain from the browser. The Wave contract stores one public string and a counter, and the site renders that string as its headline. The page reads whatever the last person left behind.",
      ],
      howItWorks: [
        "The app connects to the injected wallet and checks the chain is Sepolia before reading anything.",
        "On load it calls message() on the contract and shows the result as the headline.",
        "Submitting the input sends a waveAtMe transaction, waits for confirmation, then updates the headline. Each call increments the on-chain counter.",
        "Only the latest message is stored. There is no history, and the contract takes no payment beyond gas.",
      ],
      stack: [
        "Solidity 0.8",
        "Hardhat + Ignition",
        "Sepolia testnet",
        "Next.js 16",
        "ethers v6",
        "Three.js / React Three Fiber",
        "Tailwind CSS",
      ],
      role: ["Solo project. Wrote and deployed the contract, built the front end and the liquid background."],
    },
  },
  {
    id: "drivesafe",
    kind: "web",
    title: "DriveSafe",
    category: "Academic Archiving",
    tagline:
      "An automated, secure vault that saves, verifies and organises student capstone projects so teachers never lose files and can always prove what was submitted.",
    year: "2026",
    image: "/drivesafe.webp",
    meta: ["React", "Flask", "MariaDB"],
    status: "ARCHIVED",
    link: { href: "https://github.com/jearl09/DriveSafe", label: "Source" },
    caseStudy: {
      overview: [
        "Automated archival system for academic capstone deliverables: SRS, SDD, SPMP, STD and RI documents.",
        "Replaces manual downloading and folder-wrangling, and keeps files safe even if a student deletes their Drive link.",
      ],
      howItWorks: [
        "Reads a Google Sheets registry of Drive links and signs in with Google OAuth 2.0.",
        "Downloads each file, converts it to PDF and computes a SHA-256 hash for integrity, version control and duplicate detection.",
        "Stores the raw files in MariaDB as LONGBLOBs with the hash and version metadata.",
        "Faculty search, preview and download any version independent of Google Drive.",
      ],
      stack: [
        "React 19 + Vite",
        "TypeScript",
        "Python / Flask",
        "MariaDB",
        "Google OAuth 2.0",
        "Google Drive + Sheets APIs",
        "SHA-256",
      ],
      role: ["Capstone project. Built the archival engine, Google integrations and the faculty-facing UI."],
    },
  },
  {
    id: "tcdex-talentiq",
    kind: "web",
    title: "TCDEX TalentIQ",
    category: "Talent & Cohort Analytics",
    tagline: "An internal dashboard that centralises leadership-development data and replaces manual Excel reporting.",
    year: "2026",
    image: "/tcdex.webp",
    meta: ["Next.js", "Supabase"],
    status: "ARCHIVED",
    caseStudy: {
      overview: [
        "Built during my internship for HR and leadership teams. HR uploads Excel files; the system validates and stores them, calculates completion, attendance and readiness metrics, and visualises them for permitted users.",
        "Saves HR hours of manual compiling and gives leaders real-time insight into program effectiveness.",
      ],
      howItWorks: [
        "Covers six areas: leadership assessments (pre and post), self-paced learning, VILT sessions, a VILT module tracker, LeadX and BuildX workshops (registration vs attendance), and post-learning surveys.",
        "Each Excel upload is parsed and validated before it is written to the database.",
        "Metrics are computed from the stored rows and shown on role-gated dashboards.",
      ],
      stack: ["Next.js 16", "TypeScript", "Supabase", "SheetJS (xlsx)", "Tailwind CSS 4"],
      role: ["Intern developer. Built the upload pipeline, metric calculations and dashboard views."],
    },
  },
  {
    id: "u-park-locator",
    kind: "figma",
    title: "U-Park Locator",
    category: "UI/UX Design",
    tagline: "A mobile concept for finding and reserving a parking spot nearby.",
    year: "2025",
    image: "/upark.webp",
    meta: ["Figma", "UI/UX Design"],
    status: "PROTOTYPE",
    link: {
      href: "https://www.figma.com/proto/FD1VQMFQCsfzoLv5msmvN4/Parking-Spot-Locator",
      label: "Open prototype",
    },
  },
  {
    id: "leaf-root-solutions",
    kind: "figma",
    title: "Leaf & Root Solutions",
    category: "Brand Identity",
    tagline: "Brand identity and visual system for a landscaping business.",
    year: "2025",
    image: "/leaf-root.webp",
    meta: ["Figma", "Brand Identity"],
    status: "PROTOTYPE",
    link: {
      href: "https://www.figma.com/proto/puvhf7yCLE55ooO8PcmT7d/Leaf---Root-Solutions",
      label: "Open prototype",
    },
  },
];

export const metaRow = (project: Project) =>
  [`#${project.year}`, ...project.meta, project.status].join(" · ");

export const webProjects = projects.filter((p) => p.kind === "web");
export const figmaProjects = projects.filter((p) => p.kind === "figma");
