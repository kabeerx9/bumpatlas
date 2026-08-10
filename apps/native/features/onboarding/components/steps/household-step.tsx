import { StyleSheet, TextInput, View } from "react-native";

import { AppText, borderWidth, radius, spacing, useAppTheme } from "@/design-system";

type HouseholdStepProps = {
  householdName: string;
  onChangeHouseholdName: (value: string) => void;
};

export function HouseholdStep({ householdName, onChangeHouseholdName }: HouseholdStepProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.block}>
      <AppText variant="heading">Name your household</AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        Optional — the shared name for your memories and invited caregivers.
      </AppText>

      <View style={styles.field}>
        <AppText variant="label" tone="secondary">
          Household name
        </AppText>
        <TextInput
          value={householdName}
          onChangeText={onChangeHouseholdName}
          placeholder="The Rivera household"
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text },
          ]}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  lead: { maxWidth: 320, lineHeight: 21 },
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
