import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { spacing } from "@/design-system";
import { OnboardingAlbumScene } from "@/features/onboarding/components/onboarding-album-scene";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { CompletionStep } from "@/features/onboarding/components/steps/completion-step";
import { GoalStep, type OnboardingGoal } from "@/features/onboarding/components/steps/goal-step";
import { HouseholdStep } from "@/features/onboarding/components/steps/household-step";
import { InviteStep } from "@/features/onboarding/components/steps/invite-step";
import { NotificationsStep } from "@/features/onboarding/components/steps/notifications-step";
import { PrivacyStep } from "@/features/onboarding/components/steps/privacy-step";
import { ProfileStep } from "@/features/onboarding/components/steps/profile-step";
import { RoleStep, type OnboardingRole } from "@/features/onboarding/components/steps/role-step";
import { WelcomeStep } from "@/features/onboarding/components/steps/welcome-step";
import {
  deriveAlbumSceneModel,
  nextAlbumDirection,
  resolveOnboardingCompletion,
  type AlbumDirection,
  type AlbumStage,
} from "@/features/onboarding/lib/album-scene-model";
import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { enablePushAndRegister } from "@/lib/notifications/push";
import { FEATURES } from "@/lib/features";
import { appRoutes } from "@/navigation/routes";

const ONBOARDING_STEPS = [
  "welcome",
  "privacy",
  "role",
  "household",
  "profile",
  "goal",
  "notifications",
  "invite",
] as const;

