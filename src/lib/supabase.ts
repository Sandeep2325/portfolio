import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const contactTable = process.env.SUPABASE_CONTACT_TABLE || "contact_submissions";
const assetBucket = process.env.NEXT_PUBLIC_SUPABASE_ASSET_BUCKET || "portfolio-assets";

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function getContactTableName() {
  return contactTable;
}

export function getAssetBucketName() {
  return assetBucket;
}

export function getPublicAssetUrl(path: string) {
  if (!supabaseUrl) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/${assetBucket}/${normalized}`;
}

export function createServerSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
