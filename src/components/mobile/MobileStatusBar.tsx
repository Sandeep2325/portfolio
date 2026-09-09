"use client";

import { useEffect, useState } from "react";
import { HiOutlineWifi, HiOutlineBattery100 } from "react-icons/hi2";

export default function MobileStatusBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="safe-area-top fixed left-0 right-0 top-0 z-[9999] flex h-11 items-center justify-between bg-black/40 px-4 text-sm font-medium text-white backdrop-blur-2xl">
      <span className="text-xs font-semibold tabular-nums">
        {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
      </span>
      <div className="flex items-center gap-2">
        <HiOutlineWifi className="h-4 w-4" />
        <HiOutlineBattery100 className="h-5 w-5" />
      </div>
    </div>
  );
}
