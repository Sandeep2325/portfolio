"use client";
import { useRef, useState, useEffect } from "react";

const COMMANDS = {
  help: `Available commands:\n- help\n- readme\n- bio\n- skills\n- experience\n- projects\n- contact\n- github\n- linkedin\n- about\n- theme\n- clear\n- hi to sandeep`,
  readme: `Available commands:\n- help\n- readme\n- bio\n- skills\n- experience\n- projects\n- contact\n- github\n- linkedin\n- about\n- theme\n- clear\n- hi to sandeep\n- theme light\n- theme dark`,
  bio: `Sandeep Gowda is a Software Developer based in Bengaluru, India. Experienced in React, TypeScript, Django, Next.js, and Cloud.`,
  about: `I build robust, scalable, and interactive applications. Passionate about clean code and user experience.`,
  skills: `Skills:\n- React, TypeScript, Next.js, Redux\n- Django, FastAPI, Python\n- MySQL, PostgreSQL, MongoDB\n- AWS EC2, DevOps\n- Unity, Godot, Game Dev`,
  experience: `Experience:\n- Getafix Technologies (QuickAds): Full-Stack Developer\n- Innovya Technologies: Software Developer\n- Nexevo Technologies: Python Developer`,
  projects: `Projects:\n- QuickAds Video Ad Platform\n- VR Video Player for Oculus & PICO\n- Medical E-commerce Platform\n- Insurance Brokerage Application\n- B2B E-commerce Website`,
  contact: `Email: sandeepgowda2314@gmail.com\nPhone: +91 8105486993`,
  github: `https://github.com/Sandeep2325`,
  linkedin: `https://www.linkedin.com/in/sandeep-gowda-cc-54a117223/`,
  theme: `Sorry, only dark mode is supported!`,
};

const PROMPT = "sandeep@portfolio:~$";

const LIGHT_THEME = {
  background: "#f5f5f5",
  card: "#fff",
  prompt: "#22863a",
  text: "#24292e",
  accent: "#0969da",
  inputBg: "#eaeaea",
};
const DARK_THEME = {
  background: "#10131a",
  card: "#161b22",
  prompt: "#238636",
  text: "#c9d1d9",
  accent: "#58a6ff",
  inputBg: "#161b22",
};

export default function TerminalPage() {
  const [history, setHistory] = useState<string[]>(["Type 'readme' to see all available commands."]);
  const [input, setInput] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [unlockCount, setUnlockCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history, loading]);

  useEffect(() => {
    const blink = setInterval(() => setShowCursor((c) => !c), 500);
    return () => clearInterval(blink);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handler = () => {
        setHistory((h) => [...h, "Say 'hi to sandeep' in terminal to unlock and prove yourself a human ding dong."]);
      };
      window.addEventListener("sidebarUnlockAttempt", handler);
      return () => window.removeEventListener("sidebarUnlockAttempt", handler);
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("terminalTheme") : null;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function handleCommand(cmd: string) {
    if (cmd === "clear") {
      setHistory(["Type 'readme' to see all available commands."]);
      return;
    }
    const key = cmd.trim().toLowerCase();
    if (key === "hi to sandeep") {
      if (unlockCount === 0) {
        setLoading(true);
        setHistory((h) => [...h, `${PROMPT} ${cmd}`, "reading your mind... _"]);
        setTimeout(() => {
          setLoading(false);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("unlocked", "true");
            window.dispatchEvent(new Event("unlockSidebar"));
          }
          setHistory((h) => [...h, "Sidebar unlocked! Navigation options are now available."]);
        }, 5000);
        setUnlockCount(1);
      } else {
        setHistory((h) => [...h, `${PROMPT} ${cmd}`, "hi dear, how many times you wish me? It's ok to wish only once because I love you."]);
      }
      return;
    }
    if (key.startsWith("theme")) {
      const arg = key.split(" ")[1];
      if (arg === "light") {
        setTheme("light");
        if (typeof window !== "undefined") localStorage.setItem("terminalTheme", "light");
        setHistory((h) => [...h, `${PROMPT} ${cmd}`, "Switched to light theme."]);
      } else if (arg === "dark") {
        setTheme("dark");
        if (typeof window !== "undefined") localStorage.setItem("terminalTheme", "dark");
        setHistory((h) => [...h, `${PROMPT} ${cmd}`, "Switched to dark theme."]);
      } else {
        setHistory((h) => [...h, `${PROMPT} ${cmd}`, "Usage: theme [light|dark]"]);
      }
      return;
    }
    if (COMMANDS[key as keyof typeof COMMANDS]) {
      setHistory((h) => [...h, `${PROMPT} ${cmd}`, COMMANDS[key as keyof typeof COMMANDS]]);
    } else if (key) {
      setHistory((h) => [...h, `${PROMPT} ${cmd}`, `command not found: ${cmd}`]);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loading) {
      if (input.trim()) {
        setCommandHistory((h) => [...h, input]);
      }
      handleCommand(input);
      setInput("");
      setHistoryIndex(null);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (commandHistory.length === 0) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistoryIndex((idx) => {
        const newIdx = idx === null ? commandHistory.length - 1 : Math.max(0, idx - 1);
        setInput(commandHistory[newIdx] || "");
        return newIdx;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistoryIndex((idx) => {
        if (idx === null) return null;
        const newIdx = idx + 1;
        if (newIdx >= commandHistory.length) {
          setInput("");
          return null;
        } else {
          setInput(commandHistory[newIdx] || "");
          return newIdx;
        }
      });
    }
  }

  const colors = theme === "light" ? LIGHT_THEME : DARK_THEME;

  return (
    <div className="w-full h-[70vh] max-w-2xl mx-auto mt-8 card p-0 overflow-hidden flex flex-col" style={{ background: colors.background }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 font-mono text-base" style={{ background: colors.background, color: colors.text }}>
        {history.map((line, i) => (
          <div key={i} style={line.startsWith(PROMPT)
            ? { color: colors.prompt }
            : { color: colors.text, whiteSpace: "pre-line" }
          }>{line}</div>
        ))}
        {loading && (
          <div style={{ color: colors.text, whiteSpace: "pre-line" }}>reading your mind... <span className="animate-blink" style={{ color: colors.accent }}>_</span></div>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-center px-4 py-3 border-t" style={{ borderColor: colors.prompt, background: colors.inputBg }}>
        <span className="font-mono mr-2" style={{ color: colors.prompt }}>{PROMPT}</span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none border-none font-mono text-base"
          style={{ color: colors.text }}
          value={historyIndex !== null ? commandHistory[historyIndex] ?? "" : input}
          onChange={e => {
            setInput(e.target.value);
            setHistoryIndex(null);
          }}
          onKeyDown={onInputKeyDown}
          autoComplete="off"
          disabled={loading}
        />
        {showCursor && !loading && <span className="font-mono ml-1" style={{ color: colors.accent }}>_</span>}
      </form>
    </div>
  );
} 