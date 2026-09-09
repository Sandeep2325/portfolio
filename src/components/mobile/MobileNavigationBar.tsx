"use client";

import { HiOutlineArrowLeft, HiOutlineStop, HiOutlineSquare2Stack } from "react-icons/hi2";
import { cn } from "@/lib/utils";

interface MobileNavigationBarProps {
  hasCurrentApp: boolean;
  hasOpenApps: boolean;
  onBack: () => void;
  onHome: () => void;
  onRecents: () => void;
}

const BASE = "rounded-full p-3 transition-all";
const ENABLED = "bg-white/10 text-white hover:bg-white/15 active:scale-95";
const DISABLED = "cursor-not-allowed bg-white/5 text-white/40";

export default function MobileNavigationBar({
  hasCurrentApp,
  hasOpenApps,
  onBack,
  onHome,
  onRecents,
}: MobileNavigationBarProps) {
  return (
    <div className="safe-area-bottom fixed bottom-0 left-0 right-0 z-[10001]">
      <div className="mx-auto flex max-w-md items-center justify-between rounded-t-3xl border-t border-white/10 bg-black/70 px-10 py-3 backdrop-blur-2xl">
        <button
          type="button"
          onClick={onBack}
          disabled={!hasCurrentApp}
          className={cn(BASE, hasCurrentApp ? ENABLED : DISABLED)}
          aria-label="Back"
        >
          <HiOutlineArrowLeft className="h-5 w-5" />
        </button>
        <button type="button" onClick={onHome} className={cn(BASE, ENABLED)} aria-label="Home">
          <HiOutlineStop className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onRecents}
          disabled={!hasOpenApps}
          className={cn(BASE, hasOpenApps ? ENABLED : DISABLED)}
          aria-label="Recent apps"
        >
          <HiOutlineSquare2Stack className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
