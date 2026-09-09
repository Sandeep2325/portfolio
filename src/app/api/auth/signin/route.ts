import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseBrowserConfig, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Deliberately identical for "no such account" and "wrong password", so a
 * username cannot be used to probe which accounts exist.
 */
const GENERIC_FAILURE = "Incorrect username/email or password.";

async function emailForUsername(username: string) {
  const supabase = createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username_lower", username.toLowerCase())
    .maybeSingle();

  if (!profile?.id) return null;
  const { data, error } = await supabase.auth.admin.getUserById(profile.id as string);
  return error ? null : data.user?.email || null;
}

/**
 * Signs in with either a username or an email. Resolving the username happens
 * here rather than in the browser so the mapping is never exposed.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Accounts are not configured." }, { status: 500 });

  const browserConfig = getSupabaseBrowserConfig();
  if (!browserConfig) return NextResponse.json({ error: "Accounts are not configured." }, { status: 500 });

  const { identifier, password } = (await request.json()) as { identifier?: string; password?: string };
  const trimmed = (identifier || "").trim();
  if (!trimmed || !password) return NextResponse.json({ error: "Enter your details." }, { status: 400 });

  try {
    const email = trimmed.includes("@") ? trimmed : await emailForUsername(trimmed);
    if (!email) return NextResponse.json({ error: GENERIC_FAILURE }, { status: 401 });

    // Sign in with the public key, so this behaves exactly like a browser login.
    const anon = createClient(browserConfig.url, browserConfig.key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anon.auth.signInWithPassword({ email, password });

    if (error || !data.session) return NextResponse.json({ error: GENERIC_FAILURE }, { status: 401 });

    return NextResponse.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
