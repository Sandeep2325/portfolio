"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { HiOutlineAtSymbol, HiOutlineCheckCircle } from "react-icons/hi2";
import { USERNAME_RULES, validateUsername } from "@/lib/username";

const DISMISS_KEY = "sandeep-os-username-prompt-dismissed";

type Availability = { state: "idle" | "checking" | "free" | "taken" | "invalid"; message: string };

interface UsernamePromptProps {
  token: string;
  email: string | null;
  onClaimed: () => void;
}

/**
 * Shown to accounts that predate usernames. New signups pick one on the signup
 * form, so they never see this.
 */
export default function UsernamePrompt({ token, email, onClaimed }: UsernamePromptProps) {
  const [value, setValue] = useState("");
  const [availability, setAvailability] = useState<Availability>({ state: "idle", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true);
    } catch {
      // Storage blocked — just show the prompt.
    }
    inputRef.current?.focus();
  }, []);

  // Debounced availability check.
  useEffect(() => {
    const check = validateUsername(value);
    if (!value.trim()) {
      setAvailability({ state: "idle", message: "" });
      return;
    }
    if (!check.ok) {
      setAvailability({ state: "invalid", message: check.error });
      return;
    }

    setAvailability({ state: "checking", message: "Checking…" });
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/username?username=${encodeURIComponent(check.value)}`);
        const data = await response.json();
        setAvailability(
          data.available
            ? { state: "free", message: `${check.value} is available` }
            : { state: "taken", message: data.error || "That username is taken." },
        );
      } catch {
        setAvailability({ state: "idle", message: "" });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [value]);

  if (dismissed) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Non-fatal.
    }
    setDismissed(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const check = validateUsername(value);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/username", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: check.value }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save that username.");
        return;
      }
      onClaimed();
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = availability.state === "free" && !submitting;

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="surface animate-scale-in relative w-full max-w-md px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[rgba(77,168,255,0.25)] to-[rgba(155,89,255,0.25)]">
            <HiOutlineAtSymbol className="h-5 w-5 text-[#4da8ff]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-[var(--text)]">Pick a username</h2>
            <p className="text-sm text-[var(--muted)]">
              Your account still shows as <strong className="text-[var(--ink-soft)]">{email || "your email"}</strong>.
            </p>
          </div>
        </div>

        <form className="mt-5 grid gap-3" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink-soft)]">
            Username
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
              maxLength={20}
              placeholder="e.g. sandy_dev"
              autoComplete="off"
              disabled={submitting}
            />
          </label>

          <p
            className={
              availability.state === "free"
                ? "feed-message"
                : availability.state === "taken" || availability.state === "invalid"
                  ? "feed-error"
                  : "text-sm text-[var(--muted)]"
            }
          >
            {availability.message || USERNAME_RULES}
          </p>

          {error && <p className="feed-error">{error}</p>}

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button className="primary-button" type="submit" disabled={!canSubmit}>
              {submitting ? "Saving…" : "Claim username"}
            </button>
            <button type="button" className="secondary-button" onClick={dismiss} disabled={submitting}>
              Not now
            </button>
          </div>
        </form>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <HiOutlineCheckCircle className="h-4 w-4" />
          Used on your posts, comments and messages.
        </p>
      </div>
    </div>
  );
}
