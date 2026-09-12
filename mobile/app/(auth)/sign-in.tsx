import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { Button, Field, Notice } from "../../src/components/ui";
import { theme } from "../../src/lib/theme";

export default function SignIn() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signIn(identifier.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 18 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.primary, fontSize: 12, letterSpacing: 2, fontWeight: "700" }}>SANDEEP MESSENGER</Text>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: "800" }}>Welcome back</Text>
          <Text style={{ color: theme.muted, fontSize: 14 }}>
            Sign in with your username, or the email you signed up with.
          </Text>
        </View>

        <Field
          label="Username or email"
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="sandy_dev"
          textContentType="username"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
        />

        <Notice text={error} />
        <Button label={busy ? "Signing in…" : "Sign in"} onPress={submit} busy={busy} />

        <Link href="/(auth)/sign-up" style={{ color: theme.primary, fontWeight: "600", textAlign: "center" }}>
          New here? Create an account
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
