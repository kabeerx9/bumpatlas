import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { appRoutes } from "@/navigation/routes";

export function ConvertBirthScreen() {
  const router = useRouter();
  const { convertPregnancy } = useMockUi();
  const [childName, setChildName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [done, setDone] = useState(false);

  const canSave = childName.trim().length > 0 && birthDate.trim().length > 0;

  function handleConvert() {
    if (!canSave) return;
    convertPregnancy(childName.trim(), birthDate.trim());
    setDone(true);
  }

  if (done) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.success}>
            <Feather name="check-circle" size={32} color={colors.brand.peach} />
            <AppText variant="heading" align="center">
              Welcome, {childName.trim()}
            </AppText>
            <AppText variant="body" tone="secondary" align="center">
              Pregnancy memories moved under this child profile. Stage tips will update for
              postpartum.
            </AppText>
            <Button size="lg" onPress={() => router.replace(appRoutes.home)}>
              Go to Today
            </Button>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Close">
            <Feather name="x" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Baby is here</AppText>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.body}>
          <View style={styles.hero}>
            <AppText variant="heading" tone="inverse">
              Convert pregnancy journal
            </AppText>
            <AppText variant="bodySmall" style={styles.heroCopy}>
              Enter birth details once. Your bump journal and memories stay private to the
              household.
            </AppText>
          </View>

          <View style={styles.field}>
            <AppText variant="label" tone="secondary">
              Baby&apos;s name
            </AppText>
            <TextInput
              value={childName}
              onChangeText={setChildName}
              placeholder="What should we call them?"
              placeholderTextColor={colors.text.muted}
              style={styles.input}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <AppText variant="label" tone="secondary">
              Date of birth
            </AppText>
            <TextInput
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="Jul 29, 2026"
              placeholderTextColor={colors.text.muted}
              style={styles.input}
            />
          </View>

          <AppText variant="caption" tone="secondary">
            Educational note: this does not replace hospital paperwork. It only updates your
            BumpAtlas stage and journal.
          </AppText>
        </View>

        <View style={styles.footer}>
          <Button size="lg" disabled={!canSave} onPress={handleConvert}>
            Convert & continue
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8EDE6" },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, paddingHorizontal: spacing.page, gap: spacing.lg },
  hero: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  heroCopy: { color: "rgba(255,255,255,0.88)", lineHeight: 20 },
  field: { gap: spacing.sm },
  input: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.78)",
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  success: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.page,
    gap: spacing.lg,
  },
});
