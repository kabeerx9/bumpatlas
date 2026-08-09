import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  IconButton,
  Screen,
  Surface,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { useGroupPostsQuery } from "@/lib/api/hooks";

export function ConnectBlockedScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { blockedAuthorIds, unblockAuthor, activeGroupId } = useAppState();
  const groupPostsQuery = useGroupPostsQuery(activeGroupId);

  const posts = groupPostsQuery.data?.items ?? [];
  const nameByAuthorId = new Map(posts.map((post) => [post.authorId, post.authorName]));
  const blocked = blockedAuthorIds.map((authorId) => ({
    id: authorId,
    name: nameByAuthorId.get(authorId) ?? "Blocked member",
  }));

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={theme.colors.text} />
        </IconButton>
        <AppText variant="title">Blocked members</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <AppText variant="bodySmall" tone="secondary">
          Blocked members cannot see your posts and you won&apos;t see theirs.
        </AppText>

        {blocked.length === 0 ? (
          <Surface tone="lavender" radiusSize="xl" style={styles.empty}>
            <Feather name="users" size={28} color={theme.colors.brandText} />
            <AppText weight="semibold">No blocked members</AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              You can block someone from any post menu in Connect.
            </AppText>
          </Surface>
        ) : (
          blocked.map((member) => (
            <Surface key={member.id} radiusSize="xl" style={styles.row}>
              <View style={styles.copy}>
                <AppText weight="semibold">{member.name}</AppText>
                <AppText variant="caption" tone="secondary">
                  Blocked
                </AppText>
              </View>
              <Button size="sm" variant="ghost" onPress={() => unblockAuthor(member.id)}>
                Unblock
              </Button>
            </Surface>
          ))
        )}
      </ScrollView>
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
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copy: { gap: 2 },
});
