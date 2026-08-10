import { StyleSheet, View } from "react-native";

import { AppText, spacing } from "@/design-system";
import { SelectionOption } from "@/features/onboarding/components/selection-option";

export type OnboardingRole = "expecting" | "parent" | "partner";

type RoleStepProps = {
  role: OnboardingRole | null;
  onSelect: (role: OnboardingRole) => void;
};

const OPTIONS: Array<{
  id: OnboardingRole;
  label: string;
  description: string;
  icon: "heart" | "smile" | "users";
}> = [
  {
    id: "expecting",
    label: "Expecting",
    description: "Track pregnancy week-by-week",
    icon: "heart",
  },
  {
    id: "parent",
    label: "Parent",
    description: "Journal and care for your child",
    icon: "smile",
  },
  {
    id: "partner",
    label: "Partner / caregiver",
    description: "Joining an existing household",
    icon: "users",
  },
];

export function RoleStep({ role, onSelect }: RoleStepProps) {
  return (
    <View style={styles.block}>
      <AppText variant="heading">Which best describes you?</AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        We&apos;ll shape your first page around this.
      </AppText>

      <View style={styles.list}>
        {OPTIONS.map((option) => (
          <SelectionOption
            key={option.id}
            label={option.label}
            description={option.description}
            icon={option.icon}
            selected={role === option.id}
            onPress={() => onSelect(option.id)}
            compact
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  lead: { maxWidth: 320, lineHeight: 21 },
  list: { gap: 6, marginTop: spacing.xs },
});
