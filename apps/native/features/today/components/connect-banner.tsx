import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing, useAppTheme } from "@/design-system";

type ConnectBannerProps = {
  prompt: string;
  groupName: string;
  replyCount: number;
  emphasized?: boolean;
  onPress: () => void;
};

export function ConnectBanner({
  prompt,
  groupName,
  replyCount,
  emphasized,
  onPress,
}: ConnectBannerProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Connect: ${prompt}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        emphasized && styles.emphasized,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <Feather name="users" size={18} color={colors.brand.ink} />
      </View>
      <View style={styles.copy}>
        <AppText variant="caption" weight="semibold" style={styles.eyebrow}>
          {emphasized ? "Your focus · " : ""}Connect · {groupName}
        </AppText>
        <AppText weight="semibold" numberOfLines={2} style={styles.title}>
          {prompt}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {replyCount} parents replied today
        </AppText>
      </View>
      <View style={[styles.cta, { backgroundColor: theme.colors.primary }]}>
        <Feather name="chevron-right" size={16} color={theme.colors.primaryText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.pastel.sky,
    minHeight: 72,
  },
  emphasized: {
    borderWidth: 1.5,
    borderColor: colors.brand.honey,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.brand.honeyDeep,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  title: {
    color: colors.brand.ink,
  },
  cta: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
