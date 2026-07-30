import { StyleSheet, View } from "react-native";

import { AppText, colors } from "@/design-system";

type ProgressRingProps = {
  activeDays: number;
  goal: number;
  size?: number;
};

/** Honey progress ring on a butter track for weekly calm days (4-of-7 style goal). */
export function ProgressRing({ activeDays, goal, size = 56 }: ProgressRingProps) {
  const ratio = Math.min(1, goal > 0 ? activeDays / goal : 0);
  const stroke = 5;
  const segments = 4;
  const filled = Math.round(ratio * segments);

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: goal, now: activeDays }}
      accessibilityLabel={`${activeDays} of ${goal} calm days this week`}
    >
      <View style={[styles.track, { width: size, height: size, borderRadius: size / 2 }]}>
        {[0, 1, 2, 3].map((index) => {
          const start = index * 90;
          const isFilled = index < filled;
          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: stroke,
                  borderColor: "transparent",
                  transform: [{ rotate: `${start - 90}deg` }],
                  borderTopColor: isFilled ? colors.brand.honey : colors.surface.app,
                  borderRightColor: isFilled ? colors.brand.honey : colors.surface.app,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.label}>
        <AppText weight="semibold" style={styles.count}>
          {activeDays}/{goal}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  segment: {
    position: "absolute",
  },
  label: {
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    color: colors.brand.ink,
    fontSize: 12,
  },
});
