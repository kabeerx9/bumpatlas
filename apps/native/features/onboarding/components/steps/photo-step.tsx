import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

type PhotoStepProps = {
  onAddPhoto?: () => void;
};

export function PhotoStep({ onAddPhoto }: PhotoStepProps) {
  return (
    <View style={styles.block}>
      <AppText variant="heading">Tell us about your little one</AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        Add a photo now or skip — you can always do this later from Family.
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add photo"
        onPress={onAddPhoto}
        style={styles.photoCircle}
      >
        <View style={styles.cameraBadge}>
          <Feather name="camera" size={24} color={colors.brand.honeyDeep} />
        </View>
        <AppText variant="label" tone="secondary">
          Add Photo
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    gap: spacing.md,
    alignItems: "stretch",
  },
  lead: { maxWidth: 320, lineHeight: 24 },
  photoCircle: {
    alignSelf: "center",
    marginTop: spacing.xxl,
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(44,36,32,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface.card,
  },
  cameraBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.honeySoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
