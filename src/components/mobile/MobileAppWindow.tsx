"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HiOutlineChevronLeft, HiOutlineSquare2Stack } from "react-icons/hi2";
import { getAppConfig, type AppId } from "@/lib/os-apps";
import { cn } from "@/lib/utils";

interface MobileAppWindowProps {
  appId: AppId;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  onClose: () => void;
  onFocus: () => void;
  onOpenAppSwitcher: () => void;
  onSwitchToNext: () => void;
  onSwitchToPrevious: () => void;
  children: ReactNode;
}

export default function MobileAppWindow({
  appId,
  isOpen,
  isMinimized,
  zIndex,
  onClose,
  onFocus,
  onOpenAppSwitcher,
  onSwitchToNext,
  onSwitchToPrevious,
  children,
}: MobileAppWindowProps) {
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMinimized]);

  if (!isOpen || isMinimized) return null;

  const config = getAppConfig(appId);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 280);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setDrag({ x: 0, y: 0 });
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = event.touches[0];
    setDrag({ x: touch.clientX - touchStart.current.x, y: touch.clientY - touchStart.current.y });
  };

  const onTouchEnd = () => {
    const start = touchStart.current;
    if (start && drag) {
      const absX = Math.abs(drag.x);
      const absY = Math.abs(drag.y);
      if (absX > 100 && absX > absY) {
        if (drag.x > 0) onSwitchToPrevious();
        else onSwitchToNext();
      } else if (drag.y > 100 && start.y < 120) {
        handleClose();
      }
    }
    touchStart.current = null;
    setDrag(null);
  };

  // Follow the finger a little so the gesture feels connected.
  const offsetY = drag && drag.y > 0 ? drag.y : 0;
  const offsetX = drag ? Math.max(-50, Math.min(50, drag.x)) : 0;
  const transform = offsetY > 0 ? `translateY(${offsetY}px)` : offsetX !== 0 ? `translateX(${offsetX}px)` : undefined;

  return (
    <div
      className={cn("fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300", closing ? "opacity-0" : "opacity-100")}
      style={{ zIndex }}
      onClick={handleClose}
    >
      <div
        // top-11 clears the status bar, which paints above every app window.
        className={cn(
          "absolute inset-x-0 bottom-0 top-11 flex flex-col rounded-t-3xl bg-[#1a1a2e]",
          closing ? "animate-ios-slide-down" : "animate-ios-slide-up",
        )}
        style={{ transform, transition: touchStart.current ? "none" : "transform 0.3s ease-out" }}
        onClick={(event) => event.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between rounded-t-3xl border-b border-white/10 bg-[#1a1a2e] px-4 py-3">
          <button type="button" onClick={handleClose} className="-ml-2 rounded-full p-2 active:bg-white/10" aria-label="Go back">
            <HiOutlineChevronLeft className="h-6 w-6 text-white" />
          </button>
          <div className="flex items-center gap-2">
            {config?.icon && <config.icon className="h-5 w-5 text-white" />}
            <span className="text-sm font-semibold text-white">{config?.name.replace(".app", "")}</span>
          </div>
          <button
            type="button"
            onClick={onOpenAppSwitcher}
            className="-mr-2 rounded-full p-2 active:bg-white/10"
            aria-label="App switcher"
          >
            <HiOutlineSquare2Stack className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="mobile-app-body flex-1 overflow-y-auto bg-[#1a1a2e] px-4 pb-20 pt-3" onClick={onFocus}>
          {children}
        </div>
      </div>
    </div>
  );
}
