import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

type InvitePartnerBannerProps = {
  childName: string;
  onInvite: () => void;
};

export function InvitePartnerBanner({ childName, onInvite }: InvitePartnerBannerProps) {
  return (
    <Pressable onPress={onInvite} style={styles.banner}>
      <View style={styles.iconWrap}>
        <Feather name="user-plus" size={18} color={colors.text.inverse} />
      </View>
      <View style={styles.copy}>
        <AppText variant="caption" style={styles.eyebrow}>
          Connect · Just you for now
        </AppText>
        <AppText weight="semibold">Invite your partner to {childName}&apos;s story</AppText>
        <AppText variant="caption" style={styles.meta}>
          Free includes 2 adults · shared journal & recap
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
  meta: {
    color: colors.text.secondary,
  },
});
