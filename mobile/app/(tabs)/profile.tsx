import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { Avatar, Button } from "../../src/components/ui";
import { theme } from "../../src/lib/theme";
import { apiBase } from "../../src/lib/api";

export default function Profile() {
  const { viewer, signOut } = useAuth();
  const router = useRouter();

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={{ padding: 20, gap: 20 }}>
      <View style={{ alignItems: "center", gap: 10 }}>
        <Avatar label={viewer?.displayName || "?"} size={76} />
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "800" }}>{viewer?.displayName}</Text>
        {viewer?.isAdmin && (
          <Text style={{ color: theme.accent, fontSize: 12, fontWeight: "800", letterSpacing: 1 }}>OWNER</Text>
        )}
        <Text style={{ color: theme.muted, fontSize: 13 }}>
          {viewer?.username ? `@${viewer.username}` : "No username yet"}
        </Text>
      </View>

      {!viewer?.username && (
        <Button label="Choose a username" onPress={() => router.push("/username")} />
      )}

      <View style={{ backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 6 }}>
        <Text style={{ color: theme.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>CONNECTED TO</Text>
        <Text style={{ color: theme.inkSoft, fontSize: 13 }}>{apiBase || "No API URL configured"}</Text>
      </View>

      <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
    </ScrollView>
  );
}
