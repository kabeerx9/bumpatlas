import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockToday } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useRespectReduceMotion } from "@/features/shared/hooks/use-respect-reduce-motion";
import { appRoutes } from "@/navigation/routes";

type Phase = "ready" | "clearance" | "in_progress" | "done" | "skipped";

function formatSeconds(total: number) {
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CareScreen() {
  const router = useRouter();
  const { stageMode, completeCare: completeCareProgress } = useMockUi();
  const { reduceMotion } = useRespectReduceMotion();
  const action =
    stageMode === "pregnancy" ? mockToday.pregnancyWellnessAction : mockToday.wellnessAction;
  const [phase, setPhase] = useState<Phase>("ready");
  const [activeStep, setActiveStep] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(action.durationSeconds);
  const [timerRunning, setTimerRunning] = useState(false);
  const [clearanceAcknowledged, setClearanceAcknowledged] = useState(false);
  const [badgeAwarded, setBadgeAwarded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSecondsLeft(action.durationSeconds);
    setPhase("ready");
    setActiveStep(0);
    setTimerRunning(false);
    setClearanceAcknowledged(false);
  }, [action.id, action.durationSeconds]);

  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          const result = completeCareProgress();
          setBadgeAwarded(Boolean(result.awardedBadgeId || action.badgeOnComplete));
          setPhase("done");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, action.badgeOnComplete, completeCareProgress]);

  function requestStart() {
    setPhase("clearance");
    setClearanceAcknowledged(false);
  }

  function startCare() {
    if (!clearanceAcknowledged) return;
    setPhase("in_progress");
    setActiveStep(0);
    setSecondsLeft(action.durationSeconds);
    if (reduceMotion.current) {
      setTimerRunning(false);
      return;
    }
    setTimerRunning(true);
  }

  function stopTimer() {
    setTimerRunning(false);
  }

  function completeCare() {
    setTimerRunning(false);
    const result = completeCareProgress();
    setBadgeAwarded(Boolean(result.awardedBadgeId || action.badgeOnComplete));
    setPhase("done");
  }

  function skipCare() {
    setTimerRunning(false);
    setPhase("skipped");
  }

  function goHome() {
    router.back();
  }

  if (phase === "done" || phase === "skipped") {
    const skipped = phase === "skipped";
    return (
      <SoftStackShell title="Care" closeIcon="x" onBack={goHome} centered>
        <View style={styles.finishMark}>
            <Feather
              name={skipped ? "heart" : badgeAwarded ? "award" : "check"}
              size={28}
              color={colors.brand.peach}
            />
          </View>
          <AppText variant="heading" align="center">
            {skipped ? "That’s okay" : badgeAwarded ? "Care Pause earned" : "You took a pause"}
          </AppText>
          <AppText variant="body" tone="secondary" align="center" style={styles.finishCopy}>
            {skipped
              ? "Skipping Care never takes away your memories or your week. Come back when you have a quiet minute."
              : badgeAwarded
                ? `${action.badgeOnComplete?.description ?? "You completed a wellness Care action."} Your week of calm days still welcomes this — no streak to protect.`
                : "Two minutes for you counts. Your week of calm days still welcomes this — no streak to protect."}
          </AppText>
          {!skipped && badgeAwarded && action.badgeOnComplete ? (
            <View style={styles.badgeCard}>
              <Feather name="award" size={20} color={colors.brand.peach} />
              <View style={styles.badgeCopy}>
                <AppText weight="semibold">{action.badgeOnComplete.title}</AppText>
                <AppText variant="caption" tone="secondary">
                  Added to your badges
                </AppText>
              </View>
            </View>
          ) : null}
          <Button size="lg" onPress={goHome} style={styles.finishCta}>
            Back to Today
          </Button>
          {!skipped ? (
            <Pressable
              onPress={() => router.push(appRoutes.badges)}
              style={styles.badgesLink}
              accessibilityLabel="View badges"
            >
              <AppText variant="caption" weight="semibold" style={styles.packsText}>
                View badges
              </AppText>
            </Pressable>
          ) : null}
      </SoftStackShell>
    );
  }

  if (phase === "clearance") {
    return (
      <SoftStackShell
        title="Before you begin"
        onBack={() => setPhase("ready")}
        footer={
          <>
            <Button size="lg" disabled={!clearanceAcknowledged} onPress={startCare}>
              Begin gently
            </Button>
            <Pressable onPress={skipCare} style={styles.skipBtn} hitSlop={8}>
              <AppText tone="secondary" align="center">
                Skip for today
              </AppText>
            </Pressable>
          </>
        }
      >
        <AppText variant="caption" tone="secondary">
          Medical clearance reminder
        </AppText>

        <View style={styles.clearanceCard}>
          <Feather name="alert-circle" size={22} color={colors.brand.peach} />
          <AppText variant="title">{action.title}</AppText>
          <AppText variant="body" tone="secondary" style={styles.clearanceBody}>
            {action.clearanceCopy}
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            {action.stopCopy}
          </AppText>
        </View>

        <Pressable
          onPress={() => setClearanceAcknowledged(!clearanceAcknowledged)}
          style={styles.acceptRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: clearanceAcknowledged }}
          accessibilityLabel="I understand and feel cleared to try this gently"
        >
          <View style={[styles.checkbox, clearanceAcknowledged && styles.checkboxOn]}>
            {clearanceAcknowledged ? (
              <Feather name="check" size={14} color={colors.text.inverse} />
            ) : null}
          </View>
          <AppText variant="bodySmall" style={styles.acceptCopy}>
            I understand — I’ll stop if anything feels wrong, and I’ve checked with my clinician
            if I have complications or restrictions.
          </AppText>
        </Pressable>
      </SoftStackShell>
    );
  }

  return (
    <SoftStackShell
      title="Care"
      closeIcon="x"
      onBack={goHome}
      footer={
        phase === "ready" ? (
          <>
            <Button size="lg" onPress={requestStart}>
              Begin gently
            </Button>
            <Pressable onPress={skipCare} style={styles.skipBtn} hitSlop={8}>
              <AppText tone="secondary" align="center">
                Skip for today
              </AppText>
            </Pressable>
          </>
        ) : (
          <>
            <Button size="lg" onPress={completeCare}>
              I’m done
            </Button>
            <Pressable onPress={skipCare} style={styles.skipBtn} hitSlop={8}>
              <AppText tone="secondary" align="center">
                Stop now · that’s enough
              </AppText>
            </Pressable>
          </>
        )
      }
    >
      <AppText variant="caption" tone="secondary" align="center">
        For you · {action.duration}
      </AppText>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Feather name="wind" size={22} color={colors.text.inverse} />
        </View>
        <AppText variant="heading" style={styles.heroTitle}>
          {action.title}
        </AppText>
        <AppText variant="body" style={styles.heroDetail}>
          {action.detail}
        </AppText>
        <AppText variant="caption" style={styles.heroMeta}>
          {action.stageNote}
        </AppText>
        <AppText variant="caption" style={styles.heroMeta}>
          Reviewed by {action.reviewerName} · {action.reviewedOn}
        </AppText>
        <AppText variant="caption" style={styles.heroMeta}>
          Source: {action.sourceName}
        </AppText>
      </View>

      {phase === "in_progress" ? (
        <View style={styles.timerCard}>
          <AppText variant="caption" style={styles.peachLabel}>
            Soft timer · optional
            {reduceMotion.current ? " · reduce motion on" : ""}
          </AppText>
          <AppText variant="hero" style={styles.timerValue}>
            {formatSeconds(secondsLeft)}
          </AppText>
          <Pressable
            onPress={timerRunning ? stopTimer : () => setTimerRunning(true)}
            accessibilityLabel={timerRunning ? "Pause timer" : "Resume timer"}
            style={styles.timerToggleHit}
          >
            <AppText weight="semibold" style={styles.timerToggle}>
              {timerRunning ? "Pause timer" : "Resume timer"}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <AppText weight="semibold">How to do it</AppText>

      {action.steps.map((step, index) => {
        const isActive = phase === "in_progress" && index === activeStep;
        const isPast = phase === "in_progress" && index < activeStep;
        return (
          <Pressable
            key={step.id}
            onPress={() => {
              if (phase === "in_progress") setActiveStep(index);
            }}
            style={[
              styles.stepCard,
              isActive && styles.stepActive,
              isPast && styles.stepPast,
            ]}
            accessibilityLabel={`Step ${index + 1}: ${step.title}`}
          >
            <View style={[styles.stepIndex, isActive && styles.stepIndexActive]}>
              {isPast ? (
                <Feather name="check" size={14} color={colors.text.inverse} />
              ) : (
                <AppText
                  variant="caption"
                  weight="semibold"
                  style={isActive ? styles.stepIndexTextActive : undefined}
                >
                  {index + 1}
                </AppText>
              )}
            </View>
            <View style={styles.stepCopy}>
              <AppText weight="semibold">{step.title}</AppText>
              <AppText variant="bodySmall" tone="secondary">
                {step.body}
              </AppText>
            </View>
          </Pressable>
        );
      })}

      {phase === "in_progress" && activeStep < action.steps.length - 1 ? (
        <Button
          variant="ghost"
          onPress={() => setActiveStep((current) => current + 1)}
          style={styles.nextStep}
        >
          Next step
        </Button>
      ) : null}

      <View style={styles.stopBox}>
        <Feather name="alert-circle" size={16} color={colors.brand.peach} />
        <AppText variant="bodySmall" tone="secondary" style={styles.stopCopy}>
          {action.stopCopy}
        </AppText>
      </View>

      <Pressable
        onPress={() => router.push(appRoutes.wellnessPacks)}
        style={styles.packsLink}
        accessibilityLabel="Browse wellness packs"
      >
        <AppText variant="caption" weight="semibold" style={styles.packsText}>
          Browse more Care packs
        </AppText>
        <Feather name="arrow-up-right" size={14} color={colors.brand.peach} />
      </Pressable>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  heroTitle: {
    color: colors.text.inverse,
  },
  heroDetail: {
    color: "rgba(255,255,255,0.9)",
  },
  heroMeta: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  timerCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  peachLabel: {
    color: colors.brand.peach,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  timerValue: {
    color: colors.brand.ink,
  },
  timerToggle: {
    color: colors.brand.peach,
  },
  timerToggleHit: {
    minHeight: 44,
    justifyContent: "center",
  },
  stepCard: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.72)",
    padding: spacing.lg,
  },
  stepActive: {
    backgroundColor: colors.surface.card,
    borderWidth: 1.5,
    borderColor: colors.brand.peach,
  },
  stepPast: {
    opacity: 0.72,
  },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepIndexActive: {
    backgroundColor: colors.brand.peach,
  },
  stepIndexTextActive: {
    color: colors.text.inverse,
  },
  stepCopy: {
    flex: 1,
    gap: 4,
  },
  nextStep: {
    alignSelf: "flex-start",
  },
  stopBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  stopCopy: {
    flex: 1,
    lineHeight: 20,
  },
  packsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
  },
  packsText: {
    color: colors.brand.peach,
  },
  skipBtn: {
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  finishMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  finishCopy: {
    maxWidth: 300,
    lineHeight: 22,
  },
  finishCta: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
  badgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    alignSelf: "stretch",
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: spacing.lg,
  },
  badgeCopy: { flex: 1, gap: 2 },
  badgesLink: { minHeight: 44, justifyContent: "center" },
  clearanceCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: spacing.xl,
    gap: spacing.md,
  },
  clearanceBody: { lineHeight: 22 },
  acceptRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.brand.peach },
  acceptCopy: { flex: 1, lineHeight: 20 },
});
