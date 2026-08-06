import { Feather } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Children, Fragment, isValidElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { useAppTheme } from "@/design-system/theme";
import { radius, shadows, spacing } from "@/design-system/tokens";

type IconName = ComponentProps<typeof Feather>["name"];

type ListRowProps = {
  label: string;
  icon?: IconName;
  /** Right-aligned value or badge, shown before the chevron. */
  trailing?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
};

export function ListRow({
  label,
  icon,
  trailing,
  chevron = true,
  destructive = false,
  onPress,
}: ListRowProps) {
  const theme = useAppTheme();
  const Container = onPress ? Pressable : View;

  return (
    <Container
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? label : undefined}
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? (
        <Feather
          name={icon}
          size={16}
          color={destructive ? theme.colors.danger : theme.colors.textTertiary}
        />
      ) : null}
      <AppText
        variant="body"
        weight="semibold"
        numberOfLines={1}
        style={[styles.label, destructive && { color: theme.colors.danger }]}
      >
        {label}
      </AppText>
      {trailing}
      {chevron ? (
        <Feather name="chevron-right" size={16} color={theme.colors.textFaint} />
      ) : null}
    </Container>
  );
}

/**
 * Grouped settings list: one white card, hairline separators between rows,
 * no separator after the last one. Pass `ListRow` children.
 */
export function ListCard({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[styles.card, shadows.soft, { backgroundColor: theme.colors.surface }]}>
      {rows.map((row, index) => (
        <Fragment key={row.key ?? index}>
          {row}
          {index < rows.length - 1 ? (
            <View style={[styles.separator, { backgroundColor: theme.colors.borderStrong }]} />
          ) : null}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  label: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth * 2,
    marginLeft: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
