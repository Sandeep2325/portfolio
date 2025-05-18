import { FaEnvelope, FaPhone, FaGithub, FaLinkedin } from "react-icons/fa";

const contacts = [
  { icon: <FaEnvelope />, label: "Email", value: "sandeepgowda2314@gmail.com", href: "mailto:sandeepgowda2314@gmail.com" },
  { icon: <FaPhone />, label: "Phone", value: "8105486993", href: "tel:8105486993" },
  { icon: <FaGithub />, label: "GitHub", value: "Sandeep2325", href: "https://github.com/Sandeep2325" },
  { icon: <FaLinkedin />, label: "LinkedIn", value: "sandeep-gowda-cc-54a117223", href: "https://www.linkedin.com/in/sandeep-gowda-cc-54a117223/" },
];

export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Contact Me</h1>
      <p className="text-[#aaa] text-center mb-8">Interested in collaborating or have a project in mind? Reach out to me via any of the methods below!</p>
      <div className="flex flex-col gap-4">
        {contacts.map((c) => (
          <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#181818] rounded-lg p-4 shadow hover:bg-[#232323] transition">
            <span className="text-2xl">{c.icon}</span>
            <span className="font-semibold">{c.label}:</span>
            <span className="text-[#ccc]">{c.value}</span>
          </a>
        ))}
      </div>
    </div>
  );
} 