import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { spacing } from "@/design-system/tokens";

type SectionHeaderProps = {
  title: string;
  /** Optional trailing text link ("See all"). */
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="subhead">{title}</AppText>
      {actionLabel ? (
        <Pressable
          onPress={onActionPress}
          accessibilityRole="link"
          accessibilityLabel={actionLabel}
          hitSlop={spacing.sm}
        >
          <AppText variant="caption" weight="bold">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
});
