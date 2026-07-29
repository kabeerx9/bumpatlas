import { StyleSheet, TextInput, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

type HouseholdStepProps = {
  householdName: string;
  onChangeHouseholdName: (value: string) => void;
};

export function HouseholdStep({ householdName, onChangeHouseholdName }: HouseholdStepProps) {
  return (
    <View style={styles.block}>
      <AppText variant="heading">Name your household</AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        Optional — a shared space for memories, recaps, and the adults you invite. You can change
        this later.
      </AppText>

      <View style={styles.field}>
        <AppText variant="label" tone="secondary">
          Household name
        </AppText>
        <TextInput
          value={householdName}
          onChangeText={onChangeHouseholdName}
          placeholder="The Rivera household"
          placeholderTextColor={colors.text.muted}
          style={styles.input}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  lead: { maxWidth: 320, lineHeight: 24 },
  field: { gap: spacing.sm, marginTop: spacing.lg },
  input: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
  },
});
