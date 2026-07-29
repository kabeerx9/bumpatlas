import { Feather } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText, Screen, Surface, colors, radius, spacing } from "@/design-system";
import { mockMemories, mockMilestones, mockProfile } from "@/features/mock/demo-data";

export function JourneyScreen() {
  return (
    <Screen background={colors.surface.app}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AppText variant="caption" tone="secondary" weight="semibold">
          JOURNEY
        </AppText>
        <AppText variant="heading">{mockProfile.displayName}’s story</AppText>
        <AppText variant="body" tone="secondary">
          A private timeline of moments and milestones.
        </AppText>

        <View style={styles.section}>
          <AppText weight="semibold">Milestones</AppText>
          <View style={styles.milestoneRow}>
            {mockMilestones.map((item) => (
              <Surface key={item.id} style={styles.milestoneCard}>
                <AppText variant="caption" tone="secondary">
                  {item.status}
                </AppText>
                <AppText weight="semibold">{item.title}</AppText>
              </Surface>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <AppText weight="semibold">Recent memories</AppText>
          {mockMemories.map((memory) => (
            <Surface key={memory.id} style={styles.memoryCard}>
              <View style={styles.memoryTop}>
                <View style={styles.photoPlaceholder}>
                  <Feather name="image" size={18} color={colors.text.muted} />
                </View>
                <View style={styles.memoryCopy}>
                  <AppText variant="caption" tone="secondary">
                    {memory.dateLabel} · {memory.author}
                  </AppText>
                  <AppText weight="semibold">{memory.title}</AppText>
                  <AppText variant="bodySmall" tone="secondary">
                    {memory.body}
                  </AppText>
                </View>
              </View>
            </Surface>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  milestoneRow: {
    gap: spacing.sm,
  },
  milestoneCard: {
    padding: spacing.cardPadding,
    gap: spacing.xs,
  },
  memoryCard: {
    padding: spacing.cardPadding,
  },
  memoryTop: {
    flexDirection: "row",
    gap: spacing.md,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surface.cool,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
