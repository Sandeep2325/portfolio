import Image from "next/image";
import Link from "next/link";
import { getBlogPosts } from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const blogPosts = await getBlogPosts();

  return (
    <div className="page-shell">
      <section className="surface px-6 py-8 sm:px-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Blog</p>
        <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">Notes on engineering, AI workflows, and the modern React stack.</h1>
        <p className="mt-5 max-w-3xl text-[var(--muted)]">
          Thoughts on product engineering, frontend architecture, and practical AI-assisted development.
        </p>
      </section>

      <div className="card-grid cols-2">
        {blogPosts.map((post) => (
          <Link href={`/blog/${post.slug}`} key={post.slug} className="surface overflow-hidden transition hover:-translate-y-1">
            <div className="relative h-56 w-full">
              <Image src={post.image} alt={post.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07111b] to-transparent opacity-70" />
            </div>
            <div className="p-6">
              <div className="mb-3 flex items-center gap-4">
                <span className="rounded-full bg-white/6 px-3 py-1 text-sm text-[var(--accent)]">{post.category}</span>
              </div>
              <h2 className="font-display text-2xl font-semibold text-white">{post.title}</h2>
              <p className="mt-3 text-[var(--muted)]">{post.excerpt}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4">
                <span className="text-sm text-[var(--muted)]">{post.read_time}</span>
                <span className="inline-flex items-center text-[var(--accent)]">
                  Read more <span className="ml-1">→</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
