import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#10131a] via-[#181c24] to-[#0a0a0a] text-[#ededed]">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 bg-gradient-to-tr from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">Sandeep Gowda</h1>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-[#b5e0ff]">Full-Stack Developer | Cloud | Game & VR Enthusiast</h2>
          <p className="text-lg text-[#b0b0b0] mb-10">I build robust, scalable, and interactive applications using React, TypeScript, Django, Next.js, and cloud technologies. Passionate about game and VR development with a strong focus on clean code and user experience.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/skills" className="px-8 py-3 rounded-lg bg-blue-700 hover:bg-blue-600 text-lg font-semibold transition shadow">View Skills</Link>
            <Link href="/projects" className="px-8 py-3 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-lg font-semibold transition shadow">See Projects</Link>
            <Link href="/contact" className="px-8 py-3 rounded-lg bg-purple-700 hover:bg-purple-600 text-lg font-semibold transition shadow">Contact Me</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
