"use client";

import { useEffect } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

const LOGGED_KEY = "sandeep-os-visit-logged";

/** Records one visit per browser session. Never blocks or surfaces errors. */
export function useVisitLogger() {
  useEffect(() => {
    let alreadyLogged = false;
    try {
      alreadyLogged = sessionStorage.getItem(LOGGED_KEY) === "1";
    } catch {
      // Storage blocked; the visit is simply recorded again.
    }
    if (alreadyLogged) return;

    void (async () => {
      const token = browserSupabase ? (await browserSupabase.auth.getSession()).data.session?.access_token : null;
      try {
        await fetch("/api/visits", {
          method: "POST",
          headers: token
            ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
            : { "Content-Type": "application/json" },
          body: JSON.stringify({ path: window.location.pathname, referrer: document.referrer }),
        });
        sessionStorage.setItem(LOGGED_KEY, "1");
      } catch {
        // Analytics must never break the page.
      }
    })();
  }, []);
}
