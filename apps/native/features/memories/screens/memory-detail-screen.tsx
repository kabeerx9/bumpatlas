import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";

type Mode = "view" | "edit";

export function MemoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { childDisplayName, journeyMemories, updateJourneyMemory, deleteJourneyMemory } =
    useMockUi();

  const memory = useMemo(
    () => journeyMemories.find((item) => item.id === id) ?? journeyMemories[0],
    [id, journeyMemories],
  );

  const [mode, setMode] = useState<Mode>("view");
  const [title, setTitle] = useState(memory?.title ?? "");
  const [body, setBody] = useState(memory?.body ?? "");
  const [savedTitle, setSavedTitle] = useState(memory?.title ?? "");
  const [savedBody, setSavedBody] = useState(memory?.body ?? "");
  const [deleted, setDeleted] = useState(false);
  const [visibility, setVisibility] = useState<"household" | "private">(
    memory?.visibility === "PRIVATE" ? "private" : "household",
  );

  function startEdit() {
    setTitle(savedTitle);
    setBody(savedBody);
    setMode("edit");
  }

  function cancelEdit() {
    setTitle(savedTitle);
    setBody(savedBody);
    setMode("view");
  }

  function saveEdit() {
    const nextTitle = title.trim() || savedTitle;
    const nextBody = body.trim();
    setSavedTitle(nextTitle);
    setSavedBody(nextBody);
    setTitle(nextTitle);
    setBody(nextBody);
    if (memory?.id) {
      updateJourneyMemory(memory.id, {
        title: nextTitle,
        body: nextBody,
        visibility: visibility === "private" ? "PRIVATE" : "HOUSEHOLD",
      });
    }
    setMode("view");
  }

  function confirmDelete() {
    Alert.alert(
      "Remove this moment?",
      `It will leave ${childDisplayName}'s journey. You can capture a new one anytime — no pressure.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (memory?.id) deleteJourneyMemory(memory.id);
            setDeleted(true);
          },
        },
      ],
    );
  }

  async function shareWithHousehold() {
    if (visibility === "private") {
      Alert.alert(
        "Only you can see this",
        "Switch visibility to Household before sharing with family adults.",
      );
      return;
    }
    await Share.share({
      message: `${savedTitle}\n\n${savedBody}\n\n— shared privately with our BumpAtlas household (not Connect)`,
    });
  }

  if (!memory) {
    return (
      <SoftStackShell title="Memory" onBack={() => router.back()} centered>
        <AppText variant="heading" align="center">
          Moment not found
        </AppText>
        <Button size="lg" onPress={() => router.back()} style={styles.deletedCta}>
          Back
        </Button>
      </SoftStackShell>
    );
  }

  if (deleted) {
    return (
      <SoftStackShell title="Memory" onBack={() => router.back()} centered>
        <View style={styles.deletedMark}>
          <Feather name="heart" size={26} color={colors.brand.peach} />
        </View>
        <AppText variant="heading" align="center">
          Moment removed
        </AppText>
        <AppText variant="body" tone="secondary" align="center" style={styles.deletedCopy}>
          Your story still has room for new pages whenever you’re ready.
        </AppText>
        <Button size="lg" onPress={() => router.back()} style={styles.deletedCta}>
          Back to Journey
        </Button>
      </SoftStackShell>
    );
  }

  return (
    <SoftStackShell
      title={mode === "edit" ? "Edit moment" : "Memory"}
      onBack={() => router.back()}
      right={
        mode === "view" ? (
          <Pressable
            onPress={startEdit}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityLabel="Edit memory"
          >
            <Feather name="edit-2" size={18} color={colors.brand.ink} />
          </Pressable>
        ) : (
          <Pressable onPress={cancelEdit} hitSlop={12} style={styles.headerTextBtn}>
            <AppText variant="caption" weight="semibold" tone="secondary">
              Cancel
            </AppText>
          </Pressable>
        )
      }
      footer={
        mode === "edit" ? (
          <Button size="lg" onPress={saveEdit} disabled={body.trim().length === 0}>
            Save changes
          </Button>
        ) : (
          <>
            <Button size="lg" onPress={() => void shareWithHousehold()}>
              Share with household
            </Button>
            <Button size="lg" variant="ghost" onPress={startEdit} style={styles.secondaryBtn}>
              Edit moment
            </Button>
            <Pressable onPress={confirmDelete} style={styles.deleteBtn} hitSlop={8}>
              <AppText align="center" style={styles.deleteText}>
                Remove from journey
              </AppText>
            </Pressable>
          </>
        )
      }
    >
      <View style={styles.photo}>
        <Feather name="image" size={28} color={colors.brand.peach} />
        <AppText variant="caption" tone="secondary">
          Photo stays private to household
        </AppText>
      </View>

      <View style={styles.privacyChip}>
            <Feather
              name={visibility === "private" ? "lock" : "home"}
              size={14}
              color={colors.brand.peach}
            />
            <AppText variant="caption" weight="semibold" style={styles.privacyText}>
              {visibility === "private"
                ? "Only you · not shared with household"
                : "Household only · not on Connect"}
            </AppText>
          </View>

          <View style={styles.visibilityRow}>
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
                  style={[styles.visChip, active && styles.visChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Visibility ${option.label}`}
                >
                  <AppText
                    variant="caption"
                    weight="semibold"
                    style={active ? styles.visTextActive : undefined}
                  >
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <AppText variant="caption" tone="secondary">
            {memory.dateLabel} · {memory.author} · for {childDisplayName}
          </AppText>

          {mode === "view" ? (
            <>
              <AppText variant="heading">{savedTitle}</AppText>
              <AppText variant="body" style={styles.bodyText}>
                {savedBody}
              </AppText>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <AppText variant="label" tone="secondary">
                  Title
                </AppText>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="A short title"
                  placeholderTextColor={colors.text.muted}
                  style={styles.titleInput}
                />
              </View>
              <View style={styles.field}>
                <AppText variant="label" tone="secondary">
                  Note
                </AppText>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  placeholder="What do you want to remember?"
                  placeholderTextColor={colors.text.muted}
                  multiline
                  textAlignVertical="top"
                  style={styles.bodyInput}
                />
              </View>
            </>
          )}

          {mode === "view" ? (
            <View style={styles.helpBox}>
              <Feather name="shield" size={16} color={colors.brand.peach} />
              <AppText variant="bodySmall" tone="secondary" style={styles.helpCopy}>
                Shared with adults in your household. Never posted to community groups.
              </AppText>
            </View>
          ) : null}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextBtn: {
    minWidth: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  photo: {
    height: 220,
    borderRadius: 28,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  privacyChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.78)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  privacyText: {
    color: colors.brand.peach,
  },
  visibilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  visChip: {
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.72)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  visChipActive: {
    backgroundColor: colors.brand.peach,
  },
  visTextActive: {
    color: colors.text.inverse,
  },
  bodyText: {
    lineHeight: 24,
  },
  field: {
    gap: spacing.sm,
  },
  titleInput: {
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: "Poppins_600SemiBold",
  },
  bodyInput: {
    minHeight: 140,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: spacing.lg,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
  helpBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.72)",
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  helpCopy: {
    flex: 1,
    lineHeight: 20,
  },
  secondaryBtn: {
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.card,
  },
  deleteBtn: {
    paddingVertical: spacing.sm,
  },
  deleteText: {
    color: colors.status.error,
  },
  deletedMark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand.peachSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  deletedCopy: {
    maxWidth: 300,
    lineHeight: 22,
  },
  deletedCta: {
    marginTop: spacing.lg,
    alignSelf: "stretch",
  },
});
