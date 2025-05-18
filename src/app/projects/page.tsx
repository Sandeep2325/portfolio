const projects = [
  {
    name: "QuickAds Video Ad Platform",
    stack: "React, TypeScript, Next.js, FastAPI, AWS EC2",
    desc: "End-to-end video ad creation and management platform with automation and cloud deployment.",
  },
  {
    name: "VR Video Player for Oculus & PICO",
    stack: "Unity, C#, PICO SDK, Oculus OVR",
    desc: "360-degree VR video streaming for immersive experiences on Oculus and Pico devices.",
  },
  {
    name: "Medical E-commerce Platform",
    stack: "Django, MySQL, jQuery, AJAX, JavaScript, HTML/CSS",
    desc: "A robust e-commerce solution for medical products with secure transactions.",
  },
  {
    name: "Insurance Brokerage Application",
    stack: "Django, MySQL, jQuery, AJAX, JavaScript, HTML/CSS",
    desc: "Web app for managing insurance brokerage operations and client data.",
  },
  {
    name: "B2B E-commerce Website",
    stack: "Django REST Framework, React.js, Redux, Axios",
    desc: "Business-to-business e-commerce platform with advanced features and integrations.",
  },
];

export default function ProjectsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Projects</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {projects.map((proj) => (
          <div key={proj.name} className="bg-[#181818] rounded-lg p-6 shadow border-l-4 border-cyan-400 hover:scale-105 transition-transform">
            <div className="font-bold text-lg mb-1">{proj.name}</div>
            <div className="text-[#aaa] text-sm mb-2">{proj.stack}</div>
            <div className="text-[#ccc] text-base">{proj.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
} 