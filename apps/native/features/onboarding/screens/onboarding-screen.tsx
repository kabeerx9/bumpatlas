import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppText,
  Button,
  borderWidth,
  colors,
  radius,
  shadows,
  spacing,
} from "@/design-system";
import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";
import { appRoutes } from "@/navigation/routes";

type FeatherName = keyof typeof Feather.glyphMap;
type OnboardingStep = 0 | 1 | 2;

const FEATURES: Array<{
  icon: FeatherName;
  title: string;
  description: string;
}> = [
  {
    icon: "map-pin",
    title: "Location-aware",
    description: "Get hints based on where you are",
  },
  {
    icon: "clock",
    title: "Smart timing",
    description: "Suggestions that fit your schedule",
  },
  {
    icon: "heart",
    title: "Build your trip",
    description: "Swipe right to save places you love",
  },
];

const INTERESTS: Array<{
  id: string;
  label: string;
  icon: FeatherName;
  initiallySelected?: boolean;
  mixed?: boolean;
}> = [
  { id: "arts", label: "Arts", icon: "smile", initiallySelected: true },
  { id: "music", label: "Music", icon: "music" },
  { id: "nightlife", label: "Nightlife", icon: "moon", initiallySelected: true },
  { id: "nature", label: "Nature", icon: "navigation", initiallySelected: true },
  { id: "food", label: "Food", icon: "coffee" },
  { id: "all", label: "All", icon: "grid", mixed: true },
];

const PICK_PREVIEWS = [
  { label: "Restaurant", color: colors.discovery.teal },
  { label: "Viewpoint", color: colors.brand.lavender },
  { label: "Cafe", color: colors.status.warning },
  { label: "+2 more", color: colors.border.subtle },
];

export function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(0);
  const [selectedInterestIds, setSelectedInterestIds] = useState(
    () => new Set(INTERESTS.filter((interest) => interest.initiallySelected).map((interest) => interest.id)),
  );

  const canContinue = step !== 1 || selectedInterestIds.size > 0;
  const buttonLabel = step === 2 ? "See staff picks" : "Next";

  function handleInterestPress(id: string) {
    setSelectedInterestIds((current) => {
      const next = new Set(current);

      if (id === "all") {
        if (next.has("all")) {
          next.clear();
          return next;
        }

        INTERESTS.forEach((interest) => next.add(interest.id));
        return next;
      }

      if (next.has(id)) {
        next.delete(id);
        next.delete("all");
      } else {
        next.add(id);
        const allSpecificInterestsSelected = INTERESTS.filter((interest) => interest.id !== "all").every(
          (interest) => next.has(interest.id),
        );
        if (allSpecificInterestsSelected) {
          next.add("all");
        }
      }

      return next;
    });
  }

  async function handleContinue() {
    if (step < 2) {
      setStep((current) => (current + 1) as OnboardingStep);
      return;
    }

    await completeOnboarding();
    router.replace(appRoutes.home);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <Progress currentStep={step} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 ? <IntroStep /> : null}
          {step === 1 ? (
            <InterestsStep selectedInterestIds={selectedInterestIds} onInterestPress={handleInterestPress} />
          ) : null}
          {step === 2 ? <HostelStep /> : null}
        </ScrollView>

        <Button
          disabled={!canContinue}
          onPress={() => void handleContinue()}
          variant={step === 2 ? "primary" : "secondary"}
          size="lg"
          rightAccessory={<Feather color={step === 2 ? colors.text.primary : colors.text.inverse} name="chevron-right" size={16} />}
          style={styles.cta}
        >
          {buttonLabel}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function Progress({ currentStep }: { currentStep: OnboardingStep }) {
  return (
    <View style={styles.progress}>
      {[0, 1, 2].map((index) => (
        <View key={index} style={[styles.progressBar, index <= currentStep && styles.progressBarDone]} />
      ))}
    </View>
  );
}

function IntroStep() {
  return (
    <View style={styles.step}>
      <Header title="Welcome to App Starter" subtitle="Discover what's around you." />

      <View style={styles.featureCard}>
        {FEATURES.map((feature) => (
          <FeatureRow key={feature.title} {...feature} />
        ))}
      </View>
    </View>
  );
}

