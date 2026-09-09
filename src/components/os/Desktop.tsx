"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { APP_CONFIGS, type AppId } from "@/lib/os-apps";
import type { OSData } from "@/lib/os-data";
import type { UnreadItem } from "@/hooks/useDirectMessageNotifications";
import { useWindowManager } from "@/hooks/useWindowManager";
import { useAppRouteSync } from "@/hooks/useAppRouteSync";
import AppContent from "@/components/apps/AppContent";
import AnimatedStats from "./AnimatedStats";
import CommandPalette from "./CommandPalette";
import CursorEffect from "./CursorEffect";
import Dock from "./Dock";
import FloatingTechIcons from "./FloatingTechIcons";
import GradientMesh from "./GradientMesh";
import MessageToast from "./MessageToast";
import TopBar from "./TopBar";
import Window from "./Window";

interface DesktopProps {
  data: OSData;
  initialApp: AppId | null;
  unreadCount: number;
  toast: UnreadItem | null;
  onDismissToast: () => void;
}

export default function Desktop({ data, initialApp, unreadCount, toast, onDismissToast }: DesktopProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    updatePosition,
    updateSize,
  } = useWindowManager();

  const openWindows = Object.values(windows).filter((item) => item.isOpen);
  const activeApps = openWindows.map((item) => item.id);

  const topApp = useMemo(() => {
    const visible = openWindows.filter((item) => !item.isMinimized).sort((left, right) => right.zIndex - left.zIndex);
    return visible[0]?.id || null;
  }, [openWindows]);

  useAppRouteSync(topApp);

  const handleAppClick = useCallback(
    (id: AppId) => {
      const target = windows[id];
      if (target.isOpen && !target.isMinimized) focusWindow(id);
      else openWindow(id);
    },
    [windows, openWindow, focusWindow],
  );

  // Open the app matching the entry URL once on mount.
  useEffect(() => {
    if (initialApp) openWindow(initialApp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }

      if (event.key === "Escape" && !paletteOpen) {
        const top = Object.values(windows)
          .filter((item) => item.isOpen && !item.isMinimized)
          .sort((left, right) => right.zIndex - left.zIndex)[0];
        if (top) closeWindow(top.id);
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        const app = APP_CONFIGS.find((item) => item.shortcut === event.key);
        if (app) {
          event.preventDefault();
          handleAppClick(app.id);
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [windows, closeWindow, paletteOpen, handleAppClick]);

  const profile = data.profile;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0f0f15] text-slate-200">
      <div className="hidden md:block">
        <CursorEffect />
      </div>

      {/* Wallpaper */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0f]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0f0f15] to-[#0a0a0f]" />
        <div className="animate-blob absolute left-1/4 top-1/4 h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="animate-blob animation-delay-2000 absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-purple-500/5 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        <GradientMesh />
      </div>

      <FloatingTechIcons />

      {/* Wallpaper hero */}
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center pb-20">
        <div className="animate-fade-in space-y-4 text-center">
          <div className="relative inline-block">
            <h1 className="relative z-10 select-none text-4xl font-bold tracking-tighter sm:text-5xl md:text-7xl lg:text-8xl">
              <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text uppercase text-transparent">
                {profile?.name || "Sandeep Gowda"}
              </span>
            </h1>
            <span className="absolute -right-2 -top-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 text-[8px] text-blue-300/80 backdrop-blur-sm md:-right-4 md:-top-4 md:px-2 md:py-1 md:text-xs">
              v1.0
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <h2 className="px-4 text-center text-sm font-light uppercase tracking-[0.1em] text-white/50 sm:text-base md:text-2xl md:tracking-[0.2em]">
              {profile?.role || "Software Developer"}
            </h2>
            <div className="my-2 h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent md:w-24" />
            <p className="font-mono-os px-4 text-center text-xs text-white/40 sm:text-sm md:text-lg">
              {profile?.tagline || "Building reliable products for the web"}
            </p>
          </div>
        </div>
      </div>

      <AnimatedStats stats={data.stats.map((stat) => ({ label: stat.label, value: stat.value }))} />

      <TopBar onOpenApp={handleAppClick} />

      {/* Window layer */}
      <div className="pointer-events-none relative z-50 h-full w-full pt-8">
        {APP_CONFIGS.map((app) => (
          <div key={app.id} className="pointer-events-auto">
            <Window
              state={windows[app.id]}
              onClose={() => closeWindow(app.id)}
              onMinimize={() => minimizeWindow(app.id)}
              onMaximize={() => maximizeWindow(app.id)}
              onFocus={() => focusWindow(app.id)}
              onPositionChange={(position) => updatePosition(app.id, position)}
              onSizeChange={(size) => updateSize(app.id, size)}
            >
              <AppContent
                id={app.id}
                data={data}
                onOpenApp={handleAppClick}
                isVisible={windows[app.id].isOpen && !windows[app.id].isMinimized}
              />
            </Window>
          </div>
        ))}
      </div>

      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} onAppOpen={handleAppClick} />

      <MessageToast item={toast} onOpen={() => handleAppClick("messages")} onDismiss={onDismissToast} />

      <Dock
        onAppClick={handleAppClick}
        onSearchClick={() => setPaletteOpen((open) => !open)}
        activeApps={activeApps}
        badges={{ messages: unreadCount }}
      />
    </div>
  );
}
