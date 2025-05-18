"use client";
import { useRef } from "react";
import { FaEnvelope, FaPhone, FaGithub, FaLinkedin, FaDownload } from "react-icons/fa";
import Link from "next/link";

export default function ResumePage() {
  const resumeRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (typeof window !== "undefined" && resumeRef.current) {
      const html2pdf = (await import("html2pdf.js")).default;
      html2pdf(resumeRef.current, {
        margin: 0.5,
        filename: "Sandeep_Gowda_Resume.pdf",
        image: { type: "jpeg", quality: 1 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: "in", 
          format: "a4", 
          orientation: "portrait"
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-10 card p-8 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:flex-row print:items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#58a6ff] print:text-black">Sandeep Gowda</h1>
          <p className="text-lg text-[#8b949e] print:text-gray-700">Software Developer</p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-[#c9d1d9] print:text-gray-600">
            <span className="flex items-center gap-1"><FaEnvelope /> sandeepgowda2314@gmail.com</span>
            <span className="flex items-center gap-1"><FaPhone /> +91 8105486993</span>
            <Link href="https://github.com/Sandeep2325" target="_blank" className="flex items-center gap-1 hover:text-[#58a6ff] print:text-gray-600 print:no-underline"><FaGithub /> GitHub</Link>
            <Link href="https://www.linkedin.com/in/sandeep-gowda-cc-54a117223/" target="_blank" className="flex items-center gap-1 hover:text-[#58a6ff] print:text-gray-600 print:no-underline"><FaLinkedin /> LinkedIn</Link>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-5 py-2 rounded bg-[#58a6ff] text-white font-semibold shadow hover:bg-[#238636] transition text-base print:hidden"
        >
          <FaDownload /> Download My Resume
        </button>
      </div>
      <div ref={resumeRef} className="print:bg-white print:text-black">
        {/* Summary */}
        <div className="mb-6 print:mb-4">
          <h2 className="text-xl font-semibold mb-2 text-[#58a6ff] print:text-black print:border-b print:border-gray-300 print:pb-1">Summary</h2>
          <p className="text-[#c9d1d9] print:text-gray-700">Experienced Software Developer with expertise in React, TypeScript, Django, Next.js, and cloud infrastructure. Strong background in full-stack development, automation, and project ownership.</p>
        </div>
        {/* Skills */}
        <div className="mb-6 print:mb-4">
          <h2 className="text-xl font-semibold mb-2 text-[#58a6ff] print:text-black print:border-b print:border-gray-300 print:pb-1">Skills</h2>
          <ul className="flex flex-wrap gap-3 text-[#c9d1d9] text-sm print:text-gray-700">
            <li>React</li><li>TypeScript</li><li>Next.js</li><li>Django</li><li>FastAPI</li><li>Python</li><li>JavaScript</li><li>Redux</li><li>Bootstrap</li><li>Godot</li><li>Unity</li><li>AWS EC2</li><li>MySQL</li><li>PostgreSQL</li><li>MongoDB</li>
          </ul>
        </div>
        {/* Experience */}
        <div className="mb-6 print:mb-4">
          <h2 className="text-xl font-semibold mb-2 text-[#58a6ff] print:text-black print:border-b print:border-gray-300 print:pb-1">Experience</h2>
          <div className="mb-3 print:mb-2">
            <div className="font-bold print:text-gray-800">Getafix Technologies (QuickAds, Bengaluru)</div>
            <div className="text-sm text-[#8b949e] print:text-gray-600">Full-Stack Developer | Apr 2024 - Present</div>
            <ul className="list-disc ml-6 text-[#c9d1d9] text-sm print:text-gray-700">
              <li>Led complete video ad creation from design to deployment using React, TypeScript, Next.js, FastAPI.</li>
              <li>Managed AWS EC2 infrastructure for seamless deployment.</li>
              <li>Integrated third-party APIs to enhance automation and ad functionalities.</li>
            </ul>
          </div>
          <div className="mb-3 print:mb-2">
            <div className="font-bold print:text-gray-800">Innovya Technologies</div>
            <div className="text-sm text-[#8b949e] print:text-gray-600">Software Developer | Apr 2023 - Apr 2024</div>
            <ul className="list-disc ml-6 text-[#c9d1d9] text-sm print:text-gray-700">
              <li>Developed VR applications for Pico and Oculus using Unity and C#.</li>
              <li>Built game mechanics using Godot and GDScript.</li>
              <li>Led web, game, and VR projects with optimized deployment.</li>
            </ul>
          </div>
          <div>
            <div className="font-bold print:text-gray-800">Nexevo Technologies Pvt Ltd</div>
            <div className="text-sm text-[#8b949e] print:text-gray-600">Python Developer | Jan 2022 - Feb 2023</div>
            <ul className="list-disc ml-6 text-[#c9d1d9] text-sm print:text-gray-700">
              <li>Built full-stack applications using Django, Bootstrap, JavaScript, jQuery.</li>
              <li>Developed REST APIs for authentication and CRUD operations.</li>
              <li>Deployed applications to staging and production environments.</li>
            </ul>
          </div>
        </div>
        {/* Projects */}
        <div className="mb-6 print:mb-4">
          <h2 className="text-xl font-semibold mb-2 text-[#58a6ff] print:text-black print:border-b print:border-gray-300 print:pb-1">Projects</h2>
          <ul className="list-disc ml-6 text-[#c9d1d9] text-sm print:text-gray-700">
            <li>QuickAds Video Ad Platform (React, TypeScript, Next.js, FastAPI, AWS EC2)</li>
            <li>VR Video Player for Oculus & PICO (Unity, C#, PICO SDK, Oculus OVR)</li>
            <li>Medical E-commerce Platform (Django, MySQL, jQuery, AJAX, JavaScript, HTML/CSS)</li>
            <li>Insurance Brokerage Application (Django, MySQL, jQuery, AJAX, JavaScript, HTML/CSS)</li>
            <li>B2B E-commerce Website (Django REST Framework, React.js, Redux, Axios)</li>
          </ul>
        </div>
        {/* Education */}
        <div className="mb-2">
          <h2 className="text-xl font-semibold mb-2 text-[#58a6ff] print:text-black print:border-b print:border-gray-300 print:pb-1">Education</h2>
          <ul className="list-disc ml-6 text-[#c9d1d9] text-sm print:text-gray-700">
            <li>B.E. (EEE) - 7.49 GPA (2021) | Global Academy of Technology, Bengaluru</li>
            <li>Diploma (EEE) - 77.1% (2018) | Government Polytechnic, KR Pet</li>
            <li>10th Grade - 81.44% (2015) | BGS Public School, Kunigal</li>
            <li>Python Data Science – 5Square Technologies, Bengaluru</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 