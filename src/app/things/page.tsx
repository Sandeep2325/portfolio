import Link from "next/link";
import ThingsFeed from "@/components/ThingsFeed";

const things = [
  { number: "01", title: "What I am learning", description: "A running list of topics I am spending time on, from better React patterns to practical AI tooling.", tag: "LEARNING" },
  { number: "02", title: "Side projects", description: "Small ideas, prototypes, and experiments I build outside regular project work.", tag: "PROJECTS" },
  { number: "03", title: "Notes and resources", description: "Useful links, references, and things worth remembering for the next project.", tag: "SAVED" },
];

export default function ThingsPage() {
  return <div className="page-shell">
    <section className="things-hero surface px-6 py-10 sm:px-10 sm:py-14">
      <p className="eyebrow">Personal space</p><p className="things-kicker">MY THINGS</p>
      <h1 className="section-title max-w-4xl text-[var(--text)]">A few things I&apos;m working on and keeping track of.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">This page is for the work that does not fit neatly into a project or job title.</p>
    </section>
    <section className="things-grid">
      {things.map((thing, index) => <article className={`thing-card thing-card-${index + 1}`} key={thing.number}>
        <div className="flex items-start justify-between gap-5"><span className="thing-number">{thing.number}</span><span className="thing-tag">{thing.tag}</span></div>
        <div><h2>{thing.title}</h2><p>{thing.description}</p></div>
      </article>)}
    </section>
    <ThingsFeed />
    <section className="surface things-note px-6 py-8 sm:px-10"><div><p className="eyebrow">Let&apos;s connect</p><h2 className="mt-3 font-display text-3xl font-bold text-[var(--text)] sm:text-4xl">Want to work together?</h2></div><Link href="/contact" className="warm-button rounded-full px-6 py-3 font-semibold transition">Get in touch</Link></section>
  </div>;
}
