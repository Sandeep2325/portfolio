"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase-browser";

export default function AuthControl() {
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!browserSupabase) return;
    void browserSupabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || null));
    const { data } = browserSupabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email || null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!email) return <Link href="/login" className="auth-link">Sign in</Link>;

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await browserSupabase?.auth.signOut();
      setEmail(null);
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <span className="auth-actions">
      <Link href="/messages" className="auth-link">
        Messages
      </Link>
      <button className="logout-button" disabled={loggingOut} onClick={() => void logout()}>
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </span>
  );
}
