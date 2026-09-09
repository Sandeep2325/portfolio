"use client";

import { HiOutlineXMark } from "react-icons/hi2";
import { getAppConfig, type AppId } from "@/lib/os-apps";
import { cn } from "@/lib/utils";

interface MobileAppSwitcherProps {
  openApps: { id: AppId }[];
  currentApp: AppId | null;
  onSwitchApp: (id: AppId) => void;
  onCloseApp: (id: AppId) => void;
  onCloseAll: () => void;
  onClose: () => void;
}

export default function MobileAppSwitcher({
  openApps,
  currentApp,
  onSwitchApp,
  onCloseApp,
  onCloseAll,
  onClose,
}: MobileAppSwitcherProps) {
  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl" onClick={onClose}>
      <div className="absolute inset-0 flex flex-col px-4 pb-20 pt-14" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent apps</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCloseAll}
              className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/15"
            >
              Close all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-white/10"
              aria-label="Close switcher"
            >
              <HiOutlineXMark className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex min-h-full items-stretch gap-4">
            {openApps.map((app) => {
              const config = getAppConfig(app.id);
              if (!config) return null;

              return (
                <div
                  key={app.id}
                  className={cn(
                    "relative min-w-[70%] max-w-[75%] overflow-hidden rounded-3xl border bg-white/5 shadow-2xl transition-transform duration-200",
                    app.id === currentApp ? "scale-100 border-blue-400/60" : "scale-95 border-white/10",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchApp(app.id);
                      onClose();
                    }}
                    className="h-full w-full text-left"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="rounded-2xl border border-white/20 bg-white/10 p-2">
                        <config.icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="font-semibold text-white">{config.name.replace(".app", "")}</span>
                    </div>
                    <div className="flex h-[45vh] items-end border-t border-white/5 bg-gradient-to-b from-[#0f0f15] to-[#1a1a2e] p-5">
                      <p className="text-sm text-white/40">Tap to resume</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCloseApp(app.id);
                    }}
                    className="absolute right-3 top-3 rounded-full bg-red-500/30 p-2 transition-colors hover:bg-red-500/50"
                    aria-label={`Close ${config.name}`}
                  >
                    <HiOutlineXMark className="h-4 w-4 text-white" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
