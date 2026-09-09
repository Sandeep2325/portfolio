"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { getAppConfig } from "@/lib/os-apps";
import type { WindowState } from "@/hooks/useWindowManager";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const TOP_BAR = 32;
const DOCK_SPACE = 104;

interface WindowProps {
  state: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  children: ReactNode;
}

type ResizeStart = { x: number; y: number; width: number; height: number; left: number; top: number };

export default function Window({
  state,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onPositionChange,
  onSizeChange,
  children,
}: WindowProps) {
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState("");
  const resizeStart = useRef<ResizeStart>({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 });

  const config = getAppConfig(state.id);

  useEffect(() => {
    if (!dragging || state.isMaximized) return;

    const onMouseMove = (event: MouseEvent) => {
      onPositionChange({
        x: Math.max(0, Math.min(event.clientX - dragOffset.x, window.innerWidth - 200)),
        y: Math.max(TOP_BAR, Math.min(event.clientY - dragOffset.y, window.innerHeight - 100)),
      });
    };
    const onMouseUp = () => setDragging(false);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, dragOffset, onPositionChange, state.isMaximized]);

  useEffect(() => {
    if (!resizeDirection || state.isMaximized) return;

    const onMouseMove = (event: MouseEvent) => {
      const start = resizeStart.current;
      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;

      let width = start.width;
      let height = start.height;
      let x = start.left;
      let y = start.top;

      if (resizeDirection.includes("e")) {
        width = Math.max(MIN_WIDTH, Math.min(start.width + deltaX, window.innerWidth - start.left));
      }
      if (resizeDirection.includes("w")) {
        width = Math.max(MIN_WIDTH, Math.min(start.width - deltaX, start.left + start.width));
        x = start.left + start.width - width;
      }
      if (resizeDirection.includes("s")) {
        height = Math.max(MIN_HEIGHT, Math.min(start.height + deltaY, window.innerHeight - start.top));
      }
      if (resizeDirection.includes("n")) {
        height = Math.max(MIN_HEIGHT, Math.min(start.height - deltaY, start.top + start.height - TOP_BAR));
        y = start.top + start.height - height;
      }

      onSizeChange({ width, height });
      onPositionChange({ x, y });
    };
    const onMouseUp = () => setResizeDirection("");

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizeDirection, onSizeChange, onPositionChange, state.isMaximized]);

  if (!state.isOpen) return null;

  const startDrag = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest(".window-controls")) return;
    onFocus();
    if (state.isMaximized) return;
    setDragging(true);
    setDragOffset({ x: event.clientX - state.position.x, y: event.clientY - state.position.y });
  };

  const startResize = (event: React.MouseEvent, direction: string) => {
    event.stopPropagation();
    event.preventDefault();
    onFocus();
    resizeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: state.size.width,
      height: state.size.height,
      left: state.position.x,
      top: state.position.y,
    };
    setResizeDirection(direction);
  };

  const geometry = state.isMaximized
    ? { top: TOP_BAR, left: 0, width: "100%", height: `calc(100% - ${TOP_BAR + DOCK_SPACE}px)` }
    : { top: state.position.y, left: state.position.x, width: state.size.width, height: state.size.height };

  const handles: { direction: string; className: string; style: React.CSSProperties }[] = [
    { direction: "nw", className: "top-0 left-0 cursor-nwse-resize", style: { width: 12, height: 12, marginTop: -6, marginLeft: -6 } },
    { direction: "ne", className: "top-0 right-0 cursor-nesw-resize", style: { width: 12, height: 12, marginTop: -6, marginRight: -6 } },
    { direction: "sw", className: "bottom-0 left-0 cursor-nesw-resize", style: { width: 12, height: 12, marginBottom: -6, marginLeft: -6 } },
    { direction: "se", className: "bottom-0 right-0 cursor-nwse-resize", style: { width: 12, height: 12, marginBottom: -6, marginRight: -6 } },
    { direction: "n", className: "top-0 left-0 cursor-ns-resize", style: { width: "100%", height: 12, marginTop: -6 } },
    { direction: "s", className: "bottom-0 left-0 cursor-ns-resize", style: { width: "100%", height: 12, marginBottom: -6 } },
    { direction: "w", className: "left-0 top-0 cursor-ew-resize", style: { width: 12, height: "100%", marginLeft: -6 } },
    { direction: "e", className: "right-0 top-0 cursor-ew-resize", style: { width: 12, height: "100%", marginRight: -6 } },
  ];

  return (
    <div
      className={cn(
        "os-window animate-window-open fixed flex flex-col overflow-hidden rounded-xl border border-white/15 bg-[#1a1a2e] shadow-2xl",
        state.isMinimized && "pointer-events-none scale-90 opacity-0",
        dragging && "cursor-grabbing select-none",
      )}
      style={{ ...geometry, zIndex: state.zIndex }}
      onMouseDown={onFocus}
    >
      {!state.isMaximized &&
        handles.map((handle) => (
          <div
            key={handle.direction}
            className={cn("resize-handle absolute z-10", handle.className)}
            style={handle.style}
            onMouseDown={(event) => startResize(event, handle.direction)}
          />
        ))}

      <div
        className={cn(
          "flex select-none items-center gap-3 border-b border-white/10 bg-[#252540] px-4 py-2.5",
          !state.isMaximized && "cursor-grab active:cursor-grabbing",
        )}
        onMouseDown={startDrag}
        onDoubleClick={onMaximize}
      >
        <div className="window-controls flex gap-2">
          <button type="button" aria-label="Close window" className="window-control close" onClick={onClose} />
          <button type="button" aria-label="Minimize window" className="window-control minimize" onClick={onMinimize} />
          <button
            type="button"
            aria-label={state.isMaximized ? "Restore window" : "Maximize window"}
            className="window-control maximize"
            onClick={onMaximize}
          />
        </div>

        <div className="-ml-16 flex flex-1 items-center justify-center gap-2">
          {config?.icon && <config.icon className="text-base text-white/70" />}
          <span className="text-sm font-medium text-white/70">{config?.name}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#1a1a2e] p-5">{children}</div>
    </div>
  );
}
