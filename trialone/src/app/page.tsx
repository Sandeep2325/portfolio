import Image from "next/image";
import Link from "next/link";
import {
  getFeaturedSkills,
  getHomeStats,
  getProjects,
  getSiteProfile,
} from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [profile, featuredSkills, projects, stats] = await Promise.all([
    getSiteProfile(),
    getFeaturedSkills(),
    getProjects(),
    getHomeStats(),
  ]);
  const featuredDisplaySkills = [
    ...featuredSkills.filter((item) => !/supabase/i.test(item)),
    "AI Agents",
    "LLM Integration",
    "Social Media Creatives",
  ].slice(0, 8);

  return (
    <div className="page-shell">
      <section className="hero-grid">
        <div className="surface hero-compact px-6 py-8 sm:px-8 sm:py-10">
          <h1 className="section-title max-w-4xl text-[var(--text)]">
            Product-minded engineering with a bolder eye for frontend, APIs, and AI-driven experiences.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-[var(--muted)]">{profile?.intro || "Portfolio content is loading."}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="badge">Frontend systems</span>
            <span className="badge">API-first integrations</span>
            <span className="badge">LLM and AI API integration</span>
            <span className="badge">AI agents and automation workflows</span>
            <span className="badge">Creative generation: video, image, audio</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/projects" className="warm-button rounded-full px-6 py-3 font-semibold transition">
              Explore Projects
            </Link>
            <Link href="/contact" className="outline-button rounded-full px-6 py-3 font-semibold transition">
              Let&apos;s Collaborate
            </Link>
          </div>
          <div className="card-grid cols-2 mt-8">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">{stat.label}</p>
                <p className="mt-2 font-display text-2xl font-bold text-[var(--text)]">
                  {stat.label === "Collaboration" ? "AI + Realife = Your business" : stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface profile-panel px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-3xl font-bold text-[var(--text)]">{profile?.name || "Sandeep Gowda"}</p>
              <p className="mt-1 text-[var(--muted)]">{profile?.role || "Software Developer"}</p>
              <p className="mt-2 text-sm uppercase tracking-[0.25em] text-[var(--accent-secondary)]">{profile?.location || "Bengaluru, India"}</p>
            </div>
            {profile?.avatar ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-[1.8rem] border border-[rgba(120,64,28,0.12)] shadow-[0_14px_34px_rgba(89,49,25,0.18)]">
                <Image src={profile.avatar} alt={profile.name} fill className="object-cover" />
              </div>
            ) : null}
          </div>
          <div className="mt-8">
            <div className="rounded-[1.6rem] bg-[linear-gradient(135deg,rgba(216,93,42,0.09),rgba(14,124,102,0.08))] p-4">
              <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">Featured Stack</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {featuredDisplaySkills.map((item) => (
                  <span key={item} className="badge">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                "UI systems",
                "AI workflows",
                "LLM products",
                "Creative media",
              ].map((item) => (
                <div key={item} className="feature-card px-4 py-3 text-sm font-medium text-[var(--ink-soft)]">
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[var(--muted)]">
              Shipping interfaces with stronger visual taste and practical engineering across frontend, backend, AI APIs, and automation-heavy products.
            </p>
          </div>
        </div>
      </section>

      <section className="surface px-6 py-8 sm:px-8">
        <div className="max-w-4xl">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">About</p>
          <h2 className="font-display text-3xl font-bold text-[var(--text)] sm:text-4xl">A portfolio with more energy, less empty space, and a stronger point of view.</h2>
          <div className="mt-5 space-y-4 text-[var(--muted)]">
            {(profile?.intro ? [profile.tagline, profile.intro] : ["Content is being prepared."]).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="card-grid cols-2">
        {[
          {
            title: "Frontend Systems",
            description: "Landing pages, dashboards, product UI systems, and polished responsive interfaces with stronger visual taste.",
          },
          {
            title: "AI Agents",
            description: "Agent-style workflows for research, execution, internal tooling, and automation-heavy product experiences.",
          },
          {
            title: "LLM Integration",
            description: "Model-powered features, prompt flows, AI APIs, and production-ready integration into modern web applications.",
          },
          {
            title: "Social Media Creatives",
            description: "Creative direction and generation workflows for video, image, audio, and campaign-ready social media assets.",
          },
        ].map((item) => (
          <article key={item.title} className="surface px-6 py-7">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent-secondary)]">Focus Area</p>
            <h3 className="mt-3 font-display text-2xl font-bold text-[var(--text)]">{item.title}</h3>
            <p className="mt-4 text-[var(--muted)]">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="surface px-6 py-8 sm:px-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">AI Capabilities</p>
        <h2 className="font-display text-3xl font-bold text-[var(--text)] sm:text-4xl">Practical AI integration for products, workflows, and creative tooling.</h2>
        <div className="card-grid cols-3 mt-6">
          {[
            {
              title: "AI APIs and LLM Integration",
              description: "Integrating model-powered features, prompt workflows, and product experiences into modern web applications.",
            },
            {
              title: "AI Agents and Automation",
              description: "Designing agent-style task flows, internal automation, and workflow systems that support research, operations, and delivery.",
            },
            {
              title: "Creative Generation",
              description: "Working with video, image, and audio generation pipelines for product content, rapid prototyping, and media-backed experiences.",
            },
          ].map((item) => (
            <article key={item.title} className="feature-card">
              <h3 className="font-display text-2xl font-bold text-[var(--text)]">{item.title}</h3>
              <p className="mt-3 text-[var(--muted)]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Selected Work</p>
            <h2 className="font-display text-3xl font-bold text-[var(--text)] sm:text-4xl">Projects, products, and real-world build experience.</h2>
          </div>
          <Link href="/projects" className="text-link text-sm font-semibold uppercase tracking-[0.22em]">
            View all projects
          </Link>
        </div>
        <div className="card-grid cols-2 mt-6">
          {projects.slice(0, 4).map((project) => (
            <article key={project.name} className="feature-card">
              <p className="text-sm uppercase tracking-[0.18em] text-[var(--accent-secondary)]">{project.stack.join(" / ")}</p>
              <h3 className="mt-3 font-display text-2xl font-bold text-[var(--text)]">{project.name}</h3>
              <p className="mt-3 text-[var(--muted)]">{project.description}</p>
              <p className="mt-5 text-sm text-[var(--ink-soft)]">{project.impact}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
