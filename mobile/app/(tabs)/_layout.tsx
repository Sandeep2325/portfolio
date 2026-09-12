import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { theme } from "../../src/lib/theme";

/** Emoji keeps the tab bar dependency-free and identical on both platforms. */
function Icon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.surfaceAlt },
        headerTintColor: theme.text,
        tabBarStyle: { backgroundColor: theme.surfaceAlt, borderTopColor: theme.line },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Chats", tabBarIcon: ({ color }) => <Icon glyph="💬" color={color} /> }}
      />
      <Tabs.Screen
        name="things"
        options={{ title: "Things", tabBarIcon: ({ color }) => <Icon glyph="📰" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "You", tabBarIcon: ({ color }) => <Icon glyph="👤" color={color} /> }}
      />
    </Tabs>
  );
}
