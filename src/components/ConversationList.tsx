"use client";

import { useMemo, useState } from "react";
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineEyeSlash,
  HiOutlineShieldCheck,
  HiOutlineXMark,
} from "react-icons/hi2";
import { relativeTime } from "@/lib/relative-time";

export type ThreadSummary = {
  key: string;
  kind: "anon" | "pair";
  title: string;
  subtitle: string | null;
  peerId: string | null;
  participant: boolean;
  lastBody: string;
  lastAt: string;
  unread: number;
  ip: string | null;
};

export type Person = { id: string; label: string; isOwner: boolean; lastSeenAt: string | null };

interface ConversationListProps {
  threads: ThreadSummary[];
  people: Person[];
  activeKey: string;
  onSelect: (thread: ThreadSummary) => void;
  onStartWith: (person: Person) => void;
  onlineIds: Set<string>;
}

export default function ConversationList({
  threads,
  people,
  activeKey,
  onSelect,
  onStartWith,
  onlineIds,
}: ConversationListProps) {
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);

  const needle = query.trim().toLowerCase();
  const shownThreads = useMemo(
    () => (needle ? threads.filter((thread) => thread.title.toLowerCase().includes(needle)) : threads),
    [threads, needle],
  );
  const shownPeople = useMemo(
    () => (needle ? people.filter((person) => person.label.toLowerCase().includes(needle)) : people),
    [people, needle],
  );

  return (
    <aside className="convo-list">
      <div className="convo-search">
        <HiOutlineMagnifyingGlass className="h-4 w-4 flex-shrink-0 text-[var(--muted)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={composing ? "Search people…" : "Search chats…"}
          aria-label="Search conversations"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        )}
        {people.length > 0 && (
          <button
            type="button"
            className={`convo-new${composing ? " active" : ""}`}
            onClick={() => setComposing((open) => !open)}
            title={composing ? "Back to chats" : "New message"}
            aria-label={composing ? "Back to chats" : "New message"}
          >
            <HiOutlinePencilSquare className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="convo-scroll">
        {composing ? (
          shownPeople.length === 0 ? (
            <p className="convo-empty">No one to message yet.</p>
          ) : (
            shownPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                className="convo-row"
                onClick={() => {
                  onStartWith(person);
                  setComposing(false);
                  setQuery("");
                }}
              >
                <span className="convo-avatar">
                  {person.isOwner ? <HiOutlineShieldCheck className="h-4 w-4" /> : person.label.slice(0, 1).toUpperCase()}
                  {onlineIds.has(person.id) && <i className="convo-online" />}
                </span>
                <span className="convo-body">
                  <span className="convo-top">
                    <strong>{person.label}</strong>
                  </span>
                  <span className="convo-preview">
                    {person.lastSeenAt ? `Active ${relativeTime(person.lastSeenAt)}` : "New conversation"}
                  </span>
                </span>
              </button>
            ))
          )
        ) : shownThreads.length === 0 ? (
          <p className="convo-empty">{needle ? "No chats match." : "No conversations yet."}</p>
        ) : (
          shownThreads.map((thread) => (
            <button
              key={thread.key}
              type="button"
              className={`convo-row${thread.key === activeKey ? " active" : ""}${thread.participant ? "" : " spectate"}`}
              onClick={() => onSelect(thread)}
            >
              <span className={`convo-avatar${thread.kind === "anon" ? " anon" : ""}`}>
                {thread.kind === "anon" ? (
                  <HiOutlineEyeSlash className="h-4 w-4" />
                ) : (
                  thread.title.slice(0, 1).toUpperCase()
                )}
                {thread.peerId && onlineIds.has(thread.peerId) && <i className="convo-online" />}
              </span>

              <span className="convo-body">
                <span className="convo-top">
                  <strong>{thread.title}</strong>
                  <time>{relativeTime(thread.lastAt)}</time>
                </span>
                <span className="convo-bottom">
                  <span className="convo-preview">
                    {thread.subtitle ? <em>{thread.subtitle} · </em> : null}
                    {thread.lastBody}
                  </span>
                  {thread.unread > 0 && <span className="convo-unread">{Math.min(99, thread.unread)}</span>}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
