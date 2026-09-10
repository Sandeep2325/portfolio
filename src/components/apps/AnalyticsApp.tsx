"use client";

import { useCallback, useEffect, useState } from "react";
import { HiOutlineGlobeAlt, HiOutlineUsers, HiOutlineClock, HiOutlineArrowPath } from "react-icons/hi2";
import { browserSupabase } from "@/lib/supabase-browser";
import { relativeTime } from "@/lib/relative-time";

type Totals = { visits: number; uniqueIps: number; last24h: number; last7d: number };
type Visitor = { ip: string; visits: number; firstSeen: string; lastSeen: string; paths: string[] };
type Recent = { ip: string | null; path: string | null; referrer: string | null; created_at: string };

/** Owner-only visit log. The API refuses this data to anyone else. */
export default function AnalyticsApp() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!browserSupabase) return;
    setLoading(true);
    try {
      const { data } = await browserSupabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Sign in as the portfolio owner to view visits.");
        return;
      }
      const response = await fetch("/api/visits", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Could not load visits.");
        return;
      }
      setError("");
      setTotals(payload.totals);
      setVisitors(payload.visitors || []);
      setRecent(payload.recent || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stamp = (value: string) => new Date(value).toLocaleString();

  return (
    <div className="page-shell">
      <section className="surface px-6 py-6">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Owner only</p>
            <h1 className="gradient-text font-display mt-1 text-2xl font-bold">Visitors</h1>
            <p className="mt-2 text-[var(--muted)]">Every visit to the site, by IP address.</p>
          </div>
          <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>
            <HiOutlineArrowPath className="mr-1.5 h-4 w-4" />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </section>

      {error && <p className="feed-error">{error}</p>}

      {totals && (
        <section className="card-grid cols-2">
          {[
            { label: "Total visits", value: totals.visits, icon: HiOutlineGlobeAlt },
            { label: "Unique IPs", value: totals.uniqueIps, icon: HiOutlineUsers },
            { label: "Last 24 hours", value: totals.last24h, icon: HiOutlineClock },
            { label: "Last 7 days", value: totals.last7d, icon: HiOutlineClock },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <p className="flex items-center gap-1.5">
                <stat.icon className="h-3.5 w-3.5" />
                {stat.label}
              </p>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </section>
      )}

      {visitors.length > 0 && (
        <section className="surface px-6 py-6">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">By visitor</h2>
          <div className="visit-table" role="table">
            <div className="visit-row visit-head" role="row">
              <span>IP address</span>
              <span>Visits</span>
              <span>First seen</span>
              <span>Last seen</span>
            </div>
            {visitors.map((visitor) => (
              <div className="visit-row" role="row" key={visitor.ip}>
                <span className="font-mono-os">{visitor.ip}</span>
                <span>
                  <strong>{visitor.visits}</strong>
                </span>
                <span title={stamp(visitor.firstSeen)}>{stamp(visitor.firstSeen)}</span>
                <span title={stamp(visitor.lastSeen)}>
                  {stamp(visitor.lastSeen)}
                  <em> · {relativeTime(visitor.lastSeen)}</em>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="surface px-6 py-6">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">Recent visits</h2>
          <div className="visit-table" role="table">
            <div className="visit-row visit-head three" role="row">
              <span>When</span>
              <span>IP</span>
              <span>Page</span>
            </div>
            {recent.map((visit, index) => (
              <div className="visit-row three" role="row" key={`${visit.created_at}-${index}`}>
                <span>{stamp(visit.created_at)}</span>
                <span className="font-mono-os">{visit.ip || "unknown"}</span>
                <span>{visit.path || "/"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && visitors.length === 0 && (
        <div className="surface px-6 py-8 text-[var(--muted)]">No visits recorded yet.</div>
      )}
    </div>
  );
}
