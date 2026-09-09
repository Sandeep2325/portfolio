"use client";

import { useState } from "react";

type FormState = {
  name: string;
  email: string;
  company: string;
  message: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  company: "",
  message: "",
};

export default function ContactForm({ isConfigured }: { isConfigured: boolean }) {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setStatus("error");
      setMessage("The contact form is not fully configured yet. Add the required environment values to enable submissions.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const payload = (await response.json()) as { error?: string; success?: boolean };

    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error || "Something went wrong while sending your message.");
      return;
    }

    setStatus("success");
    setMessage("Thanks, your message has been sent.");
    setForm(initialState);
  }

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="surface px-6 py-7">
      <p className="eyebrow">Contact form</p>
      <h2 className="mt-2 font-display text-xl font-bold text-[var(--text)]">Send a message directly</h2>
      <p className="mt-3 text-[var(--muted)]">
        Share a project idea, role, or collaboration brief and send it directly from the portfolio.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink-soft)]">Name</span>
          <input
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            className="os-field"
            placeholder="Your name"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink-soft)]">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="os-field"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink-soft)]">Company</span>
          <input
            value={form.company}
            onChange={(event) => updateField("company", event.target.value)}
            className="os-field"
            placeholder="Optional"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink-soft)]">Message</span>
          <textarea
            value={form.message}
            onChange={(event) => updateField("message", event.target.value)}
            className="os-field min-h-36"
            placeholder="Tell me about the project, role, or collaboration."
            required
          />
        </label>

        <button
          type="submit"
          disabled={status === "loading"}
          className="primary-button"
        >
          {status === "loading" ? "Sending..." : "Send Message"}
        </button>
      </form>

      {message ? (
        <p className={`mt-4 text-sm ${status === "success" ? "feed-message" : "feed-error"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
