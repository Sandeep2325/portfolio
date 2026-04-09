"use client";

import { useMemo, useRef, useState } from "react";

type Command = {
  label: string;
};

const RESPONSES: Record<string, string> = {
  help: "Available commands: help, about, skills, experience, projects, contact, ai-agents, llm-integration, social-creatives, clear",
  about:
    "Software developer focused on frontend systems, APIs, AI integrations, agent workflows, and creative execution for modern products.",
  skills:
    "Core areas: frontend engineering, backend APIs, AI API integration, LLM product workflows, automation systems, and creative generation.",
  experience:
    "Experience spans product engineering, immersive apps, platform development, and full-stack delivery across web and AI-supported workflows.",
  projects:
    "Projects include ad-tech platforms, commerce products, VR builds, and AI-ready application experiences.",
  contact:
    "Use the contact page to reach out for frontend work, AI integrations, automation workflows, or social media creative production.",
  "ai-agents":
    "AI agents: workflow orchestration, agent-style task execution, internal tool automation, and practical production integrations.",
  "llm-integration":
    "LLM integration: model APIs, prompt workflows, chat experiences, retrieval-style features, and product-facing AI interactions.",
  "social-creatives":
    "Creative workflows: image generation, video generation, audio generation, and social media content systems.",
};

const PROMPT = "sandeep@portfolio:~$";

export default function TerminalConsole({ commands }: { commands: Command[] }) {
  const available = useMemo(() => {
    const base = commands.map((command) => command.label.toLowerCase());
    return Array.from(new Set(["help", "clear", ...base]));
  }, [commands]);

  const [history, setHistory] = useState<string[]>([
    "Interactive portfolio terminal ready.",
    "Type 'help' to see the available commands.",
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setHistoryIndex] = useState<number | null>(null);

  function runCommand(raw: string) {
    const command = raw.trim().toLowerCase();

    if (!command) return;

    if (command === "clear") {
      setHistory(["Interactive portfolio terminal ready.", "Type 'help' to see the available commands."]);
      return;
    }

    const response =
      RESPONSES[command] ||
      (available.includes(command)
        ? "This command is available, but the detailed response is still being expanded."
        : `command not found: ${command}`);

    setHistory((current) => [...current, `${PROMPT} ${raw}`, response]);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    setCommandHistory((current) => [...current, input]);
    runCommand(input);
    setInput("");
    setHistoryIndex(null);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp" && commandHistory.length > 0) {
      event.preventDefault();
      setHistoryIndex((current) => {
        const nextIndex = current === null ? commandHistory.length - 1 : Math.max(0, current - 1);
        setInput(commandHistory[nextIndex] || "");
        return nextIndex;
      });
    }

    if (event.key === "ArrowDown" && commandHistory.length > 0) {
      event.preventDefault();
      setHistoryIndex((current) => {
        if (current === null) return null;
        const nextIndex = current + 1;
        if (nextIndex >= commandHistory.length) {
          setInput("");
          return null;
        }
        setInput(commandHistory[nextIndex] || "");
        return nextIndex;
      });
    }
  }

  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-[rgba(120,64,28,0.12)] px-6 py-4 font-mono text-sm text-[var(--muted)]">
        {PROMPT} help
      </div>
      <div className="space-y-3 px-6 py-6 font-mono text-sm text-[var(--ink-soft)]">
        {history.map((line, index) => (
          <p key={`${line}-${index}`} className={line.startsWith(PROMPT) ? "text-[var(--accent-secondary)]" : "whitespace-pre-line"}>
            {line}
          </p>
        ))}
      </div>
      <form onSubmit={submit} className="border-t border-[rgba(120,64,28,0.12)] bg-[rgba(255,255,255,0.45)] px-6 py-4">
        <label className="flex items-center gap-3 font-mono text-sm text-[var(--ink-soft)]">
          <span className="text-[var(--accent)]">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setHistoryIndex(null);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => inputRef.current?.scrollIntoView({ block: "nearest" })}
            placeholder="Type a command and press Enter"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--muted)]"
            autoComplete="off"
          />
        </label>
      </form>
    </section>
  );
}
