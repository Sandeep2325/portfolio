"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineCommandLine, HiOutlineCodeBracket, HiOutlineBolt, HiOutlineCircleStack, HiOutlineLockClosed, HiOutlineCheckCircle } from "react-icons/hi2";

const ASCII_LOGO = String.raw`
 ____      _     _   _  ____   _____  _____  ____  
/ ___|    / \   | \ | ||  _ \ | ____|| ____||  _ \ 
\___ \   / _ \  |  \| || | | ||  _|  |  _|  | |_) |
 ___) | / ___ \ | |\  || |_| || |___ | |___ |  __/ 
|____/ /_/   \_\|_| \_||____/ |_____||_____||_|    
`;

const ICONS = [
  HiOutlineCommandLine,
  HiOutlineCodeBracket,
  HiOutlineBolt,
  HiOutlineCircleStack,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
];

export type BootLine = string;

export default function BootScreen({ lines, onComplete }: { lines: BootLine[]; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  const [caret, setCaret] = useState(true);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const blink = setInterval(() => setCaret((on) => !on), 530);
    return () => clearInterval(blink);
  }, []);

  // Any key or click skips the rest of the sequence.
  useEffect(() => {
    window.addEventListener("keydown", finish);
    window.addEventListener("pointerdown", finish);
    return () => {
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
    };
  }, [finish]);

  useEffect(() => {
    if (step >= lines.length) {
      const timer = setTimeout(finish, 700);
      return () => clearTimeout(timer);
    }

    const text = lines[step];
    let index = 0;
    const typing = setInterval(() => {
      index += 1;
      setTyped(text.slice(0, index));
      if (index >= text.length) {
        clearInterval(typing);
        setTimeout(() => {
          setStep((current) => current + 1);
          setTyped("");
        }, 220);
      }
    }, 24);

    return () => clearInterval(typing);
  }, [step, lines, finish]);

  const progress = Math.min(100, Math.round((step / lines.length) * 100));
  const CurrentIcon = ICONS[step % ICONS.length];

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#0a0a0f]">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,0,0.1) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-green-500/10 blur-3xl" />
        <div
          className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-blue-500/10 blur-3xl"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 md:px-8">
        <div className="w-full max-w-2xl">
          <div className="flex items-center gap-2 rounded-t-lg border border-green-500/30 bg-[#1a1a2e] px-4 py-2">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex flex-1 items-center justify-center gap-2">
              <HiOutlineCommandLine className="h-4 w-4 text-green-400" />
              <span className="font-mono-os text-xs text-green-400">sandeep-os@terminal</span>
            </div>
          </div>

          <div className="font-mono-os rounded-b-lg border-x border-b border-green-500/30 bg-black/80 p-6 text-sm backdrop-blur-sm md:p-8 md:text-base">
            <div className="mb-6 space-y-1">
              <div className="text-green-400">
                <span className="text-green-500">$</span> cat /etc/os-release
              </div>
              <div className="mt-2 text-white/90">
                <div>NAME=&quot;Sandeep OS&quot;</div>
                <div>VERSION=&quot;1.0&quot;</div>
                <div>ID=sandeep-os</div>
              </div>
            </div>

            <div className="mb-6 min-h-[200px] space-y-2">
              {lines.slice(0, step).map((line, index) => {
                const LineIcon = ICONS[index % ICONS.length];
                return (
                  <div key={line} className="animate-fade-in flex items-start gap-2 text-green-400">
                    <LineIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{line}</span>
                  </div>
                );
              })}

              {step < lines.length && (
                <div className="flex items-start gap-2 text-green-400">
                  <CurrentIcon className="mt-0.5 h-4 w-4 flex-shrink-0 animate-pulse" />
                  <span>
                    {typed}
                    {caret && <span className="ml-1 inline-block h-4 w-2 bg-green-400 align-middle" />}
                  </span>
                </div>
              )}

              {step >= lines.length && (
                <div className="animate-fade-in flex items-start gap-2 text-green-300">
                  <HiOutlineCheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>[SUCCESS] Welcome to Sandeep OS</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-green-400/60">
                <span>Booting…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full border border-green-500/20 bg-green-500/10">
                <div
                  className="relative h-full bg-gradient-to-r from-green-500 via-green-400 to-green-300 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-green-500/20 pt-4 text-xs text-green-400/40">
              <span>Press any key to continue…</span>
              {caret && <span className="inline-block h-3 w-1.5 bg-green-400/60" />}
            </div>
          </div>
        </div>

        {/* Pure-ASCII art: every glyph is one cell wide in any monospace font,
            so the rows stay aligned regardless of font fallback. */}
        <pre
          className="font-mono-os mt-8 hidden whitespace-pre text-center text-xs text-green-400/30 md:block"
          style={{ lineHeight: 1.1 }}
        >
          {ASCII_LOGO}
        </pre>
      </div>
    </div>
  );
}
