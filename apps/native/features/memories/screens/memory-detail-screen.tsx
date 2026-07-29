import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import {
  useDeleteMemoryMutation,
  useFamilyQuery,
  useMemoryQuery,
  useUpdateMemoryMutation,
} from "@/lib/api/hooks";

type Mode = "view" | "edit";

export function MemoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const familyQuery = useFamilyQuery();
  const childDisplayName = familyQuery.data?.childDisplayName ?? "your child";
  const memoryQuery = useMemoryQuery(id ?? "");
  const updateMemory = useUpdateMemoryMutation();
  const deleteMemory = useDeleteMemoryMutation();
  const memory = memoryQuery.data;

  const [mode, setMode] = useState<Mode>("view");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<"household" | "private">("household");

  useEffect(() => {
    if (!memory) return;
    setVisibility(memory.visibility === "PRIVATE" ? "private" : "household");
  }, [memory?.id, memory?.visibility]);

  function startEdit() {
    if (!memory) return;
    setTitle(memory.title);
    setBody(memory.body);
    setVisibility(memory.visibility === "PRIVATE" ? "private" : "household");
    setMode("edit");
  }

  function cancelEdit() {
    setMode("view");
  }

  async function saveEdit() {
    if (!memory || saving) return;
    const nextTitle = title.trim() || memory.title;
    const nextBody = body.trim();
    setSaving(true);
    try {
      await updateMemory.mutateAsync({
        id: memory.id,
        patch: {
          title: nextTitle,
          body: nextBody,
          visibility: visibility === "private" ? "PRIVATE" : "HOUSEHOLD",
        },
      });
      setMode("view");
    } catch {
      Alert.alert(
        "Couldn’t save",
        "Your changes are still here. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!memory) return;
    Alert.alert(
      "Remove this moment?",
      `It will leave ${childDisplayName}'s journey. You can capture a new one anytime — no pressure.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void handleDelete(),
        },
      ],
    );
  }

  async function handleDelete() {
    if (!memory || deleting) return;
    setDeleting(true);
    try {
      await deleteMemory.mutateAsync(memory.id);
      setDeleted(true);
    } catch {
      Alert.alert("Couldn’t remove", "Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function shareWithHousehold() {
    if (!memory) return;
    if (visibility === "private") {
      Alert.alert(
        "Only you can see this",
        "Switch visibility to Household before sharing with family adults.",
      );
      return;
    }
    await Share.share({
      message: `${memory.title}\n\n${memory.body}\n\n— shared privately with our BumpAtlas household (not Connect)`,
    });
  }

  if (memoryQuery.isLoading) {
    return (
      <SoftStackShell title="Memory" onBack={() => router.back()} centered>
        <ActivityIndicator color={colors.brand.peach} />
      </SoftStackShell>
    );
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
          <Button
            size="lg"
            onPress={() => void saveEdit()}
            disabled={body.trim().length === 0 || saving}
          >
            {saving ? "Saving…" : "Save changes"}
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
            {memory.eventDate} · {memory.authorName} · for {childDisplayName}
          </AppText>

          {mode === "view" ? (
            <>
              <AppText variant="heading">{memory.title}</AppText>
              <AppText variant="body" style={styles.bodyText}>
                {memory.body}
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
