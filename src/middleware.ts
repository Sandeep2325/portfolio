import { NextResponse, type NextRequest } from "next/server";

/**
 * CORS for the API, so a separate client (the Expo app running on web, or a
 * deployed mobile web build) can reach it.
 *
 * Credentials are deliberately NOT allowed: authentication here is a Bearer
 * token, which a cross-origin client can send freely, while the cookie-based
 * anonymous-visitor identity stays same-origin only.
 */
const DEV_ORIGINS = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  // Expo dev servers are reached over the LAN from a phone.
  /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
  /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
];

function allowed(origin: string) {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production") return DEV_ORIGINS.some((pattern) => pattern.test(origin));
  return false;
}

function withCors(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !allowed(origin)) return NextResponse.next();

  if (request.method === "OPTIONS") {
    return withCors(new NextResponse(null, { status: 204 }), origin);
  }
  return withCors(NextResponse.next(), origin);
}

export const config = { matcher: "/api/:path*" };
