import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";

import { AppText, Button, Surface, colors, radius, spacing, useAppTheme } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useConvertPregnancyMutation } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

export function ConvertBirthScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const convertPregnancyMutation = useConvertPregnancyMutation();
  const [childName, setChildName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [done, setDone] = useState(false);
  const [converting, setConverting] = useState(false);

  const canSave = childName.trim().length > 0 && birthDate.trim().length > 0;

  async function handleConvert() {
    if (!canSave || converting) return;
    setConverting(true);
    try {
      await convertPregnancyMutation.mutateAsync({
        pregnancyId: "current",
        body: { childName: childName.trim(), birthDate: birthDate.trim() },
      });
      setDone(true);
    } catch {
      Alert.alert("Couldn’t convert", "Check your connection and try again.");
    } finally {
      setConverting(false);
    }
  }

  if (done) {
    return (
      <SoftStackShell
        title="Baby is here"
        closeIcon="x"
        centered
        onBack={() => router.replace(appRoutes.home)}
      >
        <Feather name="check-circle" size={32} color={colors.brand.honeyDeep} />
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
        <Button size="lg" disabled={!canSave || converting} onPress={() => void handleConvert()}>
          {converting ? "Converting…" : "Convert & continue"}
        </Button>
      }
    >
      <Surface elevated radiusSize="xl" padding="xl" style={styles.hero}>
        <AppText variant="heading" weight="semibold">
          Convert pregnancy journal
        </AppText>
        <AppText variant="bodySmall" tone="secondary">
          Enter birth details once. Your bump journal and memories stay private to the
          household.
        </AppText>
      </Surface>

      <View style={styles.field}>
        <AppText variant="label" tone="secondary">
          Baby&apos;s name
        </AppText>
        <TextInput
          value={childName}
          onChangeText={setChildName}
          placeholder="What should we call them?"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
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
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
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
    gap: spacing.sm,
  },
  field: { gap: spacing.sm },
  input: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
});
