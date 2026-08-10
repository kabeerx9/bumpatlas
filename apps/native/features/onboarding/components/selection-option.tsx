import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, borderWidth, colors, radius, shadows, spacing, useAppTheme } from "@/design-system";

type SelectionOptionProps = {
  label: string;
  description?: string;
  icon?: keyof typeof Feather.glyphMap;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
};

export function SelectionOption({
  label,
  description,
  icon,
  selected,
  onPress,
  compact = false,
}: SelectionOptionProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          borderColor: selected ? colors.brand.honey : theme.colors.border,
          backgroundColor: selected ? colors.brand.honey : theme.colors.surface,
        },
      ]}
    >
      {selected ? (
        <View style={styles.check}>
          <Feather name="check" size={13} color={colors.brand.ink} />
        </View>
      ) : null}

      {icon ? (
        <View
          style={[
          styles.iconWrap,
          compact && styles.iconWrapCompact,
            { backgroundColor: selected ? "rgba(33,29,21,0.12)" : colors.brand.honeySoft },
          ]}
        >
          <Feather name={icon} size={compact ? 16 : 18} color={colors.brand.ink} />
        </View>
      ) : null}

      <View style={styles.copy}>
        <AppText weight="semibold" style={selected ? styles.labelSelected : undefined}>
          {label}
        </AppText>
        {description ? (
          <AppText
            variant="bodySmall"
            tone={selected ? "primary" : "secondary"}
            style={selected ? styles.descriptionSelected : undefined}
          >
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: borderWidth.emphasis,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.soft,
  },
  cardCompact: {
    minHeight: 48,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    gap: spacing.sm,
  },
  check: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(33,29,21,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  copy: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.lg,
  },
  labelSelected: {
    color: colors.brand.ink,
  },
  descriptionSelected: {
    color: "rgba(33,29,21,0.72)",
  },
});
