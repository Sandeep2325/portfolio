import { NextResponse } from "next/server";
import { getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { getClientIp, resolveAnonVisitor, setVisitorCookie } from "@/lib/visitor-server";

/** Records one page view. Called once per session by the OS shell. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false });

  try {
    const { path, referrer } = (await request.json().catch(() => ({}))) as { path?: string; referrer?: string };
    const user = await getAuthenticatedUser(request);
    const { visitor, issuedToken } = await resolveAnonVisitor(request, { create: true });

    await createServerSupabaseClient().from("visits").insert({
      ip: getClientIp(request),
      visitor_token: visitor?.token || null,
      user_id: user?.id || null,
      path: (path || "/").slice(0, 200),
      referrer: (referrer || "").slice(0, 300) || null,
      user_agent: request.headers.get("user-agent")?.slice(0, 400) || null,
    });

    const response = NextResponse.json({ ok: true });
    if (issuedToken) setVisitorCookie(response, issuedToken);
    return response;
  } catch {
    // Analytics must never break a page load.
    return NextResponse.json({ ok: false });
  }
}

type VisitRow = {
  ip: string | null;
  visitor_token: string | null;
  user_id: string | null;
  path: string | null;
  referrer: string | null;
  user_agent: string | null;
  created_at: string;
};

/** Visit report. Super admin only — this exposes raw IP addresses. */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!(await isSuperAdmin(user.id))) {
    return NextResponse.json({ error: "Only the portfolio owner can view visits." }, { status: 403 });
  }

  try {
    const { data, error } = await createServerSupabaseClient()
      .from("visits")
      .select("ip, visitor_token, user_id, path, referrer, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []) as VisitRow[];
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Group by IP so the owner sees "who, how often, and when".
    const byIp = new Map<string, { ip: string; visits: number; firstSeen: string; lastSeen: string; paths: Set<string> }>();
    for (const row of rows) {
      const key = row.ip || "unknown";
      const existing = byIp.get(key);
      if (existing) {
        existing.visits += 1;
        if (row.created_at < existing.firstSeen) existing.firstSeen = row.created_at;
        if (row.created_at > existing.lastSeen) existing.lastSeen = row.created_at;
        if (row.path) existing.paths.add(row.path);
      } else {
        byIp.set(key, {
          ip: key,
          visits: 1,
          firstSeen: row.created_at,
          lastSeen: row.created_at,
          paths: new Set(row.path ? [row.path] : []),
        });
      }
    }

    const visitors = [...byIp.values()]
      .map((entry) => ({ ...entry, paths: [...entry.paths].slice(0, 8) }))
      .sort((left, right) => right.lastSeen.localeCompare(left.lastSeen));

    return NextResponse.json({
      totals: {
        visits: rows.length,
        uniqueIps: byIp.size,
        last24h: rows.filter((row) => now - new Date(row.created_at).getTime() < dayMs).length,
        last7d: rows.filter((row) => now - new Date(row.created_at).getTime() < 7 * dayMs).length,
      },
      visitors,
      recent: rows.slice(0, 100),
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
