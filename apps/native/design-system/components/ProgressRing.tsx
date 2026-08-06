import { StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { useAppTheme } from "@/design-system/theme";
import { radius } from "@/design-system/tokens";

type ProgressRingProps = {
  /** 0–1. Clamped. */
  value: number;
  size?: number;
  label?: string;
};

/**
 * The honey percentage disc on the pregnancy card. Deliberately a filled
 * disc rather than a stroked arc — react-native-svg isn't a dependency, and
 * the design's disc reads as a badge, not a gauge.
 */
export function ProgressRing({ value, size = 46, label }: ProgressRingProps) {
  const theme = useAppTheme();
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      accessibilityLabel={label}
      style={[
        styles.disc,
        { width: size, height: size, backgroundColor: theme.colors.secondary },
      ]}
    >
      <AppText variant="caption" weight="bold">
        {pct}%
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
