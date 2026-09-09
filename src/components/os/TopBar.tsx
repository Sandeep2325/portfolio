"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HiOutlineEnvelope, HiOutlineWifi, HiOutlineBattery100 } from "react-icons/hi2";
import { useAuthSession } from "@/hooks/useAuthSession";
import type { AppId } from "@/lib/os-apps";

export default function TopBar({ onOpenApp }: { onOpenApp: (id: AppId) => void }) {
  const [now, setNow] = useState<Date | null>(null);
  const { email, signOut } = useAuthSession();
  const [signingOut, setSigningOut] = useState(false);

  // Start the clock after mount so server and client markup agree.
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-[200] flex h-8 items-center justify-between border-b border-white/5 bg-black/30 px-3 text-xs font-medium text-gray-300 backdrop-blur-md md:px-4">
      <div className="flex items-center gap-3 md:gap-4">
        <span className="text-[10px] font-bold tracking-wider text-white md:text-xs">SANDEEP OS</span>
        <button
          type="button"
          onClick={() => onOpenApp("contact")}
          className="flex items-center gap-1.5 transition-colors hover:text-white"
        >
          <HiOutlineEnvelope className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Contact</span>
        </button>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {email ? (
          <>
            <span className="hidden max-w-[160px] truncate text-white/60 md:inline">{email}</span>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              className="transition-colors hover:text-white disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <Link href="/login" className="transition-colors hover:text-white">
            Sign in
          </Link>
        )}
        <HiOutlineWifi className="hidden h-3.5 w-3.5 sm:block" />
        <HiOutlineBattery100 className="hidden h-4 w-4 sm:block" />
        <span className="tabular-nums text-[10px] md:text-xs">
          {now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}
        </span>
      </div>
    </div>
  );
}
