import type { IconType } from "react-icons";
import {
  HiOutlineUser,
  HiOutlineBriefcase,
  HiOutlineFolderOpen,
  HiOutlineBolt,
  HiOutlineNewspaper,
  HiOutlineChatBubbleLeftRight,
  HiOutlineEnvelope,
  HiOutlineInboxArrowDown,
} from "react-icons/hi2";

export type AppId =
  | "about"
  | "experience"
  | "projects"
  | "skills"
  | "things"
  | "community"
  | "messages"
  | "contact";

export interface AppConfig {
  id: AppId;
  name: string;
  icon: IconType;
  shortcut: string;
  /** Route this app deep-links to, so URLs stay shareable. */
  route: string;
  defaultSize: { width: number; height: number };
}

export const APP_CONFIGS: AppConfig[] = [
  { id: "about", name: "About.app", icon: HiOutlineUser, shortcut: "1", route: "/", defaultSize: { width: 640, height: 560 } },
  { id: "experience", name: "Experience.app", icon: HiOutlineBriefcase, shortcut: "2", route: "/experience", defaultSize: { width: 680, height: 540 } },
  { id: "projects", name: "Projects.app", icon: HiOutlineFolderOpen, shortcut: "3", route: "/projects", defaultSize: { width: 720, height: 560 } },
  { id: "skills", name: "Skills.app", icon: HiOutlineBolt, shortcut: "4", route: "/skills", defaultSize: { width: 600, height: 480 } },
  { id: "things", name: "Things.app", icon: HiOutlineNewspaper, shortcut: "5", route: "/things", defaultSize: { width: 720, height: 620 } },
  { id: "community", name: "Community.app", icon: HiOutlineChatBubbleLeftRight, shortcut: "6", route: "/community", defaultSize: { width: 700, height: 620 } },
  { id: "messages", name: "Messages.app", icon: HiOutlineInboxArrowDown, shortcut: "7", route: "/messages", defaultSize: { width: 640, height: 680 } },
  { id: "contact", name: "Contact.app", icon: HiOutlineEnvelope, shortcut: "8", route: "/contact", defaultSize: { width: 560, height: 580 } },
];

export const APP_IDS = APP_CONFIGS.map((app) => app.id);

export function appForRoute(route: string): AppId | null {
  if (route === "/") return null;
  return APP_CONFIGS.find((app) => app.route === route)?.id || null;
}

export function getAppConfig(id: AppId) {
  return APP_CONFIGS.find((app) => app.id === id);
}
