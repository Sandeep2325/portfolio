import { getProjects } from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="page-shell">
      <section className="surface px-6 py-8 sm:px-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Projects</p>
        <h1 className="font-display text-4xl font-bold text-[var(--text)] sm:text-5xl">Multi-domain work, from ad platforms to VR experiences.</h1>
        <p className="mt-5 max-w-3xl text-[var(--muted)]">
          Selected work spanning web applications, business platforms, and immersive products.
        </p>
      </section>

      <div className="card-grid cols-2">
        {projects.map((proj) => (
          <article key={proj.id} className="surface px-6 py-7">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent-secondary)]">{proj.stack.join(" / ")}</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[var(--text)]">{proj.name}</h2>
            <p className="mt-4 text-[var(--muted)]">{proj.description}</p>
            <p className="mt-5 text-sm text-[var(--ink-soft)]">{proj.impact}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
