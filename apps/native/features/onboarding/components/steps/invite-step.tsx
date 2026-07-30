import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

type InviteStepProps = {
  householdName: string;
  childName: string;
};

export function InviteStep({ householdName, childName }: InviteStepProps) {
  const subject = childName.trim() || "your little one";

  return (
    <View style={styles.block}>
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Feather name="users" size={28} color={colors.text.inverse} />
        </View>
        <AppText variant="heading" tone="inverse" align="center">
          Invite your partner
        </AppText>
        <AppText variant="bodySmall" style={styles.heroCopy} align="center">
          Free includes 2 adults. They can capture moments and see {subject}&apos;s weekly recap in{" "}
          {householdName || "your household"}.
        </AppText>
      </View>

      <View style={styles.perks}>
        <View style={styles.perkRow}>
          <Feather name="check" size={16} color={colors.brand.honeyDeep} />
          <AppText variant="bodySmall">Shared journal — private to your household</AppText>
        </View>
        <View style={styles.perkRow}>
          <Feather name="check" size={16} color={colors.brand.honeyDeep} />
          <AppText variant="bodySmall">Less mental load — both of you can contribute</AppText>
        </View>
        <View style={styles.perkRow}>
          <Feather name="check" size={16} color={colors.brand.honeyDeep} />
          <AppText variant="bodySmall">Skip anytime — you can invite from Family later</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.lg },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.ink,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  heroCopy: {
    color: "rgba(255,255,255,0.88)",
    lineHeight: 20,
    maxWidth: 300,
  },
  perks: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
});
