import { NextResponse } from "next/server";
import { getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  return NextResponse.json({ email: user.email, isAdmin: await isSuperAdmin(user.id) });
}
