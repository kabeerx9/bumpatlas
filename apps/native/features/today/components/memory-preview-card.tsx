import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing, useAppTheme } from "@/design-system";

type MemoryPreviewCardProps = {
  title: string;
  dateLabel: string;
  onPress: () => void;
};

export function MemoryPreviewCard({ title, dateLabel, onPress }: MemoryPreviewCardProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.photo}>
        <View style={styles.photoInner}>
          <Feather name="image" size={22} color={colors.brand.honeyDeep} />
        </View>
      </View>
      <View style={styles.copy}>
        <AppText variant="caption" style={styles.eyebrow}>
          Latest · {dateLabel}
        </AppText>
        <AppText weight="semibold" numberOfLines={2}>
          {title}
        </AppText>
        <View style={styles.linkRow}>
          <AppText variant="caption" weight="semibold" style={styles.link}>
            Open moment
          </AppText>
          <Feather name="arrow-up-right" size={14} color={colors.brand.honeyDeep} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  photo: {
    width: 92,
    height: 92,
    borderRadius: radius.lg,
    backgroundColor: colors.pastel.lemon,
    padding: 4,
  },
  photoInner: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  eyebrow: {
    color: colors.brand.honeyDeep,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  link: {
    color: colors.brand.honeyDeep,
  },
});
