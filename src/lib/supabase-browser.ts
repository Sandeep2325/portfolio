"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_ASSET_BUCKET || "portfolio-assets";

export const browserSupabase = url && key ? createClient(url, key) : null;

/**
 * Public URL for a stored asset path. Needed on the client because realtime
 * rows arrive straight from Postgres, without the API's derived image_url.
 */
export function publicAssetUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!url) return null;
  return `${url}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;
}
