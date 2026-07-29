import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, colors, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftHeader } from "@/features/shared/components/soft-header";
import { SoftPanel } from "@/features/shared/components/soft-panel";
import { SoftScreen } from "@/features/shared/components/soft-screen";
import {
  useBlockUserMutation,
  useGroupPostsQuery,
  useGroupsQuery,
  useReactToPostMutation,
} from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

const CONNECT_PROMPT = "What made today feel a little easier?";

export function ConnectScreen() {
  const router = useRouter();
  const {
    blockedAuthorIds,
    blockAuthor,
    activeGroupId,
    postsUsedToday,
    commentsUsedToday,
    commentsDailyLimit,
    communityRulesAccepted,
    acceptCommunityRules,
    connectRulesSeen,
    markConnectRulesSeen,
    accountAgeDays,
    linksAllowed,
  } = useMockUi();
  const groupsQuery = useGroupsQuery();
  const groupPostsQuery = useGroupPostsQuery(activeGroupId);
  const reactMutation = useReactToPostMutation(activeGroupId);
  const blockMutation = useBlockUserMutation();
  const [showBlockMenu, setShowBlockMenu] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(!connectRulesSeen && !communityRulesAccepted);

  const activeGroup = useMemo(() => {
    const fromApi = groupsQuery.data?.items.find((group) => group.id === activeGroupId);
    return {
      id: activeGroupId,
      name: fromApi?.name ?? "Your stage group",
      memberCount: fromApi?.memberCount ?? 0,
    };
  }, [activeGroupId, groupsQuery.data?.items]);

  const posts = groupPostsQuery.data?.items ?? [];
  const visiblePosts = useMemo(
    () => posts.filter((post) => !blockedAuthorIds.includes(post.authorId)),
    [posts, blockedAuthorIds],
  );

  const isWarming = !groupPostsQuery.isLoading && visiblePosts.length === 0;

  function confirmBlock(authorId: string, authorName: string) {
    Alert.alert(
      "Block member?",
      `You won't see posts from ${authorName}. They won't see yours.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () => {
            blockAuthor(authorId);
            blockMutation.mutate({ userId: authorId });
            setShowBlockMenu(null);
          },
        },
      ],
    );
  }

  return (
    <SoftScreen>
      <SoftHeader
        eyebrow="Connect"
        title={activeGroup.name}
        subtitle="Invite-only stage group. Text first. No child photos in community."
        right={
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push(appRoutes.connectGroups)}
              hitSlop={8}
              style={styles.headerIcon}
              accessibilityLabel="Change stage group"
            >
              <Feather name="users" size={18} color={colors.brand.peach} />
            </Pressable>
            <Pressable
              onPress={() => router.push(appRoutes.connectBlocked)}
              hitSlop={8}
              style={styles.headerIcon}
              accessibilityLabel="Blocked members"
            >
              <Feather name="slash" size={18} color={colors.brand.peach} />
            </Pressable>
          </View>
        }
      />

      {rulesOpen ? (
        <SoftPanel style={styles.rulesGate}>
          <AppText weight="semibold">Community rules</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Text only — no child photos. Be kind. No medical dosing for others. Report anything
            unsafe.
          </AppText>
          <Button
            size="lg"
            onPress={() => {
              acceptCommunityRules();
              markConnectRulesSeen();
              setRulesOpen(false);
            }}
          >
            I agree · continue
          </Button>
        </SoftPanel>
      ) : null}

      <AppText variant="caption" tone="secondary">
        {postsUsedToday} of 10 posts today · comments {commentsUsedToday}/{commentsDailyLimit} ·{" "}
        {activeGroup.memberCount} members
        {!linksAllowed ? ` · links paused (day ${accountAgeDays}/14)` : ""}
      </AppText>

      <Pressable onPress={() => router.push(appRoutes.connectGroups)} style={styles.changeGroup}>
        <AppText variant="caption" weight="semibold" style={styles.changeGroupText}>
          Change group
        </AppText>
        <Feather name="chevron-right" size={14} color={colors.brand.peach} />
      </Pressable>

      {isWarming ? (
        <SoftPanel style={styles.warming}>
          <Feather name="sun" size={24} color={colors.brand.peach} />
          <AppText weight="semibold">Your group is warming up</AppText>
          <AppText variant="bodySmall" tone="secondary">
            Founding hosts post the daily prompt until more families join. Be an early voice — text
            only, always kind.
          </AppText>
          <Button
            size="lg"
            onPress={() => router.push(appRoutes.connectCompose({ mode: "prompt" }))}
          >
            Share today&apos;s prompt
          </Button>
        </SoftPanel>
      ) : (
        <>
          <SoftPanel tinted style={styles.promptCard}>
            <AppText variant="caption" style={styles.promptEyebrow}>
              Today's prompt
            </AppText>
            <AppText variant="title" tone="inverse">
              {CONNECT_PROMPT}
            </AppText>
            <AppText variant="bodySmall" style={styles.promptMeta}>
              {visiblePosts.length} recent notes · keep it kind
            </AppText>
            <Button
              variant="ghost"
              size="lg"
              onPress={() => router.push(appRoutes.connectCompose({ mode: "prompt" }))}
              style={styles.promptCta}
            >
              Share a reply
            </Button>
          </SoftPanel>

          <AppText weight="semibold">From your circle</AppText>

          {visiblePosts.map((post) => {
            const liked = post.reactedByMe ?? false;
            return (
              <SoftPanel key={post.id}>
                <Pressable onPress={() => router.push(appRoutes.connectPost(post.id))}>
                  <View style={styles.authorRow}>
                    <View style={styles.avatar}>
                      <AppText weight="semibold" tone="inverse">
                        {post.authorName.slice(0, 1)}
                      </AppText>
                    </View>
                    <AppText variant="caption" tone="secondary">
                      {post.authorName}
                    </AppText>
                  </View>
                  <AppText>{post.body}</AppText>
                  <AppText variant="caption" tone="secondary" style={styles.commentCount}>
                    {post.commentCount} replies
                  </AppText>
                </Pressable>
                <View style={styles.postActions}>
                  <Pressable
                    style={styles.action}
                    onPress={() => reactMutation.mutate(post.id)}
                    disabled={reactMutation.isPending}
                    accessibilityLabel={liked ? "Unlike post" : "Like post"}
                    hitSlop={8}
                  >
                    <Feather
                      name="heart"
                      size={14}
                      color={liked ? colors.brand.terracotta : colors.brand.peach}
                    />
                    <AppText variant="caption" tone="secondary">
                      {post.reactionCount}
                    </AppText>
                  </Pressable>
                  <Pressable
                    style={styles.action}
                    onPress={() => router.push(appRoutes.connectPost(post.id))}
                    accessibilityLabel="Reply to post"
                    hitSlop={8}
                  >
                    <Feather name="message-circle" size={14} color={colors.brand.peach} />
                    <AppText variant="caption" tone="secondary">
                      Reply
                    </AppText>
                  </Pressable>
                  <Pressable
                    style={styles.action}
                    onPress={() => router.push(appRoutes.connectReport(post.id))}
                    accessibilityLabel="Report post"
                    hitSlop={8}
                  >
                    <Feather name="flag" size={14} color={colors.text.muted} />
                    <AppText variant="caption" tone="secondary">
                      Report
                    </AppText>
                  </Pressable>
                  <Pressable
                    style={styles.action}
                    onPress={() =>
                      setShowBlockMenu(showBlockMenu === post.id ? null : post.id)
                    }
                    accessibilityLabel={`Block options for ${post.authorName}`}
                  >
                    <Feather name="slash" size={14} color={colors.text.muted} />
                    <AppText variant="caption" tone="secondary">
                      Block
                    </AppText>
                  </Pressable>
                </View>
                {showBlockMenu === post.id ? (
                  <Pressable
                    style={styles.blockRow}
                    onPress={() => confirmBlock(post.authorId, post.authorName)}
                  >
                    <AppText variant="caption" weight="semibold" style={styles.blockText}>
                      Block {post.authorName.split(" · ")[0]}
                    </AppText>
                  </Pressable>
                ) : null}
              </SoftPanel>
            );
          })}
        </>
      )}

      <SoftPanel style={styles.safety}>
        <Feather name="shield" size={16} color={colors.brand.peach} />
        <AppText variant="bodySmall" tone="secondary" style={styles.safetyCopy}>
          Block and report are always available. Groups are private — not a public feed.
        </AppText>
      </SoftPanel>

      <Pressable onPress={() => router.push(appRoutes.moderation)} style={styles.adminLink}>
        <AppText variant="caption" tone="secondary">
          Founder: moderation queue
        </AppText>
      </Pressable>
    </SoftScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rulesGate: { gap: spacing.sm },
  changeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  changeGroupText: { color: colors.brand.peach },
  warming: { alignItems: "flex-start", gap: spacing.md },
  promptCard: { gap: spacing.md, padding: spacing.xl },
  promptEyebrow: {
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  promptMeta: { color: "rgba(255,255,255,0.82)" },
  promptCta: {
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.card,
    marginTop: spacing.xs,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  commentCount: { marginTop: spacing.xs },
  postActions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  blockRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(44,36,32,0.06)",
  },
  blockText: { color: colors.brand.terracotta },
  safety: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  safetyCopy: { flex: 1 },
  adminLink: { alignSelf: "center", paddingVertical: spacing.sm },
});
