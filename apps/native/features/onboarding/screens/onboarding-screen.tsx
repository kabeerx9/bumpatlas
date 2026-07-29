import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

import { spacing } from "@/design-system";
import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";
import { GenderStep } from "@/features/onboarding/components/steps/gender-step";
import { IntroStep } from "@/features/onboarding/components/steps/intro-step";
import { NameStep } from "@/features/onboarding/components/steps/name-step";
import { PhotoStep } from "@/features/onboarding/components/steps/photo-step";
import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";
import { appRoutes } from "@/navigation/routes";

type BabyStep = "name" | "gender" | "photo";
type FlowStep = "intro" | BabyStep;

const BABY_STEPS: BabyStep[] = ["name", "gender", "photo"];

export function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("intro");
  const [profileName, setProfileName] = useState("");
  const [gender, setGender] = useState<"boy" | "girl" | null>("boy");

  const babyStepIndex = step === "intro" ? 0 : BABY_STEPS.indexOf(step) + 1;

  const canContinue = useMemo(() => {
    if (step === "name") return profileName.trim().length > 0;
    if (step === "gender") return gender !== null;
    return true;
  }, [gender, profileName, step]);

  function goToBabyFlow() {
    setStep("name");
  }

  function goBack() {
    if (step === "name") {
      setStep("intro");
      return;
    }
    if (step === "gender") {
      setStep("name");
      return;
    }
    if (step === "photo") {
      setStep("gender");
    }
  }

  async function handleContinue() {
    if (step === "intro") {
      goToBabyFlow();
      return;
    }
    if (step === "name") {
      setStep("gender");
      return;
    }
    if (step === "gender") {
      setStep("photo");
      return;
    }

    await completeOnboarding();
    router.replace(appRoutes.home);
  }

  if (step === "intro") {
    return <IntroStep onContinue={goToBabyFlow} onSkip={goToBabyFlow} />;
  }

  return (
    <OnboardingShell
      stepIndex={babyStepIndex}
      totalSteps={BABY_STEPS.length}
      canContinue={canContinue}
      onBack={goBack}
      onContinue={() => void handleContinue()}
      continueLabel={step === "photo" ? "Save & Continue" : "Save & Continue"}
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
          {step === "name" ? (
            <NameStep name={profileName} onChangeName={setProfileName} />
          ) : null}
          {step === "gender" ? (
            <GenderStep gender={gender} onSelect={setGender} />
          ) : null}
          {step === "photo" ? <PhotoStep /> : null}
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
