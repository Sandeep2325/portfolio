"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { FaLock } from "react-icons/fa";
import { useRouter, usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/skills", label: "Skills" },
  { href: "/experience", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
  { href: "/resume", label: "Resume" },
  { href: "/terminal", label: "Terminal" },
];

function isTerminal(link: { href: string }) {
  return link.href === "/terminal";
}

function MobileSidebar({ open, onClose, unlocked }: { open: boolean; onClose: () => void; unlocked: boolean }) {
  console.log("MobileSidebar unlocked:", unlocked);
  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#161b22] border-r border-[#30363d] p-6 flex flex-col transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          className="self-end mb-6 text-[#8b949e] hover:text-[#58a6ff] text-2xl"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          &times;
        </button>
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#30363d] mb-3">
            <Image src="/profile.jpeg" alt="Sandeep Gowda" width={80} height={80} />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#c9d1d9]">Sandeep Gowda</span>
          <span className="text-xs text-[#8b949e] mt-1">Software Developer</span>
          <span className="text-xs text-[#58a6ff]">@ Bengaluru, India</span>
        </div>
        <nav className="flex flex-col gap-1 mt-4">
          {navLinks.map((link) => {
            const disabled = !unlocked && !isTerminal(link);
            return disabled ? (
              <span
                key={link.href}
                className="px-3 py-2 rounded font-medium bg-[#23272e] cursor-not-allowed select-none block flex items-center gap-2"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("sidebarUnlockAttempt"));
                  }
                }}
              >
                <FaLock className="text-[#8b949e]" />
                {link.label}
              </span>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded font-medium text-[#c9d1d9] hover:bg-[#21262d] hover:text-[#58a6ff] transition border border-transparent hover:border-[#30363d]"
                onClick={onClose}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-10 text-xs text-[#8b949e] leading-relaxed">
          <span className="block mb-2">Experienced in React, TypeScript, Django, Next.js, Cloud.</span>
          <span className="block">Open to collaboration and new opportunities.</span>
        </div>
        <div className="mt-auto pt-10 text-xs text-[#444]">&copy; {new Date().getFullYear()} Sandeep Gowda</div>
      </aside>
    </>
  );
}

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function checkUnlock() {
      const isUnlocked = document.cookie.includes("sidebarUnlocked=true");
      setUnlocked(isUnlocked);
      if (!isUnlocked && pathname !== "/terminal") {
        router.replace("/terminal");
      }
    }
    checkUnlock();
    window.addEventListener("unlockSidebar", checkUnlock);
    return () => window.removeEventListener("unlockSidebar", checkUnlock);
  }, [pathname, router]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar for md+ */}
      <aside className="hidden md:flex flex-col w-72 bg-[#161b22] border-r border-[#30363d] p-6 fixed inset-y-0 left-0 z-40">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#30363d] mb-3">
            <Image src="/profile.jpeg" alt="Sandeep Gowda" width={96} height={96} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#c9d1d9]">Sandeep Gowda</span>
          <span className="text-xs text-[#8b949e] mt-1">Software Developer</span>
          <span className="text-xs text-[#58a6ff]">@ Bengaluru, India</span>
        </div>
        <nav className="flex flex-col gap-1 mt-4">
          {navLinks.map((link) => {
            const disabled = !unlocked && !isTerminal(link);
            return (
              <span key={link.href}>
                {disabled ? (
                  <span
                    className="px-3 py-2 rounded font-medium bg-[#23272e] cursor-not-allowed select-none block flex items-center gap-2"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new Event("sidebarUnlockAttempt"));
                      }
                    }}
                  >
                    <FaLock className="text-[#8b949e]" />
                    {link.label}
                  </span>
                ) : (
                  <Link
                    href={link.href}
                    className="px-3 py-2 rounded font-medium text-[#c9d1d9] hover:bg-[#21262d] hover:text-[#58a6ff] transition border border-transparent hover:border-[#30363d] block"
                  >
                    {link.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
        <div className="mt-10 text-xs text-[#8b949e] leading-relaxed">
          <span className="block mb-2">Experienced in React, TypeScript, Django, Next.js, Cloud.</span>
          <span className="block">Open to collaboration and new opportunities.</span>
        </div>
        <div className="mt-auto pt-10 text-xs text-[#444]">&copy; {new Date().getFullYear()} Sandeep Gowda</div>
      </aside>
      {/* Topbar for mobile */}
      <header className="md:hidden w-full fixed top-0 left-0 z-50 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 py-3">
        <span className="text-lg font-bold tracking-tight text-[#c9d1d9]">Sandeep Gowda</span>
        <button
          className="text-2xl text-[#c9d1d9] hover:text-[#58a6ff] focus:outline-none"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          &#9776;
        </button>
      </header>
      <MobileSidebar key={unlocked ? 'unlocked' : 'locked'} open={sidebarOpen} onClose={() => setSidebarOpen(false)} unlocked={unlocked} />
      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-72 min-h-screen flex flex-col items-center justify-center px-2 sm:px-4 py-8 bg-[#0d1117]">
        <div className="w-full max-w-3xl mx-auto py-8 card mt-16 md:mt-0">{children}</div>
      </main>
    </div>
  );
} 