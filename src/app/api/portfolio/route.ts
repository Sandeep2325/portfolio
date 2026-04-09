import { NextResponse } from "next/server";
import { getExperiences, getFeaturedSkills, getProjects, getSiteProfile, getSkillGroups } from "@/lib/portfolio-data";

export async function GET() {
  const [profile, featuredSkills, experiences, projects, skillGroups] = await Promise.all([
    getSiteProfile(),
    getFeaturedSkills(),
    getExperiences(),
    getProjects(),
    getSkillGroups(),
  ]);

  return NextResponse.json({
    profile,
    featuredSkills,
    experiences,
    projects,
    skillGroups,
  });
}
