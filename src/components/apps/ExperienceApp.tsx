"use client";

import type { Experience } from "@/lib/portfolio-data";

export default function ExperienceApp({ experiences }: { experiences: Experience[] }) {
  return (
    <div className="page-shell">
      <section className="surface px-6 py-6">
        <p className="eyebrow">Experience</p>
        <h1 className="gradient-text font-display mt-2 text-2xl font-bold">
          Product, platform, and immersive engineering.
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          A timeline of delivery across frontend systems, backend services, cloud deployment, and interactive experiences.
        </p>
      </section>

      {experiences.length === 0 ? (
        <div className="surface px-6 py-8 text-[var(--muted)]">No experience entries yet.</div>
      ) : (
        <section className="surface px-6 py-6">
          <div className="mt-1">
            {experiences.map((experience) => (
              <article key={experience.id} className="timeline-item">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-secondary)]">{experience.dates}</p>
                <h2 className="mt-1 text-lg font-bold text-[var(--text)]">{experience.company}</h2>
                <p className="text-sm text-[var(--accent)]">{experience.role}</p>
                <p className="mt-3 text-sm text-[var(--muted)]">{experience.summary}</p>
                {experience.highlights.length > 0 && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--ink-soft)]">
                    {experience.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
