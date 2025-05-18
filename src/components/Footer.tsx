import { FaGithub, FaLinkedin } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full bg-[#181818] border-t border-[#222] py-6 text-center text-[#666] text-sm flex flex-col items-center gap-2">
      <div>
        &copy; {new Date().getFullYear()} Sandeep Gowda. Built with Next.js & Tailwind CSS.
      </div>
      <div className="flex gap-4 justify-center">
        <a href="https://github.com/Sandeep2325" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition"><FaGithub size={20} /></a>
        <a href="https://www.linkedin.com/in/sandeep-gowda-cc-54a117223/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition"><FaLinkedin size={20} /></a>
      </div>
    </footer>
  );
} 