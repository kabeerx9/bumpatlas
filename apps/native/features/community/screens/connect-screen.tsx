import { Feather } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText, Button, Screen, Surface, colors, spacing } from "@/design-system";
import { mockGroupPosts } from "@/features/mock/demo-data";

export function ConnectScreen() {
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppText variant="caption" tone="secondary" weight="semibold">
          CONNECT
        </AppText>
        <AppText variant="heading">0–6 months circle</AppText>
        <AppText variant="body" tone="secondary">
          Invite-only stage group. Text first. No child photos in community.
        </AppText>

        <Surface style={styles.promptCard}>
          <AppText variant="caption" weight="semibold" tone="secondary">
            TODAY’S PROMPT
          </AppText>
          <AppText weight="semibold">What’s one thing that made today easier?</AppText>
          <Button variant="secondary" onPress={() => undefined}>
            Share a reply
          </Button>
        </Surface>

        {mockGroupPosts.map((post) => (
          <Surface key={post.id} style={styles.postCard}>
            <AppText variant="caption" tone="secondary">
              {post.author}
            </AppText>
            <AppText>{post.body}</AppText>
            <View style={styles.postActions}>
              <Pressable style={styles.action}>
                <Feather name="heart" size={14} color={colors.text.secondary} />
                <AppText variant="caption" tone="secondary">
                  {post.reactions}
                </AppText>
              </Pressable>
              <Pressable style={styles.action}>
                <Feather name="message-circle" size={14} color={colors.text.secondary} />
                <AppText variant="caption" tone="secondary">
                  Reply
                </AppText>
              </Pressable>
              <Pressable style={styles.action}>
                <Feather name="flag" size={14} color={colors.text.secondary} />
                <AppText variant="caption" tone="secondary">
                  Report
                </AppText>
              </Pressable>
            </View>
          </Surface>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  promptCard: {
    gap: spacing.sm,
    padding: spacing.cardPadding,
    backgroundColor: colors.brand.sageSoft,
    borderColor: "transparent",
  },
  postCard: {
    gap: spacing.sm,
    padding: spacing.cardPadding,
  },
  postActions: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
