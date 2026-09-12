import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { theme } from "../lib/theme";

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.inkSoft, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        style={{
          borderWidth: 1,
          borderColor: theme.line,
          borderRadius: 10,
          backgroundColor: "rgba(120,130,160,0.12)",
          color: theme.text,
          paddingHorizontal: 12,
          paddingVertical: 11,
          fontSize: 15,
        }}
        {...props}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  busy?: boolean;
  disabled?: boolean;
}) {
  const off = busy || disabled;
  const background = variant === "primary" ? theme.primary : variant === "danger" ? theme.red : "transparent";
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={{
        opacity: off ? 0.55 : 1,
        backgroundColor: background,
        borderWidth: variant === "ghost" ? 1 : 0,
        borderColor: theme.line,
        borderRadius: 999,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {busy && <ActivityIndicator size="small" color={variant === "ghost" ? theme.text : theme.bg} />}
      <Text
        style={{
          color: variant === "ghost" ? theme.text : "#08121f",
          fontWeight: "700",
          fontSize: 15,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Notice({ text, tone = "error" }: { text: string; tone?: "error" | "ok" }) {
  if (!text) return null;
  return <Text style={{ color: tone === "ok" ? theme.green : theme.red, fontSize: 13 }}>{text}</Text>;
}

export function Avatar({ label, size = 44, tint }: { label: string; size?: number; tint?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tint || "rgba(77,168,255,0.25)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: theme.text, fontWeight: "700", fontSize: size * 0.38 }}>
        {(label || "?").slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
