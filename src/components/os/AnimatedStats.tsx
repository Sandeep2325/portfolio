"use client";

import { useEffect, useState } from "react";
import { HiOutlineSparkles, HiOutlineCodeBracket, HiOutlineRocketLaunch, HiOutlineBriefcase } from "react-icons/hi2";

const ICONS = [HiOutlineBriefcase, HiOutlineCodeBracket, HiOutlineRocketLaunch, HiOutlineSparkles];

export type DesktopStat = { label: string; value: string };

/** Wallpaper stat tiles that fade up shortly after the desktop settles. */
export default function AnimatedStats({ stats }: { stats: DesktopStat[] }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 700);
    return () => clearTimeout(timer);
  }, []);

  if (stats.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-36 left-1/2 z-30 hidden w-full max-w-5xl -translate-x-1/2 px-4 md:block">
      <div
        className={`grid grid-cols-2 gap-4 transition-all duration-1000 md:grid-cols-4 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        }`}
      >
        {stats.slice(0, 4).map((stat, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
          <div
            key={stat.label}
            className="group relative rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-[rgba(77,168,255,0.2)] to-[rgba(155,89,255,0.2)] p-2">
                <Icon className="h-4 w-4 text-[#4da8ff]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-white/60">{stat.label}</p>
                <p className="truncate text-sm font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
