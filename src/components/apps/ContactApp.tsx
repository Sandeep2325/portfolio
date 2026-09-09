"use client";

import ContactForm from "@/components/ContactForm";
import type { OSData } from "@/lib/os-data";

export default function ContactApp({ data }: { data: OSData }) {
  const { profile, contactConfigured } = data;

  const links = [
    profile?.email && { label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    profile?.phone && { label: "Phone", value: profile.phone, href: `tel:${profile.phone.replace(/\s+/g, "")}` },
    profile?.github && { label: "GitHub", value: "Source profile", href: profile.github },
    profile?.linkedin && { label: "LinkedIn", value: "Professional profile", href: profile.linkedin },
  ].filter(Boolean) as { label: string; value: string; href: string }[];

  return (
    <div className="page-shell">
      <section className="surface px-6 py-6">
        <p className="eyebrow">Contact</p>
        <h1 className="gradient-text font-display mt-2 text-2xl font-bold">Open to collaborate.</h1>
        <p className="mt-3 text-[var(--muted)]">
          React, APIs, AI integrations, LLM workflows, agent automation, or creative media generation.
        </p>
      </section>

      <ContactForm isConfigured={contactConfigured} />

      {links.length > 0 && (
        <section className="card-grid cols-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noreferrer" : undefined}
              className="surface px-5 py-5"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-secondary)]">{link.label}</p>
              <p className="mt-2 break-words font-semibold text-[var(--text)]">{link.value}</p>
            </a>
          ))}
        </section>
      )}
    </div>
  );
}
