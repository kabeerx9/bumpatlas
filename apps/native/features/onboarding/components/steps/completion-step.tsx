import { StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";

type CompletionStepProps = {
  preview: boolean;
};

export function CompletionStep({ preview }: CompletionStepProps) {
  return (
    <View style={styles.block}>
      <View style={styles.rule} />
      <AppText variant="heading" align="center">
        Your first page is ready.
      </AppText>
      <AppText variant="body" tone="secondary" align="center" style={styles.copy}>
        Your keepsake and first chapter are ready for Today.
      </AppText>
      {preview ? (
        <View style={styles.previewNote}>
          <AppText variant="caption" tone="secondary" align="center">
            Preview only — nothing was saved and notifications were not requested.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.xs },
  rule: { width: 32, height: 2, borderRadius: 1, backgroundColor: colors.brand.honey },
  copy: { maxWidth: 330, lineHeight: 21 },
  previewNote: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface.cool,
  },
});
