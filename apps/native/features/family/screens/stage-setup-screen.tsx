import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  AppText,
  Button,
  Surface,
  colors,
  radius,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

type Mode = "choose" | "pregnancy" | "parent";

/** Reachable after onboarding when stage is UNKNOWN — finishes profile setup. */
export function StageSetupScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { applyOnboardingProfile, stageMode } = useMockUi();
  const [mode, setMode] = useState<Mode>("choose");
  const [dueDate, setDueDate] = useState("");
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [saving, setSaving] = useState(false);

  const canSavePregnancy = dueDate.trim().length > 0;
  const canSaveParent = childName.trim().length > 0 && childDob.trim().length > 0;

  async function savePregnancy() {
    if (!canSavePregnancy || saving) return;
    setSaving(true);
    try {
      // `existingFamily: true` — the household was already created during
      // onboarding (stage setup only runs post-onboarding); this must not
      // call createFamily again and spawn a second household.
      await applyOnboardingProfile({
        role: "expecting",
        dueDate: dueDate.trim(),
        existingFamily: true,
      });
      router.replace(appRoutes.home);
    } catch {
      Alert.alert("Couldn’t save", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveParent() {
    if (!canSaveParent || saving) return;
    setSaving(true);
    try {
      await applyOnboardingProfile({
        role: "parent",
        childName: childName.trim(),
        childDob: childDob.trim(),
        existingFamily: true,
      });
      router.replace(appRoutes.home);
    } catch {
      Alert.alert("Couldn’t save", "Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SoftStackShell
      title="Finish setup"
      closeIcon={mode === "choose" ? "x" : "arrow-left"}
      onBack={() => (mode === "choose" ? router.back() : setMode("choose"))}
    >
      {mode === "choose" ? (
        <View style={styles.chooseColumn}>
          <View style={styles.hero}>
            <AppText variant="caption" tone="brand" style={styles.eyebrow}>
              Stage is {stageMode === "unknown" ? "unknown" : stageMode}
            </AppText>
            <AppText variant="heading" weight="semibold">
              Tell us where you are
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              Care, Guide, and Connect need a pregnancy week or child age to stay calm and relevant.
            </AppText>
          </View>

          <Pressable onPress={() => setMode("pregnancy")}>
            <Surface tone="card" elevated radiusSize="xl" style={styles.card}>
              <View style={styles.cardIcon}>
                <Feather name="sunrise" size={20} color={colors.brand.honeyDeep} />
              </View>
              <View style={styles.cardCopy}>
                <AppText weight="semibold">I&apos;m expecting</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Add a due date · pregnancy journal
                </AppText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </Surface>
          </Pressable>

          <Pressable onPress={() => setMode("parent")}>
            <Surface tone="card" elevated radiusSize="xl" style={styles.card}>
              <View style={styles.cardIcon}>
                <Feather name="heart" size={20} color={colors.brand.honeyDeep} />
              </View>
              <View style={styles.cardCopy}>
                <AppText weight="semibold">I have a baby / child</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Add name + date of birth
                </AppText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
            </Surface>
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
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
            accessibilityLabel="Due date"
          />
          <Button
            size="lg"
            disabled={!canSavePregnancy || saving}
            onPress={() => void savePregnancy()}
          >
            {saving ? "Saving…" : "Save pregnancy stage"}
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
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
            accessibilityLabel="Child name"
          />
          <AppText weight="semibold">Date of birth</AppText>
          <TextInput
            value={childDob}
            onChangeText={setChildDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
            accessibilityLabel="Child date of birth"
          />
          <Button
            size="lg"
            disabled={!canSaveParent || saving}
            onPress={() => void saveParent()}
          >
            {saving ? "Saving…" : "Save child stage"}
          </Button>
        </>
      ) : null}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  chooseColumn: { gap: spacing.md },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 72,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCopy: { flex: 1, gap: 2 },
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontFamily: "Poppins_400Regular",
  },
});
