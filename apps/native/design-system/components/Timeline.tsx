import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { useAppTheme } from "@/design-system/theme";
import { colors, radius, shadows, spacing } from "@/design-system/tokens";

const DOT_SIZE = 16;
const RAIL_INSET = DOT_SIZE / 2 - 1;

export type TimelineEntry = {
  id: string;
  date: string;
  title: string;
  description?: string | null;
  onPress?: () => void;
  /** Hollow dot for a future/unreached milestone. */
  upcoming?: boolean;
};

/**
 * Vertical rail with a honey dot per entry and a white card beside it.
 * The rail is drawn once behind the whole list rather than per row, so the
 * line stays continuous when cards have different heights.
 */
export function Timeline({ entries, footer }: { entries: TimelineEntry[]; footer?: ReactNode }) {
  const theme = useAppTheme();

  return (
    <View style={styles.root}>
      {entries.length > 1 ? (
        <View
          pointerEvents="none"
          style={[styles.rail, { backgroundColor: theme.colors.borderStrong }]}
        />
      ) : null}

      <View style={styles.list}>
        {entries.map((entry) => {
          const Container = entry.onPress ? Pressable : View;
          return (
            <View key={entry.id} style={styles.row}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: entry.upcoming
                      ? theme.colors.surface
                      : theme.colors.secondary,
                    borderColor: theme.colors.surface,
                  },
                  entry.upcoming && { borderColor: theme.colors.secondary },
                ]}
              />
              <Container
                accessibilityRole={entry.onPress ? "button" : undefined}
                onPress={entry.onPress}
                style={[styles.card, shadows.soft, { backgroundColor: theme.colors.surface }]}
              >
                <AppText variant="caption" tone="muted" weight="semibold">
                  {entry.date}
                </AppText>
                <AppText variant="subhead" style={styles.title}>
                  {entry.title}
                </AppText>
                {entry.description ? (
                  <AppText variant="bodySmall" tone="secondary" style={styles.description}>
                    {entry.description}
                  </AppText>
                ) : null}
              </Container>
            </View>
          );
        })}
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
  },
  rail: {
    position: "absolute",
    left: RAIL_INSET,
    top: spacing.lg,
    bottom: spacing.xl,
    width: 2,
  },
  list: {
    gap: spacing.md + 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md + 2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.full,
    borderWidth: 3,
    marginTop: spacing.lg - 2,
    // Sits above the rail it interrupts.
    zIndex: 1,
    shadowColor: colors.brand.ink,
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    marginTop: 2,
  },
  description: {
    marginTop: spacing.xs,
  },
});
