"use client";

import { useCallback, useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

/** Shared view of the signed-in visitor for the OS chrome. */
export function useAuthSession() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!browserSupabase) {
      setReady(true);
      return;
    }
    void browserSupabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || null);
      setReady(true);
    });
    const { data } = browserSupabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email || null));
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await browserSupabase?.auth.signOut();
    setEmail(null);
  }, []);

  return { email, ready, signOut };
}
