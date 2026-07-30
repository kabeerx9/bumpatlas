import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, colors, spacing } from "@/design-system";

type SoftHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function SoftHeader({ eyebrow, title, subtitle, right }: SoftHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText variant="caption" style={styles.eyebrow}>
          {eyebrow}
        </AppText>
        <AppText variant="heading" weight="semibold">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="body" tone="secondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.brand.honeyDeep,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  subtitle: {
    lineHeight: 22,
  },
});
