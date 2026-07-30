import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing, useAppTheme } from "@/design-system";

type InvitePartnerBannerProps = {
  childName: string;
  onInvite: () => void;
};

export function InvitePartnerBanner({ childName, onInvite }: InvitePartnerBannerProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onInvite}
      accessibilityRole="button"
      accessibilityLabel={`Invite your partner to ${childName}'s story`}
      style={styles.banner}
    >
      <View style={styles.iconWrap}>
        <Feather name="user-plus" size={18} color={colors.brand.ink} />
      </View>
      <View style={styles.copy}>
        <AppText variant="caption" weight="semibold" style={styles.eyebrow}>
          Connect · Just you for now
        </AppText>
        <AppText weight="semibold">Invite your partner to {childName}&apos;s story</AppText>
        <AppText variant="caption" tone="secondary">
          Free includes 2 adults · shared journal & recap
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
    backgroundColor: colors.pastel.mint,
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
  cta: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
