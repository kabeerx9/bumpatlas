import type { OnboardingGoal } from "@/features/onboarding/components/steps/goal-step";
import type { OnboardingRole } from "@/features/onboarding/components/steps/role-step";

export type AlbumStage =
  | "welcome"
  | "privacy"
  | "role"
  | "household"
  | "profile"
  | "goal"
  | "notifications"
  | "invite"
  | "complete";

export type AlbumDirection = "forward" | "back";
export type AlbumScenePhase = "spread" | "focus" | "editorial" | "today";

export const ALBUM_LAYER_ORDER = {
  cover: 0,
  pages: 1,
  fold: 2,
  thread: 3,
  content: 4,
} as const;
export type ArtifactKey = "unselected" | "expecting" | "parent" | "caregiver";
export type ChapterKey = OnboardingGoal | null;

export type AlbumSceneInput = {
  stage: AlbumStage;
  direction: AlbumDirection;
  role: OnboardingRole | null;
  householdName: string;
  childName: string;
  childDob: string;
  dueDate: string;
  goal: OnboardingGoal | null;
};

export type AlbumSceneModel = {
  stage: AlbumStage;
  phase: AlbumScenePhase;
  direction: AlbumDirection;
  artifact: ArtifactKey;
  chapter: ChapterKey;
  householdLabel: string;
  profileLabel: string;
};

export type OnboardingCompletionAction =
  | "show-preview-completion"
  | "submit-and-show-completion";

type AlbumPageSize = {
  width: number;
  height: number;
};

export function resolveBoundArtifactFrame(page: AlbumPageSize) {
  const portraitAspectRatio = 105 / 130;
  const width = Math.round(
    Math.min(page.width * 0.72, page.height * 0.78 * portraitAspectRatio),
  );
  const height = Math.round(width / portraitAspectRatio);

  return {
    width,
    height,
    left: Math.round((page.width - width) / 2),
    top: Math.round((page.height - height) / 2),
  };
}

export function resolveAlbumSceneHeight(phase: AlbumScenePhase): 184 | 156 {
  return phase === "editorial" || phase === "today" ? 156 : 184;
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function resolveArtifact(role: OnboardingRole | null): ArtifactKey {
  if (role === "partner") return "caregiver";
  return role ?? "unselected";
}

function resolvePhase(stage: AlbumStage): AlbumScenePhase {
  if (stage === "complete") return "today";
  if (stage === "profile") return "focus";
  if (stage === "goal" || stage === "notifications" || stage === "invite") {
    return "editorial";
  }
  return "spread";
}

function resolveProfileLabel(input: AlbumSceneInput) {
  if (input.role === "expecting") {
    const dueDate = formatDate(input.dueDate);
    return dueDate ? `Due ${dueDate}` : "Your pregnancy keepsake";
  }

  if (input.role === "parent") {
    const name = input.childName.trim();
    const birthDate = formatDate(input.childDob);
    if (name && birthDate) return `${name} · Born ${birthDate}`;
    return name || (birthDate ? `Born ${birthDate}` : "Your child’s keepsake");
  }

  if (input.role === "partner") return "Joining a household";
  return "Choose your first keepsake";
}

export function deriveAlbumSceneModel(input: AlbumSceneInput): AlbumSceneModel {
  return {
    stage: input.stage,
    phase: resolvePhase(input.stage),
    direction: input.direction,
    artifact: resolveArtifact(input.role),
    chapter: input.goal,
    householdLabel: input.householdName.trim() || "Our household",
    profileLabel: resolveProfileLabel(input),
  };
}

export function nextAlbumDirection(
  previousStepIndex: number,
  nextStepIndex: number,
): AlbumDirection {
  return nextStepIndex < previousStepIndex ? "back" : "forward";
}

export function resolveOnboardingCompletion(
  preview: boolean,
): OnboardingCompletionAction {
  return preview ? "show-preview-completion" : "submit-and-show-completion";
}
