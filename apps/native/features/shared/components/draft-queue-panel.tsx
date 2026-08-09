import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, borderWidth, colors, radius, shadows, spacing } from "@/design-system";
import { useAppState } from "@/features/shared/providers/app-state-provider";

type DraftQueuePanelProps = {
  onOpenDraft?: () => void;
};

export function DraftQueuePanel({ onOpenDraft }: DraftQueuePanelProps) {
  const { drafts, removeDraft, clearDrafts, isOffline, syncingDrafts, flushDraftQueue } =
    useAppState();

  if (drafts.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Feather name="cloud-off" size={16} color={colors.brand.honeyDeep} />
        <AppText weight="semibold" style={styles.title}>
          Upload queue · {drafts.length}
        </AppText>
      </View>
      <AppText variant="caption" tone="secondary">
        {isOffline
          ? "Saved on this device. They’ll sync when you’re back online."
          : syncingDrafts
            ? "Syncing drafts…"
            : "Ready to sync — they’ll upload automatically when online."}
      </AppText>
      {drafts.map((draft) => (
        <View key={draft.id} style={styles.row}>
          <Pressable style={styles.copy} onPress={onOpenDraft} accessibilityLabel="Open draft">
            <AppText variant="bodySmall" numberOfLines={2}>
              {draft.body || "Photo draft"}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {draft.eventDate} · {draft.createdAtLabel}
              {draft.hasPhoto ? " · photo" : ""}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => removeDraft(draft.id)}
            style={styles.remove}
            accessibilityLabel="Remove draft"
          >
            <Feather name="x" size={16} color={colors.text.muted} />
          </Pressable>
        </View>
      ))}
      {!isOffline ? (
        <Pressable
          onPress={() => void flushDraftQueue()}
          hitSlop={8}
          accessibilityLabel="Sync drafts now"
        >
          <AppText variant="caption" weight="semibold" style={styles.clear}>
            {syncingDrafts ? "Syncing…" : "Sync now"}
          </AppText>
        </Pressable>
      ) : null}
      {drafts.length > 1 ? (
        <Pressable onPress={clearDrafts} hitSlop={8} accessibilityLabel="Clear all drafts">
          <AppText variant="caption" weight="semibold" style={styles.clear}>
            Clear all drafts
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface.card,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border.hairline,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { color: colors.brand.ink },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: colors.border.hairline,
    paddingTop: spacing.sm,
    minHeight: 44,
  },
  copy: { flex: 1, gap: 2 },
  remove: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  clear: { color: colors.brand.honeyDeep },
});
