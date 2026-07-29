import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockGroupPosts, mockToday } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";

const MAX_CHARS = 500;

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
  const parentPost = useMemo(
    () => mockGroupPosts.find((post) => post.id === postId),
    [postId],
  );

  const { communityRulesAccepted, acceptCommunityRules, postsUsedToday, incrementPostCount, commentsUsedToday, incrementCommentCount, commentsDailyLimit } =
    useMockUi();

  const [body, setBody] = useState("");
  const [rulesAccepted, setRulesAccepted] = useState(communityRulesAccepted);

  const trimmed = body.trim();
  const effectiveRules = rulesAccepted || communityRulesAccepted;
  const atPostLimit = !isReply && postsUsedToday >= 10;
  const atCommentLimit = isReply && commentsUsedToday >= commentsDailyLimit;
  const canPost =
    trimmed.length > 0 &&
    effectiveRules &&
    trimmed.length <= MAX_CHARS &&
    !atPostLimit &&
    !atCommentLimit;

  function handlePost() {
    if (!canPost) return;
    if (!communityRulesAccepted) acceptCommunityRules();
    if (isReply) incrementCommentCount();
    else incrementPostCount();
    router.back();
  }

  function toggleRules() {
    setRulesAccepted((current) => !current);
  }

  return (
    <View style={styles.root}>
      <View style={styles.atmosphere} pointerEvents="none">
        <View style={styles.blob} />
        <View style={styles.blobSoft} />
      </View>

      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityLabel="Close composer"
            >
              <Feather name="x" size={20} color={colors.brand.ink} />
            </Pressable>
            <AppText weight="semibold">
              {isReply ? "Reply" : "Share a reply"}
            </AppText>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.body}>
            <View style={styles.contextPanel}>
              <AppText variant="caption" style={styles.peachLabel}>
                {isReply ? "Replying in" : "Today’s prompt"} · {mockToday.connectCard.groupName}
              </AppText>
              <AppText variant="title" tone="inverse" style={styles.contextTitle}>
                {isReply && parentPost
                  ? parentPost.body
                  : mockToday.connectCard.prompt}
              </AppText>
              {isReply && parentPost ? (
                <AppText variant="caption" style={styles.contextMeta}>
                  {parentPost.author} · comments {commentsUsedToday}/{commentsDailyLimit} today
                </AppText>
              ) : (
                <AppText variant="caption" style={styles.contextMeta}>
                  {mockToday.connectCard.replyCount} parents replied today · posts{" "}
                  {postsUsedToday}/10 today · comments {commentsUsedToday}/{commentsDailyLimit}
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

          <View style={styles.footer}>
            <Button size="lg" disabled={!canPost} onPress={handlePost}>
              {isReply ? "Post reply" : "Post to group"}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8EDE6",
  },
  atmosphere: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(229,155,138,0.28)",
    top: -80,
    right: -70,
  },
  blobSoft: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(243,199,188,0.3)",
    bottom: 80,
    left: -60,
  },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.md,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 44 },
  body: {
    flex: 1,
    paddingHorizontal: spacing.page,
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
    flex: 1,
    minHeight: 140,
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
  footer: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
});
