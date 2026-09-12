import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/lib/auth";
import { theme } from "../src/lib/theme";

function Gate() {
  const { signedIn, loading, viewer } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    // Send people where they belong, but only when they are in the wrong place,
    // so this never fights with normal navigation.
    if (!signedIn && !inAuth) router.replace("/(auth)/sign-in");
    else if (signedIn && inAuth) router.replace("/(tabs)");
  }, [signedIn, loading, segments, router]);

  useEffect(() => {
    if (viewer?.needsUsername) router.push("/username");
  }, [viewer?.needsUsername, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.surfaceAlt },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[key]" options={{ title: "Chat" }} />
      <Stack.Screen name="username" options={{ title: "Choose a username", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
