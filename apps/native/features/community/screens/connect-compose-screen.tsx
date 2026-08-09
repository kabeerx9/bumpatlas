import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  AppText,
  Button,
  IconButton,
  Pill,
  Screen,
  Surface,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import {
  useCreateCommentMutation,
  useCreateGroupPostMutation,
  useGroupPostsQuery,
  useGroupsQuery,
} from "@/lib/api/hooks";

const MAX_CHARS = 500;
const CONNECT_PROMPT = "What made today a little easier?";

const communityRules = [
  "Text only — no child photos in Connect.",
  "Be kind. No medical advice or dosing for others.",
  "Report anything that feels unsafe — we review quickly.",
];

export function ConnectComposeScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { mode, postId } = useLocalSearchParams<{
    mode?: "prompt" | "reply";
    postId?: string;
  }>();

  const isReply = mode === "reply" && Boolean(postId);

  const {
    communityRulesAccepted,
    acceptCommunityRules,
    postsUsedToday,
    incrementPostCount,
    commentsUsedToday,
    incrementCommentCount,
    commentsDailyLimit,
    linksAllowed,
    accountAgeDays,
    activeGroupId,
  } = useAppState();

  const groupsQuery = useGroupsQuery();
  const groupPostsQuery = useGroupPostsQuery(activeGroupId);
  const createPostMutation = useCreateGroupPostMutation(activeGroupId);
  const createCommentMutation = useCreateCommentMutation(activeGroupId);

  const [body, setBody] = useState("");
  const [rulesAccepted, setRulesAccepted] = useState(communityRulesAccepted);

  const groups = groupsQuery.data?.items ?? [];
  const posts = groupPostsQuery.data?.items ?? [];
  const parentPost = useMemo(
    () => posts.find((post) => post.id === postId),
    [posts, postId],
  );

  const activeGroupName =
    groups.find((group) => group.id === activeGroupId)?.name ?? "Your stage group";

  const trimmed = body.trim();
  const effectiveRules = rulesAccepted || communityRulesAccepted;
  const atPostLimit = !isReply && postsUsedToday >= 10;
  const atCommentLimit = isReply && commentsUsedToday >= commentsDailyLimit;
  const hasLink = /https?:\/\//i.test(trimmed);
  const linkBlocked = hasLink && !linksAllowed;
  const isSubmitting = createPostMutation.isPending || createCommentMutation.isPending;
  const canPost =
    trimmed.length > 0 &&
    effectiveRules &&
    trimmed.length <= MAX_CHARS &&
    !atPostLimit &&
    !atCommentLimit &&
    !linkBlocked &&
    !isSubmitting;

  async function handlePost() {
    if (!canPost) return;
    if (!communityRulesAccepted) acceptCommunityRules();
    try {
      if (isReply && postId) {
        await createCommentMutation.mutateAsync({ postId, body: trimmed });
        incrementCommentCount();
      } else {
        await createPostMutation.mutateAsync({ body: trimmed });
        incrementPostCount();
      }
      router.back();
    } catch {
      Alert.alert("Couldn’t post", "Check your connection and try again.");
    }
  }

  function toggleRules() {
    setRulesAccepted((current) => !current);
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close" onPress={() => router.back()}>
          <Feather name="x" size={20} color={theme.colors.text} />
        </IconButton>
        <AppText variant="title">{isReply ? "Reply" : "Share a reply"}</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Surface tone="dark" bordered={false} radiusSize="xl" style={styles.contextPanel}>
            <AppText variant="caption" tone="inverse" style={styles.contextEyebrow}>
              {isReply ? "Replying in" : "Today’s prompt"} · {activeGroupName}
            </AppText>
            <AppText variant="title" tone="inverse">
              {isReply && parentPost ? parentPost.body : CONNECT_PROMPT}
            </AppText>
            {isReply && parentPost ? (
              <AppText variant="caption" tone="inverse" style={styles.contextMeta}>
                {parentPost.authorName} · comments {commentsUsedToday}/{commentsDailyLimit} today
              </AppText>
            ) : (
              <AppText variant="caption" tone="inverse" style={styles.contextMeta}>
                {posts.length} notes in group · posts {postsUsedToday}/10 today · comments{" "}
                {commentsUsedToday}/{commentsDailyLimit}
              </AppText>
            )}
          </Surface>

          {!isReply && groups.length > 0 ? (
            <View style={styles.groupPickerRow}>
              {groups.map((group) => (
                <Pill key={group.id} tone={group.id === activeGroupId ? "selected" : "neutral"}>
                  {group.name}
                </Pill>
              ))}
            </View>
          ) : null}

          {atPostLimit ? (
            <AppText variant="bodySmall" tone="brand" style={styles.limitWarn}>
              Daily post limit reached (10). Replies still count toward your comment limit.
            </AppText>
          ) : null}

          {atCommentLimit ? (
            <AppText variant="bodySmall" tone="brand" style={styles.limitWarn}>
              Daily comment limit reached ({commentsDailyLimit}). Limits reset tomorrow.
            </AppText>
          ) : null}

          {linkBlocked ? (
            <AppText variant="bodySmall" tone="brand" style={styles.limitWarn}>
              Links are paused for the first 14 days (day {accountAgeDays} of your account). Text
              only for now.
            </AppText>
          ) : null}

          <Surface radiusSize="xl" style={styles.inputCard}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={
                isReply
                  ? "Write a supportive reply..."
                  : "What made today a little easier?"
              }
              placeholderTextColor={theme.colors.textMuted}
              multiline
              maxLength={MAX_CHARS}
              style={[styles.input, { color: theme.colors.text }]}
              textAlignVertical="top"
              accessibilityLabel="Post text"
            />
            <AppText variant="caption" tone="secondary" style={styles.counter}>
              {body.length}/{MAX_CHARS}
            </AppText>
          </Surface>

          <Surface radiusSize="xl" style={styles.rulesCard}>
            <View style={styles.rulesHeader}>
              <Feather name="shield" size={16} color={theme.colors.brandText} />
              <AppText weight="semibold">Community rules</AppText>
            </View>
            {communityRules.map((rule) => (
              <AppText key={rule} variant="bodySmall" tone="secondary">
                · {rule}
              </AppText>
            ))}
            <Pressable
              onPress={toggleRules}
              style={styles.acceptRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: effectiveRules }}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: theme.colors.secondary },
                  effectiveRules && { backgroundColor: theme.colors.secondary },
                ]}
              >
                {effectiveRules ? (
                  <Feather name="check" size={14} color={theme.colors.secondaryText} />
                ) : null}
              </View>
              <AppText variant="bodySmall" style={styles.acceptCopy}>
                I agree to keep Connect kind and text-only
              </AppText>
            </Pressable>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button size="lg" disabled={!canPost} onPress={() => void handlePost()}>
          {isSubmitting ? "Posting…" : isReply ? "Post reply" : "Post to group"}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  headerSpacer: { width: 44 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  contextPanel: { gap: spacing.sm, padding: spacing.xl },
  contextEyebrow: { opacity: 0.78, letterSpacing: 0.8, textTransform: "uppercase" },
  contextMeta: { opacity: 0.82 },
  groupPickerRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  limitWarn: { lineHeight: 20 },
  inputCard: { gap: spacing.xs },
  input: {
    minHeight: 140,
    maxHeight: 220,
    fontSize: 17,
    fontFamily: "Poppins_400Regular",
  },
  counter: { textAlign: "right" },
  rulesCard: { gap: spacing.xs },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  acceptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptCopy: { flex: 1 },
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
});
