import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";

const SUGGESTIONS = [
  "Suggest a memory prompt for today",
  "Summarize this week’s moments",
  "Find a short wellness idea",
];

export function AssistantScreen() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "I can help with prompts, recaps, and reviewed tips. I can’t diagnose, dose medicine, or say a baby is healthy or delayed.",
    },
  ]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setThread((current) => [
      ...current,
      { role: "user", text: trimmed },
      {
        role: "assistant",
        text: "UI preview only. When backend AI is connected, answers will cite reviewed BumpAtlas content.",
      },
    ]);
    setMessage("");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <AppText weight="semibold" tone="secondary">
            Close
          </AppText>
        </Pressable>
        <AppText weight="semibold">Berry</AppText>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
          {thread.map((item, index) => (
            <View
              key={`${item.role}-${index}`}
              style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}
            >
              <AppText
                variant="bodySmall"
                tone={item.role === "user" ? "inverse" : "primary"}
              >
                {item.text}
              </AppText>
            </View>
          ))}

          <View style={styles.suggestions}>
            {SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion}
                style={styles.suggestion}
                onPress={() => send(suggestion)}
              >
                <AppText variant="caption" weight="semibold">
                  {suggestion}
                </AppText>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Ask something calm..."
            placeholderTextColor={colors.text.muted}
            style={styles.input}
          />
          <Button onPress={() => send(message)} disabled={message.trim().length === 0}>
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  spacer: {
    width: 48,
  },
  thread: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.brand.peach,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  suggestions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  suggestion: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: "flex-start",
  },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
  },
});
