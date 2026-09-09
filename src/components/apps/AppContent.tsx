"use client";

import type { AppId } from "@/lib/os-apps";
import type { OSData } from "@/lib/os-data";
import AboutApp from "./AboutApp";
import ExperienceApp from "./ExperienceApp";
import ProjectsApp from "./ProjectsApp";
import SkillsApp from "./SkillsApp";
import ThingsApp from "./ThingsApp";
import CommunityApp from "./CommunityApp";
import MessagesApp from "./MessagesApp";
import ContactApp from "./ContactApp";

interface AppContentProps {
  id: AppId;
  data: OSData;
  onOpenApp: (id: AppId) => void;
}

/** Single mapping of app id to window body, shared by the desktop and mobile shells. */
export default function AppContent({ id, data, onOpenApp }: AppContentProps) {
  switch (id) {
    case "about":
      return <AboutApp data={data} onOpenApp={onOpenApp} />;
    case "experience":
      return <ExperienceApp experiences={data.experiences} />;
    case "projects":
      return <ProjectsApp projects={data.projects} />;
    case "skills":
      return <SkillsApp skillGroups={data.skillGroups} />;
    case "things":
      return <ThingsApp />;
    case "community":
      return <CommunityApp />;
    case "messages":
      return <MessagesApp />;
    case "contact":
      return <ContactApp data={data} />;
    default:
      return null;
  }
}
