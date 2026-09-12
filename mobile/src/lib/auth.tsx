import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import { apiGet, apiSend } from "./api";

export type Viewer = {
  userId: string;
  email: string | null;
  username: string | null;
  displayName: string;
  isAdmin: boolean;
  needsUsername: boolean;
};

type AuthValue = {
  viewer: Viewer | null;
  loading: boolean;
  signedIn: boolean;
  refresh: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  claimUsername: (username: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setViewer(null);
      setLoading(false);
      return;
    }
    try {
      setViewer(await apiGet<Viewer>("/api/auth/me"));
    } catch {
      setViewer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Sign-in, sign-out and token refresh all change who the app is for.
    const { data } = supabase.auth.onAuthStateChange(() => void refresh());
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      // Resolving a username to an account happens server-side, so the mapping
      // from username to email is never exposed to the client.
      const result = await apiSend<{ accessToken: string; refreshToken: string }>("/api/auth/signin", "POST", {
        identifier,
        password,
      });
      const { error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) throw new Error(error.message);
      await refresh();
    },
    [refresh],
  );

  const signUp = useCallback(async (username: string, email: string, password: string) => {
    const check = await apiGet<{ available: boolean; error?: string }>(
      `/api/auth/username?username=${encodeURIComponent(username)}`,
    );
    if (!check.available) throw new Error(check.error || "That username is taken.");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) throw new Error(error.message);
    return `Account created as ${username}. Check your email if confirmation is on, then sign in.`;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setViewer(null);
  }, []);

  const claimUsername = useCallback(
    async (username: string) => {
      await apiSend("/api/auth/username", "POST", { username });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<AuthValue>(
    () => ({ viewer, loading, signedIn: Boolean(viewer), refresh, signIn, signUp, signOut, claimUsername }),
    [viewer, loading, refresh, signIn, signUp, signOut, claimUsername],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
