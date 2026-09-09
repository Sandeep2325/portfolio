"use client";

import { useEffect, useRef } from "react";

const TRAIL_COUNT = 8;

/** Soft follower dot with a short trail that only appears over interactive targets. */
export default function CursorEffect() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const trailHost = trailRef.current;
    if (!cursor || !trailHost) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const trails: HTMLDivElement[] = [];
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const dot = document.createElement("div");
      dot.style.cssText =
        "position:fixed;width:8px;height:8px;border-radius:9999px;background:rgba(77,168,255,0.2);" +
        "pointer-events:none;opacity:0;z-index:9998;transform:translate(-50%,-50%);transition:opacity .2s ease";
      trailHost.appendChild(dot);
      trails.push(dot);
    }

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let hovering = false;
    const history: { x: number; y: number }[] = [];

    const onMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      const target = event.target as HTMLElement | null;
      hovering = Boolean(target?.closest("button, a, input, textarea, select, .dock-icon, .window-controls"));
    };

    let frame = 0;
    const tick = () => {
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;

      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
      cursor.style.opacity = hovering ? "1" : "0.5";
      cursor.style.transform = `translate(-50%, -50%) scale(${hovering ? 1.5 : 1})`;

      if (hovering) {
        history.unshift({ x: cursorX, y: cursorY });
        if (history.length > TRAIL_COUNT) history.pop();
        history.forEach((position, index) => {
          const dot = trails[index];
          if (!dot) return;
          dot.style.left = `${position.x}px`;
          dot.style.top = `${position.y}px`;
          dot.style.opacity = `${(1 - index / TRAIL_COUNT) * 0.5}`;
          dot.style.transform = `translate(-50%, -50%) scale(${1 - index * 0.1})`;
        });
      } else {
        history.length = 0;
        for (const dot of trails) dot.style.opacity = "0";
      }

      frame = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      for (const dot of trails) dot.remove();
    };
  }, []);

  return (
    <>
      <div ref={trailRef} />
      <div
        ref={cursorRef}
        className="pointer-events-none fixed z-[9999] h-4 w-4 rounded-full border border-[rgba(77,168,255,0.6)] bg-[rgba(77,168,255,0.4)] transition-[opacity,transform] duration-200"
        style={{ transform: "translate(-50%, -50%)" }}
      />
    </>
  );
}
