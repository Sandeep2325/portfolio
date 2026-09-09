import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans-os", display: "swap" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-os", display: "swap" });

export const metadata: Metadata = {
  title: "Sandeep OS | Sandeep Gowda",
  description:
    "A desktop-OS portfolio for Sandeep Gowda — experience, projects, skills, posts, community wall, and direct messages, each as its own app.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
