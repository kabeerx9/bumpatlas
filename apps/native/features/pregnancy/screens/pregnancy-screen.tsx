import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockPregnancy } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import {
  gestationalWeekFromDueDate,
  pregnancyWeekLabel,
  trimesterFromWeek,
} from "@/features/pregnancy/lib/gestational-week";
import { appRoutes } from "@/navigation/routes";

export function PregnancyScreen() {
  const router = useRouter();
  const {
    checklistDone,
    toggleChecklistItem,
    selectedMood,
    setSelectedMood,
    pregnancyConverted,
    pregnancyChildName,
    dueDateOverride,
  } = useMockUi();

  const dueDate = dueDateOverride ?? mockPregnancy.dueDate;
  const computedWeek = gestationalWeekFromDueDate(dueDate);
  const weekLabel = pregnancyWeekLabel(computedWeek);
  const trimester = trimesterFromWeek(computedWeek);

  const categories = Array.from(new Set(mockPregnancy.checklist.map((item) => item.category)));

  if (pregnancyConverted) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
              <Feather name="arrow-left" size={20} color={colors.brand.ink} />
            </Pressable>
            <AppText weight="semibold">Pregnancy journal</AppText>
            <View style={styles.iconBtn} />
          </View>
          <View style={styles.converted}>
            <Feather name="heart" size={28} color={colors.brand.peach} />
            <AppText variant="heading" align="center">
              Converted to {pregnancyChildName}&apos;s story
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              Pregnancy memories stay in Journey under the new child profile.
            </AppText>
            <Button size="lg" onPress={() => router.replace(appRoutes.journey)}>
              Open Journey
            </Button>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.atmosphere} pointerEvents="none">
        <View style={styles.blob} />
      </View>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Pregnancy</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <AppText variant="caption" style={styles.eyebrow}>
              {trimester}
            </AppText>
            <AppText variant="heading" tone="inverse">
              {weekLabel}
            </AppText>
            <AppText variant="bodySmall" style={styles.heroMeta}>
              Due {dueDate} · week {computedWeek} computed from due date (40-week model)
            </AppText>
          </View>

          <View style={styles.card}>
            <AppText variant="caption" style={styles.peach}>
              This week&apos;s tip
            </AppText>
            <AppText weight="semibold">{mockPregnancy.weeklyTip.title}</AppText>
            <AppText variant="bodySmall" tone="secondary">
              {mockPregnancy.weeklyTip.summary}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {mockPregnancy.weeklyTip.reviewerName} · {mockPregnancy.weeklyTip.reviewedOn}
            </AppText>
          </View>

          <View style={styles.card}>
            <AppText weight="semibold">Nearby week cards</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Stage tips sample — full inventory ships with content ops.
            </AppText>
            {mockPregnancy.weekCards.map((card) => (
              <View key={card.week} style={styles.weekRow}>
                <AppText variant="caption" weight="semibold" style={styles.peach}>
                  Week {card.week}
                </AppText>
                <AppText weight="semibold">{card.title}</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  {card.summary}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <AppText weight="semibold">Bump journal prompt</AppText>
            <AppText variant="bodySmall" tone="secondary">
              {mockPregnancy.bumpPrompt}
            </AppText>
            <Button
              size="lg"
              variant="ghost"
              onPress={() => router.push(appRoutes.capture)}
              style={styles.softBtn}
            >
              Capture a bump moment
            </Button>
          </View>

          <View style={styles.card}>
            <AppText weight="semibold">How are you feeling?</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Optional reflection — not a clinical mood tracker.
            </AppText>
            <View style={styles.moodRow}>
              {mockPregnancy.moodOptions.map((mood) => {
                const active = selectedMood === mood.id;
                return (
                  <Pressable
                    key={mood.id}
                    onPress={() => setSelectedMood(active ? null : mood.id)}
                    style={[styles.moodChip, active && styles.moodChipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <AppText
                      variant="caption"
                      weight="semibold"
                      style={active ? styles.moodTextActive : undefined}
                    >
                      {mood.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <AppText weight="semibold">Your checklist</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Hospital bag & clinician questions — non-clinical, just for you.
          </AppText>

          {categories.map((category) => (
            <View key={category} style={styles.card}>
              <AppText variant="caption" style={styles.peach}>
                {category}
              </AppText>
              {mockPregnancy.checklist
                .filter((item) => item.category === category)
                .map((item) => {
                  const done = checklistDone[item.id];
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggleChecklistItem(item.id)}
                      style={styles.checkRow}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: done }}
                    >
                      <View style={[styles.checkbox, done && styles.checkboxOn]}>
                        {done ? (
                          <Feather name="check" size={14} color={colors.text.inverse} />
                        ) : null}
                      </View>
                      <AppText
                        variant="bodySmall"
                        style={done ? styles.checkDone : undefined}
                      >
                        {item.title}
                      </AppText>
                    </Pressable>
                  );
                })}
            </View>
          ))}

          <View style={styles.convertCard}>
            <Feather name="sunrise" size={20} color={colors.brand.peach} />
            <AppText weight="semibold">Baby arrived?</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Convert this pregnancy journal into a child profile. Memories stay with you.
            </AppText>
            <Button size="lg" onPress={() => router.push(appRoutes.convertBirth)}>
              Convert to child profile
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8EDE6" },
  atmosphere: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  blob: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(229,155,138,0.26)",
    top: -90,
    right: -70,
  },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  hero: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroMeta: { color: "rgba(255,255,255,0.88)" },
  card: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  peach: { color: colors.brand.peach, textTransform: "uppercase", letterSpacing: 0.4 },
  softBtn: { backgroundColor: colors.brand.peachSoft, borderColor: colors.brand.peachSoft },
  weekRow: {
    gap: 2,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(44,36,32,0.06)",
  },
  moodRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  moodChip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  moodChipActive: {
    backgroundColor: colors.brand.peachSoft,
    borderColor: colors.brand.peach,
  },
  moodTextActive: { color: colors.brand.peach },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.brand.peach },
  checkDone: { textDecorationLine: "line-through", opacity: 0.6 },
  convertCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  converted: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.page,
    gap: spacing.md,
  },
});
