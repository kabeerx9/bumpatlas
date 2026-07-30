import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText, borderWidth, radius, spacing, useAppTheme } from "@/design-system";
import { mockLegalDocuments, type LegalDocId } from "@/features/mock/mock-content";
import { SoftStackShell } from "@/features/shared/components/soft-stack-shell";

export function LegalDocumentScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const docId = (doc ?? "privacy") as LegalDocId;
  const document = mockLegalDocuments[docId] ?? mockLegalDocuments.privacy;

  return (
    <SoftStackShell title={document.title} onBack={() => router.back()}>
      <AppText variant="caption" tone="secondary">
        Updated {document.updated}
      </AppText>
      {document.sections.map((section) => (
        <View
          key={section.heading}
          style={[
            styles.section,
            { backgroundColor: theme.colors.surfaceWarm, borderColor: theme.colors.border },
          ]}
        >
          <AppText weight="semibold">{section.heading}</AppText>
          <AppText variant="bodySmall" tone="secondary" style={styles.body}>
            {section.body}
          </AppText>
        </View>
      ))}
    </SoftStackShell>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.hairline,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  body: { lineHeight: 22 },
});
