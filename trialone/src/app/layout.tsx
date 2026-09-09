import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getNavigation, getSiteProfile } from "@/lib/portfolio-data";
import AuthControl from "@/components/AuthControl";

export const metadata: Metadata = {
  title: "Sandeep Gowda | Modern Portfolio",
  description:
    "A modern multi-page portfolio for Sandeep Gowda featuring work across React, Next.js, APIs, cloud delivery, and collaboration.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [profile, navigation] = await Promise.all([getSiteProfile(), getNavigation()]);

  return (
    <html lang="en">
      <body>
        <div className="site-bg">
          <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
            <header className="sticky top-4 z-50 mb-8">
              <div className="surface flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                <Link href="/" className="flex items-center gap-4">
                  <div className="brand-mark">
                    {(profile?.name || "SG")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-[var(--text)]">{profile?.name || "Portfolio"}</p>
                    <p className="text-sm text-[var(--muted)]">{profile?.role || "Software Developer"}</p>
                  </div>
                </Link>
                <nav className="flex flex-wrap items-center gap-2">
                  {navigation.map((item) => (
                    <Link key={item.href} href={item.href} className="nav-pill">
                      {item.label}
                    </Link>
                  ))}
                  <AuthControl />
                </nav>
              </div>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="mt-10">
              <div className="surface flex flex-col gap-3 px-5 py-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-display text-base font-semibold text-[var(--text)]">{profile?.name || "Portfolio"}</p>
                  <p className="text-sm text-[var(--muted)]">{profile?.tagline || "Modern software portfolio and collaboration hub."}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                  {profile?.github ? (
                    <a href={profile.github} target="_blank" rel="noreferrer" className="text-link">
                      GitHub
                    </a>
                  ) : null}
                  {profile?.linkedin ? (
                    <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-link">
                      LinkedIn
                    </a>
                  ) : null}
                  {profile?.email ? (
                    <a href={`mailto:${profile.email}`} className="text-link">
                      Email
                    </a>
                  ) : null}
                </div>
              </div>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
