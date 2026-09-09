"use client";

import type { SkillGroup } from "@/lib/portfolio-data";

export default function SkillsApp({ skillGroups }: { skillGroups: SkillGroup[] }) {
  return (
    <div className="page-shell">
      <section className="surface px-6 py-6">
        <p className="eyebrow">Skills</p>
        <h1 className="gradient-text font-display mt-2 text-2xl font-bold">
          A stack shaped by product delivery and APIs.
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Frontend engineering, backend systems, cloud delivery, AI APIs, LLM integration, agent workflows, and creative
          generation tooling.
        </p>
      </section>

      {skillGroups.length === 0 ? (
        <div className="surface px-6 py-8 text-[var(--muted)]">No skill groups yet.</div>
      ) : (
        <section className="card-grid cols-2">
          {skillGroups.map((group) => (
            <article key={group.id} className="surface px-5 py-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-secondary)]">{group.title}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <span key={item} className="badge">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
