import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  borderWidth,
  radius,
  shadows,
  spacing,
  useAppTheme,
} from "@/design-system";
import { useAppState } from "@/features/shared/providers/app-state-provider";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";
import { useBookmarkContentMutation, useContentDetailQuery } from "@/lib/api/hooks";
import { appRoutes } from "@/navigation/routes";

const heroImages = [
  "https://images.unsplash.com/photo-1546015720-b8b30df5aa27",
  "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4",
  "https://images.unsplash.com/photo-1519689680058-324335c77eba",
  "https://images.unsplash.com/photo-1457342813143-a1ae27448a82",
];

function hashId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 997;
  }
  return Math.abs(hash);
}

function heroImageForId(id: string) {
  return `${heroImages[hashId(id) % heroImages.length]}?w=1200&q=80`;
}

export function GuideDetailScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { markLearnDone } = useAppState();
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

  if (guideQuery.isLoading) {
    return (
      <SoftStackShell title="Guide" onBack={() => router.back()} centered>
        <ActivityIndicator color={theme.colors.primary} />
      </SoftStackShell>
    );
  }

  /** Query failed (unpublished, removed, or bad id) — a calm dead end, not an infinite spinner. */
  if (!guide) {
    return (
      <SoftStackShell title="Guide" onBack={() => router.back()} centered>
        <Feather name="book-open" size={28} color={theme.colors.textMuted} />
        <AppText variant="heading" weight="semibold" align="center">
          Article not available
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          This guide may have been unpublished or the link is out of date.
        </AppText>
        <Button size="lg" variant="ghost" onPress={() => router.back()}>
          Go back
        </Button>
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
          style={[
            styles.iconBtn,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark article"}
        >
          <Feather
            name="bookmark"
            size={18}
            color={bookmarked ? theme.colors.brandText : theme.colors.text}
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
          >
            Ask about this topic
          </Button>
        </>
      }
    >
      <View
        style={[
          styles.heroCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Image source={{ uri: heroImageForId(guide.id) }} style={styles.heroImage} />
        <View style={styles.heroBody}>
          <AppText variant="caption" tone="brand" weight="semibold" style={styles.eyebrow}>
            {(guide.stageTags[0] ?? "Guide")} · {guide.readingMinutes} min read
          </AppText>
          <AppText variant="heading" style={styles.heroTitle}>
            {guide.title}
          </AppText>
          <AppText variant="body" tone="secondary" style={styles.heroSummary}>
            {guide.summary}
          </AppText>
        </View>
      </View>

      {citation ? (
        <View
          style={[
            styles.citationCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Feather name="check-circle" size={16} color={theme.colors.brandText} />
          <View style={styles.citationCopy}>
            <AppText weight="semibold">Reviewed content</AppText>
            <AppText variant="caption" tone="secondary">
              Source: {citation.source}
            </AppText>
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.bodyCard,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        {paragraphs.map((paragraph, index) => (
          <AppText key={`${guide.id}-p-${index}`} variant="body" style={styles.paragraph}>
            {paragraph}
          </AppText>
        ))}
      </View>

      <View style={[styles.disclaimer, { backgroundColor: theme.colors.accent }]}>
        <Feather name="info" size={16} color={theme.colors.brandText} />
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
    borderRadius: radius.full,
    borderWidth: borderWidth.hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: radius.xl,
    borderWidth: borderWidth.hairline,
    overflow: "hidden",
    ...shadows.card,
  },
  heroImage: {
    width: "100%",
    height: 220,
  },
  heroBody: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  heroTitle: {
    lineHeight: 36,
  },
  heroSummary: {
    lineHeight: 24,
  },
  citationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: borderWidth.hairline,
    padding: spacing.lg,
  },
  citationCopy: {
    flex: 1,
    gap: 4,
  },
  bodyCard: {
    borderRadius: radius.xl,
    borderWidth: borderWidth.hairline,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  paragraph: {
    lineHeight: 26,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  disclaimerCopy: {
    flex: 1,
    lineHeight: 20,
  },
});
