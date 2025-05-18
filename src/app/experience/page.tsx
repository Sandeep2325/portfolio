const experiences = [
  {
    company: "Getafix Technologies (QuickAds, Bengaluru)",
    role: "Full-Stack Developer",
    dates: "Apr 2024 - Present",
    details: [
      "Led complete video ad creation from design to deployment using React, TypeScript, Next.js, FastAPI.",
      "Managed AWS EC2 infrastructure for seamless deployment.",
      "Integrated third-party APIs to enhance automation and ad functionalities.",
    ],
  },
  {
    company: "Innovya Technologies",
    role: "Software Developer",
    dates: "Apr 2023 - Apr 2024",
    details: [
      "Developed VR applications for Pico and Oculus using Unity and C#.",
      "Built game mechanics using Godot and GDScript.",
      "Led web, game, and VR projects with optimized deployment.",
    ],
  },
  {
    company: "Nexevo Technologies Pvt Ltd",
    role: "Python Developer",
    dates: "Jan 2022 - Feb 2023",
    details: [
      "Built full-stack applications using Django, Bootstrap, JavaScript, jQuery.",
      "Developed REST APIs for authentication and CRUD operations.",
      "Deployed applications to staging and production environments.",
    ],
  },
];

export default function ExperiencePage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Professional Experience</h1>
      <div className="flex flex-col gap-8">
        {experiences.map((exp) => (
          <div key={exp.company} className="bg-[#181818] rounded-lg p-6 shadow border-l-4 border-blue-400">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
              <div className="font-bold text-lg">{exp.company}</div>
              <div className="text-[#aaa] text-sm">{exp.role} | {exp.dates}</div>
            </div>
            <ul className="list-disc ml-6 text-[#ccc]">
              {exp.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
} 