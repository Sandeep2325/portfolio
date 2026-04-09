"use client";

import { useEffect, useState } from "react";
import { FaDownload } from "react-icons/fa";

type ResumeData = {
  profile: {
    name: string;
    role: string;
    email: string;
    phone: string;
    github: string;
    linkedin: string;
    location?: string;
    tagline?: string;
    intro?: string;
  } | null;
  featuredSkills: string[];
  skillGroups: {
    id: number;
    title: string;
    items: string[];
  }[];
  experiences: {
    id: number;
    company: string;
    role: string;
    dates: string;
    summary?: string;
    highlights: string[];
  }[];
  projects: {
    id: number;
    name: string;
    description?: string;
    impact?: string;
    stack: string[];
  }[];
};

export const dynamic = "force-dynamic";

function buildSummary(data: ResumeData | null) {
  if (!data?.profile) return "Resume content is loading.";
  const keywords = data.featuredSkills.slice(0, 6).join(", ");
  return `${data.profile.role} with experience delivering multi-page web applications, frontend systems, backend APIs, cloud-backed products, AI API integrations, LLM-enabled features, agent workflows, and automation systems. Strong hands-on background in ${keywords}, with a focus on scalable implementation, clean user experience, and cross-functional collaboration.`;
}

export default function ResumePage() {
  const [data, setData] = useState<ResumeData | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/portfolio")
      .then((response) => response.json())
      .then((payload: ResumeData) => {
        if (mounted) setData(payload);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleDownload = async () => {
    const element = document.getElementById("resume-sheet");
    if (typeof window !== "undefined" && element) {
      const html2pdf = (await import("html2pdf.js")).default;
      html2pdf(element, {
        margin: 0.45,
        filename: "Sandeep_Gowda_ATS_Resume.pdf",
        image: { type: "jpeg", quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      });
    }
  };

  const summary = buildSummary(data);

  return (
    <div className="page-shell">
      <section className="surface flex flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--accent)]">Resume</p>
          <h1 className="font-display text-4xl font-bold text-white">{data?.profile?.name || "Loading..."}</h1>
          <p className="mt-2 text-[var(--muted)]">ATS-optimized single-column resume with modern presentation.</p>
        </div>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-[#052132] transition hover:bg-[var(--accent-strong)] print:hidden"
        >
          <FaDownload /> Download ATS Resume
        </button>
      </section>

      <div id="resume-sheet" className="resume-sheet">
        <header className="border-b border-slate-200 pb-5">
          <h2 className="text-3xl font-bold">{data?.profile?.name || "Portfolio"}</h2>
          <p className="mt-1 text-lg font-medium text-slate-700">{data?.profile?.role || "Software Developer"}</p>
          <div className="resume-meta mt-4">
            <span>{data?.profile?.email}</span>
            <span>{data?.profile?.phone}</span>
            {data?.profile?.location ? <span>{data.profile.location}</span> : null}
            <span>{data?.profile?.linkedin}</span>
            <span>{data?.profile?.github}</span>
          </div>
        </header>

        <section className="mt-6">
          <h2 className="resume-section-title font-semibold">Professional Summary</h2>
          <div className="resume-summary mt-3">
            <p className="text-sm leading-6 text-slate-700">{summary}</p>
          </div>
        </section>

        <section className="resume-grid mt-6">
          <div>
            <h2 className="resume-section-title font-semibold">Core Technical Skills</h2>
            <div className="mt-3 space-y-3">
              {(data?.skillGroups || []).map((group) => (
                <div key={group.id}>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{group.title}</p>
                  <div className="resume-skill-list mt-2">
                    {group.items.map((item) => (
                      <span key={item} className="resume-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">AI and Creative Systems</p>
                <div className="resume-skill-list mt-2">
                  {[
                    "AI APIs",
                    "LLM Integration",
                    "AI Agents",
                    "Automation Workflows",
                    "Prompt Workflows",
                    "Image Generation",
                    "Video Generation",
                    "Audio Generation",
                  ].map((item) => (
                    <span key={item} className="resume-pill">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="resume-section-title font-semibold">Professional Experience</h2>
          <div className="mt-4 space-y-6">
            {(data?.experiences || []).map((experience) => (
              <article key={experience.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{experience.role}</h3>
                    <p className="text-sm font-medium text-slate-700">{experience.company}</p>
                  </div>
                  <p className="text-sm text-slate-500">{experience.dates}</p>
                </div>
                {experience.summary ? <p className="mt-2 text-sm leading-6 text-slate-700">{experience.summary}</p> : null}
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
                  {experience.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="resume-section-title font-semibold">Selected Projects</h2>
          <div className="mt-4 space-y-4">
            {(data?.projects || []).slice(0, 4).map((project) => (
              <article key={project.id}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="text-base font-bold text-slate-900">{project.name}</h3>
                  <p className="text-sm text-slate-500">{project.stack.join(", ")}</p>
                </div>
                {project.description ? <p className="mt-1 text-sm leading-6 text-slate-700">{project.description}</p> : null}
                {project.impact ? <p className="mt-1 text-sm font-medium text-slate-800">Impact: {project.impact}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
