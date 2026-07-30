import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  CardStack,
  Pill,
  Surface,
  colors,
  radius,
  spacing,
  useAppTheme,
} from "@/design-system";
import { mockPregnancy } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import {
  gestationalWeekFromDueDate,
  pregnancyWeekLabel,
  trimesterFromWeek,
} from "@/features/pregnancy/lib/gestational-week";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

// Presentational only — a friendly "size of a ..." cue per week, not clinical data.
const sizeOfWeek: Record<number, string> = {
  8: "a raspberry",
  12: "a lime",
  16: "an avocado",
  20: "a banana",
  24: "an ear of corn",
  28: "an eggplant",
  32: "a pineapple",
  36: "a honeydew melon",
  39: "a small pumpkin",
};

function sizeOfLabel(week: number) {
  const knownWeeks = Object.keys(sizeOfWeek)
    .map(Number)
    .sort((a, b) => a - b);
  let closest = knownWeeks[0];
  for (const knownWeek of knownWeeks) {
    if (knownWeek <= week) closest = knownWeek;
  }
  return sizeOfWeek[closest] ?? "a growing little one";
}

export function PregnancyScreen() {
  const router = useRouter();
  const theme = useAppTheme();
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
  const progress = Math.min(1, Math.max(0, computedWeek / 40));

  const categories = Array.from(new Set(mockPregnancy.checklist.map((item) => item.category)));

  if (pregnancyConverted) {
    return (
      <SoftStackShell
        title="Pregnancy journal"
        onBack={() => router.back()}
        centered
      >
        <Feather name="heart" size={28} color={colors.brand.honeyDeep} />
        <AppText variant="heading" align="center">
          Converted to {pregnancyChildName}&apos;s story
        </AppText>
        <AppText variant="bodySmall" tone="secondary" align="center">
          Pregnancy memories stay in Journey under the new child profile.
        </AppText>
        <Button size="lg" onPress={() => router.replace(appRoutes.journey)}>
          Open Journey
        </Button>
      </SoftStackShell>
    );
  }

  return (
    <SoftStackShell title="Pregnancy" onBack={() => router.back()}>
      <CardStack style={styles.heroStack}>
        <Surface elevated radiusSize="xl" padding="xl" style={styles.hero}>
          <Pill tone="selected">{trimester}</Pill>
          <AppText
            variant="hero"
            weight="semibold"
            style={styles.heroWeek}
          >
            {weekLabel}
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            Baby is about the size of {sizeOfLabel(computedWeek)}
          </AppText>

          <View style={[styles.progressTrack, { backgroundColor: theme.colors.background }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: colors.brand.honey },
              ]}
            />
          </View>
          <AppText variant="caption" tone="tertiary">
            Due {dueDate} · computed from a 40-week model
          </AppText>
        </Surface>
      </CardStack>

      <Surface elevated radiusSize="lg" style={styles.card}>
        <Pill tone="lavender">This week&apos;s tip</Pill>
        <AppText weight="semibold">{mockPregnancy.weeklyTip.title}</AppText>
        <AppText variant="bodySmall" tone="secondary">
          {mockPregnancy.weeklyTip.summary}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {mockPregnancy.weeklyTip.reviewerName} · {mockPregnancy.weeklyTip.reviewedOn}
        </AppText>
      </Surface>

      <Surface elevated radiusSize="lg" style={styles.card}>
        <AppText weight="semibold">Nearby week cards</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Stage tips sample — full inventory ships with content ops.
        </AppText>
        {mockPregnancy.weekCards.map((card) => (
          <View key={card.week} style={styles.weekRow}>
            <Pill tone="mint">Week {card.week}</Pill>
            <AppText weight="semibold" style={styles.weekTitle}>
              {card.title}
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              {card.summary}
            </AppText>
          </View>
        ))}
      </Surface>

      <Surface elevated radiusSize="lg" style={styles.card}>
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
      </Surface>

      <Surface elevated radiusSize="lg" style={styles.card}>
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
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Pill tone={active ? "selected" : "neutral"}>{mood.label}</Pill>
              </Pressable>
            );
          })}
        </View>
      </Surface>

      <AppText weight="semibold">Your checklist</AppText>
      <AppText variant="bodySmall" tone="secondary">
        Hospital bag & clinician questions — non-clinical, just for you.
      </AppText>

      {categories.map((category) => (
        <Surface key={category} elevated radiusSize="lg" style={styles.card}>
          <Pill tone="mint">{category}</Pill>
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
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: colors.brand.honeyDeep },
                      done && { backgroundColor: colors.brand.honey, borderColor: colors.brand.honey },
                    ]}
                  >
                    {done ? <Feather name="check" size={14} color={colors.brand.ink} /> : null}
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
        </Surface>
      ))}

      <Surface tone="warm" elevated={false} bordered={false} radiusSize="xl" style={styles.card}>
        <Feather name="sunrise" size={20} color={colors.brand.honeyDeep} />
        <AppText weight="semibold">Baby arrived?</AppText>
        <AppText variant="bodySmall" tone="secondary">
          Convert this pregnancy journal into a child profile. Memories stay with you.
        </AppText>
        <Button size="lg" onPress={() => router.push(appRoutes.convertBirth)}>
          Convert to child profile
        </Button>
      </Surface>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  heroStack: {
    marginBottom: spacing.xs,
  },
  hero: {
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  heroWeek: {
    fontSize: 56,
    lineHeight: 60,
  },
  progressTrack: {
    alignSelf: "stretch",
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  card: {
    gap: spacing.sm,
  },
  weekRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  weekTitle: {
    marginTop: 2,
  },
  softBtn: {
    backgroundColor: colors.brand.honeySoft,
    borderColor: colors.brand.honeySoft,
  },
  moodRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
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
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: { textDecorationLine: "line-through", opacity: 0.6 },
});
