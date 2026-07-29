import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
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
      <SoftStackShell
        title="Baby is here"
        closeIcon="x"
        centered
        onBack={() => router.replace(appRoutes.home)}
      >
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
      </SoftStackShell>
    );
  }

  return (
    <SoftStackShell
      title="Baby is here"
      closeIcon="x"
      onBack={() => router.back()}
      footer={
        <Button size="lg" disabled={!canSave} onPress={handleConvert}>
          Convert & continue
        </Button>
      }
    >
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
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
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
});
