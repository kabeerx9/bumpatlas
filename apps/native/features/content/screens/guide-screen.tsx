import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText, Button, Screen, Surface, colors, radius, spacing } from "@/design-system";
import { mockGuides } from "@/features/mock/demo-data";
import { appRoutes } from "@/navigation/routes";

export function GuideScreen() {
  const router = useRouter();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppText variant="caption" tone="secondary" weight="semibold">
          GUIDE
        </AppText>
        <AppText variant="heading">Learn what matters now</AppText>
        <AppText variant="body" tone="secondary">
          Short reviewed tips. Ask the assistant when you need a nudge — not a doctor.
        </AppText>

        <Surface style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiIcon}>
              <Feather name="message-circle" size={16} color={colors.brand.terracotta} />
            </View>
            <AppText weight="semibold">Ask BumpAtlas</AppText>
          </View>
          <AppText variant="bodySmall" tone="secondary">
            Suggest a prompt, summarize your week, or find a tip. Educational only.
          </AppText>
          <Button variant="secondary" onPress={() => router.push(appRoutes.assistant)}>
            Open assistant
          </Button>
        </Surface>

        {mockGuides.map((guide) => (
          <Pressable key={guide.id}>
            <Surface style={styles.guideCard}>
              <AppText variant="caption" tone="secondary" weight="semibold">
                {guide.category.toUpperCase()}
              </AppText>
              <AppText weight="semibold">{guide.title}</AppText>
            </Surface>
          </Pressable>
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
  aiCard: {
    gap: spacing.sm,
    padding: spacing.cardPadding,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  aiIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.sageSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  guideCard: {
    gap: spacing.xs,
    padding: spacing.cardPadding,
  },
});
