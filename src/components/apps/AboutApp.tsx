"use client";

import Image from "next/image";
import type { OSData } from "@/lib/os-data";
import type { AppId } from "@/lib/os-apps";

export default function AboutApp({ data, onOpenApp }: { data: OSData; onOpenApp: (id: AppId) => void }) {
  const { profile, stats, featuredSkills, projects, pillars } = data;
  const skills = featuredSkills.filter((item) => !/supabase/i.test(item)).slice(0, 10);

  return (
    <div className="page-shell">
      <section className="surface overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[rgba(77,168,255,0.35)] via-[rgba(155,89,255,0.3)] to-transparent" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            {profile?.avatar ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-[#1a1a2e] bg-[#1a1a2e]">
                <Image src={profile.avatar} alt={profile.name} fill sizes="80px" className="object-cover" />
              </div>
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl border-2 border-[#1a1a2e] bg-gradient-to-br from-[#4da8ff] to-[#9b59ff] text-2xl font-bold text-[#0a0a0f]">
                SG
              </div>
            )}
            <div className="flex-1">
              <h1 className="gradient-text font-display text-2xl font-bold">{profile?.name || "Sandeep Gowda"}</h1>
              <p className="text-[var(--muted)]">{profile?.role || "Software Developer"}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{profile?.location || "Bengaluru, India"}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="primary-button" onClick={() => onOpenApp("contact")}>
              Get in touch
            </button>
            <button type="button" className="secondary-button" onClick={() => onOpenApp("projects")}>
              View work
            </button>
            <button type="button" className="secondary-button" onClick={() => onOpenApp("things")}>
              Latest posts
            </button>
          </div>
        </div>
      </section>

      <section className="surface px-6 py-6">
        <p className="eyebrow">About</p>
        <p className="mt-3 text-[var(--ink-soft)]">
          {profile?.intro || "I enjoy building reliable web products and solving everyday business problems with software."}
        </p>
        <p className="mt-3 text-[var(--muted)]">
          I work across frontend development, APIs, integrations, and cloud deployment. I care about clear communication,
          maintainable code, and shipping work that people can actually use.
        </p>
      </section>

      {stats.length > 0 && (
        <section className="card-grid cols-2">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </section>
      )}

      {projects.length > 0 && (
        <section className="surface px-6 py-6">
          <div className="section-heading">
            <div>
              <h2>Featured</h2>
              <p>A few areas I work in most often.</p>
            </div>
            <button type="button" className="text-link" onClick={() => onOpenApp("projects")}>
              Show all
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {projects.slice(0, 3).map((project) => (
              <article key={project.id} className="flex gap-3 rounded-xl border border-[var(--surface-border)] p-3">
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[rgba(77,168,255,0.25)] to-[rgba(155,89,255,0.25)] font-bold text-[#4da8ff]">
                  {project.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--text)]">{project.name}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{project.description}</p>
                  <p className="mt-1 text-xs text-[var(--accent-secondary)]">{project.stack.join(" · ")}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="surface px-6 py-6">
          <div className="section-heading">
            <div>
              <h2>Skills</h2>
              <p>Tools and technologies I use.</p>
            </div>
            <button type="button" className="text-link" onClick={() => onOpenApp("skills")}>
              See all
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span className="badge" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {pillars.length > 0 && (
        <section className="card-grid cols-2">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="surface px-5 py-5">
              <h3 className="font-semibold text-[var(--text)]">{pillar.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{pillar.description}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
