import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { spacing } from "@/design-system/tokens";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Circular IconButton(s), right-aligned. */
  action?: ReactNode;
  /** Avatar or glyph shown before the title block. */
  leading?: ReactNode;
  /** `hero` for a tab's own title, `compact` when it sits above dense content. */
  size?: "hero" | "compact";
};

/**
 * The header every tab opens with: display title top-left, one muted
 * supporting line under it, circular actions top-right.
 */
export function ScreenHeader({
  title,
  subtitle,
  action,
  leading,
  size = "hero",
}: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      {leading}
      <View style={styles.copy}>
        <AppText variant={size === "hero" ? "hero" : "heading"} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" tone="muted" weight="medium" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
});
