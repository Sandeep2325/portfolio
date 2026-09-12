import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { apiGet } from "../../src/lib/api";
import { Button, Field, Notice } from "../../src/components/ui";
import { theme } from "../../src/lib/theme";

const RULES = "3–20 characters: letters, numbers, dot, underscore or hyphen.";
const PATTERN = /^[A-Za-z0-9_.-]{3,20}$/;

export default function SignUp() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [availability, setAvailability] = useState({ ok: false, text: RULES });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Debounced availability check, same endpoint the web signup uses.
  useEffect(() => {
    const value = username.trim();
    if (!value) return setAvailability({ ok: false, text: RULES });
    if (!PATTERN.test(value)) return setAvailability({ ok: false, text: RULES });

    setAvailability({ ok: false, text: "Checking…" });
    const timer = setTimeout(async () => {
      try {
        const result = await apiGet<{ available: boolean; error?: string }>(
          `/api/auth/username?username=${encodeURIComponent(value)}`,
        );
        setAvailability(
          result.available
            ? { ok: true, text: `${value} is available` }
            : { ok: false, text: result.error || "That username is taken." },
        );
      } catch {
        setAvailability({ ok: false, text: "Could not check that username." });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [username]);

  async function submit() {
    if (busy || !availability.ok) return;
    setBusy(true);
    setError("");
    try {
      setNotice(await signUp(username.trim(), email.trim(), password));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 18 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.primary, fontSize: 12, letterSpacing: 2, fontWeight: "700" }}>CREATE ACCOUNT</Text>
          <Text style={{ color: theme.text, fontSize: 28, fontWeight: "800" }}>Pick a username</Text>
          <Text style={{ color: theme.muted, fontSize: 14 }}>It is how you appear on messages and posts.</Text>
        </View>

        <Field
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          placeholder="sandy_dev"
        />
        <Text style={{ color: availability.ok ? theme.green : theme.muted, fontSize: 13 }}>{availability.text}</Text>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />

        <Notice text={error} />
        <Notice text={notice} tone="ok" />
        <Button
          label={busy ? "Creating…" : "Sign up"}
          onPress={submit}
          busy={busy}
          disabled={!availability.ok || !email.trim() || password.length < 6}
        />

        <Link href="/(auth)/sign-in" style={{ color: theme.primary, fontWeight: "600", textAlign: "center" }}>
          Already have an account? Sign in
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
