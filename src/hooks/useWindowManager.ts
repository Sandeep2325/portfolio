"use client";

import { useCallback, useRef, useState } from "react";
import { APP_CONFIGS, type AppId } from "@/lib/os-apps";

export interface WindowState {
  id: AppId;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

/**
 * Cascade new windows down and to the right, and clamp to the viewport so a
 * window never opens off-screen on a small display.
 */
function initialPosition(index: number, size: { width: number; height: number }) {
  const x = 90 + index * 28;
  const y = 70 + index * 28;
  if (typeof window === "undefined") return { x, y };
  return {
    x: Math.max(8, Math.min(x, window.innerWidth - size.width - 8)),
    y: Math.max(40, Math.min(y, window.innerHeight - 160)),
  };
}

export function useWindowManager() {
  const zCounter = useRef(1000);

  const [windows, setWindows] = useState<Record<AppId, WindowState>>(() => {
    const initial = {} as Record<AppId, WindowState>;
    APP_CONFIGS.forEach((app, index) => {
      initial[app.id] = {
        id: app.id,
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        zIndex: 10 + index,
        position: { x: 90 + index * 28, y: 70 + index * 28 },
        size: app.defaultSize,
      };
    });
    return initial;
  });

  const patch = useCallback((id: AppId, changes: Partial<WindowState>) => {
    setWindows((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
  }, []);

  const openWindow = useCallback(
    (id: AppId) => {
      zCounter.current += 1;
      setWindows((current) => {
        const target = current[id];
        // Re-seat a window that has never been opened, now that we know the viewport.
        const openCount = Object.values(current).filter((item) => item.isOpen).length;
        const position = target.isOpen ? target.position : initialPosition(openCount, target.size);
        return {
          ...current,
          [id]: { ...target, isOpen: true, isMinimized: false, zIndex: zCounter.current, position },
        };
      });
    },
    [],
  );

  const closeWindow = useCallback(
    (id: AppId) => patch(id, { isOpen: false, isMinimized: false, isMaximized: false }),
    [patch],
  );

  const minimizeWindow = useCallback((id: AppId) => patch(id, { isMinimized: true }), [patch]);

  const maximizeWindow = useCallback(
    (id: AppId) => setWindows((current) => ({ ...current, [id]: { ...current[id], isMaximized: !current[id].isMaximized } })),
    [],
  );

  const focusWindow = useCallback(
    (id: AppId) => {
      zCounter.current += 1;
      patch(id, { zIndex: zCounter.current, isMinimized: false });
    },
    [patch],
  );

  const updatePosition = useCallback((id: AppId, position: { x: number; y: number }) => patch(id, { position }), [patch]);
  const updateSize = useCallback((id: AppId, size: { width: number; height: number }) => patch(id, { size }), [patch]);

  const closeAllWindows = useCallback(() => {
    setWindows((current) => {
      const updated = { ...current };
      (Object.keys(updated) as AppId[]).forEach((key) => {
        updated[key] = { ...updated[key], isOpen: false, isMinimized: false, isMaximized: false };
      });
      return updated;
    });
  }, []);

  return {
    windows,
    openWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    focusWindow,
    updatePosition,
    updateSize,
    closeAllWindows,
  };
}
