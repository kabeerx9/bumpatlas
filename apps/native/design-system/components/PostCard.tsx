import { Feather } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar } from "@/design-system/components/Avatar";
import { AppText } from "@/design-system/components/Text";
import { useAppTheme } from "@/design-system/theme";
import { radius, shadows, spacing } from "@/design-system/tokens";

type PostCardProps = {
  authorName: string;
  authorUri?: string | null;
  timeLabel: string;
  body: string;
  likeCount: number;
  commentCount: number;
  liked?: boolean;
  onPress?: () => void;
  onLikePress?: () => void;
  /** Extra controls pushed to the right of the reaction row (reply, report, block). */
  actions?: ReactNode;
  /** Rendered below the card body — inline menus, moderation notices. */
  footer?: ReactNode;
};

/** A single community post: avatar + byline, body, then a quiet reaction row. */
export function PostCard({
  authorName,
  authorUri,
  timeLabel,
  body,
  likeCount,
  commentCount,
  liked = false,
  onPress,
  onLikePress,
  actions,
  footer,
}: PostCardProps) {
  const theme = useAppTheme();
  const Container = onPress ? Pressable : View;

  return (
    <Container
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `Post by ${authorName}` : undefined}
      onPress={onPress}
      style={[styles.card, shadows.soft, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.byline}>
        <Avatar name={authorName} uri={authorUri} size={34} />
        <View style={styles.bylineCopy}>
          <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
            {authorName}
          </AppText>
          <AppText variant="label" tone="muted" weight="medium" style={styles.time}>
            {timeLabel}
          </AppText>
        </View>
      </View>

      <AppText variant="bodySmall" tone="secondary" style={styles.body}>
        {body}
      </AppText>

      <View style={styles.reactions}>
        <Pressable
          onPress={onLikePress}
          disabled={!onLikePress}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={liked ? "Remove like" : "Like post"}
          accessibilityState={{ selected: liked }}
          style={styles.reaction}
        >
          <Feather
            name="heart"
            size={14}
            color={liked ? theme.colors.danger : theme.colors.textMuted}
          />
          <AppText variant="caption" tone="muted" weight="semibold">
            {likeCount}
          </AppText>
        </Pressable>
        <View style={styles.reaction}>
          <Feather name="message-circle" size={14} color={theme.colors.textMuted} />
          <AppText variant="caption" tone="muted" weight="semibold">
            {commentCount}
          </AppText>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {footer}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  byline: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  bylineCopy: {
    flex: 1,
  },
  time: {
    marginTop: 1,
    letterSpacing: 0,
    textTransform: "none",
  },
  body: {
    marginTop: spacing.sm + 2,
  },
  reactions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.sm + 2,
  },
  reaction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginLeft: "auto",
  },
});
