import Image from "next/image";
import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import { getBlogPostBySlug } from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return <div className="surface px-6 py-8 text-[var(--muted)]">Post not found.</div>;
  }

  return (
    <div className="page-shell">
      <section className="surface px-6 py-8 sm:px-8">
        <Link href="/blog" className="group inline-flex items-center text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]">
          <FaArrowLeft className="mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Blog
        </Link>
      </section>

      <article className="surface overflow-hidden">
        <div className="relative h-80 w-full">
          <Image src={post.image} alt={post.title} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111b] to-transparent opacity-70" />
        </div>

        <div className="p-8">
          <div className="mb-6 flex items-center gap-4">
            <span className="rounded-full bg-[#f3f6f8] px-3 py-1 text-sm text-[var(--accent)]">{post.category}</span>
            <span className="text-sm text-[var(--muted)]">{post.read_time}</span>
          </div>

          <h1 className="font-display text-4xl font-bold text-[var(--text)] sm:text-5xl">{post.title}</h1>

          <div className="article mt-8" dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>
      </article>
    </div>
  );
}
