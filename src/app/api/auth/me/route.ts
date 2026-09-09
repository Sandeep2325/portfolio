import { NextResponse } from "next/server";
import { getAuthenticatedUser, getUserDisplayName, isSuperAdmin } from "@/lib/auth-server";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const isAdmin = await isSuperAdmin(user.id);
  const displayName = await getUserDisplayName(user);

  return NextResponse.json({
    email: user.email,
    displayName,
    isAdmin,
  });
}
