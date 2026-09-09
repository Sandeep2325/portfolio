import { getSkillGroups } from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const skillGroups = await getSkillGroups();

  return (
    <div className="page-shell">
      <section className="surface px-6 py-8 sm:px-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Skills</p>
        <h1 className="font-display text-4xl font-bold text-[var(--text)] sm:text-5xl">A stack shaped by product delivery, APIs, and modern collaboration.</h1>
        <p className="mt-5 max-w-3xl text-[var(--muted)]">
          A practical mix of frontend engineering, backend systems, cloud delivery, AI APIs, LLM integration, agent workflows, and creative generation tooling.
        </p>
      </section>

      <section className="card-grid cols-2">
        {skillGroups.map((group) => (
          <article key={group.id} className="surface px-6 py-7">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent-secondary)]">{group.title}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {group.items.map((item) => (
                <span key={item} className="badge">
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
