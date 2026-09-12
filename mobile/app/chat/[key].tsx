import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from "expo-audio";
import { useAuth } from "../../src/lib/auth";
import { useMessages } from "../../src/lib/useMessages";
import { useConnections } from "../../src/lib/useConnections";
import { apiSend, apiUpload } from "../../src/lib/api";
import { MessageBubble } from "../../src/components/MessageBubble";
import { Button, Notice } from "../../src/components/ui";
import { theme } from "../../src/lib/theme";
import { threadKeyOf, type Message } from "../../src/lib/types";

type Pending = { uri: string; name: string; mime: string; kind: "image" | "file" | "audio"; durationMs?: number };

export default function ChatThread() {
  const params = useLocalSearchParams<{ key: string; title?: string; peerId?: string }>();
  const threadKey = String(params.key || "");
  const peerId = String(params.peerId || "");
  const title = String(params.title || "Chat");

  const { signedIn, viewer } = useAuth();
  const { messages, setMessages, labels, userId, admin, owner, isIncoming, catchUp } = useMessages(signedIn);
  const connections = useConnections(signedIn);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const recordStartedAt = useRef(0);
  const optimisticSeq = useRef(0);

  const thread = useMemo(
    () => messages.filter((message) => threadKeyOf(message) === threadKey),
    [messages, threadKey],
  );

  const spectating = useMemo(() => {
    if (!thread.length || admin === false) return false;
    const ids = thread.flatMap((m) => [m.sender_id, m.recipient_id, m.anon_visitor_id]).filter(Boolean);
    return !ids.includes(userId);
  }, [thread, userId, admin]);

  // The owner is exempt from the connection gate in both directions.
  const peerIsOwner = Boolean(peerId && peerId === owner?.id);
  const gateState = peerId && !viewer?.isAdmin && !peerIsOwner ? connections.stateFor(peerId) : "connected";
  const needsConnection = gateState !== "connected";
  const connection = peerId ? connections.connectionFor(peerId) : null;

  // Mark the peer's messages read whenever this thread is open.
  useEffect(() => {
    if (!peerId || spectating) return;
    const unread = thread.filter((message) => isIncoming(message) && !message.read_at);
    if (unread.length === 0) return;
    void apiSend("/api/messages/read", "POST", { peerId }).then(() => {
      const ids = new Set(unread.map((message) => message.id));
      setMessages((current) =>
        current.map((item) => (ids.has(item.id) ? { ...item, read_at: new Date().toISOString() } : item)),
      );
    }).catch(() => undefined);
  }, [thread, peerId, spectating, isIncoming, setMessages]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPending({
      uri: asset.uri,
      name: asset.fileName || "photo.jpg",
      mime: asset.mimeType || "image/jpeg",
      kind: "image",
    });
  }, []);

  const pickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPending({
      uri: asset.uri,
      name: asset.name,
      mime: asset.mimeType || "application/octet-stream",
      kind: "file",
    });
  }, []);

  const startRecording = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setError("Microphone permission is needed for voice notes.");
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
    recordStartedAt.current = Date.now();
    setRecording(true);
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    await recorder.stop();
    setRecording(false);
    if (!recorder.uri) return;
    setPending({
      uri: recorder.uri,
      name: "voice-message.m4a",
      mime: "audio/m4a",
      kind: "audio",
      durationMs: Date.now() - recordStartedAt.current,
    });
  }, [recorder]);

  async function send() {
    const text = draft.trim();
    if (sending || (!text && !pending)) return;

    setSending(true);
    setError("");

    optimisticSeq.current -= 1;
    const optimisticId = optimisticSeq.current;
    const optimistic: Message = {
      id: optimisticId,
      sender_id: userId,
      recipient_id: peerId,
      body: text || " ",
      created_at: new Date().toISOString(),
      status: "sending",
      reply_to_id: replyTo?.id ?? null,
      attachment: pending
        ? {
            url: pending.uri,
            kind: pending.kind,
            name: pending.name,
            mime: pending.mime,
            size: 0,
            durationMs: pending.durationMs ?? null,
          }
        : null,
    };
    setMessages((current) => [...current, optimistic]);
    const attachment = pending;
    const quoted = replyTo;
    setDraft("");
    setPending(null);
    setReplyTo(null);

    try {
      const form = new FormData();
      form.append("body", text);
      form.append("recipientId", peerId);
      if (quoted) form.append("replyToId", String(quoted.id));
      if (attachment) {
        if (attachment.durationMs) form.append("durationMs", String(attachment.durationMs));
        // React Native accepts this shape as a multipart file part.
        form.append("attachment", {
          uri: attachment.uri,
          name: attachment.name,
          type: attachment.mime,
        } as unknown as Blob);
      }

      const saved = await apiUpload<{ message: Message }>("/api/messages", form);
      setMessages((current) => {
        const withoutOptimistic = current.filter((item) => item.id !== optimisticId);
        return withoutOptimistic.some((item) => item.id === saved.message.id)
          ? withoutOptimistic
          : [...withoutOptimistic, saved.message];
      });
      void catchUp();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send.");
      setMessages((current) =>
        current.map((item) => (item.id === optimisticId ? { ...item, status: "failed" } : item)),
      );
    } finally {
      setSending(false);
    }
  }

  function onLongPress(message: Message) {
    if (message.id < 0) return;
    const options: { text: string; onPress?: () => void; style?: "cancel" | "destructive" }[] = [
      { text: "Reply", onPress: () => setReplyTo(message) },
      {
        text: "Delete for me",
        style: "destructive",
        onPress: () => void remove(message.id, "me"),
      },
    ];
    const mine = !isIncoming(message);
    if (mine || viewer?.isAdmin) {
      options.push({ text: "Delete for everyone", style: "destructive", onPress: () => void remove(message.id, "everyone") });
    }
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Message", undefined, options);
  }

  async function remove(messageId: number, scope: "me" | "everyone") {
    try {
      await apiSend("/api/messages", "DELETE", { messageId, scope });
      if (scope === "me") setMessages((current) => current.filter((item) => item.id !== messageId));
      else
        setMessages((current) =>
          current.map((item) =>
            item.id === messageId
              ? { ...item, deleted_for_everyone_at: new Date().toISOString(), body: " ", attachment: null }
              : item,
          ),
        );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete.");
    }
  }

  const composerDisabled = spectating || needsConnection;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title }} />

      <FlatList
        ref={listRef}
        data={thread}
        keyExtractor={(message) => String(message.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>No messages yet. Say hello.</Text>
        }
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            outgoing={spectating ? false : !isIncoming(item)}
            senderLabel={spectating ? labels[item.sender_id || item.anon_visitor_id || ""] || "Unknown" : undefined}
            onLongPress={() => onLongPress(item)}
          />
        )}
      />

      <Notice text={error} />

      {spectating ? (
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.line }}>
          <Text style={{ color: theme.muted, textAlign: "center", fontSize: 13 }}>
            You are viewing this conversation as the owner. Replying is disabled.
          </Text>
        </View>
      ) : needsConnection ? (
        <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: theme.line }}>
          <Text style={{ color: theme.text, fontWeight: "700", textAlign: "center" }}>
            {gateState === "awaiting-them"
              ? `Waiting for ${title} to accept`
              : gateState === "awaiting-you"
                ? `${title} wants to connect`
                : `Connect with ${title} to start messaging`}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
            You can only message people you are connected with.
          </Text>
          {gateState === "awaiting-you" && connection ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button label="Accept" onPress={() => void connections.respond(connection.id, "accept")} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Decline" variant="ghost" onPress={() => void connections.respond(connection.id, "decline")} />
              </View>
            </View>
          ) : gateState === "awaiting-them" && connection ? (
            <Button label="Withdraw request" variant="ghost" onPress={() => void connections.remove(connection.id)} />
          ) : (
            <Button
              label={gateState === "declined" ? "Ask again" : "Send connection request"}
              onPress={() => void connections.request(peerId)}
            />
          )}
        </View>
      ) : (
        <View style={{ borderTopWidth: 1, borderTopColor: theme.line, padding: 10, gap: 8 }}>
          {replyTo && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(77,168,255,0.10)", borderRadius: 8, padding: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.primary, fontSize: 11, fontWeight: "700" }}>Replying</Text>
                <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>
                  {replyTo.body.trim() || "Attachment"}
                </Text>
              </View>
              <Pressable onPress={() => setReplyTo(null)}>
                <Text style={{ color: theme.muted, fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
          )}

          {pending && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.surface, borderRadius: 8, padding: 8 }}>
              <Text style={{ fontSize: 16 }}>{pending.kind === "image" ? "🖼" : pending.kind === "audio" ? "🎤" : "📎"}</Text>
              <Text numberOfLines={1} style={{ color: theme.muted, flex: 1, fontSize: 13 }}>
                {pending.kind === "audio" ? "Voice message ready" : pending.name}
              </Text>
              <Pressable onPress={() => setPending(null)}>
                <Text style={{ color: theme.red, fontSize: 13, fontWeight: "700" }}>Remove</Text>
              </Pressable>
            </View>
          )}

          {recording ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.red }} />
              <Text style={{ color: theme.text, flex: 1, fontWeight: "600" }}>Recording…</Text>
              <Button label="Stop" onPress={() => void stopRecording()} />
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
              <Pressable onPress={() => void pickImage()} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20 }}>🖼</Text>
              </Pressable>
              <Pressable onPress={() => void pickFile()} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20 }}>📎</Text>
              </Pressable>
              <Pressable onPress={() => void startRecording()} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20 }}>🎤</Text>
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Message"
                placeholderTextColor={theme.muted}
                multiline
                style={{
                  flex: 1,
                  maxHeight: 110,
                  minHeight: 40,
                  backgroundColor: theme.surface,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingTop: 10,
                  paddingBottom: 10,
                  color: theme.text,
                }}
              />
              <Pressable
                onPress={() => void send()}
                disabled={sending || composerDisabled}
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  opacity: sending ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#08121f", fontWeight: "800" }}>Send</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
