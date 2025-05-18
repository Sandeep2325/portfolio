import Link from "next/link";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/skills", label: "Skills" },
  { href: "/experience", label: "Experience" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#181818]/80 backdrop-blur border-b border-[#222] shadow-lg">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-gradient-to-tr from-blue-500 to-cyan-400 text-white font-extrabold text-2xl rounded-full w-10 h-10 flex items-center justify-center shadow">SG</span>
          <span className="font-bold text-lg tracking-tight text-white hidden sm:inline">Sandeep Gowda</span>
        </Link>
        <nav className="flex gap-2 sm:gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 rounded-lg font-medium text-[#ccc] hover:text-white hover:bg-blue-700/80 transition"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
} 