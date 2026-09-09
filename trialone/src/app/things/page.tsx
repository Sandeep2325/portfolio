import Link from "next/link";

const things = [
  { number: "01", title: "Building in public", description: "Notes, experiments, and small product ideas from the workbench—shared before they are perfectly polished.", tag: "PROCESS" },
  { number: "02", title: "Useful systems", description: "A collection of workflows, tiny automations, and repeatable setups that make creative and engineering work feel lighter.", tag: "SYSTEMS" },
  { number: "03", title: "Curious by default", description: "Currently exploring AI agents, better interface patterns, and the meeting point between practical tools and good taste.", tag: "NOW" },
];

export default function ThingsPage() {
  return <div className="page-shell">
    <section className="things-hero surface px-6 py-10 sm:px-10 sm:py-14">
      <p className="eyebrow">A small collection</p><p className="things-kicker">MY THINGS / 2026</p>
      <h1 className="section-title max-w-4xl text-[var(--text)]">The ideas, tools, and rabbit holes that keep me interested.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">Not a case-study archive—more like a living shelf of things I&apos;m making, learning, and returning to.</p>
    </section>
    <section className="things-grid">
      {things.map((thing, index) => <article className={`thing-card thing-card-${index + 1}`} key={thing.number}>
        <div className="flex items-start justify-between gap-5"><span className="thing-number">{thing.number}</span><span className="thing-tag">{thing.tag}</span></div>
        <div><h2>{thing.title}</h2><p>{thing.description}</p></div>
      </article>)}
    </section>
    <section className="surface things-note px-6 py-8 sm:px-10"><div><p className="eyebrow">Open invitation</p><h2 className="mt-3 font-display text-3xl font-bold text-[var(--text)] sm:text-4xl">Have an interesting problem?</h2></div><Link href="/contact" className="warm-button rounded-full px-6 py-3 font-semibold transition">Start a conversation</Link></section>
  </div>;
}
