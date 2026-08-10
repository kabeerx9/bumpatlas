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
      <View style={styles.headingRow}>
        <View style={styles.iconWrap}>
          <Feather name="users" size={18} color={colors.brand.ink} />
        </View>
        <View style={styles.headingCopy}>
          <AppText variant="heading">Make room for someone you trust</AppText>
          <AppText variant="bodySmall" tone="secondary" style={styles.lead}>
            Invite one adult to share {subject}&apos;s private story in {householdName || "your household"}.
          </AppText>
        </View>
      </View>

      <View style={styles.trustCard}>
        <TrustPoint>Private to your household</TrustPoint>
        <TrustPoint>Both adults can add memories</TrustPoint>
      </View>
    </View>
  );
}

function TrustPoint({ children }: { children: string }) {
  return (
    <View style={styles.trustRow}>
      <Feather name="check" size={15} color={colors.brand.honeyDeep} />
      <AppText variant="bodySmall">{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  headingRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  headingCopy: { flex: 1, gap: spacing.xs },
  lead: { lineHeight: 19 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  trustCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  trustRow: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