function InterestsStep({
  selectedInterestIds,
  onInterestPress,
}: {
  selectedInterestIds: Set<string>;
  onInterestPress: (id: string) => void;
}) {
  return (
    <View style={styles.step}>
      <Header title="Your interests" subtitle="Pick what you'd like to discover" />

      <View style={styles.interestGrid}>
        {INTERESTS.map((interest) => {
          const selected = selectedInterestIds.has(interest.id);

          return (
            <Pressable
              accessibilityRole="button"
              key={interest.id}
              onPress={() => onInterestPress(interest.id)}
              style={({ pressed }) => [
                styles.interestCell,
                selected && styles.interestCellSelected,
                interest.mixed && styles.interestCellMixed,
                pressed && styles.pressed,
              ]}
            >
              <Feather color={colors.brand.purple600} name={interest.icon} size={22} />
              <AppText
                variant="label"
                weight={interest.mixed ? "bold" : "medium"}
                style={interest.mixed ? styles.mixedInterestLabel : styles.interestLabel}
              >
                {interest.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.helperGroup}>
        <AppText variant="label" tone="muted" align="center">
          All = surprise me with everything
        </AppText>
        <AppText variant="label" tone="muted" align="center">
          You can change this later
        </AppText>
      </View>
    </View>
  );
}

function HostelStep() {
  return (
    <View style={[styles.step, styles.hostelStep]}>
      <Header title="Your hostel knows this city" subtitle="Staff picks loaded and ready" />

      <View style={styles.hostelCard}>
        <View style={styles.hostelHeader}>
          <View style={styles.hostelIcon}>
            <Feather color={colors.brand.purple600} name="map-pin" size={16} />
          </View>
          <View style={styles.hostelCopy}>
            <View style={styles.hostelNameRow}>
              <AppText variant="caption" weight="bold">
                Home Lisbon Hostel
              </AppText>
              <View style={styles.checkBadge}>
                <Feather color={colors.text.inverse} name="check" size={9} />
              </View>
            </View>
            <AppText variant="label" style={styles.hostelMeta}>
              5 picks from Miguel · updated today
            </AppText>
          </View>
        </View>

        <View style={styles.pickGrid}>
          {PICK_PREVIEWS.map((pick) => (
            <View key={pick.label} style={styles.pickCard}>
              <View style={[styles.pickSwatch, { backgroundColor: pick.color }]} />
              <AppText variant="label" tone="secondary" align="center" numberOfLines={1}>
                {pick.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <AppText variant="bodySmall" tone="secondary" align="center" style={styles.hostelFooter}>
        Real local knowledge from Miguel.{"\n"}No algorithm.
      </AppText>
    </View>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <AppText variant="subhead" tone="brand" weight="semibold">
        {title}
      </AppText>
      <AppText variant="bodySmall" tone="secondary">
        {subtitle}
      </AppText>
    </View>
  );
}

function FeatureRow({
  icon,
  title,
  description,
  style,
}: {
  icon: FeatherName;
  title: string;
  description: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.featureRow, style]}>
      <View style={styles.featureIcon}>
        <Feather color={colors.status.emeraldText} name={icon} size={17} />
      </View>
      <View style={styles.featureCopy}>
        <AppText variant="bodySmall" weight="medium">
          {title}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {description}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.card,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.surface.card,
    paddingHorizontal: 20,
  },
  progress: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 24,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border.subtle,
  },
  progressBarDone: {
    backgroundColor: colors.brand.purple500,
  },
  scrollContent: {
    flexGrow: 1,
  },
  step: {
    flex: 1,
    paddingTop: 28,
  },
  hostelStep: {
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  featureCard: {
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderWidth: borderWidth.hairline,
    borderColor: "#F3F4F6",
    borderRadius: radius.lg,
    backgroundColor: "#F9FAFB",
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  featureIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: "#F0FDF4",
  },
  featureCopy: {
    flex: 1,
    gap: 1,
  },
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  interestCell: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    width: "30.9%",
    minHeight: 82,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: borderWidth.emphasis,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    backgroundColor: colors.surface.card,
  },
  interestCellSelected: {
    borderColor: colors.brand.purple500,
    backgroundColor: "#FAF5FF",
  },
  interestCellMixed: {
    borderWidth: 2,
    borderColor: colors.brand.mint,
    backgroundColor: "#F0FDF4",
  },
  interestLabel: {
    color: colors.text.primary,
  },
  mixedInterestLabel: {
    color: colors.status.emerald,
  },
  helperGroup: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  hostelCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.lavenderLight,
    ...shadows.soft,
  },
  hostelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  hostelIcon: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.card,
    ...shadows.soft,
  },
  hostelCopy: {
    flex: 1,
    gap: 1,
  },
  hostelNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  checkBadge: {
    alignItems: "center",
    justifyContent: "center",
    width: 14,
    height: 14,
    borderRadius: radius.full,
    backgroundColor: colors.status.emerald,
  },
  hostelMeta: {
    color: "#8F6FDD",
  },
  pickGrid: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  pickCard: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.card,
  },
  pickSwatch: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
  },
  hostelFooter: {
    marginTop: spacing.md,
  },
  cta: {
    marginBottom: spacing.lg,
    width: "100%",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
