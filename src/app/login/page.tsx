"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [askToMessage, setAskToMessage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!browserSupabase) {
      setError("Authentication is not configured.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email"));
      const password = String(form.get("password"));
      const result =
        mode === "signin"
          ? await browserSupabase.auth.signInWithPassword({ email, password })
          : await browserSupabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/login` },
            });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (mode === "signin") {
        setAskToMessage(true);
        return;
      }

      setNotice("Account created. Check your email if confirmation is enabled, then sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell auth-page">
      <section className="surface auth-card px-6 py-8 sm:px-8">
        {askToMessage ? (
          <div className="post-login-choice">
            <p className="eyebrow">You&apos;re signed in</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-[var(--text)]">Would you like to message Sandeep?</h1>
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
            <h1 className="mt-3 font-display text-3xl font-bold text-[var(--text)]">
              {mode === "signin" ? "Welcome back" : "Create a guest account"}
            </h1>
            <p className="mt-3 text-[var(--muted)]">
              Guests can send private messages. The portfolio owner can publish posts and reply as admin.
            </p>
            <form onSubmit={submit}>
              <label>
                Email
                <input name="email" required type="email" autoComplete="email" disabled={submitting} />
              </label>
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
              <button className="primary-button" type="submit" disabled={submitting}>
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
