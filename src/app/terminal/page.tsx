"use client";
import { useRef, useState, useEffect } from "react";

const COMMANDS = {
  help: `Available commands:\n- help\n- readme\n- bio\n- skills\n- experience\n- projects\n- contact\n- github\n- linkedin\n- about\n- theme\n- clear\n- hi to sandeep`,
  readme: `Available commands:\n- help\n- readme\n- bio\n- skills\n- experience\n- projects\n- contact\n- github\n- linkedin\n- about\n- theme\n- clear\n- hi to sandeep`,
  bio: `Sandeep Gowda is a Software Developer based in Bengaluru, India. Experienced in React, TypeScript, Django, Next.js, and Cloud.`,
  about: `I build robust, scalable, and interactive applications. Passionate about clean code and user experience.`,
  skills: `Skills:\n- React, TypeScript, Next.js, Redux\n- Django, FastAPI, Python\n- MySQL, PostgreSQL, MongoDB\n- AWS EC2, DevOps\n- Unity, Godot, Game Dev`,
  experience: `Experience:\n- Getafix Technologies (QuickAds): Full-Stack Developer\n- Innovya Technologies: Software Developer\n- Nexevo Technologies: Python Developer`,
  projects: `Projects:\n- QuickAds Video Ad Platform\n- VR Video Player for Oculus & PICO\n- Medical E-commerce Platform\n- Insurance Brokerage Application\n- B2B E-commerce Website`,
  contact: `Email: sandeepgowda2314@gmail.com\nPhone: 8105486993`,
  github: `https://github.com/Sandeep2325`,
  linkedin: `https://www.linkedin.com/in/sandeep-gowda-cc-54a117223/`,
  theme: `Sorry, only dark mode is supported!`,
};

const PROMPT = "sandeep@portfolio:~$";

export default function TerminalPage() {
  const [history, setHistory] = useState<string[]>(["Type 'readme' to see all available commands."]);
  const [input, setInput] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [unlockCount, setUnlockCount] = useState(0);
  const [loading, setLoading] = useState(false);
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

  function handleCommand(cmd: string) {
    if (cmd === "clear") {
      setHistory([]);
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
    if (COMMANDS[key as keyof typeof COMMANDS]) {
      setHistory((h) => [...h, `${PROMPT} ${cmd}`, COMMANDS[key as keyof typeof COMMANDS]]);
    } else if (key) {
      setHistory((h) => [...h, `${PROMPT} ${cmd}`, `command not found: ${cmd}`]);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loading) {
      handleCommand(input);
      setInput("");
    }
  }

  return (
    <div className="w-full h-[70vh] max-w-2xl mx-auto mt-8 card p-0 overflow-hidden flex flex-col" style={{background:'#10131a'}}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 text-[#58a6ff] font-mono text-base" style={{background:'#10131a'}}>
        {history.map((line, i) => (
          <div key={i} className={line.startsWith(PROMPT) ? "text-[#238636]" : "text-[#c9d1d9] whitespace-pre-line"}>{line}</div>
        ))}
        {loading && (
          <div className="text-[#c9d1d9] whitespace-pre-line">reading your mind... <span className="animate-blink text-[#58a6ff]">_</span></div>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex items-center px-4 py-3 border-t border-[#30363d] bg-[#161b22]">
        <span className="text-[#238636] font-mono mr-2">{PROMPT}</span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none border-none text-[#c9d1d9] font-mono text-base"
          value={input}
          onChange={e => setInput(e.target.value)}
          autoComplete="off"
          disabled={loading}
        />
        {showCursor && !loading && <span className="text-[#58a6ff] font-mono ml-1">_</span>}
      </form>
    </div>
  );
} 