"use client";

import { useEffect, useRef, useState } from "react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { APP_CONFIGS, type AppId } from "@/lib/os-apps";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAppOpen: (id: AppId) => void;
}

export default function CommandPalette({ isOpen, onClose, onAppOpen }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = APP_CONFIGS.filter((app) => app.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelected(0);
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((current) => (results.length ? (current + 1) % results.length : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((current) => (results.length ? (current - 1 + results.length) % results.length : 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const app = results[selected];
        if (app) {
          onAppOpen(app.id);
          onClose();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, results, selected, onAppOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="command-palette">
      <div className="command-palette-backdrop" onClick={onClose} />

      <div className="command-palette-content animate-scale-in">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <HiOutlineMagnifyingGlass className="h-5 w-5 text-white/50" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search apps…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            className="flex-1 bg-transparent text-white outline-none placeholder:text-white/40"
          />
          <kbd>ESC</kbd>
        </div>

        <div className="max-h-80 overflow-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-white/50">No apps found</p>
          ) : (
            results.map((app, index) => (
              <button
                key={app.id}
                type="button"
                onMouseEnter={() => setSelected(index)}
                onClick={() => {
                  onAppOpen(app.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  index === selected ? "bg-[rgba(77,168,255,0.2)] text-white" : "text-white/80 hover:bg-white/5"
                }`}
              >
                <app.icon className="text-xl" />
                <span className="flex-1 font-medium">{app.name}</span>
                <kbd>⌘{app.shortcut}</kbd>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-white/10 px-4 py-3 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <kbd>↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd>↵</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd>ESC</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
