import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

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
        <View style={styles.photoInner}>
          <Feather name="image" size={22} color={colors.brand.peach} />
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
          <Feather name="arrow-up-right" size={14} color={colors.brand.peach} />
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
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  pressed: {
    opacity: 0.92,
  },
  photo: {
    width: 92,
    height: 92,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
    padding: 4,
  },
  photoInner: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  eyebrow: {
    color: colors.brand.peach,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  link: {
    color: colors.brand.peach,
  },
});
