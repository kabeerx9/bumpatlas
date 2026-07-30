import { StyleSheet, TextInput, View } from "react-native";

import { AppText, borderWidth, radius, spacing, useAppTheme } from "@/design-system";
import type { OnboardingRole } from "@/features/onboarding/components/steps/role-step";

type ProfileStepProps = {
  role: OnboardingRole | null;
  childName: string;
  childDob: string;
  dueDate: string;
  onChangeChildName: (value: string) => void;
  onChangeChildDob: (value: string) => void;
  onChangeDueDate: (value: string) => void;
};

export function ProfileStep({
  role,
  childName,
  childDob,
  dueDate,
  onChangeChildName,
  onChangeChildDob,
  onChangeDueDate,
}: ProfileStepProps) {
  const theme = useAppTheme();
  const expecting = role === "expecting";
  const partner = role === "partner";
  const inputStyle = [
    styles.input,
    { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text },
  ];

  if (partner) {
    return (
      <View style={styles.block}>
        <AppText variant="heading">You&apos;re joining a household</AppText>
        <AppText variant="body" tone="secondary" style={styles.lead}>
          Your partner or family owner will share access. You can still personalize notifications
          and start contributing once you&apos;re in.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <AppText variant="heading">
        {expecting ? "When is baby due?" : "Tell us about your little one"}
      </AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        {expecting
          ? "We use your due date for pregnancy week tips and timing."
          : "A name and birthday help personalize memories and stage content."}
      </AppText>

      {expecting ? (
        <View style={styles.field}>
          <AppText variant="label" tone="secondary">
            Due date
          </AppText>
          <TextInput
            value={dueDate}
            onChangeText={onChangeDueDate}
            placeholder="Aug 15, 2026"
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
          />
        </View>
      ) : (
        <>
          <View style={styles.field}>
            <AppText variant="label" tone="secondary">
              Child&apos;s name
            </AppText>
            <TextInput
              value={childName}
              onChangeText={onChangeChildName}
              placeholder="What should we call them?"
              placeholderTextColor={theme.colors.textMuted}
              style={inputStyle}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          <View style={styles.field}>
            <AppText variant="label" tone="secondary">
              Date of birth
            </AppText>
            <TextInput
              value={childDob}
              onChangeText={onChangeChildDob}
              placeholder="Apr 28, 2026"
              placeholderTextColor={theme.colors.textMuted}
              style={inputStyle}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  lead: { maxWidth: 320, lineHeight: 24 },
  field: { gap: spacing.sm, marginTop: spacing.md },
  input: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
});
