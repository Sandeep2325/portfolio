"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_CONFIGS, type AppId } from "@/lib/os-apps";
import type { OSData } from "@/lib/os-data";
import { useMobileAppManager } from "@/hooks/useMobileAppManager";
import { useAppRouteSync } from "@/hooks/useAppRouteSync";
import { useAuthSession } from "@/hooks/useAuthSession";
import AppContent from "@/components/apps/AppContent";
import MobileAppSwitcher from "./MobileAppSwitcher";
import MobileAppWindow from "./MobileAppWindow";
import MobileNavigationBar from "./MobileNavigationBar";
import MobileStatusBar from "./MobileStatusBar";
import { cn } from "@/lib/utils";

export default function MobileHomeScreen({ data, initialApp }: { data: OSData; initialApp: AppId | null }) {
  const {
    apps,
    openApps,
    openApp,
    closeApp,
    minimizeApp,
    restoreApp,
    focusApp,
    closeAllApps,
    minimizeAllApps,
    getNextApp,
    getPreviousApp,
  } = useMobileAppManager();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { email, signOut } = useAuthSession();

  const currentApp = useMemo(() => openApps.find((app) => !app.isMinimized)?.id || null, [openApps]);

  useAppRouteSync(currentApp);

  useEffect(() => {
    if (initialApp) openApp(initialApp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The switcher has nothing to show once every app is closed.
  useEffect(() => {
    if (switcherOpen && openApps.length === 0) setSwitcherOpen(false);
  }, [switcherOpen, openApps.length]);

  const handleAppClick = (id: AppId) => {
    if (apps[id].isOpen) restoreApp(id);
    else openApp(id);
  };

  const handleBack = () => {
    if (currentApp) minimizeApp(currentApp);
    setSwitcherOpen(false);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-[#0a0a0f] via-[#0f0f15] to-[#1a1a2e]">
      <MobileStatusBar />

      <div className="absolute inset-0 overflow-y-auto pb-24 pt-11">
        <div className="px-6 py-8">
          <div className="mb-8 flex items-start justify-between gap-3">
            <div>
              <h1 className="gradient-text text-3xl font-bold">Sandeep OS</h1>
              <p className="mt-1 text-sm text-white/60">Tap an app to open it</p>
            </div>
            {email ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80"
              >
                Sign in
              </Link>
            )}
          </div>

          <div className="grid grid-cols-4 gap-5">
            {APP_CONFIGS.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => handleAppClick(app.id)}
                className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
              >
                <span
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20",
                    "bg-gradient-to-br from-white/20 to-white/10 shadow-lg transition-all",
                    apps[app.id].isOpen && "ring-2 ring-blue-500/50",
                  )}
                >
                  <app.icon className="h-8 w-8 text-white" />
                </span>
                <span className="text-center text-[11px] font-medium text-white/80">{app.name.replace(".app", "")}</span>
              </button>
            ))}
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-bold text-white">{data.profile?.name || "Sandeep Gowda"}</h2>
            <p className="mt-1 text-sm text-white/60">{data.profile?.role || "Software Developer"}</p>
            <p className="mt-3 font-mono-os text-xs text-white/40">
              {data.profile?.tagline || "Building reliable products for the web"}
            </p>
          </div>
        </div>
      </div>

      {APP_CONFIGS.map((app) => (
        <MobileAppWindow
          key={app.id}
          appId={app.id}
          isOpen={apps[app.id].isOpen}
          isMinimized={apps[app.id].isMinimized}
          zIndex={apps[app.id].zIndex}
          onClose={() => {
            closeApp(app.id);
            setSwitcherOpen(false);
          }}
          onFocus={() => focusApp(app.id)}
          onOpenAppSwitcher={() => setSwitcherOpen(true)}
          onSwitchToNext={() => {
            const next = getNextApp(app.id);
            if (next) restoreApp(next);
          }}
          onSwitchToPrevious={() => {
            const previous = getPreviousApp(app.id);
            if (previous) restoreApp(previous);
          }}
        >
          <AppContent id={app.id} data={data} onOpenApp={handleAppClick} />
        </MobileAppWindow>
      ))}

      {switcherOpen && openApps.length > 0 && (
        <MobileAppSwitcher
          openApps={openApps}
          currentApp={currentApp}
          onSwitchApp={restoreApp}
          onCloseApp={closeApp}
          onCloseAll={() => {
            closeAllApps();
            setSwitcherOpen(false);
          }}
          onClose={() => setSwitcherOpen(false)}
        />
      )}

      <MobileNavigationBar
        hasCurrentApp={Boolean(currentApp)}
        hasOpenApps={openApps.length > 0}
        onBack={handleBack}
        onHome={() => {
          minimizeAllApps();
          setSwitcherOpen(false);
        }}
        onRecents={() => {
          if (openApps.length > 0) setSwitcherOpen(true);
        }}
      />
    </div>
  );
}
