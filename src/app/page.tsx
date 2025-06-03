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

      <div className="mt-20 max-w-4xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-[#b5e0ff]">About Me</h2>
        <div className="space-y-6 text-[#b0b0b0]">
          <p className="text-lg leading-relaxed">
            I&apos;m a passionate software developer with a diverse skill set spanning both web and immersive technologies. My journey in software development has led me to work on exciting projects across various domains.
          </p>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-[#b5e0ff]">Web Development Expertise</h3>
            <p className="text-lg leading-relaxed">
              In the web development space, I specialize in building modern, responsive applications using React and TypeScript. I&apos;ve contributed to several projects implementing complex state management, real-time features, and RESTful APIs. My experience with Next.js has enabled me to create performant, SEO-friendly applications with server-side rendering capabilities.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-[#b5e0ff]">Backend Development</h3>
            <p className="text-lg leading-relaxed">
              On the backend, I&apos;ve worked extensively with Django, Python, and Node.js, developing robust APIs and database-driven applications. I&apos;ve implemented authentication systems, payment integrations, and complex business logic while maintaining clean, maintainable code. My experience includes working with PostgreSQL, MongoDB, and Redis for various data storage needs. With Node.js, I&apos;ve built scalable RESTful APIs and real-time applications using Express.js, implemented WebSocket connections, and integrated with various third-party services.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-[#b5e0ff]">Immersive Technology</h3>
            <p className="text-lg leading-relaxed">
              Beyond traditional web development, I&apos;ve ventured into the exciting world of VR application development using Unity. This experience has given me a unique perspective on creating immersive user experiences and handling real-time 3D interactions. I&apos;ve worked on projects involving spatial computing, interactive environments, and VR-based training simulations.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-[#b5e0ff]">Technical Philosophy</h3>
            <p className="text-lg leading-relaxed">
              I believe in writing clean, maintainable code and following best practices in software development. My approach combines technical excellence with a strong focus on user experience. I&apos;m constantly learning and adapting to new technologies while maintaining a solid foundation in core programming principles.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-6 justify-center mt-2">
        <a href="mailto:sandeepgowda2314@gmail.com" className="text-2xl text-[#b5e0ff] hover:text-blue-400 transition" title="Email"><FaEnvelope /></a>
        <a href="https://github.com/Sandeep2325" target="_blank" rel="noopener noreferrer" className="text-2xl text-[#b5e0ff] hover:text-blue-400 transition" title="GitHub"><FaGithub /></a>
        <a href="https://www.linkedin.com/in/sandeep-gowda-cc-54a117223/" target="_blank" rel="noopener noreferrer" className="text-2xl text-[#b5e0ff] hover:text-blue-400 transition" title="LinkedIn"><FaLinkedin /></a>
      </div>
    </section>
  );
}
