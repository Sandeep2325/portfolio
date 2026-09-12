import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { apiGet, apiSend } from "../../src/lib/api";
import { useAuth } from "../../src/lib/auth";
import { Notice } from "../../src/components/ui";
import { theme } from "../../src/lib/theme";
import type { ThingsPost } from "../../src/lib/types";

/** The public posts feed, same content and actions as the web Things app. */
export default function Things() {
  const { viewer } = useAuth();
  const [posts, setPosts] = useState<ThingsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiGet<{ posts: ThingsPost[] }>("/api/things");
      setPosts(payload.posts || []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function comment(postId: number) {
    const body = (drafts[postId] || "").trim();
    if (!body || busyId === postId) return;
    setBusyId(postId);
    try {
      const result = await apiSend<{ comment: ThingsPost["comments"][number] }>("/api/things/comments", "POST", {
        postId,
        body,
      });
      setPosts((current) =>
        current.map((post) => (post.id === postId ? { ...post, comments: [...post.comments, result.comment] } : post)),
      );
      setDrafts((current) => ({ ...current, [postId]: "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not comment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Notice text={error} />
      <FlatList
        data={posts}
        keyExtractor={(post) => String(post.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={theme.primary} />}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        ListEmptyComponent={
          loading ? null : <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>No posts yet.</Text>
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: theme.surface, borderRadius: theme.radius, overflow: "hidden" }}>
            <View style={{ padding: 14, gap: 6 }}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: "800" }}>{item.title}</Text>
              <Text style={{ color: theme.inkSoft, fontSize: 14, lineHeight: 20 }}>{item.body}</Text>
              <Text style={{ color: theme.muted, fontSize: 11 }}>
                {new Date(item.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </Text>
            </View>

            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={{ width: "100%", height: 220 }} resizeMode="cover" />
            )}

            <View style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {item.likes.length} like{item.likes.length === 1 ? "" : "s"} · {item.comments.length} comment
                {item.comments.length === 1 ? "" : "s"}
              </Text>

              {item.comments.map((entry) => (
                <View key={entry.id} style={{ flexDirection: "row", gap: 8 }}>
                  <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "700" }}>{entry.author_name}</Text>
                  <Text style={{ color: theme.inkSoft, fontSize: 13, flex: 1 }}>{entry.body}</Text>
                </View>
              ))}

              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <TextInput
                  value={drafts[item.id] || ""}
                  onChangeText={(value) => setDrafts((current) => ({ ...current, [item.id]: value }))}
                  placeholder={viewer ? `Comment as ${viewer.displayName}` : "Comment as Ghost"}
                  placeholderTextColor={theme.muted}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(120,130,160,0.12)",
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    color: theme.text,
                    fontSize: 13,
                  }}
                />
                <Pressable onPress={() => void comment(item.id)} disabled={busyId === item.id}>
                  <Text style={{ color: theme.primary, fontWeight: "700" }}>Send</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}
