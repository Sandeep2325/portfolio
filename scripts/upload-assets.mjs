import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.NEXT_PUBLIC_SUPABASE_ASSET_BUCKET || "portfolio-assets";

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry);
    const info = await stat(full);

    if (info.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }

  return files;
}

const { error: bucketError } = await supabase.storage.createBucket(bucket, { public: true });
if (bucketError && !bucketError.message.toLowerCase().includes("already")) {
  throw bucketError;
}

const files = await walk("public");

for (const file of files) {
  const buffer = await readFile(file);
  const objectPath = file.replace(/^public\//, "").replace(/\\/g, "/");

  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    upsert: true,
  });

  if (error) {
    throw new Error(`${objectPath}: ${error.message}`);
  }

  console.log(`uploaded ${objectPath}`);
}
