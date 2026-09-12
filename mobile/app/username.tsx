import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/lib/auth";
import { Button, Field, Notice } from "../src/components/ui";
import { theme } from "../src/lib/theme";

/** Accounts created before usernames existed are prompted to claim one. */
export default function ChooseUsername() {
  const { viewer, claimUsername } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await claimUsername(username.trim());
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save that username.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} style={{ backgroundColor: theme.bg }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "800" }}>Pick a username</Text>
        <Text style={{ color: theme.muted, fontSize: 14 }}>
          Your account still shows as {viewer?.email || "your email"}.
        </Text>
      </View>
      <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" maxLength={20} />
      <Notice text={error} />
      <Button label={busy ? "Saving…" : "Claim username"} onPress={submit} busy={busy} />
      <Button label="Not now" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}
