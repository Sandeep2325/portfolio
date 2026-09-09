import { NextResponse } from "next/server";
import { getAuthenticatedUser, getProfile, resolveDisplayName } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { validateUsername } from "@/lib/username";

/** Postgres unique-violation, raised when two people claim a name at once. */
const UNIQUE_VIOLATION = "23505";

async function isTaken(username: string, exceptUserId?: string) {
  const { data, error } = await createServerSupabaseClient()
    .from("profiles")
    .select("id")
    .eq("username_lower", username.toLowerCase())
    .maybeSingle();

  // Never treat a failed lookup as "free" — that would hand out a name that
  // the unique index then rejects, or that belongs to someone else.
  if (error) throw new Error(`Username lookup failed: ${error.message}`);

  if (!data) return false;
  return data.id !== exceptUserId;
}

/** Availability check for the signup form, before an account exists. */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Accounts are not configured." }, { status: 500 });

  const requested = new URL(request.url).searchParams.get("username");
  const check = validateUsername(requested);
  if (!check.ok) return NextResponse.json({ available: false, error: check.error });

  try {
    const taken = await isTaken(check.value);
    return NextResponse.json({
      available: !taken,
      username: check.value,
      error: taken ? "That username is taken." : null,
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}

/** Claims or changes the signed-in user's username. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Accounts are not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { username } = (await request.json()) as { username?: string };
  const check = validateUsername(username);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  try {
    if (await isTaken(check.value, user.id)) {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }

    const profile = await getProfile(user.id);
    const displayName = resolveDisplayName(
      {
        id: user.id,
        display_name: profile?.display_name ?? null,
        username: check.value,
        is_super_admin: Boolean(profile?.is_super_admin),
        last_seen_at: profile?.last_seen_at ?? null,
      },
      user.email,
    );

    const { error } = await createServerSupabaseClient()
      .from("profiles")
      .update({ username: check.value, display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      // Lost the race between the check above and this write.
      if (error.code === UNIQUE_VIOLATION) {
        return NextResponse.json({ error: "That username was just taken." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ username: check.value, displayName });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