const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();
  const { applyOnboardingProfile } = useAppState();
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const step = ONBOARDING_STEPS[stepIndex] ?? "welcome";
  const [showCompletion, setShowCompletion] = useState(false);
  const [direction, setDirection] = useState<AlbumDirection>("forward");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [attested, setAttested] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState({
    dailyPrompt: true,
    wellnessReminder: true,
    partnerActivity: true,
    weeklyRecap: true,
    communityReply: false,
    subscription: true,
  });

  const resolvedHouseholdName = useMemo(() => {
    if (householdName.trim()) return householdName.trim();
    if (childName.trim()) return `${childName.trim()}'s household`;
    return "Our household";
  }, [childName, householdName]);

  const albumStage: AlbumStage = showCompletion ? "complete" : step;
  const albumModel = useMemo(
    () =>
      deriveAlbumSceneModel({
        stage: albumStage,
        direction,
        role,
        householdName: resolvedHouseholdName,
        childName,
        childDob,
        dueDate,
        goal,
      }),
    [albumStage, childDob, childName, direction, dueDate, goal, resolvedHouseholdName, role],
  );

  const canContinue = useMemo(() => {
    if (showCompletion) return FEATURES.onboardingPreview;

    switch (step) {
      case "welcome":
        return attested;
      case "privacy":
        return termsAccepted && privacyAccepted;
      case "role":
        return role !== null;
      case "household":
        return true;
      case "profile":
        if (role === "expecting") return dueDate.trim().length > 0;
        return childName.trim().length > 0 && childDob.trim().length > 0;
      case "goal":
        return goal !== null;
      case "notifications":
      case "invite":
        return true;
      default:
        return false;
    }
  }, [
    attested,
    childDob,
    childName,
    dueDate,
    goal,
    privacyAccepted,
    role,
    step,
    termsAccepted,
    showCompletion,
  ]);

  const continueLabel = useMemo(() => {
    if (isSubmitting) return "Saving…";
    if (showCompletion) return "Restart preview";
    if (step === "invite" && FEATURES.onboardingPreview) return "Finish preview";
    if (step === "invite") return "Invite partner";
    if (step === "notifications") return "Continue";
    if (step === "welcome") return "Continue";
    return "Save & Continue";
  }, [isSubmitting, showCompletion, step]);

  function goBack() {
    if (showCompletion) {
      setDirection("back");
      setShowCompletion(false);
      return;
    }

    if (stepIndex > 0) {
      setDirection(nextAlbumDirection(stepIndex, stepIndex - 1));
      setStepIndex((current) => current - 1);
    }
  }

  function goNext() {
    if (stepIndex < TOTAL_STEPS - 1) {
      setDirection(nextAlbumDirection(stepIndex, stepIndex + 1));
      setStepIndex((current) => current + 1);
    }
  }

  function restartPreview() {
    setDirection("back");
    setShowCompletion(false);
    setStepIndex(0);
    setAttested(false);
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    setRole(null);
    setHouseholdName("");
    setChildName("");
    setChildDob("");
    setDueDate("");
    setGoal(null);
    setNotificationPrefs({
      dailyPrompt: true,
      wellnessReminder: true,
      partnerActivity: true,
      weeklyRecap: true,
      communityReply: false,
      subscription: true,
    });
  }

  async function finishOnboarding(destination: "home" | "invite") {
    if (isSubmitting) return;

    if (resolveOnboardingCompletion(FEATURES.onboardingPreview) === "show-preview-completion") {
      setDirection("forward");
      setShowCompletion(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await applyOnboardingProfile({
        role,
        dueDate,
        childName,
        childDob,
        householdName: resolvedHouseholdName,
        primaryGoal: goal,
        notificationPrefs,
      });
      setDirection("forward");
      setShowCompletion(true);
      await new Promise((resolve) => setTimeout(resolve, 460));

      // Permission and token registration are deliberately part of the final
      // submission only. They never run while a user is browsing the steps.
      void enablePushAndRegister();
      await completeOnboarding();
      router.replace(destination === "invite" ? appRoutes.invite : appRoutes.home);
    } catch {
      // Family/pregnancy/consent writes failed server-side — stay on this
      // step rather than marking onboarding complete for a household that
      // was never created.
      Alert.alert(
        "Couldn't finish setup",
        "Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleContinue() {
    if (isSubmitting) return;

    if (showCompletion) {
      restartPreview();
      return;
    }

    if (step === "invite") {
      await finishOnboarding("invite");
      return;
    }

    if (stepIndex < TOTAL_STEPS - 1) {
      goNext();
      return;
    }

    await finishOnboarding("home");
  }

  async function handleSkipInvite() {
    await finishOnboarding("home");
  }

  function toggleNotification(key: keyof typeof notificationPrefs) {
    setNotificationPrefs((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <OnboardingShell
      scene={<OnboardingAlbumScene model={albumModel} />}
      stepIndex={showCompletion ? TOTAL_STEPS : stepIndex + 1}
      totalSteps={TOTAL_STEPS}
      canContinue={canContinue && !isSubmitting}
      onBack={(showCompletion || stepIndex > 0) && !isSubmitting ? goBack : undefined}
      onContinue={() => void handleContinue()}
      continueLabel={continueLabel}
      progressLabel={showCompletion ? "Your first page" : undefined}
      secondaryLabel={!showCompletion && step === "invite" ? "Skip for now" : undefined}
      onSecondary={!showCompletion && step === "invite" ? () => void handleSkipInvite() : undefined}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.stepContent}>
          {showCompletion ? <CompletionStep preview={FEATURES.onboardingPreview} /> : null}
          {!showCompletion && step === "welcome" ? (
            <WelcomeStep attested={attested} onToggleAttestation={() => setAttested((v) => !v)} />
          ) : null}
          {!showCompletion && step === "privacy" ? (
            <PrivacyStep
              termsAccepted={termsAccepted}
              privacyAccepted={privacyAccepted}
              onToggleTerms={() => setTermsAccepted((v) => !v)}
              onTogglePrivacy={() => setPrivacyAccepted((v) => !v)}
            />
          ) : null}
          {!showCompletion && step === "role" ? <RoleStep role={role} onSelect={setRole} /> : null}
          {!showCompletion && step === "household" ? (
            <HouseholdStep
              householdName={householdName}
              onChangeHouseholdName={setHouseholdName}
            />
          ) : null}
          {!showCompletion && step === "profile" ? (
            <ProfileStep
              role={role}
              childName={childName}
              childDob={childDob}
              dueDate={dueDate}
              onChangeChildName={setChildName}
              onChangeChildDob={setChildDob}
              onChangeDueDate={setDueDate}
            />
          ) : null}
          {!showCompletion && step === "goal" ? <GoalStep goal={goal} onSelect={setGoal} /> : null}
          {!showCompletion && step === "notifications" ? (
            <NotificationsStep prefs={notificationPrefs} onToggle={toggleNotification} />
          ) : null}
          {!showCompletion && step === "invite" ? (
            <InviteStep householdName={resolvedHouseholdName} childName={childName} />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stepContent: { flex: 1, minHeight: 0, paddingBottom: spacing.sm },
});
