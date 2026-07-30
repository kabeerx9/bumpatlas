import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, shadows, spacing } from "@/design-system";
import { BabyIllustration } from "@/features/onboarding/components/baby-illustration";

type Gender = "boy" | "girl";

type GenderStepProps = {
  gender: Gender | null;
  onSelect: (gender: Gender) => void;
};

const OPTIONS: Array<{ id: Gender; label: string }> = [
  { id: "boy", label: "Boy" },
  { id: "girl", label: "Girl" },
];

export function GenderStep({ gender, onSelect }: GenderStepProps) {
  return (
    <View style={styles.block}>
      <AppText variant="heading">Tell us about your little one</AppText>
      <AppText variant="body" tone="secondary" style={styles.lead}>
        Optional — helps tailor activities and language.
      </AppText>

      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const selected = gender === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(option.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              {selected ? (
                <View style={styles.check}>
                  <Feather name="check" size={13} color={colors.brand.ink} />
                </View>
              ) : null}

              <View style={styles.artFrame}>
                <BabyIllustration variant={option.id} />
              </View>

              <AppText
                weight="semibold"
                style={[styles.label, selected && styles.labelSelected]}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  lead: { maxWidth: 320, lineHeight: 24 },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  card: {
    flex: 1,
    minHeight: 248,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.soft,
  },
  cardSelected: {
    borderColor: colors.brand.honey,
    backgroundColor: colors.brand.honeySoft,
  },
  check: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand.honey,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  artFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "rgba(248,228,222,0.35)",
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  label: {
    marginTop: spacing.md,
    color: colors.text.primary,
    fontSize: 16,
  },
  labelSelected: {
    color: colors.brand.ink,
  },
});
