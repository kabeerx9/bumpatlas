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
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockGroupPosts } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { appRoutes } from "@/navigation/routes";

export function ConnectPostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { commentsUsedToday, commentsDailyLimit, incrementCommentCount } = useMockUi();
  const [comment, setComment] = useState("");
  const [localComments, setLocalComments] = useState<
    Array<{ id: string; author: string; body: string; createdAt: string }>
  >([]);

  const post = useMemo(
    () => mockGroupPosts.find((item) => item.id === id) ?? mockGroupPosts[0],
    [id],
  );

  const allComments = [...post.comments, ...localComments];
  const atCommentLimit = commentsUsedToday >= commentsDailyLimit;

  function submitComment() {
    const trimmed = comment.trim();
    if (!trimmed || atCommentLimit) return;
    incrementCommentCount();
    setLocalComments((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        author: "You · 12 weeks",
        body: trimmed,
        createdAt: "Just now",
      },
    ]);
    setComment("");
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Thread</AppText>
          <Pressable
            onPress={() => router.push(appRoutes.connectReport(post.id))}
            style={styles.iconBtn}
            accessibilityLabel="Report post"
          >
            <Feather name="flag" size={18} color={colors.text.muted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.postCard}>
            <AppText variant="caption" style={styles.postMeta}>
              {post.author}
            </AppText>
            <AppText variant="body" tone="inverse">
              {post.body}
            </AppText>
          </View>

          <AppText weight="semibold">{allComments.length} replies</AppText>
          <AppText variant="caption" tone="secondary">
            Comments {commentsUsedToday}/{commentsDailyLimit} today
          </AppText>

          {allComments.map((item) => (
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8EDE6" },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: spacing.page,
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
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
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
});
