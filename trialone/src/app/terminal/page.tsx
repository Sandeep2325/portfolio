import Link from "next/link";
import TerminalConsole from "@/components/TerminalConsole";
import { getTerminalCommands } from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

const commandDescriptions: Record<string, string> = {
  about: "Overview of Sandeep, his working style, and what kind of teams he collaborates with.",
  skills: "Frontend, backend, cloud, and AI-assisted workflow strengths.",
  experience: "Career timeline across product engineering, APIs, and immersive projects.",
  projects: "Selected work including ad-tech, commerce, and VR applications.",
  contact: "Ways to get in touch for hiring, freelance work, or product collaboration.",
  "ai-agents": "Agent workflows, internal automation, and task-oriented AI execution patterns.",
  "api-work": "Backend integration, API architecture, and product-ready service work.",
  "llm-integration": "Model-powered product experiences, prompt flows, and LLM-backed application features.",
  "social-creatives": "Creative pipelines for social video, image, and audio production.",
};

export default async function TerminalPage() {
  const commands = await getTerminalCommands();

  return (
    <div className="page-shell">
      <section className="surface px-6 py-8 sm:px-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">My Terminal</p>
        <h1 className="font-display text-4xl font-bold text-[var(--text)] sm:text-5xl">A command-style view of the portfolio.</h1>
        <p className="mt-5 max-w-3xl text-[var(--muted)]">
          Browse the portfolio through a terminal-inspired interface and type commands directly below.
        </p>
      </section>

      <TerminalConsole commands={commands} />

      <section className="surface px-6 py-7">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent-secondary)]">Available Commands</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {commands.map((command) => (
            <div key={command.label} className="feature-card">
              <p className="font-mono text-sm text-[var(--accent)]">$ {command.label}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{commandDescriptions[command.label] || "Portfolio section command."}</p>
            </div>
          ))}
        </div>
      </section>

      <Link href="/" className="text-link text-sm font-semibold uppercase tracking-[0.22em]">
        Back to home
      </Link>
    </div>
  );
}
