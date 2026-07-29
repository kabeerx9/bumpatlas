import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
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
  const { mode, postId } = useLocalSearchParams<{
    mode?: "prompt" | "reply";
    postId?: string;
  }>();

  const isReply = mode === "reply" && Boolean(postId);

  const {
    communityRulesAccepted,
    acceptCommunityRules,
    postsUsedToday,
    commentsUsedToday,
    commentsDailyLimit,
    linksAllowed,
    accountAgeDays,
    activeGroupId,
  } = useMockUi();

  const groupsQuery = useGroupsQuery();
  const groupPostsQuery = useGroupPostsQuery(activeGroupId);
  const createPostMutation = useCreateGroupPostMutation(activeGroupId);
  const createCommentMutation = useCreateCommentMutation(activeGroupId);

  const [body, setBody] = useState("");
  const [rulesAccepted, setRulesAccepted] = useState(communityRulesAccepted);

  const posts = groupPostsQuery.data?.items ?? [];
  const parentPost = useMemo(
    () => posts.find((post) => post.id === postId),
    [posts, postId],
  );

  const activeGroupName =
    groupsQuery.data?.items.find((group) => group.id === activeGroupId)?.name ??
    "Your stage group";

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
      } else {
        await createPostMutation.mutateAsync({ body: trimmed });
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
    <SoftStackShell
      title={isReply ? "Reply" : "Share a reply"}
      closeIcon="x"
      onBack={() => router.back()}
      scroll={false}
      footer={
        <Button size="lg" disabled={!canPost} onPress={() => void handlePost()}>
          {isSubmitting ? "Posting…" : isReply ? "Post reply" : "Post to group"}
        </Button>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.body}>
          <View style={styles.contextPanel}>
            <AppText variant="caption" style={styles.peachLabel}>
              {isReply ? "Replying in" : "Today’s prompt"} · {activeGroupName}
            </AppText>
            <AppText variant="title" tone="inverse" style={styles.contextTitle}>
              {isReply && parentPost ? parentPost.body : CONNECT_PROMPT}
            </AppText>
            {isReply && parentPost ? (
              <AppText variant="caption" style={styles.contextMeta}>
                {parentPost.authorName} · comments {commentsUsedToday}/{commentsDailyLimit} today
              </AppText>
            ) : (
              <AppText variant="caption" style={styles.contextMeta}>
                {posts.length} notes in group · posts {postsUsedToday}/10 today · comments{" "}
                {commentsUsedToday}/{commentsDailyLimit}
              </AppText>
            )}
          </View>

          {atPostLimit ? (
            <AppText variant="bodySmall" style={styles.limitWarn}>
              Daily post limit reached (10). Replies still count toward your comment limit.
            </AppText>
          ) : null}

          {atCommentLimit ? (
            <AppText variant="bodySmall" style={styles.limitWarn}>
              Daily comment limit reached ({commentsDailyLimit}). Limits reset tomorrow.
            </AppText>
          ) : null}

          {linkBlocked ? (
            <AppText variant="bodySmall" style={styles.limitWarn}>
              Links are paused for the first 14 days (day {accountAgeDays} of your account). Text
              only for now.
            </AppText>
          ) : null}

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={
              isReply
                ? "Write a supportive reply..."
                : "What made today a little easier?"
            }
            placeholderTextColor={colors.text.muted}
            multiline
            maxLength={MAX_CHARS}
            style={styles.input}
            textAlignVertical="top"
            accessibilityLabel="Post text"
          />

          <AppText variant="caption" tone="secondary" style={styles.counter}>
            {body.length}/{MAX_CHARS}
          </AppText>

          <View style={styles.rulesCard}>
            <View style={styles.rulesHeader}>
              <Feather name="shield" size={16} color={colors.brand.peach} />
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
              <View style={[styles.checkbox, effectiveRules && styles.checkboxChecked]}>
                {effectiveRules ? (
                  <Feather name="check" size={14} color={colors.text.inverse} />
                ) : null}
              </View>
              <AppText variant="bodySmall" style={styles.acceptCopy}>
                I agree to keep Connect kind and text-only
              </AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    flex: 1,
    gap: spacing.md,
  },
  contextPanel: {
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
  contextTitle: {
    lineHeight: 28,
  },
  contextMeta: {
    color: "rgba(255,255,255,0.82)",
  },
  limitWarn: {
    color: colors.brand.terracotta,
    lineHeight: 20,
  },
  input: {
    minHeight: 140,
    maxHeight: 220,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    fontSize: 17,
    color: colors.text.primary,
    fontFamily: "Poppins_400Regular",
  },
  counter: {
    textAlign: "right",
    marginTop: -spacing.sm,
  },
  rulesCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.xs,
  },
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
    borderTopColor: "rgba(44,36,32,0.06)",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.brand.peach,
    borderColor: colors.brand.peach,
  },
  acceptCopy: {
    flex: 1,
  },
});
