import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  ChipRow,
  IconButton,
  PostCard,
  Screen,
  ScreenHeader,
  SectionHeader,
  Surface,
  colors,
  layout,
  radius,
  shadows,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { formatRelativeTime } from "@/features/shared/lib/format-date";
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
  } = useAppState();
  const groupsQuery = useGroupsQuery();
  // The stored id predates the server wiring and may be a mock id; resolve to a
  // real group (the joined one first) so the posts query never asks for a
  // group the server has never heard of.
  const loadedGroups = groupsQuery.data?.items;
  const resolvedGroupId = useMemo(() => {
    if (!loadedGroups || loadedGroups.length === 0) return activeGroupId;
    if (loadedGroups.some((group) => group.id === activeGroupId)) return activeGroupId;
    const joined = loadedGroups.find((group) => group.joined);
    return joined?.id ?? loadedGroups[0].id;
  }, [loadedGroups, activeGroupId]);
  const groupPostsQuery = useGroupPostsQuery(resolvedGroupId);
  const reactMutation = useReactToPostMutation(resolvedGroupId);
  const blockMutation = useBlockUserMutation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(!connectRulesSeen && !communityRulesAccepted);

  const groups = groupsQuery.data?.items ?? [];
  const activeGroup = useMemo(() => {
    const fromApi = groups.find((group) => group.id === resolvedGroupId);
    return {
      id: resolvedGroupId,
      name: fromApi?.name ?? "Your stage group",
      memberCount: fromApi?.memberCount ?? 0,
    };
  }, [resolvedGroupId, groups]);

  const posts = groupPostsQuery.data?.items ?? [];
  const visiblePosts = useMemo(
    () => posts.filter((post) => !blockedAuthorIds.includes(post.authorId)),
    [posts, blockedAuthorIds],
  );

  const groupChips = useMemo(
    () => groups.map((group) => ({ value: group.id, label: `${group.name} · ${group.memberCount}` })),
    [groups],
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
            setOpenMenuId(null);
          },
        },
      ],
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.gutter}>
          <ScreenHeader
            title="Community"
            subtitle="Tips and stories from other parents."
            action={
              <View style={styles.headerActions}>
                <IconButton
                  accessibilityLabel="Change stage group"
                  size={40}
                  onPress={() => router.push(appRoutes.connectGroups)}
                >
                  <Feather name="users" size={16} color={theme.colors.text} />
                </IconButton>
                <IconButton
                  accessibilityLabel="Blocked members"
                  size={40}
                  onPress={() => router.push(appRoutes.connectBlocked)}
                >
                  <Feather name="slash" size={16} color={theme.colors.text} />
                </IconButton>
              </View>
            }
          />
        </View>

        {groupChips.length > 0 ? (
          <ChipRow
            chips={groupChips}
            value={activeGroupId}
            onChange={() => router.push(appRoutes.connectGroups)}
          />
        ) : null}

        {rulesOpen ? (
          <View style={styles.gutter}>
            <Surface tone="mint" radiusSize="lg" bordered={false} style={styles.gapSm}>
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
          </View>
        ) : null}

        {isWarming ? (
          <View style={styles.gutter}>
            <Surface tone="lavender" radiusSize="lg" bordered={false} style={styles.warming}>
              <Feather name="sun" size={24} color={theme.colors.brandText} />
              <AppText weight="semibold">Your group is warming up</AppText>
              <AppText variant="bodySmall" tone="secondary">
                Founding hosts post the daily prompt until more families join. Be an early voice —
                text only, always kind.
              </AppText>
              <Button
                size="lg"
                onPress={() => router.push(appRoutes.connectCompose({ mode: "prompt" }))}
              >
                Share today&apos;s prompt
              </Button>
            </Surface>
          </View>
        ) : (
          <>
            <View style={styles.gutter}>
              <View style={[styles.promptCard, shadows.card, { backgroundColor: theme.colors.accent }]}>
                <AppText variant="label" style={styles.honeyLabel}>
                  Today&apos;s prompt
                </AppText>
                <AppText variant="title">{CONNECT_PROMPT}</AppText>
                <AppText variant="bodySmall" tone="secondary">
                  {visiblePosts.length} recent notes · keep it kind
                </AppText>
                <Button
                  size="lg"
                  onPress={() => router.push(appRoutes.connectCompose({ mode: "prompt" }))}
                  style={styles.promptCta}
                >
                  Share a reply
                </Button>
              </View>
            </View>

            <View style={styles.gutter}>
              <SectionHeader title={`From ${activeGroup.name}`} />
              <View style={styles.feed}>
                {visiblePosts.map((post) => (
                  <PostCard
                    key={post.id}
                    authorName={post.authorName}
                    timeLabel={formatRelativeTime(post.createdAt)}
                    body={post.body}
                    likeCount={post.reactionCount}
                    commentCount={post.commentCount}
                    liked={post.reactedByMe ?? false}
                    onPress={() => router.push(appRoutes.connectPost(post.id))}
                    onLikePress={() =>
                      reactMutation.mutate({ postId: post.id, reacted: post.reactedByMe ?? false })
                    }
                    actions={
                      <>
                        <Pressable
                          hitSlop={spacing.sm}
                          accessibilityRole="button"
                          accessibilityLabel="Reply to post"
                          onPress={() => router.push(appRoutes.connectPost(post.id))}
                        >
                          <Feather name="corner-up-left" size={14} color={theme.colors.textMuted} />
                        </Pressable>
                        <Pressable
                          hitSlop={spacing.sm}
                          accessibilityRole="button"
                          accessibilityLabel={`More options for ${post.authorName}`}
                          accessibilityState={{ expanded: openMenuId === post.id }}
                          onPress={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                        >
                          <Feather name="more-horizontal" size={16} color={theme.colors.textMuted} />
                        </Pressable>
                      </>
                    }
                    footer={
                      openMenuId === post.id ? (
                        <View style={[styles.menu, { borderTopColor: theme.colors.borderStrong }]}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Report post"
                            onPress={() => router.push(appRoutes.connectReport(post.id))}
                            style={styles.menuItem}
                          >
                            <Feather name="flag" size={14} color={theme.colors.textSecondary} />
                            <AppText variant="caption" weight="semibold" tone="secondary">
                              Report
                            </AppText>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Block ${post.authorName}`}
                            onPress={() => confirmBlock(post.authorId, post.authorName)}
                            style={styles.menuItem}
                          >
                            <Feather name="slash" size={14} color={theme.colors.danger} />
                            <AppText
                              variant="caption"
                              weight="semibold"
                              style={{ color: theme.colors.danger }}
                            >
                              Block {post.authorName.split(" · ")[0]}
                            </AppText>
                          </Pressable>
                        </View>
                      ) : null
                    }
                  />
                ))}
              </View>
            </View>
          </>
        )}

        <View style={styles.gutter}>
          <AppText variant="caption" tone="muted" weight="medium">
            {postsUsedToday} of 10 posts today · comments {commentsUsedToday}/{commentsDailyLimit} ·{" "}
            {activeGroup.memberCount} members
            {!linksAllowed ? ` · links paused (day ${accountAgeDays}/14)` : ""}
          </AppText>
        </View>

        <View style={styles.gutter}>
          <Surface tone="warm" radiusSize="lg" bordered={false} style={styles.safety}>
            <Feather name="shield" size={16} color={theme.colors.brandText} />
            <AppText variant="bodySmall" tone="secondary" style={styles.safetyCopy}>
              Block and report are always available. Groups are private — not a public feed.
            </AppText>
          </Surface>
        </View>

        <Pressable onPress={() => router.push(appRoutes.moderation)} style={styles.adminLink}>
          <AppText variant="caption" tone="muted">
            Founder: moderation queue
          </AppText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.sm,
    paddingBottom: layout.tabBarScrollPadding,
    gap: spacing.xl - 4,
  },
  gutter: { paddingHorizontal: spacing.page },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  gapSm: { gap: spacing.sm },
  warming: { alignItems: "flex-start", gap: spacing.md },
  promptCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  promptCta: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  honeyLabel: { color: colors.brand.honeyDeep },
  feed: { gap: spacing.md },
  menu: {
    flexDirection: "row",
    gap: spacing.xl,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    minHeight: 32,
  },
  safety: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  safetyCopy: { flex: 1 },
  adminLink: { alignSelf: "center", paddingVertical: spacing.sm },
});
