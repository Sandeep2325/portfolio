import { Image, Linking, Pressable, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { theme } from "../lib/theme";
import { callSummary, type Message } from "../lib/types";

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/** Voice note player. Mounted per audio message, so each keeps its own position. */
function VoiceNote({ url, durationMs }: { url: string; durationMs: number | null }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const total = status.duration || (durationMs ? durationMs / 1000 : 0);

  return (
    <Pressable
      onPress={() => (status.playing ? player.pause() : player.play())}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "rgba(77,168,255,0.25)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: theme.primary, fontSize: 15 }}>{status.playing ? "❚❚" : "▶"}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)" }}>
          <View
            style={{
              height: 3,
              borderRadius: 2,
              backgroundColor: theme.primary,
              width: total ? `${Math.min(100, (status.currentTime / total) * 100)}%` : "0%",
            }}
          />
        </View>
        <Text style={{ color: theme.muted, fontSize: 11 }}>{formatClock(status.currentTime || 0)} / {formatClock(total)}</Text>
      </View>
    </Pressable>
  );
}

export function MessageBubble({
  message,
  outgoing,
  senderLabel,
  onLongPress,
  onPressQuote,
}: {
  message: Message;
  outgoing: boolean;
  senderLabel?: string;
  onLongPress: () => void;
  onPressQuote?: (id: number) => void;
}) {
  const call = callSummary(message);
  if (call) {
    const missed = message.call_status !== "completed";
    return (
      <View style={{ alignSelf: "center", marginVertical: 6 }}>
        <Text style={{ color: missed ? theme.red : theme.inkSoft, fontSize: 12 }}>
          {outgoing ? "↗" : "↙"} {call}
        </Text>
      </View>
    );
  }

  const removed = Boolean(message.deleted_for_everyone_at);
  const attachment = message.attachment;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={{
        alignSelf: outgoing ? "flex-end" : "flex-start",
        maxWidth: "82%",
        marginVertical: 3,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: outgoing ? theme.bubbleOut : theme.bubbleIn,
        borderWidth: removed ? 1 : 0,
        borderColor: theme.line,
        borderStyle: removed ? "dashed" : "solid",
      }}
    >
      {senderLabel && <Text style={{ color: theme.primary, fontSize: 11, fontWeight: "800" }}>{senderLabel}</Text>}

      {message.reply_to && !removed && (
        <Pressable
          onPress={() => onPressQuote?.(message.reply_to!.id)}
          style={{
            borderLeftWidth: 3,
            borderLeftColor: theme.primary,
            backgroundColor: "rgba(0,0,0,0.25)",
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginBottom: 6,
          }}
        >
          <Text style={{ color: theme.primary, fontSize: 11, fontWeight: "700" }}>
            {message.reply_to.outgoing ? "You" : senderLabel || "Them"}
          </Text>
          <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12 }}>
            {message.reply_to.excerpt}
          </Text>
        </Pressable>
      )}

      {removed ? (
        <Text style={{ color: theme.muted, fontStyle: "italic", fontSize: 14 }}>This message was deleted</Text>
      ) : (
        <>
          {message.body.trim() ? <Text style={{ color: theme.text, fontSize: 15 }}>{message.body}</Text> : null}

          {attachment?.url && attachment.kind === "image" && (
            <Image
              source={{ uri: attachment.url }}
              style={{ width: 220, height: 165, borderRadius: 8, marginTop: 6, backgroundColor: "#000" }}
              resizeMode="cover"
            />
          )}

          {attachment?.url && attachment.kind === "audio" && (
            <VoiceNote url={attachment.url} durationMs={attachment.durationMs} />
          )}

          {attachment?.url && attachment.kind === "file" && (
            <Pressable
              onPress={() => Linking.openURL(attachment.url!)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginTop: 6,
                borderWidth: 1,
                borderColor: theme.line,
                borderRadius: 8,
                padding: 8,
              }}
            >
              <Text style={{ fontSize: 18 }}>📎</Text>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>
                  {attachment.name}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>
                  {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : "Tap to open"}
                </Text>
              </View>
            </Pressable>
          )}
        </>
      )}

      <Text style={{ color: theme.muted, fontSize: 10, marginTop: 4, alignSelf: "flex-end" }}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        {outgoing && !removed
          ? message.status === "sending"
            ? " · Sending…"
            : message.status === "failed"
              ? " · Not sent"
              : message.read_at
                ? " ✓✓"
                : " ✓"
          : ""}
      </Text>
    </Pressable>
  );
}
