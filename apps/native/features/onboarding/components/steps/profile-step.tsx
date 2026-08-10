import { StyleSheet, TextInput, View } from "react-native";

import { AppText, borderWidth, radius, spacing, useAppTheme } from "@/design-system";
import { DateField } from "@/features/shared/components/date-field";
import type { OnboardingRole } from "@/features/onboarding/components/steps/role-step";

const TODAY = new Date();
const DUE_DATE_MAX = new Date();
DUE_DATE_MAX.setMonth(DUE_DATE_MAX.getMonth() + 10);

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
          Your family owner will share access, then you can add memories together.
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
        <DateField
          label="Due date"
          value={dueDate}
          onChange={onChangeDueDate}
          minimumDate={TODAY}
          maximumDate={DUE_DATE_MAX}
          style={styles.field}
        />
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
          <DateField
            label="Date of birth"
            value={childDob}
            onChange={onChangeChildDob}
            maximumDate={TODAY}
            style={styles.field}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  lead: { maxWidth: 320, lineHeight: 21 },
  field: { gap: spacing.xs, marginTop: spacing.sm },
  input: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
});
