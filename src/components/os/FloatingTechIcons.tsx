"use client";

import { useEffect, useRef } from "react";
import { SiReact, SiNextdotjs, SiTypescript, SiJavascript, SiPython, SiNodedotjs, SiTailwindcss, SiGit } from "react-icons/si";

const TECH = [
  { Icon: SiReact, label: "React", color: "#22d3ee" },
  { Icon: SiNextdotjs, label: "Next.js", color: "#ffffff" },
  { Icon: SiTypescript, label: "TypeScript", color: "#60a5fa" },
  { Icon: SiJavascript, label: "JavaScript", color: "#facc15" },
  { Icon: SiPython, label: "Python", color: "#3b82f6" },
  { Icon: SiNodedotjs, label: "Node.js", color: "#22c55e" },
  { Icon: SiTailwindcss, label: "Tailwind", color: "#67e8f9" },
  { Icon: SiGit, label: "Git", color: "#f97316" },
];

/**
 * Icons orbit the viewport centre and nudge away from the pointer. Positions are
 * written straight to the DOM so the animation never re-renders React.
 */
export default function FloatingTechIcons() {
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const state = TECH.map((_, index) => {
      const angle = (index / TECH.length) * Math.PI * 2;
      const radius = 350 + Math.random() * 150;
      return {
        x: window.innerWidth / 2 + Math.cos(angle) * radius,
        y: window.innerHeight / 2 + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
      };
    });

    const mouse = { x: -9999, y: -9999 };
    const onMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };
    window.addEventListener("mousemove", onMove);

    let frame = 0;
    const tick = () => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      // Keep the ring wide enough to clear the hero name in the middle.
      const orbit = Math.max(420, window.innerWidth * 0.36);
      const drift = Date.now() * 0.0001;

      state.forEach((point, index) => {
        const angle = (index / TECH.length) * Math.PI * 2 + drift;
        const targetX = centerX + Math.cos(angle) * orbit;
        const targetY = centerY + Math.sin(angle) * orbit;

        const dx = mouse.x - point.x;
        const dy = mouse.y - point.y;
        const distance = Math.hypot(dx, dy) || 1;
        const push = Math.min(50 / (distance / 10 + 1), 5);

        point.vx = (point.vx + (targetX - point.x) * 0.02 + (dx / distance) * push * 0.01) * 0.95;
        point.vy = (point.vy + (targetY - point.y) * 0.02 + (dy / distance) * push * 0.01) * 0.95;
        point.x += point.vx;
        point.y += point.vy;

        const node = nodeRefs.current[index];
        if (node) node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
      });

      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
      {TECH.map((tech, index) => (
        <div
          key={tech.label}
          ref={(node) => {
            nodeRefs.current[index] = node;
          }}
          className="absolute left-0 top-0 opacity-40"
          style={{ color: tech.color }}
        >
          <tech.Icon size={34} />
        </div>
      ))}
    </div>
  );
}
