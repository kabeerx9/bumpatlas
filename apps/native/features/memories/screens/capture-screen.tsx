import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText, Button, IconButton, Pill, Surface, colors, radius, spacing, useAppTheme } from "@/design-system";
import { pregnancyContent } from "@/features/pregnancy/data/pregnancy-content";
import { DraftQueuePanel } from "@/features/shared/components/draft-queue-panel";
import { OfflineBanner } from "@/features/shared/components/offline-banner";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { queryKeys, useEntitlementsQuery, useFamilyQuery, useTodayQuery } from "@/lib/api/hooks";
import { FEATURES } from "@/lib/features";
import type { PreparedPhoto } from "@/lib/media/pick-and-prepare";
import { pickAndPreparePhoto } from "@/lib/media/pick-and-prepare";
import { saveMemoryWithOptionalUpload } from "@/lib/memories/save-memory";
import { appRoutes } from "@/navigation/routes";

type PhotoState = "none" | "selected" | "failed" | "denied";

const CAPTURE_PROMPTS = [
  "What made today feel a little easier?",
  "One small moment worth keeping",
  "What surprised you today?",
];

const BACKDATE_OPTIONS = ["Today", "Yesterday", "2 days ago", "Pick a date…"];

export function CaptureScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const { isOffline, saveDraft } = useAppState();
  const todayQuery = useTodayQuery();
  const familyQuery = useFamilyQuery();
  const entitlementsQuery = useEntitlementsQuery();
  const stageMode = familyQuery.data?.stageMode ?? "postpartum";
  const [localMediaBump, setLocalMediaBump] = useState(0);
  const mediaUploadsUsed = (todayQuery.data?.mediaUploadsUsed ?? 0) + localMediaBump;
  const mediaUploadsLimit =
    entitlementsQuery.data?.mediaUploadsLimit ?? todayQuery.data?.mediaUploadsLimit ?? 30;
  const [body, setBody] = useState("");
  const [photoState, setPhotoState] = useState<PhotoState>("none");
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [eventDate, setEventDate] = useState("Today");
  const [customDate, setCustomDate] = useState("");
  const [visibility, setVisibility] = useState<"household" | "private">("household");
  const [promptIndex, setPromptIndex] = useState(0);

  const mediaNearLimit = mediaUploadsUsed >= mediaUploadsLimit - 1;
  const mediaExhausted = mediaUploadsUsed >= mediaUploadsLimit;
  const rotatingPrompt = CAPTURE_PROMPTS[promptIndex % CAPTURE_PROMPTS.length];
  const prompt =
    stageMode === "pregnancy"
      ? pregnancyContent.bumpPrompt
      : (todayQuery.data?.cards.capture.prompt ?? rotatingPrompt);

  async function runPick(source: "library" | "camera") {
    if (mediaExhausted || picking) return;
    setPicking(true);
    const result = await pickAndPreparePhoto(source);
    setPicking(false);

    if (result.status === "cancelled") return;
    if (result.status === "denied") {
      setPhotoState("denied");
      Alert.alert(
        "Photo access needed",
        "Allow photo library or camera access in Settings to attach a moment photo.",
      );
      return;
    }
    if (result.status === "failed") {
      setPhotoState("failed");
      setPhoto(null);
      return;
    }

    setPhoto(result.photo);
    setPhotoState("selected");
    setLocalMediaBump((count) => count + 1);
  }

  function pickPhoto() {
    if (mediaExhausted || picking) return;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Photo library", "Camera"],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) void runPick("library");
          if (index === 2) void runPick("camera");
        },
      );
      return;
    }

    Alert.alert("Add a photo", undefined, [
      { text: "Photo library", onPress: () => void runPick("library") },
      { text: "Camera", onPress: () => void runPick("camera") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function saveMoment() {
    if (saving) return;
    const resolvedDate = eventDate === "Pick a date…" ? customDate || "Custom date" : eventDate;
    const visibilityValue = visibility === "private" ? "PRIVATE" : "HOUSEHOLD";

    if (isOffline) {
      saveDraft({
        body: body.trim(),
        eventDate: resolvedDate,
        hasPhoto: photoState === "selected",
        photoUri: photo?.uri ?? null,
        visibility: visibilityValue,
      });
      setSavedLocally(true);
      return;
    }

    setSaving(true);
    try {
      await saveMemoryWithOptionalUpload({
        body: body.trim(),
        eventDate: eventDate === "Pick a date…" ? "Pick a date…" : eventDate,
        customDate,
        visibility: visibilityValue,
        photo: photoState === "selected" ? photo : null,
        idempotencyKey: `capture-${Date.now()}`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.memories }),
        queryClient.invalidateQueries({ queryKey: queryKeys.today }),
        // A capture can be the "first memory" badge — refresh badges so the
        // global celebration toast (app-state-provider) picks it up.
        queryClient.invalidateQueries({ queryKey: queryKeys.badges }),
      ]);

      router.back();
    } catch {
      Alert.alert(
        "Couldn’t save",
        "Your note is still here. Check your connection and try again, or save a draft offline.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SoftStackShell
      title="Capture"
      closeIcon="x"
      onBack={() => router.back()}
      scroll={false}
      right={undefined}
      footer={
        <>
          <Button
            size="lg"
            disabled={body.trim().length === 0 || saving || picking}
            onPress={() => void saveMoment()}
          >
            {isOffline ? "Save draft locally" : saving ? "Saving…" : "Save moment"}
          </Button>
          {savedLocally ? (
            <Button size="lg" variant="ghost" onPress={() => router.back()}>
              Back to Today
            </Button>
          ) : null}
        </>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {isOffline ? (
          <View style={styles.bannerWrap}>
            <OfflineBanner message="Offline · this moment will queue to upload when you're back" />
          </View>
        ) : null}

        <View style={styles.bannerWrap}>
          <DraftQueuePanel />
        </View>

        {savedLocally ? (
          <Surface tone="lavender" style={styles.savedBanner} padding="md" bordered={false}>
            <Feather name="check-circle" size={16} color={theme.colors.accentText} />
            <AppText variant="bodySmall">Saved locally · will sync when online</AppText>
          </Surface>
        ) : null}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.promptPanel}>
            <AppText variant="caption" weight="semibold" style={styles.promptLabel}>
              Today’s prompt
            </AppText>
            <AppText variant="heading" tone="inverse">
              {prompt}
            </AppText>
            {stageMode !== "pregnancy" ? (
              <Pressable
                onPress={() => setPromptIndex((i) => i + 1)}
                hitSlop={8}
                accessibilityLabel="Try another prompt"
              >
                <AppText variant="caption" weight="semibold" style={styles.promptLink}>
                  Try another prompt
                </AppText>
              </Pressable>
            ) : null}
          </View>

          <AppText weight="semibold">When did this happen?</AppText>
          <View style={styles.dateRow}>
            {BACKDATE_OPTIONS.map((option) => {
              const active = eventDate === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setEventDate(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Pill tone={active ? "selected" : "neutral"}>{option}</Pill>
                </Pressable>
              );
            })}
          </View>
          {eventDate === "Pick a date…" ? (
            <TextInput
              value={customDate}
              onChangeText={setCustomDate}
              placeholder="Jul 20, 2026"
              placeholderTextColor={colors.text.muted}
              style={styles.dateInput}
            />
          ) : null}

          {FEATURES.photos ? (
            photoState === "selected" && photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <View style={styles.photoMeta}>
                  <AppText weight="semibold">Photo added</AppText>
                  <AppText variant="caption" tone="secondary">
                    Compressed · EXIF / GPS stripped
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    Media uploads {mediaUploadsUsed}/{mediaUploadsLimit} this month
                  </AppText>
                  <Pressable
                    onPress={() => {
                      setPhoto(null);
                      setPhotoState("none");
                      setLocalMediaBump((count) => Math.max(0, count - 1));
                    }}
                    accessibilityLabel="Remove photo"
                  >
                    <AppText variant="caption" weight="semibold" tone="brand" style={styles.removePhotoSpacing}>
                      Remove photo
                    </AppText>
                  </Pressable>
                </View>
              </View>
            ) : photoState === "failed" || photoState === "denied" ? (
              <View style={styles.failBox}>
                <AppText weight="semibold">
                  {photoState === "denied" ? "Photo permission needed" : "Photo didn’t prepare"}
                </AppText>
                <AppText variant="bodySmall" tone="secondary">
                  Your note is safe. Retry the photo or save text only.
                </AppText>
                <View style={styles.failActions}>
                  <Button size="sm" variant="ghost" onPress={pickPhoto}>
                    Retry photo
                  </Button>
                  <Button size="sm" onPress={() => void saveMoment()}>
                    Save text only
                  </Button>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.photoBox}
                onPress={pickPhoto}
                accessibilityLabel="Add a photo"
                disabled={mediaExhausted || picking}
              >
                <View style={[styles.cameraCircle, { backgroundColor: theme.colors.primary }]}>
                  <Feather name="camera" size={22} color={theme.colors.primaryText} />
                </View>
                <AppText weight="semibold">
                  {mediaExhausted
                    ? "Photo limit reached"
                    : picking
                      ? "Preparing photo…"
                      : "Add a photo"}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  {mediaExhausted
                    ? `Free tier: ${mediaUploadsLimit} uploads/month · text still saves`
                    : mediaNearLimit
                      ? `Almost at free media limit · ${mediaUploadsUsed}/${mediaUploadsLimit}`
                      : "Optional — compressed & stripped of location data"}
                </AppText>
                {mediaNearLimit || mediaExhausted ? (
                  <Pressable
                    onPress={() => router.push(appRoutes.paywall("media-quota"))}
                    hitSlop={8}
                    accessibilityLabel="View premium media quota"
                  >
                    <AppText variant="caption" weight="semibold" tone="brand" style={styles.removePhotoSpacing}>
                      View premium media options
                    </AppText>
                  </Pressable>
                ) : null}
              </Pressable>
            )
          ) : null}

          <AppText weight="semibold">Who can see this?</AppText>
          <View style={styles.dateRow}>
            {(
              [
                { id: "household" as const, label: "Household" },
                { id: "private" as const, label: "Only me" },
              ] as const
            ).map((option) => {
              const active = visibility === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setVisibility(option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Pill tone={active ? "selected" : "neutral"}>{option.label}</Pill>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="A short note to remember..."
            placeholderTextColor={colors.text.muted}
            multiline
            style={styles.input}
            textAlignVertical="top"
          />

          <AppText variant="caption" tone="secondary">
            {visibility === "private"
              ? "Only you — not shared with household or Connect."
              : "Visible to your household only — not Connect."}{" "}
            Event date: {eventDate === "Pick a date…" ? customDate || "—" : eventDate}
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  offlineToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerWrap: { paddingBottom: spacing.sm },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  body: { gap: spacing.md, paddingBottom: spacing.lg },
  promptPanel: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.ink,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  promptLabel: {
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  promptLink: { color: colors.brand.honey },
  dateRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dateInput: {
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
  photoBox: {
    minHeight: 160,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoPreview: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing.md,
    alignItems: "center",
  },
  photoImage: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.pastel.lemon,
  },
  photoMeta: { flex: 1, gap: 4 },
  removePhotoSpacing: { marginTop: spacing.xs },
  failBox: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface.mist,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  failActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  cameraCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  demoLink: { marginTop: spacing.xs, textDecorationLine: "underline" },
  input: {
    minHeight: 120,
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    padding: spacing.lg,
    fontSize: 17,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
});
