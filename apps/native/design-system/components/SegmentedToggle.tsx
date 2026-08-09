import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { useAppTheme } from "@/design-system/theme";
import { radius, spacing } from "@/design-system/tokens";

type Segment<T extends string> = { value: T; label: string };

type SegmentedToggleProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * White container, honey pill on the active segment. Used for the
 * Pregnancy / child switch on Journey. Two or three segments only —
 * past that it becomes a chip row.
 */
export function SegmentedToggle<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedToggleProps<T>) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: theme.colors.surface }]}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
            onPress={() => onChange(segment.value)}
            style={({ pressed }) => [
              styles.segment,
              active && { backgroundColor: theme.colors.secondary },
              pressed && !active && styles.pressed,
            ]}
          >
            <AppText variant="bodySmall" weight="bold" align="center">
              {segment.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: spacing.xs,
    borderRadius: radius.sheet - 4,
    padding: spacing.xs + 2,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
