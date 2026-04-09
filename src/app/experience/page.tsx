import { getExperiences } from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

export default async function ExperiencePage() {
  const experiences = await getExperiences();

  return (
    <div className="page-shell">
      <section className="surface px-6 py-8 sm:px-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Experience</p>
        <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">Product, platform, and immersive engineering experience.</h1>
        <p className="mt-5 max-w-3xl text-[var(--muted)]">
          A timeline of product delivery across frontend systems, backend services, cloud deployment, and interactive experiences.
        </p>
      </section>

      <div className="flex flex-col gap-5">
        {experiences.map((exp) => (
          <article key={exp.id} className="surface px-6 py-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent-secondary)]">{exp.dates}</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-white">{exp.company}</h2>
                <p className="mt-1 text-base text-[var(--accent)]">{exp.role}</p>
              </div>
              <p className="max-w-xl text-[var(--muted)]">{exp.summary}</p>
            </div>
            <ul className="mt-6 list-disc space-y-3 pl-5 text-[var(--muted)]">
              {exp.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
