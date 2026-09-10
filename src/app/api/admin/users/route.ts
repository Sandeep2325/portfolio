import { NextResponse } from "next/server";
import { getAuthenticatedUser, isSuperAdmin } from "@/lib/auth-server";
import { createServerSupabaseClient, getAssetBucketName, isSupabaseConfigured } from "@/lib/supabase";
import { DM_ATTACHMENT_BUCKET } from "@/lib/attachments";

const UUID = /^[0-9a-f-]{36}$/i;

async function requireOwner(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  if (!(await isSuperAdmin(user.id))) {
    return { error: NextResponse.json({ error: "Only the portfolio owner can manage people." }, { status: 403 }) };
  }
  return { user };
}

/** Accounts and anonymous visitors, with enough context to decide on a delete. */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const guard = await requireOwner(request);
  if (guard.error) return guard.error;

  try {
    const supabase = createServerSupabaseClient();

    const [{ data: profiles }, { data: visitors }, { data: messages }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, is_super_admin, last_seen_at, created_at"),
      supabase.from("anon_visitors").select("id, label, ip, first_seen_at, last_seen_at"),
      supabase.from("direct_messages").select("sender_id, recipient_id, anon_visitor_id"),
    ]);

    // One pass to count messages per participant.
    const counts = new Map<string, number>();
    const bump = (id: string | null | undefined) => {
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    };
    for (const row of messages || []) {
      bump(row.sender_id as string | null);
      bump(row.recipient_id as string | null);
      bump(row.anon_visitor_id as string | null);
    }

    const accounts = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data } = await supabase.auth.admin.getUserById(profile.id as string);
        return {
          id: profile.id as string,
          email: data.user?.email || null,
          username: (profile.username as string | null) || null,
          displayName: (profile.display_name as string | null) || null,
          isAdmin: Boolean(profile.is_super_admin),
          lastSeenAt: (profile.last_seen_at as string | null) || null,
          createdAt: (profile.created_at as string | null) || null,
          messageCount: counts.get(profile.id as string) || 0,
        };
      }),
    );

    return NextResponse.json({
      accounts: accounts.sort((left, right) => Number(right.isAdmin) - Number(left.isAdmin)),
      visitors: (visitors || [])
        .map((visitor) => ({
          id: visitor.id as string,
          label: visitor.label as string,
          ip: (visitor.ip as string | null) || null,
          firstSeenAt: visitor.first_seen_at as string,
          lastSeenAt: visitor.last_seen_at as string,
          messageCount: counts.get(visitor.id as string) || 0,
        }))
        .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt)),
    });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}

/**
 * Removes a person and everything that belongs to them.
 *
 * Foreign keys cascade profiles and direct messages, but storage objects and
 * the denormalised author_name on public posts do not, so both are handled
 * explicitly here.
 */
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const guard = await requireOwner(request);
  if (guard.error) return guard.error;
  const owner = guard.user!;

  const { kind, id, purgePosts } = (await request.json()) as {
    kind?: "account" | "anon";
    id?: string;
    purgePosts?: boolean;
  };

  if ((kind !== "account" && kind !== "anon") || !id || !UUID.test(id)) {
    return NextResponse.json({ error: "Choose someone to delete." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    let displayName: string | null = null;

    if (kind === "account") {
      if (id === owner.id) return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, is_super_admin")
        .eq("id", id)
        .maybeSingle();

      if (!profile) return NextResponse.json({ error: "Account not found." }, { status: 404 });
      if (profile.is_super_admin) {
        return NextResponse.json({ error: "The owner account cannot be deleted." }, { status: 400 });
      }
      displayName = (profile.display_name as string | null) || null;
    }

    // Storage does not cascade, so clear the attachments before the rows go.
    const { data: theirMessages } = await supabase
      .from("direct_messages")
      .select("attachment_bucket, attachment_path")
      .or(kind === "account" ? `sender_id.eq.${id},recipient_id.eq.${id}` : `anon_visitor_id.eq.${id}`)
      .not("attachment_path", "is", null);

    const byBucket = new Map<string, string[]>();
    for (const row of theirMessages || []) {
      const bucket = (row.attachment_bucket as string | null) || DM_ATTACHMENT_BUCKET;
      byBucket.set(bucket, [...(byBucket.get(bucket) || []), row.attachment_path as string]);
    }
    for (const [bucket, paths] of byBucket) {
      await supabase.storage.from(bucket).remove(paths);
    }

    let removedPosts = 0;
    if (purgePosts && displayName) {
      // Public posts only carry a denormalised author_name, so this matches on
      // that. Usernames are unique, which keeps it accurate.
      const { data: community } = await supabase
        .from("community_messages")
        .delete()
        .eq("author_name", displayName)
        .select("id, image_path");
      const { data: comments } = await supabase
        .from("things_comments")
        .delete()
        .eq("author_name", displayName)
        .select("id");

      const images = (community || []).map((row) => row.image_path as string | null).filter((path): path is string => Boolean(path));
      if (images.length > 0) await supabase.storage.from(getAssetBucketName()).remove(images);
      removedPosts = (community || []).length + (comments || []).length;
    }

    if (kind === "account") {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase.from("anon_visitors").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id, kind, removedPosts });
  } catch (caught) {
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Unexpected server error." }, { status: 500 });
  }
}
