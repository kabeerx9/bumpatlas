import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";

type HighRiskEscalateProps = {
  onAcknowledge: () => void;
  onKeepReporting: () => void;
};

export function HighRiskEscalatePanel({
  onAcknowledge,
  onKeepReporting,
}: HighRiskEscalateProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.icon}>
        <Feather name="alert-triangle" size={22} color={colors.brand.terracotta} />
      </View>
      <AppText weight="semibold">Priority safety review</AppText>
      <AppText variant="bodySmall" tone="secondary" style={styles.copy}>
        Reports about self-harm, abuse, or exploitation of a minor are escalated immediately to
        founders with dedicated logging. If you or someone else is in immediate danger, contact local
        emergency services.
      </AppText>
      <Button size="lg" onPress={onKeepReporting}>
        Continue report
      </Button>
      <Button size="lg" variant="ghost" onPress={onAcknowledge}>
        I understand
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.brand.terracotta,
    backgroundColor: "rgba(255,255,255,0.95)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { lineHeight: 20 },
});
