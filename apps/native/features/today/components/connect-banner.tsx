import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, shadows, spacing } from "@/design-system";

type ConnectBannerProps = {
  prompt: string;
  groupName: string;
  replyCount: number;
  onPress: () => void;
};

export function ConnectBanner({ prompt, groupName, replyCount, onPress }: ConnectBannerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Feather name="users" size={18} color={colors.brand.peach} />
      </View>
      <View style={styles.copy}>
        <AppText variant="caption" tone="secondary">
          Connect · today’s prompt
        </AppText>
        <AppText weight="semibold" numberOfLines={2}>
          {prompt}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {groupName} · {replyCount} replies
        </AppText>
      </View>
      <Feather name="arrow-up-right" size={18} color={colors.brand.peach} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    ...shadows.soft,
  },
  pressed: {
    opacity: 0.94,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
