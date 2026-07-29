import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

import { spacing } from "@/design-system";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { GoalStep, type OnboardingGoal } from "@/features/onboarding/components/steps/goal-step";
import { HouseholdStep } from "@/features/onboarding/components/steps/household-step";
import { InviteStep } from "@/features/onboarding/components/steps/invite-step";
import { NotificationsStep } from "@/features/onboarding/components/steps/notifications-step";
import { PrivacyStep } from "@/features/onboarding/components/steps/privacy-step";
import { ProfileStep } from "@/features/onboarding/components/steps/profile-step";
import { RoleStep, type OnboardingRole } from "@/features/onboarding/components/steps/role-step";
import { WelcomeStep } from "@/features/onboarding/components/steps/welcome-step";
import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { enablePushAndRegister } from "@/lib/notifications/push";
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
  const { applyOnboardingProfile } = useMockUi();
  const router = useRouter();

  const [stepIndex, setStepIndex] = useState(0);
  const step = ONBOARDING_STEPS[stepIndex];

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

  const canContinue = useMemo(() => {
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
        if (role === "partner") return true;
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
  ]);

  const continueLabel = useMemo(() => {
    if (step === "invite") return "Invite partner";
    if (step === "notifications") return "Continue";
    if (step === "welcome") return "Continue";
    return "Save & Continue";
  }, [step]);

  function goBack() {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
    }
  }

  function goNext() {
    if (stepIndex < TOTAL_STEPS - 1) {
      setStepIndex((current) => current + 1);
    }
  }

  async function finishOnboarding(destination: "home" | "invite") {
    await applyOnboardingProfile({
      role,
      dueDate,
      childName,
      childDob,
      householdName: resolvedHouseholdName,
      primaryGoal: goal,
      notificationPrefs,
    });
    await completeOnboarding();
    router.replace(destination === "invite" ? appRoutes.invite : appRoutes.home);
  }

  async function handleContinue() {
    if (step === "invite") {
      await finishOnboarding("invite");
      return;
    }

    if (step === "notifications") {
      // Request OS permission here so the production path is ready before home.
      // Denied is fine — prefs still save and can be enabled later in settings.
      void enablePushAndRegister();
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
      stepIndex={stepIndex + 1}
      totalSteps={TOTAL_STEPS}
      canContinue={canContinue}
      onBack={stepIndex > 0 ? goBack : undefined}
      onContinue={() => void handleContinue()}
      continueLabel={continueLabel}
      secondaryLabel={step === "invite" ? "Skip for now" : undefined}
      onSecondary={step === "invite" ? () => void handleSkipInvite() : undefined}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {step === "welcome" ? (
            <WelcomeStep attested={attested} onToggleAttestation={() => setAttested((v) => !v)} />
          ) : null}
          {step === "privacy" ? (
            <PrivacyStep
              termsAccepted={termsAccepted}
              privacyAccepted={privacyAccepted}
              onToggleTerms={() => setTermsAccepted((v) => !v)}
              onTogglePrivacy={() => setPrivacyAccepted((v) => !v)}
            />
          ) : null}
          {step === "role" ? <RoleStep role={role} onSelect={setRole} /> : null}
          {step === "household" ? (
            <HouseholdStep
              householdName={householdName}
              onChangeHouseholdName={setHouseholdName}
            />
          ) : null}
          {step === "profile" ? (
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
          {step === "goal" ? <GoalStep goal={goal} onSelect={setGoal} /> : null}
          {step === "notifications" ? (
            <NotificationsStep prefs={notificationPrefs} onToggle={toggleNotification} />
          ) : null}
          {step === "invite" ? (
            <InviteStep householdName={resolvedHouseholdName} childName={childName} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
});
