"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

let tokenWatcherWired = false;

/**
 * Realtime authorises the socket with the access token it was last given. That
 * token expires (an hour by default), and the SDK refreshing it does NOT
 * re-authorise the socket — subscriptions then go quiet with no error, and only
 * come back when the component remounts.
 *
 * Calling this before subscribing sets the current token and, once per page,
 * wires a listener that pushes every refreshed token back into realtime.
 */
export async function primeRealtimeAuth(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || "";
  if (token) await supabase.realtime.setAuth(token);

  if (!tokenWatcherWired) {
    tokenWatcherWired = true;
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) void supabase.realtime.setAuth(session.access_token);
    });
  }

  return token;
}

/** Channel states that mean we stopped receiving and should rejoin. */
export function isDeadChannelStatus(status: string) {
  return status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED";
}
