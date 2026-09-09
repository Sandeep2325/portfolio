import {
  getCollaborationPillars,
  getExperiences,
  getFeaturedSkills,
  getHomeStats,
  getProjects,
  getSiteProfile,
  getSkillGroups,
} from "@/lib/portfolio-data";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { OSData } from "@/lib/os-data";

const EMPTY: OSData = {
  profile: null,
  stats: [],
  featuredSkills: [],
  skillGroups: [],
  experiences: [],
  projects: [],
  pillars: [],
  contactConfigured: false,
};

/** Resolves every piece of portfolio content the OS shell renders, in one pass. */
export async function getOSData(): Promise<OSData> {
  // Without Supabase credentials the desktop still boots, just with empty apps.
  if (!isSupabaseConfigured()) return EMPTY;

  const [profile, stats, featuredSkills, skillGroups, experiences, projects, pillars] = await Promise.all([
    getSiteProfile(),
    getHomeStats(),
    getFeaturedSkills(),
    getSkillGroups(),
    getExperiences(),
    getProjects(),
    getCollaborationPillars(),
  ]);

  return { profile, stats, featuredSkills, skillGroups, experiences, projects, pillars, contactConfigured: true };
}
