"use client";

import { useEffect } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

const INTERVAL_MS = 60_000;

/**
 * Keeps profiles.last_seen_at fresh for the signed-in visitor while a tab is
 * open and visible. This is the "last seen" source; realtime presence in a
 * conversation is what powers "active now".
 */
export function usePresenceHeartbeat() {
  useEffect(() => {
    if (!browserSupabase) return;
    const supabase = browserSupabase;
    let stopped = false;

    async function beat() {
      if (stopped || document.visibilityState !== "visible") return;
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        await fetch("/api/presence", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      } catch {
        // Offline or navigating away — the next beat will catch up.
      }
    }

    void beat();
    const timer = setInterval(() => void beat(), INTERVAL_MS);
    const onVisible = () => void beat();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
