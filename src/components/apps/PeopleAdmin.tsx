"use client";

import { useCallback, useEffect, useState } from "react";
import { HiOutlineTrash, HiOutlineArrowPath, HiOutlineUser, HiOutlineEyeSlash, HiOutlineShieldCheck } from "react-icons/hi2";
import { browserSupabase } from "@/lib/supabase-browser";
import { relativeTime } from "@/lib/relative-time";

type Account = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  isAdmin: boolean;
  lastSeenAt: string | null;
  createdAt: string | null;
  messageCount: number;
};

type Visitor = {
  id: string;
  label: string;
  ip: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  messageCount: number;
};

/** Owner-only people management. Deleting is irreversible, so it asks twice. */
export default function PeopleAdmin() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [purgePosts, setPurgePosts] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const token = useCallback(async () => {
    const { data } = (await browserSupabase?.auth.getSession()) || { data: { session: null } };
    return data.session?.access_token || "";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = await token();
      if (!accessToken) {
        setError("Sign in as the portfolio owner to manage people.");
        return;
      }
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Could not load people.");
        return;
      }
      setError("");
      setAccounts(payload.accounts || []);
      setVisitors(payload.visitors || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(kind: "account" | "anon", id: string, name: string, messageCount: number) {
    const extra = purgePosts && kind === "account" ? "\n\nTheir community posts and comments will also be removed." : "";
    const warning =
      `Permanently delete ${name}?\n\n` +
      `This removes their account, ${messageCount} message${messageCount === 1 ? "" : "s"} and any attachments.` +
      `${extra}\n\nThis cannot be undone.`;
    if (!window.confirm(warning)) return;

    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const accessToken = await token();
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ kind, id, purgePosts }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not delete.");
        return;
      }
      setNotice(
        `Deleted ${name}${data.removedPosts ? ` and ${data.removedPosts} public post${data.removedPosts === 1 ? "" : "s"}` : ""}.`,
      );
      if (kind === "account") setAccounts((current) => current.filter((item) => item.id !== id));
      else setVisitors((current) => current.filter((item) => item.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="surface px-6 py-6">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Owner only</p>
          <h2 className="font-display mt-1 text-lg font-bold text-[var(--text)]">People</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Accounts and anonymous visitors who have used the site.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>
          <HiOutlineArrowPath className="mr-1.5 h-4 w-4" />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="feed-error mt-3">{error}</p>}
      {notice && <p className="feed-message mt-3">{notice}</p>}

      <label className="people-purge">
        <input type="checkbox" checked={purgePosts} onChange={(event) => setPurgePosts(event.target.checked)} />
        Also remove their community posts and comments when deleting an account
      </label>

      <h3 className="people-heading">Accounts</h3>
      {accounts.length === 0 && !loading ? (
        <p className="text-sm text-[var(--muted)]">No accounts yet.</p>
      ) : (
        <div className="people-list">
          {accounts.map((account) => (
            <div className="people-row" key={account.id}>
              <span className="people-avatar">
                {account.isAdmin ? <HiOutlineShieldCheck className="h-4 w-4" /> : <HiOutlineUser className="h-4 w-4" />}
              </span>
              <span className="people-main">
                <strong>
                  {account.username || account.displayName || "Guest"}
                  {account.isAdmin && <span className="owner-badge">Owner</span>}
                </strong>
                <em>{account.email || account.id.slice(0, 8) + "…"}</em>
              </span>
              <span className="people-meta">
                {account.messageCount} msg
                <em>{account.lastSeenAt ? `seen ${relativeTime(account.lastSeenAt)}` : "never seen"}</em>
              </span>
              {account.isAdmin ? (
                <span className="people-locked">protected</span>
              ) : (
                <button
                  type="button"
                  className="people-delete"
                  disabled={busyId === account.id}
                  onClick={() =>
                    void remove("account", account.id, account.username || account.email || "this account", account.messageCount)
                  }
                >
                  <HiOutlineTrash className="h-4 w-4" />
                  {busyId === account.id ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <h3 className="people-heading">Anonymous visitors</h3>
      {visitors.length === 0 && !loading ? (
        <p className="text-sm text-[var(--muted)]">No anonymous visitors yet.</p>
      ) : (
        <div className="people-list">
          {visitors.map((visitor) => (
            <div className="people-row" key={visitor.id}>
              <span className="people-avatar anon">
                <HiOutlineEyeSlash className="h-4 w-4" />
              </span>
              <span className="people-main">
                <strong>{visitor.label}</strong>
                <em className="font-mono-os">{visitor.ip || "unknown IP"}</em>
              </span>
              <span className="people-meta">
                {visitor.messageCount} msg
                <em>seen {relativeTime(visitor.lastSeenAt)}</em>
              </span>
              <button
                type="button"
                className="people-delete"
                disabled={busyId === visitor.id}
                onClick={() => void remove("anon", visitor.id, visitor.label, visitor.messageCount)}
              >
                <HiOutlineTrash className="h-4 w-4" />
                {busyId === visitor.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
