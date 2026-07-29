import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { mockGroupPosts } from "@/features/mock/demo-data";
import { useMockUi } from "@/features/mock/mock-ui-context";

export function ConnectBlockedScreen() {
  const router = useRouter();
  const { blockedAuthorIds, unblockAuthor } = useMockUi();

  const blocked = mockGroupPosts
    .filter((post) => blockedAuthorIds.includes(post.authorId))
    .map((post) => ({ id: post.authorId, name: post.author }));

  const uniqueBlocked = Array.from(new Map(blocked.map((item) => [item.id, item])).values());

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">Blocked members</AppText>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="bodySmall" tone="secondary">
            Blocked members cannot see your posts and you won&apos;t see theirs.
          </AppText>

          {uniqueBlocked.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="users" size={28} color={colors.brand.peach} />
              <AppText weight="semibold">No blocked members</AppText>
              <AppText variant="bodySmall" tone="secondary" align="center">
                You can block someone from any post menu in Connect.
              </AppText>
            </View>
          ) : (
            uniqueBlocked.map((member) => (
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
        </ScrollView>
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
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: spacing.page,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
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
