import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, shadows, spacing } from "@/design-system";

type SelectionOptionProps = {
  label: string;
  description?: string;
  icon?: keyof typeof Feather.glyphMap;
  selected: boolean;
  onPress: () => void;
};

export function SelectionOption({
  label,
  description,
  icon,
  selected,
  onPress,
}: SelectionOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      {selected ? (
        <View style={styles.check}>
          <Feather name="check" size={13} color={colors.text.inverse} />
        </View>
      ) : null}

      {icon ? (
        <View style={styles.iconWrap}>
          <Feather name={icon} size={18} color={selected ? colors.brand.peach : colors.text.secondary} />
        </View>
      ) : null}

      <View style={styles.copy}>
        <AppText weight="semibold" style={selected ? styles.labelSelected : undefined}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="bodySmall" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.soft,
  },
  cardSelected: {
    borderColor: colors.brand.peach,
    backgroundColor: colors.surface.warm,
  },
  check: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.lg,
  },
  labelSelected: {
    color: colors.brand.peach,
  },
});
