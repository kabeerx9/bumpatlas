import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, shadows, spacing } from "@/design-system";

type CaptureHeroCardProps = {
  prompt: string;
  activeDays: number;
  goal: number;
  onCapture: () => void;
};

export function CaptureHeroCard({ prompt, activeDays, goal, onCapture }: CaptureHeroCardProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.decor} />
      <View style={styles.decorSmall} />

      <View style={styles.metaRow}>
        <View style={styles.badge}>
          <Feather name="heart" size={14} color={colors.brand.peach} />
        </View>
        <AppText variant="caption" weight="semibold" style={styles.meta}>
          {activeDays} of {goal} calm days this week
        </AppText>
      </View>

      <AppText variant="label" style={styles.label}>
        Today’s moment
      </AppText>
      <AppText variant="heading" style={styles.prompt}>
        {prompt}
      </AppText>

      <Button size="lg" onPress={onCapture} style={styles.cta}>
        Capture moment
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing.xl,
    gap: spacing.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.hairline,
    ...shadows.card,
  },
  decor: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.brand.peachSoft,
    top: -50,
    right: -40,
    opacity: 0.9,
  },
  decorSmall: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand.peachSoft,
    bottom: -20,
    left: -20,
    opacity: 0.6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    color: colors.brand.peach,
  },
  label: {
    color: colors.text.secondary,
  },
  prompt: {
    lineHeight: 36,
    maxWidth: "92%",
  },
  cta: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    minWidth: 180,
  },
});
