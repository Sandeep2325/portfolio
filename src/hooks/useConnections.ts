"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { browserSupabase } from "@/lib/supabase-browser";
import { primeRealtimeAuth, isDeadChannelStatus } from "@/lib/realtime";

export type Connection = {
  id: string;
  peerId: string;
  peerLabel: string;
  status: "pending" | "accepted" | "declined";
  outgoing: boolean;
  createdAt: string;
};

export type PeerState = "none" | "connected" | "awaiting-them" | "awaiting-you" | "declined";

/** Connection requests and accepted links for the signed-in viewer. */
export function useConnections(enabled: boolean) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const token = useCallback(async () => {
    const { data } = (await browserSupabase?.auth.getSession()) || { data: { session: null } };
    return data.session?.access_token || "";
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;
    const accessToken = await token();
    if (!accessToken) return;
    try {
      const response = await fetch("/api/connections", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = await response.json();
      setConnections(payload.connections || []);
    } catch {
      // Next event retries.
    }
  }, [enabled, token]);

  useEffect(() => {
    void load();
    if (!enabled || !browserSupabase) return;
    const supabase = browserSupabase;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;

    void (async () => {
      await primeRealtimeAuth(supabase);
      if (cancelled) return;
      channel = supabase
        .channel(`connections-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, () => void load())
        .subscribe((status) => {
          if (isDeadChannelStatus(status)) void load();
        });
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled, load]);

  const act = useCallback(
    async (method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, key: string) => {
      setBusyId(key);
      try {
        const accessToken = await token();
        const response = await fetch("/api/connections", {
          method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(body),
        });
        await load();
        return response.ok;
      } finally {
        setBusyId(null);
      }
    },
    [token, load],
  );

  const byPeer = useMemo(() => new Map(connections.map((row) => [row.peerId, row])), [connections]);

  const stateFor = useCallback(
    (peerId: string): PeerState => {
      const row = byPeer.get(peerId);
      if (!row) return "none";
      if (row.status === "accepted") return "connected";
      if (row.status === "declined") return "declined";
      return row.outgoing ? "awaiting-them" : "awaiting-you";
    },
    [byPeer],
  );

  return {
    connections,
    incoming: connections.filter((row) => row.status === "pending" && !row.outgoing),
    outgoing: connections.filter((row) => row.status === "pending" && row.outgoing),
    busyId,
    stateFor,
    connectionFor: (peerId: string) => byPeer.get(peerId) || null,
    request: (userId: string) => act("POST", { userId }, userId),
    respond: (id: string, action: "accept" | "decline") => act("PATCH", { id, action }, id),
    remove: (id: string) => act("DELETE", { id }, id),
    refresh: load,
  };
}
