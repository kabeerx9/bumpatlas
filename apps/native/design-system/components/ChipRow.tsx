import { Pressable, ScrollView, StyleSheet } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { useAppTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";

export type Chip<T extends string> = { value: T; label: string };

type ChipRowProps<T extends string> = {
  chips: readonly Chip<T>[];
  value?: T | null;
  onChange?: (value: T) => void;
  /** Horizontal padding, so chips can bleed to the screen edge while scrolling. */
  gutter?: number;
};

/**
 * Horizontally scrolling filter chips: white by default, honey when selected.
 * Bleeds past the screen gutter on purpose — a chip cut off at the edge is the
 * affordance that tells you the row scrolls.
 */
export function ChipRow<T extends string>({
  chips,
  value,
  onChange,
  gutter = spacing.page,
}: ChipRowProps<T>) {
  const theme = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
    >
      {chips.map((chip) => {
        const active = chip.value === value;
        return (
          <Pressable
            key={chip.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={chip.label}
            disabled={!onChange}
            onPress={() => onChange?.(chip.value)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active ? theme.colors.secondary : theme.colors.surface,
              },
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="caption" weight="bold" numberOfLines={1}>
              {chip.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    alignItems: "center",
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.sm + 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
