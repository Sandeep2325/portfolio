import CommunityWall from "@/components/CommunityWall";

export const dynamic = "force-dynamic";

export default function CommunityPage() {
  return <div className="page-shell"><section className="surface community-hero px-6 py-9 sm:px-8"><p className="eyebrow">Community</p><h1 className="mt-3 font-display text-4xl font-bold text-[var(--text)] sm:text-5xl">A place to talk.</h1><p className="mt-4 max-w-2xl text-[var(--muted)]">Leave a message, share an idea, or ask a question. I&apos;ll see it here and can reply directly.</p></section><CommunityWall /></div>;
}
