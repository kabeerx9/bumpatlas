import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { useAppTheme } from "@/design-system/theme";
import { radius, shadows, spacing } from "@/design-system/tokens";

export type StatTileProps = {
  /** Small glyph above the value — a Feather icon or an emoji string. */
  icon?: ReactNode;
  value: string;
  label: string;
};

/** One white tile in a 3-up stat row. Value is display type, label is muted. */
export function StatTile({ icon, value, label }: StatTileProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.tile, shadows.soft, { backgroundColor: theme.colors.surface }]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <AppText variant="subhead" numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="label" tone="muted" weight="medium" numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

/** Equal-width row of stat tiles. Three reads best at 402pt; four gets cramped. */
export function StatRow({ items }: { items: StatTileProps[] }) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.cell}>
          <StatTile {...item} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
  },
  tile: {
    borderRadius: radius.md,
    padding: spacing.lg - 2,
  },
  icon: {
    marginBottom: spacing.xs + 2,
  },
  label: {
    marginTop: 1,
    letterSpacing: 0,
    textTransform: "none",
  },
});
