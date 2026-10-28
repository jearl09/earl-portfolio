export type ProjectStatus = "LIVE" | "ARCHIVED" | "PRIVATE" | "PILOT" | "PROTOTYPE";
/** Which section of the gallery the card sits in. */
export type ProjectGroup = "client" | "experiment" | "figma";

export interface CaseStudy {
  overview: string[];
  howItWorks: string[];
  stack: string[];
  role: string[];
}

export interface Project {
  id: string;
  kind: "web" | "figma";
  group: ProjectGroup;
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
    group: "client",
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
    id: "liveluxe-owner-disbursements",
    group: "client",
    kind: "web",
    title: "Owner Disbursements",
    category: "Finance Automation",
    tagline:
      "Monthly owner payouts for a short-stay property manager: every reservation classified, one statement per owner, one bank file, two approvals before anything is paid.",
    year: "2026",
    image: "/liveluxe-disbursements.webp",
    meta: ["Python", "Flask", "Hostaway API"],
    status: "PRIVATE",
    caseStudy: {
      overview: [
        "Built for Live Luxe. Each month the operator uploads the owner-expenses file and the Airbnb, Booking.com and bank reports; the system pulls the reservations from Hostaway, works out what each owner is owed and produces a PDF statement per property plus the NAB ABA payment file.",
        "Runs on an always-on Mac mini behind Tailscale, with a password-gated front door on Vercel so the finance team can open it from anywhere without the machine being exposed to the internet.",
      ],
      howItWorks: [
        "Every reservation is classified as counted, rolling to next month or excluded, each with a recorded reason. Overrides are allowed but logged. A missing expenses file blocks the run; expenses are never assumed to be zero.",
        "Issues are graded. Blockers (unknown channel, unmatched expense, bad bank details) stop the ABA from being built; warnings (unmapped listing with revenue, payout-month mismatch against the platform report) have to be checked before approval.",
        "The ABA file is re-parsed after it is written: 120-character records, totals, record count and self-balance. The page shows that the sum of statements equals the sum of ABA credits.",
        "Emails go out from the owners@ mailbox only after a dry-run validation and a typed confirmation. Sent statements are never re-sent; a statement that changes after sending is flagged. Finalising writes counted reservations to a ledger so nothing can be paid twice.",
        "Requests travel browser → Vercel (HTTP Basic auth) → Tailscale Funnel → Flask on the mini, with a shared header key so the mini refuses anything that did not come through the gate.",
      ],
      stack: [
        "Python 3.12",
        "Flask + Jinja",
        "Hostaway API",
        "Google Workspace CLI (Gmail, Drive)",
        "WeasyPrint PDF statements",
        "NAB ABA file format",
        "launchd on macOS",
        "Tailscale Funnel",
        "Next.js 16 gateway on Vercel",
      ],
      role: [
        "Deployment and operations engineer. The calculation engine was supplied by the client; I migrated it to the always-on server, set up the two Gmail identities and their token handling, wrote the scheduling, built the Vercel front door and documented the runbook.",
      ],
    },
  },
  {
    id: "liveluxe-weekly-variable-costs",
    group: "client",
    kind: "web",
    title: "Weekly Variable Costs",
    category: "AI / Document Pipelines",
    tagline:
      "A scheduled pipeline that reads a week of supplier invoices from two mailboxes, has Claude extract every line, and publishes a cost sheet split across four bank accounts.",
    year: "2026",
    image: "/liveluxe-weekly-costs.webp",
    meta: ["Python", "Claude Code", "Google Workspace"],
    status: "PRIVATE",
    caseStudy: {
      overview: [
        "Built for Live Luxe and its cleaning company. Each Tuesday-to-Monday week, supplier, utility and cleaner invoices arrive in two Google Workspace mailboxes. The pipeline collects them, extracts the amounts and the property each one belongs to, and rebuilds a Google Sheet plus a Drive folder per bank account: Head Lease, Trust, Hybrid and Company.",
        "A Run-now web page shows where each week is up to (collected, extracted, published), lets staff collect a week by hand and publish an extracted week. It never sends email; drafting and sending client invoices stay on separate, individually approved scheduled jobs.",
      ],
      howItWorks: [
        "Four launchd jobs cover the week: Monday afternoon collects, extracts and drafts invoices; Monday evening sends the approved drafts; Tuesday morning re-collects for late arrivals and sends the cleaning company's invoice if Monday's did not go; Tuesday evening does the final republish and reconciliation.",
        "Extraction is done by Claude Code running headless under the scheduler, reading each email and attachment against a written spec and business-rule memory files, and writing one JSON record per invoice line. A guard file per week and mode stops a job running twice.",
        "Publishing rebuilds the sheet in place and skips files already uploaded, so a re-run is safe. Each run ends with a written summary: totals per account, what changed since the last run, missing invoices and the decisions the owner has to make.",
        "The pre-flight checks both mailbox logins before anything runs; an expired token stops the job with a one-line reason rather than a half-finished week.",
        "Same front-door pattern as the disbursements tool: Vercel gateway with Basic auth, Tailscale Funnel, shared header key, Flask bound to localhost.",
      ],
      stack: [
        "Python 3.12",
        "Flask",
        "Claude Code (headless, scheduled)",
        "Google Workspace CLI (Gmail, Drive, Sheets)",
        "openpyxl",
        "launchd on macOS",
        "Tailscale Funnel",
        "Next.js 16 gateway on Vercel",
      ],
      role: [
        "Deployment and operations engineer, and author of the web layer. Migrated the client's pipeline to the always-on server, connected the second mailbox, adapted the four scheduled jobs and their prompts to the machine, built the Run-now page and Vercel gateway, and ran the first end-to-end week.",
      ],
    },
  },
  {
    id: "liveluxe-partner-portal",
    group: "client",
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
    group: "experiment",
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
    group: "experiment",
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
    group: "experiment",
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
    group: "figma",
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
    group: "figma",
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
export const clientProjects = projects.filter((p) => p.group === "client");
export const experimentProjects = projects.filter((p) => p.group === "experiment");
export const figmaProjects = projects.filter((p) => p.group === "figma");
