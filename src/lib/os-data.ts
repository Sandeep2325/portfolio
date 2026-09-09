import type {
  CollaborationPillar,
  Experience,
  HomeStat,
  Project,
  SiteProfile,
  SkillGroup,
} from "@/lib/portfolio-data";

/** Everything the OS shell needs, resolved on the server and handed to the client once. */
export type OSData = {
  profile: SiteProfile | null;
  stats: HomeStat[];
  featuredSkills: string[];
  skillGroups: SkillGroup[];
  experiences: Experience[];
  projects: Project[];
  pillars: CollaborationPillar[];
  contactConfigured: boolean;
};
