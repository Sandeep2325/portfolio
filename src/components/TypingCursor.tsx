"use client";

export default function TypingCursor() {
  return (
    <span className="inline-block animate-blink text-[#58a6ff] ml-1 align-baseline">_</span>
  );
}

// Add this to your globals.css:
// @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
// .animate-blink { animation: blink 1s steps(1) infinite; } 