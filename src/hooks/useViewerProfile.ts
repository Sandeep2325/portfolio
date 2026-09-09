"use client";

import { useCallback, useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

export type ViewerProfile = {
  userId: string;
  email: string | null;
  username: string | null;
  displayName: string;
  isAdmin: boolean;
  needsUsername: boolean;
};

/** The signed-in visitor's profile plus the access token, kept in sync with auth. */
export function useViewerProfile() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<ViewerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!browserSupabase) {
      setLoading(false);
      return;
    }
    const { data } = await browserSupabase.auth.getSession();
    const accessToken = data.session?.access_token || "";
    setToken(accessToken);

    if (!accessToken) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      setProfile(response.ok ? ((await response.json()) as ViewerProfile) : null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    if (!browserSupabase) return;
    const { data } = browserSupabase.auth.onAuthStateChange(() => void load());
    return () => data.subscription.unsubscribe();
  }, [load]);

  return { token, profile, loading, refresh: load };
}
