import type { AppId } from "@/lib/os-apps";
import { getOSData } from "@/lib/os-data-server";
import OSShell from "./OSShell";

/**
 * Server entry for every route. Loads the portfolio once, hands it to the
 * client shell, and leaves readable content behind for visitors without JS.
 */
export default async function OSPage({ app = null }: { app?: AppId | null }) {
  const data = await getOSData();
  const { profile, experiences, projects, skillGroups } = data;

  return (
    <>
      <OSShell data={data} initialApp={app} />

      <noscript>
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="font-display text-3xl font-bold text-[var(--text)]">{profile?.name || "Sandeep Gowda"}</h1>
          <p className="mt-1 text-[var(--muted)]">{profile?.role || "Software Developer"}</p>
          <p className="mt-4 text-[var(--ink-soft)]">{profile?.intro}</p>

          <p className="mt-6 text-sm text-[var(--muted)]">
            This portfolio runs as a desktop OS and needs JavaScript for the full experience. The content below is the
            plain-text version.
          </p>

          {experiences.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-[var(--text)]">Experience</h2>
              {experiences.map((experience) => (
                <article key={experience.id} className="mt-4">
                  <h3 className="font-semibold text-[var(--text)]">
                    {experience.role} — {experience.company}
                  </h3>
                  <p className="text-sm text-[var(--muted)]">{experience.dates}</p>
                  <p className="mt-1 text-[var(--ink-soft)]">{experience.summary}</p>
                </article>
              ))}
            </section>
          )}

          {projects.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-[var(--text)]">Projects</h2>
              {projects.map((project) => (
                <article key={project.id} className="mt-4">
                  <h3 className="font-semibold text-[var(--text)]">{project.name}</h3>
                  <p className="mt-1 text-[var(--ink-soft)]">{project.description}</p>
                </article>
              ))}
            </section>
          )}

          {skillGroups.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-[var(--text)]">Skills</h2>
              {skillGroups.map((group) => (
                <p key={group.id} className="mt-2 text-[var(--ink-soft)]">
                  <strong className="text-[var(--text)]">{group.title}:</strong> {group.items.join(", ")}
                </p>
              ))}
            </section>
          )}

          {profile?.email && (
            <p className="mt-8">
              <a href={`mailto:${profile.email}`} className="text-link">
                {profile.email}
              </a>
            </p>
          )}
        </div>
      </noscript>
    </>
  );
}
