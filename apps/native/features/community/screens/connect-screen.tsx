import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  CardStack,
  IconButton,
  Pill,
  Screen,
  Surface,
  colors,
  radius,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import {
  useBlockUserMutation,
  useGroupPostsQuery,
  useGroupsQuery,
  useReactToPostMutation,
} from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

const CONNECT_PROMPT = "What made today feel a little easier?";

const AVATAR_TONES = [colors.pastel.petal, colors.pastel.mint, colors.pastel.lemon, colors.pastel.sky];

function avatarTone(name: string) {
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMinutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

export function ConnectScreen() {
  const router = useRouter();
  const theme = useAppTheme();
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

  const groups = groupsQuery.data?.items ?? [];
  const activeGroup = useMemo(() => {
    const fromApi = groups.find((group) => group.id === activeGroupId);
    return {
      id: activeGroupId,
      name: fromApi?.name ?? "Your stage group",
      memberCount: fromApi?.memberCount ?? 0,
    };
  }, [activeGroupId, groups]);

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
    <Screen padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <AppText variant="caption" tone="brand" style={styles.eyebrow}>
              Connect
            </AppText>
            <AppText variant="heading">{activeGroup.name}</AppText>
            <AppText variant="bodySmall" tone="secondary">
              Invite-only stage group. Text first. No child photos in community.
            </AppText>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              accessibilityLabel="Change stage group"
              onPress={() => router.push(appRoutes.connectGroups)}
            >
              <Feather name="users" size={18} color={theme.colors.text} />
            </IconButton>
            <IconButton
              accessibilityLabel="Blocked members"
              onPress={() => router.push(appRoutes.connectBlocked)}
            >
              <Feather name="slash" size={18} color={theme.colors.text} />
            </IconButton>
          </View>
        </View>

        {groups.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {groups.map((group) => (
              <Pressable
                key={group.id}
                onPress={() => router.push(appRoutes.connectGroups)}
                accessibilityRole="button"
                accessibilityLabel={`${group.name}, ${group.memberCount} members`}
              >
                <Pill tone={group.id === activeGroupId ? "selected" : "neutral"}>
                  {group.name} · {group.memberCount}
                </Pill>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {rulesOpen ? (
          <Surface tone="mint" style={styles.rulesGate}>
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
          </Surface>
        ) : null}

        <AppText variant="caption" tone="secondary">
          {postsUsedToday} of 10 posts today · comments {commentsUsedToday}/{commentsDailyLimit} ·{" "}
          {activeGroup.memberCount} members
          {!linksAllowed ? ` · links paused (day ${accountAgeDays}/14)` : ""}
        </AppText>

        {isWarming ? (
          <Surface tone="lavender" style={styles.warming}>
            <Feather name="sun" size={24} color={theme.colors.brandText} />
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
          </Surface>
        ) : (
          <>
            <CardStack style={styles.promptStack}>
              <Surface tone="dark" bordered={false} radiusSize="xl" style={styles.promptCard}>
                <AppText variant="caption" tone="inverse" style={styles.promptEyebrow}>
                  Today's prompt
                </AppText>
                <AppText variant="title" tone="inverse">
                  {CONNECT_PROMPT}
                </AppText>
                <AppText variant="bodySmall" tone="inverse" style={styles.promptMeta}>
                  {visiblePosts.length} recent notes · keep it kind
                </AppText>
                <Button
                  variant="secondary"
                  size="lg"
                  onPress={() => router.push(appRoutes.connectCompose({ mode: "prompt" }))}
                  style={styles.promptCta}
                >
                  Share a reply
                </Button>
              </Surface>
            </CardStack>

            <AppText weight="semibold">From your circle</AppText>

            {visiblePosts.map((post) => {
              const liked = post.reactedByMe ?? false;
              return (
                <Surface key={post.id} radiusSize="lg" style={styles.postCard}>
                  <Pressable onPress={() => router.push(appRoutes.connectPost(post.id))}>
                    <View style={styles.authorRow}>
                      <View style={[styles.avatar, { backgroundColor: avatarTone(post.authorName) }]}>
                        <AppText weight="semibold">{post.authorName.slice(0, 1)}</AppText>
                      </View>
                      <View style={styles.authorCopy}>
                        <AppText variant="bodySmall" weight="semibold">
                          {post.authorName}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {timeAgo(post.createdAt)}
                        </AppText>
                      </View>
                    </View>
                    <AppText style={styles.postBody}>{post.body}</AppText>
                    <AppText variant="caption" tone="secondary" style={styles.commentCount}>
                      {post.commentCount} replies
                    </AppText>
                  </Pressable>
                  <View style={styles.postActions}>
                    <View style={styles.action}>
                      <IconButton
                        accessibilityLabel={liked ? "Unlike post" : "Like post"}
                        onPress={() => reactMutation.mutate(post.id)}
                        disabled={reactMutation.isPending}
                        size={36}
                        tone={liked ? "purple" : "card"}
                      >
                        <Feather
                          name="heart"
                          size={14}
                          color={liked ? theme.colors.secondaryText : theme.colors.textMuted}
                        />
                      </IconButton>
                      <AppText variant="caption" tone="secondary">
                        {post.reactionCount}
                      </AppText>
                    </View>
                    <View style={styles.action}>
                      <IconButton
                        accessibilityLabel="Reply to post"
                        onPress={() => router.push(appRoutes.connectPost(post.id))}
                        size={36}
                      >
                        <Feather name="message-circle" size={14} color={theme.colors.textMuted} />
                      </IconButton>
                      <AppText variant="caption" tone="secondary">
                        Reply
                      </AppText>
                    </View>
                    <View style={styles.action}>
                      <IconButton
                        accessibilityLabel="Report post"
                        onPress={() => router.push(appRoutes.connectReport(post.id))}
                        size={36}
                      >
                        <Feather name="flag" size={14} color={theme.colors.textMuted} />
                      </IconButton>
                      <AppText variant="caption" tone="secondary">
                        Report
                      </AppText>
                    </View>
                    <View style={styles.action}>
                      <IconButton
                        accessibilityLabel={`Block options for ${post.authorName}`}
                        onPress={() =>
                          setShowBlockMenu(showBlockMenu === post.id ? null : post.id)
                        }
                        size={36}
                      >
                        <Feather name="slash" size={14} color={theme.colors.textMuted} />
                      </IconButton>
                      <AppText variant="caption" tone="secondary">
                        Block
                      </AppText>
                    </View>
                  </View>
                  {showBlockMenu === post.id ? (
                    <Pressable
                      style={styles.blockRow}
                      onPress={() => confirmBlock(post.authorId, post.authorName)}
                    >
                      <AppText variant="caption" weight="semibold" tone="brand">
                        Block {post.authorName.split(" · ")[0]}
                      </AppText>
                    </Pressable>
                  ) : null}
                </Surface>
              );
            })}
          </>
        )}

        <Surface tone="warm" style={styles.safety}>
          <Feather name="shield" size={16} color={theme.colors.brandText} />
          <AppText variant="bodySmall" tone="secondary" style={styles.safetyCopy}>
            Block and report are always available. Groups are private — not a public feed.
          </AppText>
        </Surface>

        <Pressable onPress={() => router.push(appRoutes.moderation)} style={styles.adminLink}>
          <AppText variant="caption" tone="secondary">
            Founder: moderation queue
          </AppText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { letterSpacing: 1, textTransform: "uppercase" },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chipRow: { gap: spacing.sm, paddingRight: spacing.md },
  rulesGate: { gap: spacing.sm },
  postCard: { gap: 0 },
  warming: { alignItems: "flex-start", gap: spacing.md },
  promptStack: { marginTop: spacing.xs },
  promptCard: { gap: spacing.md, padding: spacing.xl },
  promptEyebrow: {
    opacity: 0.78,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  promptMeta: { opacity: 0.82 },
  promptCta: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  authorCopy: { gap: 1 },
  postBody: { marginTop: spacing.sm },
  commentCount: { marginTop: spacing.xs },
  postActions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  blockRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  safety: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  safetyCopy: { flex: 1 },
  adminLink: { alignSelf: "center", paddingVertical: spacing.sm },
});
