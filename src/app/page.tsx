import Link from "next/link";
import { FaGithub, FaLinkedin, FaEnvelope } from "react-icons/fa";
import TypingCursor from "../components/TypingCursor";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 bg-gradient-to-tr from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">Sandeep Gowda</h1>
      <h2 className="text-2xl sm:text-3xl font-semibold mb-6 text-[#b5e0ff]">Software Developer</h2>
      <p className="text-lg text-[#b0b0b0] mb-10 max-w-2xl mx-auto">
        I build robust, scalable, and interactive applications using React, TypeScript, Django, Next.js, and cloud technologies. Passionate about clean code and user experience.
        <TypingCursor />
      </p>
      <div className="flex flex-wrap gap-4 justify-center mb-8">
        <Link href="/skills" className="px-8 py-3 rounded-lg bg-blue-700 hover:bg-blue-600 text-lg font-semibold transition shadow">View Skills</Link>
        <Link href="/projects" className="px-8 py-3 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-lg font-semibold transition shadow">See Projects</Link>
        <Link href="/contact" className="px-8 py-3 rounded-lg bg-purple-700 hover:bg-purple-600 text-lg font-semibold transition shadow">Contact Me</Link>
      </div>
      <div className="flex gap-6 justify-center mt-2">
        <a href="mailto:sandeepgowda2314@gmail.com" className="text-2xl text-[#b5e0ff] hover:text-blue-400 transition" title="Email"><FaEnvelope /></a>
        <a href="https://github.com/Sandeep2325" target="_blank" rel="noopener noreferrer" className="text-2xl text-[#b5e0ff] hover:text-blue-400 transition" title="GitHub"><FaGithub /></a>
        <a href="https://www.linkedin.com/in/sandeep-gowda-cc-54a117223/" target="_blank" rel="noopener noreferrer" className="text-2xl text-[#b5e0ff] hover:text-blue-400 transition" title="LinkedIn"><FaLinkedin /></a>
      </div>
    </section>
  );
}
