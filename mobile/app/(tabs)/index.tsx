import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { useMessages } from "../../src/lib/useMessages";
import { useConnections } from "../../src/lib/useConnections";
import { apiGet } from "../../src/lib/api";
import { Avatar, Button, Notice } from "../../src/components/ui";
import { theme } from "../../src/lib/theme";
import { relativeTime, type Person, type ThreadSummary } from "../../src/lib/types";

export default function Chats() {
  const { signedIn, viewer } = useAuth();
  const router = useRouter();
  const { threads, loading, error, reload } = useMessages(signedIn);
  const connections = useConnections(signedIn);

  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? threads.filter((thread) => thread.title.toLowerCase().includes(needle)) : threads;
  }, [threads, query]);

  async function openPicker() {
    setPicking(true);
    try {
      const payload = await apiGet<{ people: Person[] }>("/api/users/directory");
      setPeople(payload.people || []);
    } catch {
      setPeople([]);
    }
  }

  function openThread(thread: ThreadSummary) {
    router.push({ pathname: "/chat/[key]", params: { key: thread.key, title: thread.title, peerId: thread.peerId || "" } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flexDirection: "row", gap: 10, padding: 12, alignItems: "center" }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats"
          placeholderTextColor={theme.muted}
          style={{
            flex: 1,
            backgroundColor: theme.surface,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 10,
            color: theme.text,
          }}
        />
        <Pressable
          onPress={openPicker}
          style={{ backgroundColor: theme.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          <Text style={{ color: "#08121f", fontWeight: "700" }}>New</Text>
        </Pressable>
      </View>

      {connections.incoming.length > 0 && (
        <View style={{ backgroundColor: "rgba(77,168,255,0.10)", paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
          <Text style={{ color: theme.primary, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>
            CONNECTION REQUESTS · {connections.incoming.length}
          </Text>
          {connections.incoming.map((request) => (
            <View key={request.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar label={request.peerLabel} size={32} />
              <Text style={{ color: theme.text, flex: 1, fontWeight: "600" }}>{request.peerLabel}</Text>
              <Pressable
                onPress={() => void connections.respond(request.id, "accept")}
                disabled={connections.busyId === request.id}
                style={{ backgroundColor: "rgba(74,222,128,0.22)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Text style={{ color: theme.green, fontWeight: "700", fontSize: 13 }}>Accept</Text>
              </Pressable>
              <Pressable
                onPress={() => void connections.respond(request.id, "decline")}
                disabled={connections.busyId === request.id}
                style={{ paddingHorizontal: 8, paddingVertical: 6 }}
              >
                <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 13 }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Notice text={error} />

      <FlatList
        data={shown}
        keyExtractor={(thread) => thread.key}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} tintColor={theme.primary} />}
        ListEmptyComponent={
          loading ? null : (
            <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>
              No conversations yet. Tap New to start one.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openThread(item)}
            style={{
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.line,
            }}
          >
            <Avatar label={item.title} tint={item.kind === "anon" ? "rgba(155,89,255,0.25)" : undefined} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text numberOfLines={1} style={{ color: theme.text, fontWeight: "700", flex: 1 }}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>{relativeTime(item.lastAt)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 13, flex: 1 }}>
                  {item.subtitle ? `${item.subtitle} · ` : ""}
                  {item.lastBody}
                </Text>
                {item.unread > 0 && (
                  <View style={{ backgroundColor: theme.red, borderRadius: 999, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800", textAlign: "center" }}>
                      {Math.min(99, item.unread)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)} transparent={false}>
        <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: 60, paddingHorizontal: 16, gap: 12 }}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: "800" }}>New message</Text>
          <FlatList
            data={people}
            keyExtractor={(person) => person.id}
            ListEmptyComponent={<Text style={{ color: theme.muted }}>No one to message yet.</Text>}
            renderItem={({ item }) => {
              const state = item.isOwner ? "connected" : connections.stateFor(item.id);
              return (
                <Pressable
                  onPress={() => {
                    setPicking(false);
                    router.push({
                      pathname: "/chat/[key]",
                      params: {
                        key: `pair:${[viewer?.userId || "", item.id].sort().join("|")}`,
                        title: item.label,
                        peerId: item.id,
                      },
                    });
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
                >
                  <Avatar label={item.label} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: "700" }}>{item.label}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>
                      {item.isOwner ? "Always reachable" : state === "connected" ? "Connected" : "Not connected"}
                    </Text>
                  </View>
                  {!item.isOwner && state === "none" && (
                    <Pressable
                      onPress={() => void connections.request(item.id)}
                      style={{ borderWidth: 1, borderColor: theme.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
                    >
                      <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "700" }}>Connect</Text>
                    </Pressable>
                  )}
                  {state === "awaiting-them" && <Text style={{ color: theme.muted, fontSize: 12 }}>Requested</Text>}
                </Pressable>
              );
            }}
          />
          <Button label="Close" variant="ghost" onPress={() => setPicking(false)} />
        </View>
      </Modal>
    </View>
  );
}
