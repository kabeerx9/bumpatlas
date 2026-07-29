import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, shadows, spacing } from "@/design-system";

type MemoryPreviewCardProps = {
  title: string;
  dateLabel: string;
  onPress: () => void;
};

export function MemoryPreviewCard({ title, dateLabel, onPress }: MemoryPreviewCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.photo}>
        <Feather name="image" size={22} color={colors.brand.peach} />
      </View>
      <View style={styles.copy}>
        <AppText variant="caption" tone="secondary">
          Latest memory · {dateLabel}
        </AppText>
        <AppText weight="semibold" numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="caption" style={styles.link}>
          Open journey
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    ...shadows.soft,
  },
  pressed: {
    opacity: 0.94,
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  link: {
    color: colors.brand.peach,
    marginTop: 2,
  },
});
