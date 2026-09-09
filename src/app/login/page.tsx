"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase-browser";
import { USERNAME_RULES, validateUsername } from "@/lib/username";

type Availability = { state: "idle" | "checking" | "free" | "taken" | "invalid"; message: string };

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [askToMessage, setAskToMessage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState<Availability>({ state: "idle", message: "" });
  const router = useRouter();

  // Live username availability, signup only.
  useEffect(() => {
    if (mode !== "signup") return;

    const check = validateUsername(username);
    if (!username.trim()) {
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
  }, [username, mode]);

  async function signIn(form: FormData) {
    const response = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: form.get("identifier"), password: form.get("password") }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not sign in.");
      return;
    }

    // Hand the server-issued session to the browser client.
    const { error: sessionError } = await browserSupabase!.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });
    if (sessionError) {
      setError(sessionError.message);
      return;
    }
    setAskToMessage(true);
  }

  async function signUp(form: FormData) {
    const check = validateUsername(username);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    if (availability.state === "taken") {
      setError("That username is taken.");
      return;
    }

    const result = await browserSupabase!.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      // The profile trigger claims this username on insert.
      options: { data: { username: check.value }, emailRedirectTo: `${window.location.origin}/login` },
    });

    if (result.error) {
      setError(result.error.message);
      return;
    }
    setNotice(`Account created as ${check.value}. Check your email if confirmation is enabled, then sign in.`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!browserSupabase) {
      setError("Authentication is not configured.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      if (mode === "signin") await signIn(form);
      else await signUp(form);
    } finally {
      setSubmitting(false);
    }
  }

  const availabilityClass =
    availability.state === "free"
      ? "feed-message"
      : availability.state === "taken" || availability.state === "invalid"
        ? "feed-error"
        : "text-sm text-[var(--muted)]";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f] px-4 py-12">
      <div className="animate-blob pointer-events-none absolute left-1/4 top-1/4 h-[420px] w-[420px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="animate-blob animation-delay-2000 pointer-events-none absolute bottom-1/4 right-1/4 h-[360px] w-[360px] rounded-full bg-purple-500/10 blur-[120px]" />
      <section className="surface auth-card animate-scale-in relative w-full max-w-md px-6 py-8 sm:px-8">
        {askToMessage ? (
          <div className="post-login-choice">
            <p className="eyebrow">You&apos;re signed in</p>
            <h1 className="mt-3 font-display text-2xl font-bold text-[var(--text)]">Would you like to message Sandeep?</h1>
            <p className="mt-3 text-[var(--muted)]">You can send a private message and receive a reply in your inbox.</p>
            <div>
              <button className="primary-button" onClick={() => router.push("/messages")}>
                Yes, message Sandeep
              </button>
              <button className="secondary-button" onClick={() => router.push("/")}>
                Not now
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="eyebrow">Community access</p>
            <h1 className="mt-3 font-display text-2xl font-bold text-[var(--text)]">
              {mode === "signin" ? "Welcome back" : "Create a guest account"}
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              {mode === "signin"
                ? "Sign in with your username, or the email you signed up with."
                : "Pick a username — it is how you appear on posts, comments and messages."}
            </p>

            <form onSubmit={submit}>
              {mode === "signin" ? (
                <label>
                  Username or email
                  <input name="identifier" required autoComplete="username" disabled={submitting} placeholder="sandy_dev or you@example.com" />
                </label>
              ) : (
                <>
                  <label>
                    Username
                    <input
                      name="username"
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      maxLength={20}
                      autoComplete="username"
                      disabled={submitting}
                      placeholder="sandy_dev"
                    />
                  </label>
                  <p className={availabilityClass}>{availability.message || USERNAME_RULES}</p>
                  <label>
                    Email
                    <input name="email" required type="email" autoComplete="email" disabled={submitting} />
                  </label>
                </>
              )}

              <label>
                Password
                <input
                  name="password"
                  required
                  type="password"
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  disabled={submitting}
                />
              </label>

              <button
                className="primary-button"
                type="submit"
                disabled={submitting || (mode === "signup" && availability.state !== "free")}
              >
                {submitting
                  ? mode === "signin"
                    ? "Signing in…"
                    : "Creating account…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Sign up"}
              </button>
            </form>

            {notice && <p className="auth-notice">{notice}</p>}
            {error && <p className="feed-error">{error}</p>}

            <button
              className="auth-switch"
              disabled={submitting}
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
                setNotice("");
              }}
            >
              {mode === "signin" ? "New here? Create a guest account" : "Already have an account? Sign in"}
            </button>
            <Link href="/" className="text-link">
              Back to portfolio
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
