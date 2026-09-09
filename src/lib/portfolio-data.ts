import { unstable_noStore as noStore } from "next/cache";
import { createServerSupabaseClient, getPublicAssetUrl } from "@/lib/supabase";

export type SiteProfile = {
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  avatar: string;
  tagline: string;
  intro: string;
};

export type HomeStat = {
  label: string;
  value: string;
  sort_order: number;
};

export type CollaborationPillar = {
  title: string;
  description: string;
  sort_order: number;
};

export type SkillGroup = {
  id: number;
  title: string;
  sort_order: number;
  items: string[];
};

export type Experience = {
  id: number;
  company: string;
  role: string;
  dates: string;
  summary: string;
  sort_order: number;
  highlights: string[];
};

export type Project = {
  id: number;
  name: string;
  description: string;
  impact: string;
  sort_order: number;
  stack: string[];
};

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  read_time: string;
  category: string;
  image: string;
  content: string;
  sort_order: number;
};

export type NavigationItem = {
  href: string;
  label: string;
  sort_order: number;
};

export type TerminalCommand = {
  label: string;
  sort_order: number;
};

async function getSupabase() {
  noStore();
  return createServerSupabaseClient();
}

export async function getSiteProfile(): Promise<SiteProfile | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("site_profile").select("*").limit(1).maybeSingle();
  if (error) return null;
  if (!data) return null;
  return {
    ...data,
    avatar: getPublicAssetUrl(data.avatar),
  };
}

export async function getNavigation(): Promise<NavigationItem[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("site_navigation").select("*").order("sort_order");
  const navigation = (error || !data ? [] : data).map((item) =>
    item.href === "/terminal" ? { ...item, label: "My Terminal" } : item,
  );
  const essentials: NavigationItem[] = [
    { href: "/community", label: "Community", sort_order: 997 },
    { href: "/things", label: "My Things", sort_order: 998 },
    { href: "/terminal", label: "My Terminal", sort_order: 999 },
  ];
  return [...navigation, ...essentials.filter((item) => !navigation.some((navItem) => navItem.href === item.href))].sort(
    (left, right) => left.sort_order - right.sort_order,
  );
}

export async function getHomeStats(): Promise<HomeStat[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("home_stats").select("*").order("sort_order");
  if (error || !data) return [];
  return data;
}

export async function getCollaborationPillars(): Promise<CollaborationPillar[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("collaboration_pillars").select("*").order("sort_order");
  if (error || !data) return [];
  return data;
}

export async function getFeaturedSkills(): Promise<string[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("featured_skills").select("label").order("sort_order");
  if (error || !data) return [];
  return data.map((item) => item.label);
}

export async function getSkillGroups(): Promise<SkillGroup[]> {
  const supabase = await getSupabase();
  const [{ data: groups, error: groupsError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("skill_groups").select("*").order("sort_order"),
    supabase.from("skill_items").select("group_id, label, sort_order").order("sort_order"),
  ]);

  if (groupsError || itemsError || !groups) return [];

  return groups.map((group) => ({
    ...group,
    items: (items || []).filter((item) => item.group_id === group.id).map((item) => item.label),
  }));
}

export async function getExperiences(): Promise<Experience[]> {
  const supabase = await getSupabase();
  const [{ data: experiences, error: experiencesError }, { data: highlights, error: highlightsError }] = await Promise.all([
    supabase.from("experiences").select("*").order("sort_order"),
    supabase.from("experience_highlights").select("experience_id, text, sort_order").order("sort_order"),
  ]);

  if (experiencesError || highlightsError || !experiences) return [];

  return experiences.map((experience) => ({
    ...experience,
    highlights: (highlights || [])
      .filter((highlight) => highlight.experience_id === experience.id)
      .map((highlight) => highlight.text),
  }));
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await getSupabase();
  const [{ data: projects, error: projectsError }, { data: stacks, error: stacksError }] = await Promise.all([
    supabase.from("projects").select("*").order("sort_order"),
    supabase.from("project_stacks").select("project_id, label, sort_order").order("sort_order"),
  ]);

  if (projectsError || stacksError || !projects) return [];

  return projects.map((project) => ({
    ...project,
    stack: (stacks || []).filter((stack) => stack.project_id === project.id).map((stack) => stack.label),
  }));
}

export async function getBlogPosts(): Promise<BlogPostSummary[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("blog_posts").select("*").order("sort_order");
  if (error || !data) return [];
  return data.map((post) => ({
    ...post,
    image: getPublicAssetUrl(post.image),
  }));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostSummary | null> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
  if (error) return null;
  if (!data) return null;
  return {
    ...data,
    image: getPublicAssetUrl(data.image),
  };
}

export async function getTerminalCommands(): Promise<TerminalCommand[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from("terminal_commands").select("*").order("sort_order");
  if (error || !data || data.length === 0) {
    return [
      { label: "about", sort_order: 1 },
      { label: "skills", sort_order: 2 },
      { label: "experience", sort_order: 3 },
      { label: "projects", sort_order: 4 },
      { label: "contact", sort_order: 5 },
      { label: "react-collab", sort_order: 6 },
      { label: "api-work", sort_order: 7 },
      { label: "claude-workflow", sort_order: 8 },
    ];
  }
  return data;
}
