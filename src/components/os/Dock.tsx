"use client";

import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { APP_CONFIGS, type AppId } from "@/lib/os-apps";

interface DockProps {
  onAppClick: (id: AppId) => void;
  onSearchClick: () => void;
  activeApps: AppId[];
}

export default function Dock({ onAppClick, onSearchClick, activeApps }: DockProps) {
  return (
    <div className="fixed bottom-2 left-1/2 z-[100] -translate-x-1/2 px-2 md:bottom-4 md:px-0">
      <div className="glass-dock scrollbar-hide flex max-w-[96vw] gap-1.5 overflow-x-auto px-2 py-2 md:gap-3 md:px-4 md:py-3">
        {APP_CONFIGS.map((app) => (
          <button
            key={app.id}
            type="button"
            className="dock-icon group"
            aria-label={app.name}
            onClick={(event) => {
              event.stopPropagation();
              onAppClick(app.id);
            }}
          >
            <app.icon className="text-lg text-gray-300 transition-transform duration-200 group-hover:scale-110 group-hover:text-white md:text-2xl" />

            {activeApps.includes(app.id) && (
              <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#4da8ff]" />
            )}

            <span className="glass-panel pointer-events-none absolute bottom-full left-1/2 mb-3 hidden -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
              <span className="font-medium text-white">{app.name}</span>
              <span className="ml-2 text-white/50">⌘{app.shortcut}</span>
            </span>
          </button>
        ))}

        <div className="mx-0.5 h-8 w-px self-center bg-white/15 md:mx-1 md:h-10" />

        <button
          type="button"
          className="dock-icon group"
          aria-label="Command palette"
          onClick={(event) => {
            event.stopPropagation();
            onSearchClick();
          }}
        >
          <HiOutlineMagnifyingGlass className="text-base text-gray-300 transition-colors group-hover:text-white md:text-xl" />
          <span className="glass-panel pointer-events-none absolute bottom-full left-1/2 mb-3 hidden -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:block">
            <span className="font-medium text-white">Command palette</span>
            <span className="ml-2 text-white/50">⌘K</span>
          </span>
        </button>
      </div>
    </div>
  );
}
