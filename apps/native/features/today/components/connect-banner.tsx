import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

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
        <Feather name="users" size={18} color={colors.text.inverse} />
      </View>
      <View style={styles.copy}>
        <AppText variant="caption" style={styles.eyebrow}>
          {emphasized ? "Your focus · " : ""}Connect · {groupName}
        </AppText>
        <AppText weight="semibold" numberOfLines={2} style={styles.title}>
          {prompt}
        </AppText>
        <AppText variant="caption" style={styles.meta}>
          {replyCount} parents replied today
        </AppText>
      </View>
      <Feather name="chevron-right" size={20} color={colors.brand.peach} />
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
    backgroundColor: "rgba(255,255,255,0.78)",
    minHeight: 72,
  },
  emphasized: {
    borderWidth: 1.5,
    borderColor: colors.brand.peach,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.brand.peach,
    letterSpacing: 0.4,
  },
  title: {
    color: colors.brand.ink,
  },
  meta: {
    color: colors.text.secondary,
  },
});
