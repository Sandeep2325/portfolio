import { NextResponse } from "next/server";
import { getAuthenticatedUser, getProfile, resolveDisplayName } from "@/lib/auth-server";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const profile = await getProfile(user.id);
  const displayName = resolveDisplayName(profile, user.email);

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    username: profile?.username || null,
    displayName,
    isAdmin: Boolean(profile?.is_super_admin),
    // Accounts created before usernames existed get prompted to claim one.
    needsUsername: !profile?.username,
  });
}
