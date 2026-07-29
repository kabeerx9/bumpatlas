import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText, colors, radius, spacing } from "@/design-system";
import { mockLegalDocuments, type LegalDocId } from "@/features/mock/mock-content";

export function LegalDocumentScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const docId = (doc ?? "privacy") as LegalDocId;
  const document = mockLegalDocuments[docId] ?? mockLegalDocuments.privacy;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color={colors.brand.ink} />
          </Pressable>
          <AppText weight="semibold">{document.title}</AppText>
          <View style={styles.spacer} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="caption" tone="secondary">
            Updated {document.updated}
          </AppText>
          {document.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <AppText weight="semibold">{section.heading}</AppText>
              <AppText variant="bodySmall" tone="secondary" style={styles.body}>
                {section.body}
              </AppText>
            </View>
          ))}
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
  spacer: { width: 44 },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: spacing.page,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.78)",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  body: { lineHeight: 22 },
});
