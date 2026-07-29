import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, colors, radius, spacing } from "@/design-system";
import { useMockUi } from "@/features/mock/mock-ui-context";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useBookmarkContentMutation, useContentDetailQuery } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

export function GuideDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { markLearnDone } = useMockUi();
  const guideQuery = useContentDetailQuery(id ?? "");
  const bookmarkMutation = useBookmarkContentMutation();
  const guide = guideQuery.data;
  const [localBookmarked, setLocalBookmarked] = useState<boolean | null>(null);

  useEffect(() => {
    setLocalBookmarked(null);
  }, [guide?.id]);

  const bookmarked = localBookmarked ?? guide?.bookmarked ?? false;
  const paragraphs = useMemo(
    () => (guide?.bodyMarkdown ? guide.bodyMarkdown.split(/\n{2,}/).filter(Boolean) : []),
    [guide?.bodyMarkdown],
  );
  const citation = guide?.citations?.[0];

  function toggleBookmark() {
    if (!guide) return;
    const next = !bookmarked;
    setLocalBookmarked(next);
    bookmarkMutation.mutate(guide.id, {
      onError: () => setLocalBookmarked(!next),
    });
  }

  function finishReading() {
    markLearnDone();
    router.back();
  }

  if (guideQuery.isLoading || !guide) {
    return (
      <SoftStackShell title="Guide" onBack={() => router.back()} centered>
        <ActivityIndicator color={colors.brand.peach} />
      </SoftStackShell>
    );
  }

  return (
    <SoftStackShell
      title="Guide"
      onBack={() => router.back()}
      right={
        <Pressable
          onPress={toggleBookmark}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark article"}
        >
          <Feather
            name="bookmark"
            size={18}
            color={bookmarked ? colors.brand.peach : colors.brand.ink}
          />
        </Pressable>
      }
      footer={
        <>
          <Button size="lg" onPress={finishReading}>
            Mark Learn done for today
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onPress={() => router.push(appRoutes.assistant)}
            style={styles.assistantBtn}
          >
            Ask about this topic
          </Button>
        </>
      }
    >
      <View style={styles.hero}>
        <AppText variant="caption" style={styles.eyebrow}>
          {(guide.stageTags[0] ?? "Guide")} · {guide.readingMinutes} min read
        </AppText>
        <AppText variant="heading" style={styles.heroTitle}>
          {guide.title}
        </AppText>
        <AppText variant="body" style={styles.heroSummary}>
          {guide.summary}
        </AppText>
      </View>

      {citation ? (
        <View style={styles.citationCard}>
          <Feather name="check-circle" size={16} color={colors.brand.peach} />
          <View style={styles.citationCopy}>
            <AppText weight="semibold">Reviewed content</AppText>
            <AppText variant="caption" tone="secondary">
              Source: {citation.source}
            </AppText>
          </View>
        </View>
      ) : null}

      <View style={styles.bodyCard}>
        {paragraphs.map((paragraph, index) => (
          <AppText key={`${guide.id}-p-${index}`} variant="body" style={styles.paragraph}>
            {paragraph}
          </AppText>
        ))}
      </View>

      <View style={styles.disclaimer}>
        <Feather name="info" size={16} color={colors.brand.peach} />
        <AppText variant="bodySmall" tone="secondary" style={styles.disclaimerCopy}>
          Educational only — not medical advice. If something worries you about your baby or
          pregnancy, contact a qualified clinician.
        </AppText>
      </View>
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    borderRadius: 28,
    backgroundColor: colors.brand.peach,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.78)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.text.inverse,
    lineHeight: 34,
  },
  heroSummary: {
    color: "rgba(255,255,255,0.9)",
    lineHeight: 22,
  },
  citationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
  },
  citationCopy: {
    flex: 1,
    gap: 4,
  },
  bodyCard: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.xl,
    gap: spacing.md,
  },
  paragraph: {
    lineHeight: 24,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.peachSoft,
    padding: spacing.lg,
  },
  disclaimerCopy: {
    flex: 1,
    lineHeight: 20,
  },
  assistantBtn: {
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.card,
  },
});
