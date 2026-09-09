"use client";

import { useCallback, useRef, useState } from "react";
import { APP_CONFIGS, type AppId } from "@/lib/os-apps";

export interface MobileAppState {
  id: AppId;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
}

export function useMobileAppManager() {
  const zCounter = useRef(1000);

  const [apps, setApps] = useState<Record<AppId, MobileAppState>>(() => {
    const initial = {} as Record<AppId, MobileAppState>;
    APP_CONFIGS.forEach((app, index) => {
      initial[app.id] = { id: app.id, isOpen: false, isMinimized: false, zIndex: 1000 + index };
    });
    return initial;
  });

  const raise = useCallback((id: AppId, changes: Partial<MobileAppState>) => {
    zCounter.current += 1;
    setApps((current) => ({ ...current, [id]: { ...current[id], ...changes, zIndex: zCounter.current } }));
  }, []);

  const openApp = useCallback((id: AppId) => raise(id, { isOpen: true, isMinimized: false }), [raise]);
  const restoreApp = useCallback((id: AppId) => raise(id, { isOpen: true, isMinimized: false }), [raise]);
  const focusApp = useCallback((id: AppId) => raise(id, { isMinimized: false }), [raise]);

  const closeApp = useCallback((id: AppId) => {
    setApps((current) => ({ ...current, [id]: { ...current[id], isOpen: false, isMinimized: false } }));
  }, []);

  const minimizeApp = useCallback((id: AppId) => {
    setApps((current) => ({ ...current, [id]: { ...current[id], isMinimized: true } }));
  }, []);

  const closeAllApps = useCallback(() => {
    setApps((current) => {
      const updated = { ...current };
      (Object.keys(updated) as AppId[]).forEach((key) => {
        updated[key] = { ...updated[key], isOpen: false, isMinimized: false };
      });
      return updated;
    });
  }, []);

  const minimizeAllApps = useCallback(() => {
    setApps((current) => {
      const updated = { ...current };
      (Object.keys(updated) as AppId[]).forEach((key) => {
        if (updated[key].isOpen) updated[key] = { ...updated[key], isMinimized: true };
      });
      return updated;
    });
  }, []);

  /** Open apps, most recently focused first. */
  const openApps = Object.values(apps)
    .filter((app) => app.isOpen)
    .sort((left, right) => right.zIndex - left.zIndex);

  const neighbour = (currentId: AppId, step: 1 | -1) => {
    if (openApps.length <= 1) return null;
    const index = openApps.findIndex((app) => app.id === currentId);
    if (index === -1) return null;
    return openApps[(index + step + openApps.length) % openApps.length].id;
  };

  return {
    apps,
    openApps,
    openApp,
    closeApp,
    minimizeApp,
    restoreApp,
    focusApp,
    closeAllApps,
    minimizeAllApps,
    getNextApp: (id: AppId) => neighbour(id, 1),
    getPreviousApp: (id: AppId) => neighbour(id, -1),
  };
}
