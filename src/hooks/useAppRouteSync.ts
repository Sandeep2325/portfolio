"use client";

import { useEffect } from "react";
import { getAppConfig, type AppId } from "@/lib/os-apps";

/**
 * Mirrors the focused app into the address bar with replaceState, so every app
 * stays deep-linkable without triggering a Next.js navigation.
 */
export function useAppRouteSync(activeApp: AppId | null) {
  useEffect(() => {
    const route = (activeApp && getAppConfig(activeApp)?.route) || "/";
    if (window.location.pathname !== route) {
      window.history.replaceState(null, "", route);
    }
  }, [activeApp]);
}
