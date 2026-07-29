import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useGroupPostsQuery } from "@/lib/api/hooks";

export function ConnectBlockedScreen() {
  const router = useRouter();
  const { blockedAuthorIds, unblockAuthor, activeGroupId } = useMockUi();
  const groupPostsQuery = useGroupPostsQuery(activeGroupId);

  const posts = groupPostsQuery.data?.items ?? [];
  const nameByAuthorId = new Map(posts.map((post) => [post.authorId, post.authorName]));
  const blocked = blockedAuthorIds.map((authorId) => ({
    id: authorId,
    name: nameByAuthorId.get(authorId) ?? "Blocked member",
  }));

  return (
    <SoftStackShell title="Blocked members" onBack={() => router.back()}>
      <AppText variant="bodySmall" tone="secondary">
        Blocked members cannot see your posts and you won&apos;t see theirs.
      </AppText>

      {blocked.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="users" size={28} color={colors.brand.peach} />
          <AppText weight="semibold">No blocked members</AppText>
          <AppText variant="bodySmall" tone="secondary" align="center">
            You can block someone from any post menu in Connect.
          </AppText>
        </View>
      ) : (
        blocked.map((member) => (
          <View key={member.id} style={styles.row}>
            <View style={styles.copy}>
              <AppText weight="semibold">{member.name}</AppText>
              <AppText variant="caption" tone="secondary">
                Blocked
              </AppText>
            </View>
            <Button size="sm" variant="ghost" onPress={() => unblockAuthor(member.id)}>
              Unblock
            </Button>
          </View>
        ))
      )}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
  },
  copy: { gap: 2 },
});
