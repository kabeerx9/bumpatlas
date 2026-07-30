import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  AppText,
  Button,
  IconButton,
  Screen,
  Surface,
  colors,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { useCreateCommentMutation, useGroupPostDetailQuery } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

const AVATAR_TONES = [colors.pastel.petal, colors.pastel.mint, colors.pastel.lemon, colors.pastel.sky];

function avatarTone(name: string) {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

export function ConnectPostDetailScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { commentsUsedToday, commentsDailyLimit, activeGroupId } = useMockUi();
  const [comment, setComment] = useState("");

  const postQuery = useGroupPostDetailQuery(activeGroupId, id ?? "");
  const createCommentMutation = useCreateCommentMutation(activeGroupId);

  const post = postQuery.data;
  const atCommentLimit = commentsUsedToday >= commentsDailyLimit;

  async function submitComment() {
    const trimmed = comment.trim();
    if (!trimmed || atCommentLimit || !post) return;
    try {
      await createCommentMutation.mutateAsync({ postId: post.id, body: trimmed });
      setComment("");
    } catch {
      Alert.alert("Couldn’t reply", "Check your connection and try again.");
    }
  }

  function Header({ right }: { right?: ReactNode }) {
    return (
      <View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={theme.colors.text} />
        </IconButton>
        <AppText variant="title">Thread</AppText>
        {right ?? <View style={styles.headerSpacer} />}
      </View>
    );
  }

  if (postQuery.isLoading) {
    return (
      <Screen padded={false}>
        <Header />
        <View style={styles.centered}>
          <AppText tone="secondary">Loading thread…</AppText>
        </View>
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen padded={false}>
        <Header />
        <View style={styles.centered}>
          <AppText weight="semibold">Post not found</AppText>
          <Button size="lg" onPress={() => router.back()}>
            Back to Connect
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Header
        right={
          <IconButton
            accessibilityLabel="Report post"
            onPress={() => router.push(appRoutes.connectReport(post.id))}
          >
            <Feather name="flag" size={18} color={theme.colors.textMuted} />
          </IconButton>
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Surface radiusSize="lg" style={styles.postCard}>
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: avatarTone(post.authorName) }]}>
              <AppText weight="semibold">{post.authorName.slice(0, 1)}</AppText>
            </View>
            <AppText variant="bodySmall" weight="semibold">
              {post.authorName}
            </AppText>
          </View>
          <AppText variant="body" style={styles.postBody}>
            {post.body}
          </AppText>
        </Surface>

        <AppText weight="semibold">{post.comments.length} replies</AppText>
        <AppText variant="caption" tone="secondary">
          Comments {commentsUsedToday}/{commentsDailyLimit} today
        </AppText>

        {post.comments.map((item) => (
          <Surface key={item.id} radiusSize="md" style={styles.commentCard}>
            <AppText variant="caption" tone="secondary">
              {item.authorName} · {item.createdAt}
            </AppText>
            <AppText variant="bodySmall">{item.body}</AppText>
          </Surface>
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.composer}>
          <View style={styles.inputWrap}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={
                atCommentLimit
                  ? "Daily comment limit reached"
                  : "Write a supportive reply..."
              }
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.input, { color: theme.colors.text }]}
              editable={!atCommentLimit}
              accessibilityLabel="Reply text"
              allowFontScaling
              maxFontSizeMultiplier={1.35}
            />
          </View>
          <IconButton
            accessibilityLabel="Send reply"
            tone="mint"
            disabled={comment.trim().length === 0 || atCommentLimit || createCommentMutation.isPending}
            onPress={() => void submitComment()}
          >
            <Feather name="arrow-up" size={18} color={theme.colors.primaryText} />
          </IconButton>
        </View>
      </KeyboardAvoidingView>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  postCard: { gap: spacing.sm },
  authorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  postBody: { marginTop: spacing.xs },
  commentCard: { gap: 4 },
  composer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  input: {
    fontFamily: "Poppins_400Regular",
  },
});
