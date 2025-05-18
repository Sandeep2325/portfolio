import type { Metadata } from "next";
import "./globals.css";
import SidebarShell from "../components/SidebarShell";

export const metadata: Metadata = {
  title: "Sandeep Gowda | Software Developer Portfolio",
  description: "Portfolio of Sandeep Gowda: React, TypeScript, Django, Next.js, Cloud Developer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0d1117] text-[#c9d1d9] min-h-screen font-sans">
        <SidebarShell>{children}</SidebarShell>
      </body>
    </html>
  );
}
