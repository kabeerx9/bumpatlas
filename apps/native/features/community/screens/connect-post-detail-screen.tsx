import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { appRoutes } from "@/navigation/routes";

export function ConnectPostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    commentsUsedToday,
    commentsDailyLimit,
    activeGroupId,
    getGroupFeed,
    addGroupComment,
  } = useMockUi();
  const [comment, setComment] = useState("");

  const feed = getGroupFeed(activeGroupId);
  const post = useMemo(
    () => feed.find((item) => item.id === id) ?? feed[0],
    [feed, id],
  );

  const atCommentLimit = commentsUsedToday >= commentsDailyLimit;

  function submitComment() {
    const trimmed = comment.trim();
    if (!trimmed || atCommentLimit || !post) return;
    addGroupComment({ postId: post.id, body: trimmed, groupId: activeGroupId });
    setComment("");
  }

  if (!post) {
    return (
      <SoftStackShell title="Thread" onBack={() => router.back()} scroll={false}>
        <View style={styles.empty}>
          <AppText weight="semibold">Post not found</AppText>
          <Button size="lg" onPress={() => router.back()}>
            Back to Connect
          </Button>
        </View>
      </SoftStackShell>
    );
  }

  return (
    <SoftStackShell
      title="Thread"
      onBack={() => router.back()}
      scroll={false}
      right={
        <Pressable
          onPress={() => router.push(appRoutes.connectReport(post.id))}
          style={styles.iconBtn}
          accessibilityLabel="Report post"
        >
          <Feather name="flag" size={18} color={colors.text.muted} />
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.postCard}>
          <AppText variant="caption" style={styles.postMeta}>
            {post.author}
          </AppText>
          <AppText variant="body" tone="inverse">
            {post.body}
          </AppText>
        </View>

        <AppText weight="semibold">{post.comments.length} replies</AppText>
        <AppText variant="caption" tone="secondary">
          Comments {commentsUsedToday}/{commentsDailyLimit} today
        </AppText>

        {post.comments.map((item) => (
          <View key={item.id} style={styles.commentCard}>
            <AppText variant="caption" tone="secondary">
              {item.author} · {item.createdAt}
            </AppText>
            <AppText variant="bodySmall">{item.body}</AppText>
          </View>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.composer}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={
              atCommentLimit
                ? "Daily comment limit reached"
                : "Write a supportive reply..."
            }
            placeholderTextColor={colors.text.muted}
            style={styles.input}
            editable={!atCommentLimit}
            accessibilityLabel="Reply text"
            allowFontScaling
            maxFontSizeMultiplier={1.35}
          />
          <Button
            size="sm"
            disabled={comment.trim().length === 0 || atCommentLimit}
            onPress={submitComment}
          >
            Reply
          </Button>
        </View>
      </KeyboardAvoidingView>
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
  scroll: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  postCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.brand.peach,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  postMeta: { color: "rgba(255,255,255,0.78)" },
  commentCard: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.md,
    gap: 4,
  },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(44,36,32,0.06)",
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: spacing.lg,
    fontFamily: "Poppins_400Regular",
    color: colors.text.primary,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.page,
  },
});
