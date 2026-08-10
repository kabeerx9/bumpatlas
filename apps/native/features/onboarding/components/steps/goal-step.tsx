import { StyleSheet, View } from "react-native";

import { AppText, spacing } from "@/design-system";
import { SelectionOption } from "@/features/onboarding/components/selection-option";

export type OnboardingGoal = "memories" | "wellness" | "connect" | "learn";

type GoalStepProps = {
  goal: OnboardingGoal | null;
  onSelect: (goal: OnboardingGoal) => void;
};

const OPTIONS: Array<{
  id: OnboardingGoal;
  label: string;
  description: string;
  icon: "camera" | "sun" | "users" | "book-open";
}> = [
  {
    id: "memories",
    label: "Capture memories",
    description: "Build a journal you’ll treasure",
    icon: "camera",
  },
  {
    id: "wellness",
    label: "Parent wellness",
    description: "Small care moments that add up",
    icon: "sun",
  },
  {
    id: "connect",
    label: "Connect with others",
    description: "Share in a private stage group",
    icon: "users",
  },
  {
    id: "learn",
    label: "Learn what matters now",
    description: "Reviewed tips for this stage",
    icon: "book-open",
  },
];

export function GoalStep({ goal, onSelect }: GoalStepProps) {
  return (
    <View style={styles.block}>
      <AppText variant="heading">What matters most right now?</AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        Today includes everything; this chapter simply opens first.
      </AppText>

      <View style={styles.list}>
        {OPTIONS.map((option) => (
          <SelectionOption
            key={option.id}
            label={option.label}
            description={option.description}
            icon={option.icon}
            selected={goal === option.id}
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
