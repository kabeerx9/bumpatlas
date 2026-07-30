import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

export type Citation = {
  title: string;
  sourceName: string;
  reviewerName: string;
  reviewedOn: string;
  guideId?: string;
};

type CitationCardProps = {
  citation: Citation;
  onOpen?: () => void;
};

export function CitationCard({ citation, onOpen }: CitationCardProps) {
  return (
    <Pressable
      onPress={onOpen}
      disabled={!onOpen}
      style={[styles.card, !onOpen && styles.cardStatic]}
    >
      <Feather name="book-open" size={14} color={colors.brand.honeyDeep} />
      <View style={styles.copy}>
        <AppText variant="caption" weight="semibold" style={styles.title}>
          {citation.title}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {citation.reviewerName} · {citation.reviewedOn} · {citation.sourceName}
        </AppText>
      </View>
      {onOpen ? <Feather name="chevron-right" size={14} color={colors.text.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.honeySoft,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  cardStatic: {
    opacity: 1,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.brand.ink,
  },
});
