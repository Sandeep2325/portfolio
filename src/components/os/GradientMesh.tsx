"use client";

import { useEffect, useRef } from "react";

const POINT_COUNT = 50;
const LINK_DISTANCE = 150;

type Point = { x: number; y: number; vx: number; vy: number };

/** Drifting particle mesh that leans toward the pointer. Purely decorative. */
export default function GradientMesh() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const mouse = { x: 0.5, y: 0.5 };
    const trackMouse = (event: MouseEvent) => {
      mouse.x = event.clientX / window.innerWidth;
      mouse.y = event.clientY / window.innerHeight;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", trackMouse);

    const points: Point[] = Array.from({ length: POINT_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    }));

    let time = 0;
    let frame = 0;

    const draw = () => {
      time += 0.005;
      context.clearRect(0, 0, canvas.width, canvas.height);

      for (const point of points) {
        const dx = mouse.x * canvas.width - point.x;
        const dy = mouse.y * canvas.height - point.y;
        const distance = Math.hypot(dx, dy);
        const influence = Math.min(0.3 / (distance / 100 + 1), 0.1);

        point.vx = (point.vx + dx * influence * 0.0001 + (Math.random() - 0.5) * 0.02) * 0.98;
        point.vy = (point.vy + dy * influence * 0.0001 + (Math.random() - 0.5) * 0.02) * 0.98;
        point.x += point.vx;
        point.y += point.vy;

        if (point.x < 0) point.x = canvas.width;
        if (point.x > canvas.width) point.x = 0;
        if (point.y < 0) point.y = canvas.height;
        if (point.y > canvas.height) point.y = 0;
      }

      context.lineWidth = 1;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          if (distance >= LINK_DISTANCE) continue;
          context.strokeStyle = `rgba(77, 168, 255, ${(1 - distance / LINK_DISTANCE) * 0.3})`;
          context.beginPath();
          context.moveTo(points[i].x, points[i].y);
          context.lineTo(points[j].x, points[j].y);
          context.stroke();
        }
      }

      for (const point of points) {
        const gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, 80);
        gradient.addColorStop(0, `rgba(77, 168, 255, ${0.15 + Math.sin(time + point.x) * 0.1})`);
        gradient.addColorStop(0.5, `rgba(155, 89, 255, ${0.1 + Math.cos(time + point.y) * 0.05})`);
        gradient.addColorStop(1, "rgba(77, 168, 255, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(point.x, point.y, 80, 0, Math.PI * 2);
        context.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", trackMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ mixBlendMode: "screen" }} />;
}
