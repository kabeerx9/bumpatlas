import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, shadows, spacing } from "@/design-system";

type EscalateCardProps = {
  title?: string;
  body?: string;
  onCallClinician?: () => void;
  onEmergency?: () => void;
};

export function EscalateCard({
  title = "Talk with a clinician",
  body = "This sounds like something a qualified clinician should hear directly. BumpAtlas can’t assess urgency or give medical advice.",
  onCallClinician,
  onEmergency,
}: EscalateCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Feather name="phone-call" size={18} color={colors.brand.honeyDeep} />
      </View>
      <AppText weight="semibold">{title}</AppText>
      <AppText variant="bodySmall" tone="secondary" style={styles.body}>
        {body}
      </AppText>
      <View style={styles.actions}>
        {onCallClinician ? (
          <Button size="sm" variant="ghost" onPress={onCallClinician} style={styles.btn}>
            Call my clinic
          </Button>
        ) : null}
        {onEmergency ? (
          <Button size="sm" onPress={onEmergency} style={styles.emergencyBtn}>
            Emergency resources
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.brand.honeyDeep,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...shadows.soft,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    backgroundColor: colors.surface.card,
  },
  emergencyBtn: {
    backgroundColor: colors.brand.honeyDeep,
  },
});
