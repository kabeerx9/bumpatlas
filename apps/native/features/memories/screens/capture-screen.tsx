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

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockMemoryPrompts } from "@/features/mock/demo-data";
import { mockPregnancy } from "@/features/mock/mock-content";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { DraftQueuePanel } from "@/features/shared/components/draft-queue-panel";
import { OfflineBanner } from "@/features/shared/components/offline-banner";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { queryKeys, useEntitlementsQuery, useTodayQuery } from "@/lib/api/hooks";
import type { PreparedPhoto } from "@/lib/media/pick-and-prepare";
import { pickAndPreparePhoto } from "@/lib/media/pick-and-prepare";
import { saveMemoryWithOptionalUpload } from "@/lib/memories/save-memory";
import { appRoutes } from "@/navigation/routes";

type PhotoState = "none" | "selected" | "failed" | "denied";

const BACKDATE_OPTIONS = ["Today", "Yesterday", "2 days ago", "Pick a date…"];

export function CaptureScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOffline, saveDraft, completeCapture, stageMode } = useMockUi();
  const todayQuery = useTodayQuery();
  const entitlementsQuery = useEntitlementsQuery();
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
  const [awardedBadge, setAwardedBadge] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);

  const mediaNearLimit = mediaUploadsUsed >= mediaUploadsLimit - 1;
  const mediaExhausted = mediaUploadsUsed >= mediaUploadsLimit;
  const rotatingPrompt = mockMemoryPrompts[promptIndex % mockMemoryPrompts.length];
  const prompt = stageMode === "pregnancy" ? mockPregnancy.bumpPrompt : rotatingPrompt;

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
      const saved = await saveMemoryWithOptionalUpload({
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
      ]);

      const result = completeCapture({
        body: body.trim(),
        eventDate: saved.eventDateIso,
        hasPhoto: photoState === "selected",
        visibility: visibilityValue,
      });
      if (result.awardedBadgeId) setAwardedBadge(result.awardedBadgeId);
      else router.back();
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
          <View style={styles.savedBanner}>
            <Feather name="check-circle" size={16} color={colors.brand.peach} />
            <AppText variant="bodySmall">Saved locally · will sync when online</AppText>
          </View>
        ) : null}

        {awardedBadge ? (
          <View style={styles.savedBanner}>
            <Feather name="award" size={16} color={colors.brand.peach} />
            <AppText variant="bodySmall">First Capture badge earned — no streak to protect</AppText>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <AppText variant="caption" weight="semibold" style={styles.removePhoto}>
                Back to Today
              </AppText>
            </Pressable>
          </View>
        ) : null}

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.promptPanel}>
            <AppText variant="caption" style={styles.peachLabel}>
              Today’s prompt
            </AppText>
            <AppText variant="heading" style={styles.prompt}>
              {prompt}
            </AppText>
            {stageMode !== "pregnancy" ? (
              <Pressable
                onPress={() => setPromptIndex((i) => i + 1)}
                hitSlop={8}
                accessibilityLabel="Try another prompt"
              >
                <AppText variant="caption" weight="semibold" style={styles.removePhoto}>
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
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <AppText
                    variant="caption"
                    weight="semibold"
                    style={active ? styles.dateTextActive : undefined}
                  >
                    {option}
                  </AppText>
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

          {photoState === "selected" && photo ? (
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
                  <AppText variant="caption" weight="semibold" style={styles.removePhoto}>
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
              <View style={styles.cameraCircle}>
                <Feather name="camera" size={22} color={colors.brand.peach} />
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
                  <AppText variant="caption" weight="semibold" style={styles.removePhoto}>
                    View premium media options
                  </AppText>
                </Pressable>
              ) : null}
            </Pressable>
          )}

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
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <AppText
                    variant="caption"
                    weight="semibold"
                    style={active ? styles.dateTextActive : undefined}
                  >
                    {option.label}
                  </AppText>
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
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerWrap: { paddingBottom: spacing.sm },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
  },
  body: { gap: spacing.md, paddingBottom: spacing.lg },
  promptPanel: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  peachLabel: {
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  prompt: { color: colors.text.inverse, lineHeight: 34 },
  dateRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dateChip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  dateChipActive: {
    backgroundColor: colors.brand.peachSoft,
    borderColor: colors.brand.peach,
  },
  dateTextActive: { color: colors.brand.peach },
  dateInput: {
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.78)",
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
  photoBox: {
    minHeight: 160,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  photoPreview: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.md,
    alignItems: "center",
  },
  photoImage: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
  },
  photoMeta: { flex: 1, gap: 4 },
  removePhoto: { color: colors.brand.peach, marginTop: spacing.xs },
  failBox: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  failActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  cameraCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  demoLink: { marginTop: spacing.xs, textDecorationLine: "underline" },
  input: {
    minHeight: 120,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    fontSize: 17,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
});
