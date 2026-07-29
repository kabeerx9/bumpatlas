import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppText,
  Atmosphere,
  Button,
  colors,
  radius,
  spacing,
} from "@/design-system";
import { mockToday } from "@/features/mock/demo-data";

export function CaptureScreen() {
  const router = useRouter();
  const [body, setBody] = useState("");

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Feather name="x" size={22} color={colors.brand.ink} />
            </Pressable>
            <AppText weight="semibold">Capture</AppText>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.body}>
            <AppText variant="label" tone="secondary">
              Today’s prompt
            </AppText>
            <AppText variant="heading" style={styles.prompt}>
              {mockToday.memoryPrompt}
            </AppText>

            <Pressable style={styles.photoBox}>
              <View style={styles.cameraCircle}>
                <Feather name="camera" size={22} color={colors.brand.terracotta} />
              </View>
              <AppText weight="semibold">Add a photo</AppText>
              <AppText variant="caption" tone="secondary">
                Make it feel like a page from the baby book
              </AppText>
            </Pressable>

            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="A short note to remember..."
              placeholderTextColor={colors.text.muted}
              multiline
              style={styles.input}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.footer}>
            <Button
              size="lg"
              disabled={body.trim().length === 0}
              onPress={() => router.back()}
            >
              Save moment
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  headerSpacer: { width: 22 },
  body: {
    flex: 1,
    paddingHorizontal: spacing.page,
    gap: spacing.md,
  },
  prompt: { marginBottom: spacing.sm },
  photoBox: {
    minHeight: 180,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  cameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 140,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.lg,
    fontSize: 17,
    color: colors.text.primary,
  },
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
});
