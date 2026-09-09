"use client";

import CommunityWall from "@/components/CommunityWall";

export default function CommunityApp() {
  return (
    <div className="page-shell">
      <section className="surface px-6 py-6">
        <p className="eyebrow">Community</p>
        <h1 className="gradient-text font-display mt-2 text-2xl font-bold">A place to talk.</h1>
        <p className="mt-3 text-[var(--muted)]">
          Leave a message, share an idea, or ask a question. I&apos;ll see it here and can reply directly.
        </p>
      </section>
      <CommunityWall />
    </div>
  );
}
