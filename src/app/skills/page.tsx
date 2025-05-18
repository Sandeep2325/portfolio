import { FaReact, FaPython, FaAws, FaUnity, FaGamepad, FaDatabase } from "react-icons/fa";
import { SiDjango, SiTypescript, SiNextdotjs, SiFastapi, SiRedux, SiGodotengine, SiMysql, SiPostgresql, SiMongodb, SiHtml5, SiCss3, SiJavascript, SiBootstrap } from "react-icons/si";

const skills = [
  { icon: <FaReact className="text-cyan-400" />, label: "React.js", desc: "Modern UI development with reusable components." },
  { icon: <SiTypescript className="text-blue-400" />, label: "TypeScript", desc: "Type-safe JavaScript for scalable apps." },
  { icon: <SiNextdotjs className="text-white" />, label: "Next.js", desc: "Full-stack React framework for SSR and SSG." },
  { icon: <SiDjango className="text-green-600" />, label: "Django", desc: "Robust backend and REST APIs." },
  { icon: <SiFastapi className="text-green-400" />, label: "FastAPI", desc: "High-performance Python web APIs." },
  { icon: <FaPython className="text-yellow-300" />, label: "Python", desc: "Versatile scripting and backend development." },
  { icon: <SiJavascript className="text-yellow-400" />, label: "JavaScript", desc: "Core web interactivity and logic." },
  { icon: <SiHtml5 className="text-orange-500" />, label: "HTML5", desc: "Semantic, accessible markup." },
  { icon: <SiCss3 className="text-blue-500" />, label: "CSS3", desc: "Responsive, modern styling." },
  { icon: <SiRedux className="text-purple-400" />, label: "Redux", desc: "State management for complex apps." },
  { icon: <SiBootstrap className="text-purple-600" />, label: "Bootstrap", desc: "Rapid UI prototyping." },
  { icon: <SiGodotengine className="text-blue-300" />, label: "Godot", desc: "Game engine for 2D/3D games." },
  { icon: <FaUnity className="text-gray-400" />, label: "Unity", desc: "VR/AR and game development." },
  { icon: <FaAws className="text-orange-400" />, label: "AWS EC2", desc: "Cloud infrastructure and deployment." },
  { icon: <SiMysql className="text-blue-300" />, label: "MySQL", desc: "Relational database management." },
  { icon: <SiPostgresql className="text-blue-400" />, label: "PostgreSQL", desc: "Advanced SQL database." },
  { icon: <SiMongodb className="text-green-400" />, label: "MongoDB", desc: "NoSQL document database." },
  { icon: <FaGamepad className="text-pink-400" />, label: "Game Dev", desc: "Game mechanics and logic." },
  { icon: <FaDatabase className="text-gray-400" />, label: "Databases", desc: "Data modeling and management." },
];

export default function SkillsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Technical Skills</h1>
      <p className="text-[#aaa] text-center mb-10">A blend of frontend, backend, cloud, and game development skills. I enjoy building robust, scalable, and interactive applications.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {skills.map((skill) => (
          <div key={skill.label} className="bg-[#181818] rounded-lg p-5 flex flex-col items-center shadow hover:scale-105 transition-transform">
            <div className="text-4xl mb-2">{skill.icon}</div>
            <div className="font-semibold mb-1">{skill.label}</div>
            <div className="text-[#aaa] text-sm text-center">{skill.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 