"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";

type Message = { id: number; parent_id: number | null; author_name: string; body: string; is_owner: boolean; created_at: string };

export default function CommunityWall() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  const date = useMemo(() => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), []);

  useEffect(() => { void (async () => { const response = await fetch("/api/community", { cache: "no-store" }); const data = await response.json(); if (response.ok) setMessages(data.messages); else setError(data.error || "Could not load messages."); setLoading(false); })(); if (browserSupabase) void browserSupabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token || "")); }, []);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ body: form.get("message"), authorName: form.get("name"), parentId: replyTo }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not send message."); return; }
    setMessages((current) => [data.message, ...current]); event.currentTarget.reset(); setReplyTo(null);
  }

  const roots = messages.filter((message) => !message.parent_id);
  const replies = (id: number) => messages.filter((message) => message.parent_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  return <section className="community-wall surface px-6 py-7 sm:px-8"><div className="section-heading"><div><h2>Community messages</h2><p>Say hello, ask a question, or leave a note. Posts are visible to everyone.</p></div></div>
    <form className="community-form" onSubmit={sendMessage}><div className="reply-status">{replyTo ? <span>Replying to a message <button type="button" onClick={() => setReplyTo(null)}>Cancel</button></span> : <span>{accessToken ? "Posting as a signed-in guest" : "Sign in to join the conversation"}</span>}</div><div className="community-fields"><input name="name" maxLength={40} placeholder="Your display name (optional)" /></div><textarea name="message" required disabled={!accessToken} maxLength={1000} rows={3} placeholder={accessToken ? "Write a message…" : "Sign in to write a message"} /><button className="primary-button" disabled={!accessToken} type="submit">Send message</button></form>
    {error && <p className="feed-error">{error}</p>}{loading ? <p className="mt-6 text-sm text-[var(--muted)]">Loading community…</p> : roots.length === 0 ? <div className="empty-community">No messages yet. Start the conversation.</div> : <div className="message-list">{roots.map((message) => <article className="community-message" key={message.id}><div className={message.is_owner ? "message-avatar owner" : "message-avatar"}>{message.is_owner ? "SG" : "G"}</div><div className="message-main"><div><strong>{message.author_name}</strong>{message.is_owner && <span className="owner-badge">Owner</span>}<time>{date.format(new Date(message.created_at))}</time></div><p>{message.body}</p><button className="reply-button" onClick={() => setReplyTo(message.id)}>Reply</button>{replies(message.id).map((reply) => <div className="community-reply" key={reply.id}><div className={reply.is_owner ? "message-avatar owner" : "message-avatar"}>{reply.is_owner ? "SG" : "G"}</div><div><strong>{reply.author_name}</strong>{reply.is_owner && <span className="owner-badge">Owner</span>}<time>{date.format(new Date(reply.created_at))}</time><p>{reply.body}</p></div></div>)}</div></article>)}</div>}
  </section>;
}
