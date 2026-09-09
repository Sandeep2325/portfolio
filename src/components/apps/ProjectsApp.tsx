"use client";

import type { Project } from "@/lib/portfolio-data";

export default function ProjectsApp({ projects }: { projects: Project[] }) {
  return (
    <div className="page-shell">
      <section className="surface px-6 py-6">
        <p className="eyebrow">Projects</p>
        <h1 className="gradient-text font-display mt-2 text-2xl font-bold">
          Multi-domain work, from ad platforms to VR.
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Selected work spanning web applications, business platforms, and immersive products.
        </p>
      </section>

      {projects.length === 0 ? (
        <div className="surface px-6 py-8 text-[var(--muted)]">No projects yet.</div>
      ) : (
        <section className="card-grid cols-2">
          {projects.map((project) => (
            <article key={project.id} className="surface px-5 py-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-secondary)]">
                {project.stack.join(" / ")}
              </p>
              <h2 className="mt-2 text-lg font-bold text-[var(--text)]">{project.name}</h2>
              <p className="mt-3 text-sm text-[var(--muted)]">{project.description}</p>
              {project.impact && <p className="mt-3 text-sm text-[var(--ink-soft)]">{project.impact}</p>}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
