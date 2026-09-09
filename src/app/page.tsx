import Image from "next/image";
import Link from "next/link";
import { getFeaturedSkills, getHomeStats, getProjects, getSiteProfile } from "@/lib/portfolio-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [profile, featuredSkills, projects, stats] = await Promise.all([getSiteProfile(), getFeaturedSkills(), getProjects(), getHomeStats()]);
  const skills = featuredSkills.filter((item) => !/supabase/i.test(item)).slice(0, 8);
  return <div className="page-shell linkedin-layout">
    <section className="profile-card surface">
      <div className="profile-cover" />
      <div className="profile-content">
        {profile?.avatar && <div className="profile-avatar"><Image src={profile.avatar} alt={profile.name} fill className="object-cover" /></div>}
        <div className="profile-intro"><div><h1>{profile?.name || "Sandeep Gowda"}</h1><p className="profile-role">{profile?.role || "Software Developer"}</p><p className="profile-location">{profile?.location || "Bengaluru, India"} · <Link href="/contact">Contact info</Link></p></div><div className="profile-actions"><Link href="/contact" className="primary-button">Connect</Link><Link href="/projects" className="secondary-button">View work</Link></div></div>
      </div>
    </section>
    <section className="surface content-section px-6 py-7 sm:px-8"><h2>About</h2><p>{profile?.intro || "I enjoy building reliable web products and solving everyday business problems with software."}</p><p>I work across frontend development, APIs, integrations, and cloud deployment. I care about clear communication, maintainable code, and shipping work that people can actually use.</p></section>
    <section className="surface content-section px-6 py-7 sm:px-8"><div className="section-heading"><div><h2>Featured</h2><p>A few areas I work in most often.</p></div><Link href="/projects" className="text-link">Show all</Link></div><div className="featured-list">{projects.slice(0, 3).map((project) => <article className="featured-item" key={project.id}><div className="featured-icon">{project.name.charAt(0)}</div><div><h3>{project.name}</h3><p>{project.description}</p><span>{project.stack.join(" · ")}</span></div></article>)}</div></section>
    <section className="surface content-section px-6 py-7 sm:px-8"><div className="section-heading"><div><h2>Skills</h2><p>Tools and technologies I use.</p></div><Link href="/skills" className="text-link">See skills</Link></div><div className="mt-5 flex flex-wrap gap-2">{skills.map((skill) => <span className="badge" key={skill}>{skill}</span>)}</div></section>
    {stats.length > 0 && <section className="card-grid cols-2">{stats.map((stat) => <div key={stat.label} className="stat-card"><p>{stat.label}</p><strong>{stat.value}</strong></div>)}</section>}
  </div>;
}
