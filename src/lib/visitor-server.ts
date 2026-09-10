import { createHash, randomUUID } from "crypto";
import type { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export const VISITOR_COOKIE = "sg_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type AnonVisitor = {
  id: string;
  token: string;
  ip: string | null;
  label: string;
  first_seen_at: string;
  last_seen_at: string;
};

/**
 * Best-effort client IP. Behind Vercel/most proxies the real address is the
 * first entry of x-forwarded-for; the rest are hops we do not trust.
 */
export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || null;
}

export function readVisitorToken(request: Request) {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`));
  return match?.[1] || null;
}

export function setVisitorCookie(response: NextResponse, token: string) {
  response.cookies.set(VISITOR_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}

/** Short, stable, non-reversible handle like "Guest 4f2a91". */
function labelFor(seed: string) {
  return `Guest ${createHash("sha256").update(seed).digest("hex").slice(0, 6)}`;
}

/**
 * Finds (or creates) the anonymous visitor behind a request.
 *
 * The cookie token is authoritative when present. Falling back to the IP is
 * what makes a first message work before any cookie exists, and keeps the
 * identifier the owner asked for.
 */
export async function resolveAnonVisitor(
  request: Request,
  options: { create?: boolean } = {},
): Promise<{ visitor: AnonVisitor | null; issuedToken: string | null }> {
  const supabase = createServerSupabaseClient();
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 400) || null;
  const cookieToken = readVisitorToken(request);

  if (cookieToken) {
    const { data } = await supabase.from("anon_visitors").select("*").eq("token", cookieToken).maybeSingle();
    if (data) {
      await supabase
        .from("anon_visitors")
        .update({ last_seen_at: new Date().toISOString(), ip, user_agent: userAgent })
        .eq("id", data.id);
      return { visitor: { ...(data as AnonVisitor), ip }, issuedToken: null };
    }
  }

  // No usable cookie: reuse the most recent visitor from this IP so a reply
  // lands in the same thread, otherwise start a new one.
  if (ip) {
    const { data } = await supabase
      .from("anon_visitors")
      .select("*")
      .eq("ip", ip)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      await supabase
        .from("anon_visitors")
        .update({ last_seen_at: new Date().toISOString(), user_agent: userAgent })
        .eq("id", data.id);
      return { visitor: data as AnonVisitor, issuedToken: (data as AnonVisitor).token };
    }
  }

  if (!options.create) return { visitor: null, issuedToken: null };

  const token = randomUUID();
  const { data, error } = await supabase
    .from("anon_visitors")
    .insert({ token, ip, user_agent: userAgent, label: labelFor(token) })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { visitor: data as AnonVisitor, issuedToken: token };
}
