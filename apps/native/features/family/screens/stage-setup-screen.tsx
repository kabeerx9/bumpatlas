import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

type Mode = "choose" | "pregnancy" | "parent";

/** Reachable after onboarding when stage is UNKNOWN — finishes profile setup. */
export function StageSetupScreen() {
  const router = useRouter();
  const { applyOnboardingProfile, stageMode } = useMockUi();
  const [mode, setMode] = useState<Mode>("choose");
  const [dueDate, setDueDate] = useState("");
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");

  const canSavePregnancy = dueDate.trim().length > 0;
  const canSaveParent = childName.trim().length > 0 && childDob.trim().length > 0;

  function savePregnancy() {
    if (!canSavePregnancy) return;
    applyOnboardingProfile({
      role: "expecting",
      dueDate: dueDate.trim(),
      householdName: "Our household",
    });
    router.replace(appRoutes.home);
  }

  function saveParent() {
    if (!canSaveParent) return;
    applyOnboardingProfile({
      role: "parent",
      childName: childName.trim(),
      childDob: childDob.trim(),
      householdName: `${childName.trim()}'s household`,
    });
    router.replace(appRoutes.home);
  }

  return (
    <SoftStackShell
      title="Finish setup"
      closeIcon={mode === "choose" ? "x" : "arrow-left"}
      onBack={() => (mode === "choose" ? router.back() : setMode("choose"))}
      scroll={mode !== "choose"}
      contentStyle={mode === "choose" ? styles.chooseBody : undefined}
    >
      {mode === "choose" ? (
        <View style={styles.chooseColumn}>
          <View style={styles.hero}>
            <AppText variant="caption" style={styles.eyebrow}>
              Stage is {stageMode === "unknown" ? "unknown" : stageMode}
            </AppText>
            <AppText variant="heading" tone="inverse">
              Tell us where you are
            </AppText>
            <AppText variant="bodySmall" style={styles.heroCopy}>
              Care, Guide, and Connect need a pregnancy week or child age to stay calm and relevant.
            </AppText>
          </View>

          <Pressable style={styles.card} onPress={() => setMode("pregnancy")}>
            <Feather name="sunrise" size={20} color={colors.brand.peach} />
            <View style={styles.cardCopy}>
              <AppText weight="semibold">I&apos;m expecting</AppText>
              <AppText variant="bodySmall" tone="secondary">
                Add a due date · pregnancy journal
              </AppText>
            </View>
            <Feather name="chevron-right" size={18} color={colors.text.muted} />
          </Pressable>

          <Pressable style={styles.card} onPress={() => setMode("parent")}>
            <Feather name="heart" size={20} color={colors.brand.peach} />
            <View style={styles.cardCopy}>
              <AppText weight="semibold">I have a baby / child</AppText>
              <AppText variant="bodySmall" tone="secondary">
                Add name + date of birth
              </AppText>
            </View>
            <Feather name="chevron-right" size={18} color={colors.text.muted} />
          </Pressable>
        </View>
      ) : null}

      {mode === "pregnancy" ? (
        <>
          <AppText weight="semibold">Due date</AppText>
          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            accessibilityLabel="Due date"
          />
          <Button size="lg" disabled={!canSavePregnancy} onPress={savePregnancy}>
            Save pregnancy stage
          </Button>
        </>
      ) : null}

      {mode === "parent" ? (
        <>
          <AppText weight="semibold">Child&apos;s name</AppText>
          <TextInput
            value={childName}
            onChangeText={setChildName}
            placeholder="Name"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            accessibilityLabel="Child name"
          />
          <AppText weight="semibold">Date of birth</AppText>
          <TextInput
            value={childDob}
            onChangeText={setChildDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            accessibilityLabel="Child date of birth"
          />
          <Button size="lg" disabled={!canSaveParent} onPress={saveParent}>
            Save child stage
          </Button>
        </>
      ) : null}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  chooseBody: {
    flex: 1,
    paddingHorizontal: spacing.page,
    gap: spacing.md,
  },
  chooseColumn: { flex: 1, gap: spacing.md },
  hero: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroCopy: { color: "rgba(255,255,255,0.9)", lineHeight: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: spacing.lg,
    minHeight: 72,
  },
  cardCopy: { flex: 1, gap: 2 },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
});
