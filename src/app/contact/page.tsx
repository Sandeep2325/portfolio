import ContactForm from "@/components/ContactForm";
import { getSiteProfile } from "@/lib/portfolio-data";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const [profile, configured] = await Promise.all([getSiteProfile(), Promise.resolve(isSupabaseConfigured())]);

  return (
    <div className="page-shell">
      <section className="surface px-6 py-8 sm:px-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Contact</p>
        <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">Open to collaborate on React, APIs, AI integrations, and modern product builds.</h1>
        <p className="mt-5 max-w-3xl text-[var(--muted)]">
          Reach out for product design implementation, frontend engineering, backend integration, AI API features, LLM workflows, agent automation, or creative media generation.
        </p>
      </section>

      <section className="card-grid cols-2">
        <ContactForm isConfigured={configured} />
        {profile?.email ? (
          <a href={`mailto:${profile.email}`} className="surface px-6 py-7 transition hover:bg-white/5">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent-secondary)]">Email</p>
            <p className="mt-3 font-display text-2xl font-bold text-white">{profile.email}</p>
            <p className="mt-3 text-[var(--muted)]">Best for project inquiries, collaboration, and hiring conversations.</p>
          </a>
        ) : null}
        {profile?.phone ? (
          <a href={`tel:${profile.phone.replace(/\s+/g, "")}`} className="surface px-6 py-7 transition hover:bg-white/5">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent-secondary)]">Phone</p>
            <p className="mt-3 font-display text-2xl font-bold text-white">{profile.phone}</p>
            <p className="mt-3 text-[var(--muted)]">Available for direct conversations around active project work.</p>
          </a>
        ) : null}
        {profile?.github ? (
          <a href={profile.github} target="_blank" rel="noreferrer" className="surface px-6 py-7 transition hover:bg-white/5">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent-secondary)]">GitHub</p>
            <p className="mt-3 font-display text-2xl font-bold text-white">Source Profile</p>
            <p className="mt-3 text-[var(--muted)]">Code, experiments, and implementation history.</p>
          </a>
        ) : null}
        {profile?.linkedin ? (
          <a href={profile.linkedin} target="_blank" rel="noreferrer" className="surface px-6 py-7 transition hover:bg-white/5">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--accent-secondary)]">LinkedIn</p>
            <p className="mt-3 font-display text-2xl font-bold text-white">Professional Profile</p>
            <p className="mt-3 text-[var(--muted)]">The fastest way to connect for roles and collaboration.</p>
          </a>
        ) : null}
      </section>
    </div>
  );
}
