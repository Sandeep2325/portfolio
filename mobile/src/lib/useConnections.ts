import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiSend } from "./api";
import type { Connection } from "./types";

export type PeerState = "none" | "connected" | "awaiting-them" | "awaiting-you" | "declined";

/** Connection requests and accepted links, mirroring the web rules. */
export function useConnections(enabled: boolean) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const payload = await apiGet<{ connections: Connection[] }>("/api/connections");
      setConnections(payload.connections || []);
    } catch {
      // Leave the last known state in place.
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, key: string) => {
      setBusyId(key);
      try {
        await apiSend("/api/connections", method, body);
        await load();
      } finally {
        setBusyId(null);
      }
    },
    [load],
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
    busyId,
    stateFor,
    connectionFor: (peerId: string) => byPeer.get(peerId) || null,
    request: (userId: string) => act("POST", { userId }, userId),
    respond: (id: string, action: "accept" | "decline") => act("PATCH", { id, action }, id),
    remove: (id: string) => act("DELETE", { id }, id),
    reload: load,
  };
}
